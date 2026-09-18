import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { SpoolResult, Vec3, add, elbowCenterline, scale, sub } from '../../calc/spool';
import { useTheme } from '../../theme/ThemeProvider';
import { pipeShades } from '../diagram/primitives';
import { Box, LabelWant, Seg, placeLabels, segmentHitsBox } from './dimension';
import {
  Camera,
  Crossing,
  ELEVATIONS,
  ISO_CORNERS,
  ISO_VIEW,
  LOST,
  NamedView,
  PLAN_VIEW,
  Projected,
  bestCorner,
  clampPitch,
  distanceToSegment,
  fitProjection,
  fitView,
  polylineCrossings,
  project,
  projectedFraction,
  viewAt,
} from './project';

const W = 360;
const H = 360;
/** Room round the drawing for the figures that hang off it. */
const PAD = 30;
/** How big the compass is, and how close to the edge it sits. */
const GIZMO = 80;
const GIZMO_EDGE = 4;

const hex = (c: string) => [
  parseInt(c.slice(1, 3), 16),
  parseInt(c.slice(3, 5), 16),
  parseInt(c.slice(5, 7), 16),
];

function mix(a: string, b: string, k: number): string {
  const [ar, ag, ab] = hex(a);
  const [br, bg, bb] = hex(b);
  const to = (x: number) => Math.round(x).toString(16).padStart(2, '0');
  return `#${to(ar! + (br! - ar!) * k)}${to(ag! + (bg! - ag!) * k)}${to(ab! + (bb! - ab!) * k)}`;
}

/** An open polyline through projected points. */
const polyline = (ps: Projected[]): string =>
  ps.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(' ');

/**
 * The two sides of a curved tube.
 *
 * A bent pipe's outline is its centreline pushed out half a diameter each way,
 * along the normal at each point rather than one normal for the whole fitting,
 * or the outline would cross itself round the inside of the bend.
 */
function tubeSides(ps: Projected[], half: number): [string, string] {
  if (ps.length < 2) return ['', ''];
  const left: Projected[] = [];
  const right: Projected[] = [];
  for (let i = 0; i < ps.length; i += 1) {
    const a = ps[Math.max(0, i - 1)]!;
    const b = ps[Math.min(ps.length - 1, i + 1)]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const nx = (-dy / l) * half;
    const ny = (dx / l) * half;
    const at = ps[i]!;
    left.push({ x: at.x + nx, y: at.y + ny, depth: at.depth });
    right.push({ x: at.x - nx, y: at.y - ny, depth: at.depth });
  }
  return [polyline(left), polyline(right)];
}

/** A short line across the pipe at one end of a fitting: the weld. */
function jointMark(ps: Projected[], half: number, at: number, colour: string) {
  const a = ps[Math.max(0, at - 1)]!;
  const b = ps[Math.min(ps.length - 1, at + 1)]!;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = Math.hypot(dx, dy);
  if (l < 1e-6) return null;
  const nx = (-dy / l) * half;
  const ny = (dx / l) * half;
  const q = ps[at]!;
  return (
    <Line
      x1={q.x + nx}
      y1={q.y + ny}
      x2={q.x - nx}
      y2={q.y - ny}
      stroke={colour}
      strokeWidth={0.9}
      strokeOpacity={0.75}
    />
  );
}

/** A line across the width of a fitting, for its gradient to run along. */
function chordNormal(ps: Projected[], half: number) {
  const a = ps[0]!;
  const b = ps[ps.length - 1]!;
  const mid = ps[ps.length >> 1] ?? a;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = Math.hypot(dx, dy) || 1;
  const nx = (-dy / l) * half;
  const ny = (dx / l) * half;
  return { x1: mid.x + nx, y1: mid.y + ny, x2: mid.x - nx, y2: mid.y - ny };
}

type Piece =
  | { kind: 'run'; depth: number; a: Projected; b: Projected; index: number; joints: [number, number] }
  | { kind: 'elbow'; depth: number; path: Projected[]; index: number; joints: [number, number] };

const outline = (p: Piece): Projected[] => (p.kind === 'run' ? [p.a, p.b] : p.path);
const joined = (a: Piece, b: Piece) =>
  a.joints[0] === b.joints[0] ||
  a.joints[0] === b.joints[1] ||
  a.joints[1] === b.joints[0] ||
  a.joints[1] === b.joints[1];

const GRAB_MS = 260;
const GRAB_SLOP = 10;
const HIT_PAD = 22;

/** The compass arms, and where a collapsed one puts its name. */
const AXES = [
  { key: 'X' as const, label: 'E', colour: '#C0553F', away: { x: 1, y: 0.6 } },
  { key: 'Y' as const, label: 'UP', colour: '#3E8F5B', away: { x: 0, y: -1 } },
  { key: 'Z' as const, label: 'N', colour: '#2E6C9C', away: { x: -1, y: 0.6 } },
];

export function SpoolView({
  spool,
  showLabels,
  onPickRun,
  selectedRun,
  onResizeLeg,
  lengthLabel,
  legText,
  elbowText,
}: {
  spool: SpoolResult;
  showLabels: boolean;
  onPickRun?: (index: number) => void;
  selectedRun?: number | null;
  onResizeLeg?: (index: number, nextLength: number) => void;
  lengthLabel?: (inches: number) => string;
  /** What goes against leg `index` on the drawing: its length, then where it runs. */
  legText?: (index: number) => string[];
  /** What goes against elbow `index`: its angle, then the fitting it needs. */
  elbowText?: (index: number) => string[];
}) {
  const t = useTheme();
  const sh = pipeShades(t);
  // The view opens on the corner this spool reads best from, not on a fixed
  // one. Which corner that is depends only on the shape, so it is worked out
  // from the shape.
  const [cam, setCam] = useState<Camera>(() => bestCorner(spool.points).cam);
  const [dragging, setDragging] = useState(false);
  const start = useRef<Camera>(ISO_VIEW);
  const camRef = useRef<Camera>(ISO_VIEW);
  camRef.current = cam;

  const [grabbed, setGrabbed] = useState<number | null>(null);
  const box = useRef({ w: W, h: H });

  const viewScale = () => Math.min(box.current.w / W, box.current.h / H) || 1;
  const toViewBox = (x: number, y: number) => {
    const s = viewScale();
    return { x: (x - (box.current.w - W * s) / 2) / s, y: (y - (box.current.h - H * s) / 2) / s };
  };
  const geom = useRef<{ pts: Projected[]; scale: number }>({ pts: [], scale: 1 });
  const grab = useRef<{
    leg: number | null;
    timer: ReturnType<typeof setTimeout> | null;
    startLength: number;
    ux: number;
    uy: number;
    moved: boolean;
  }>({ leg: null, timer: null, startLength: 0, ux: 1, uy: 0, moved: false });
  const spoolRef = useRef(spool);
  spoolRef.current = spool;

  // The drawing fills the canvas, which means its scale follows the silhouette
  // and the silhouette changes as the spool turns. Standing still that is what
  // is wanted; under a thumb it would have the picture breathing. So a drag
  // carries the scale it began with as a ceiling — the drawing may give ground
  // to stay on the page and never swells — and it refits on release.
  const [ceiling, setCeiling] = useState(Infinity);
  const ceilingRef = useRef(Infinity);
  ceilingRef.current = ceiling;

  const resizeRef = useRef(onResizeLeg);
  resizeRef.current = onResizeLeg;

  const hitTest = (x: number, y: number): number | null => {
    const { pts } = geom.current;
    let best: number | null = null;
    let bestD = HIT_PAD;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const d = distanceToSegment(x, y, pts[i]!.x, pts[i]!.y, pts[i + 1]!.x, pts[i + 1]!.y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  };

  const clearGrab = () => {
    if (grab.current.timer) clearTimeout(grab.current.timer);
    grab.current.timer = null;
    grab.current.leg = null;
    setGrabbed(null);
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
        onPanResponderGrant: (e) => {
          start.current = camRef.current;
          grab.current.moved = false;
          grab.current.leg = null;

          const local = toViewBox(e.nativeEvent.locationX, e.nativeEvent.locationY);
          const hit = hitTest(local.x, local.y);
          if (hit !== null && resizeRef.current) {
            grab.current.timer = setTimeout(() => {
              if (grab.current.moved) return;
              const pts = geom.current.pts;
              const a = pts[hit]!;
              const b = pts[hit + 1]!;
              const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
              grab.current.leg = hit;
              grab.current.ux = (b.x - a.x) / l;
              grab.current.uy = (b.y - a.y) / l;
              grab.current.startLength = spoolRef.current.runs[hit]?.centerToCenter ?? 0;
              setGrabbed(hit);
              onPickRun?.(hit);
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }, GRAB_MS);
          }
          setDragging(true);
          setCeiling(geom.current.scale || Infinity);
        },
        onPanResponderMove: (_e, g) => {
          if (Math.abs(g.dx) > GRAB_SLOP || Math.abs(g.dy) > GRAB_SLOP) grab.current.moved = true;

          if (grab.current.leg !== null) {
            const s = viewScale();
            const along = (g.dx / s) * grab.current.ux + (g.dy / s) * grab.current.uy;
            const next = grab.current.startLength + along / (geom.current.scale || 1);
            resizeRef.current?.(grab.current.leg, Math.max(0.5, next));
            return;
          }

          if (grab.current.timer && !grab.current.moved) return;
          if (grab.current.timer) {
            clearTimeout(grab.current.timer);
            grab.current.timer = null;
          }
          // Straight hold of the model under the thumb: pull it right and it
          // goes right, pull it down and the top comes over. Nothing is fenced
          // off — every yaw and every tilt from straight down to straight up
          // is somewhere the drag can reach, because every one of them is a
          // view a fitter asks for.
          setCam({
            yaw: start.current.yaw - g.dx * 0.011,
            pitch: clampPitch(start.current.pitch + g.dy * 0.011),
          });
        },
        onPanResponderRelease: () => {
          clearGrab();
          setDragging(false);
          setCeiling(Infinity);
        },
        onPanResponderTerminate: () => {
          clearGrab();
          setDragging(false);
          setCeiling(Infinity);
        },
      }),
    []
  );

  const goTo = (v: NamedView) => {
    setCam(v.cam);
    setCeiling(Infinity);
  };

  const view = cam;
  const here = useMemo(() => viewAt(view), [view]);

  // A new shape may not read from the corner the old one did, so the corner is
  // chosen again — but only while the camera is still on one of the four. A
  // view somebody turned to by hand, or a plan they are reading dimensions
  // off, is theirs, and stretching a leg is not a new shape.
  const shape = useMemo(
    () => spool.runs.map((r) => `${r.direction.x.toFixed(4)},${r.direction.y.toFixed(4)},${r.direction.z.toFixed(4)}`).join('|'),
    [spool.runs]
  );
  const onCorner = ISO_CORNERS.some((c) => c.id === here?.id);
  const onCornerRef = useRef(onCorner);
  onCornerRef.current = onCorner;
  const pointsRef = useRef(spool.points);
  pointsRef.current = spool.points;
  useEffect(() => {
    if (!onCornerRef.current) return;
    setCam(bestCorner(pointsRef.current).cam);
    setCeiling(Infinity);
  }, [shape]);

  const scene = useMemo(() => {
    const none = { pieces: [] as Piece[], breaks: [] as Crossing[][], collapsed: [] as boolean[] };
    if (!spool.valid || spool.points.length < 2) return none;
    const fitted = fitView(spool.points, view, W, H, PAD, ceiling);
    const pts = spool.points.map(fitted.map);
    geom.current = { pts, scale: fitted.scale };

    const pieces: Piece[] = [];
    const collapsed = spool.runs.map((r) => projectedFraction(r.direction, view) < LOST);

    // Legs are drawn from where the pipe actually starts to where it actually
    // stops, a takeoff short of each corner it turns at, because that is where
    // the fitting takes over. A leg too short for its own takeoffs is a spool
    // that cannot be built; it draws as a stub rather than inside out.
    spool.runs.forEach((r, i) => {
      const half = r.centerToCenter / 2;
      const a = fitted.map(add(r.from, scale(r.direction, Math.min(r.takeoffStart, half))));
      const b = fitted.map(sub(r.to, scale(r.direction, Math.min(r.takeoffEnd, half))));
      pieces.push({ kind: 'run', depth: (a.depth + b.depth) / 2, a, b, index: i, joints: [i, i + 1] });
    });

    // And the corner itself is drawn as the fitting that fills it: an arc on
    // the bend radius, not a ball on a stick.
    spool.elbows.forEach((e, i) => {
      const into = spool.runs[e.index - 1];
      const outOf = spool.runs[e.index];
      if (!into || !outOf) return;
      const path = elbowCenterline(spool.points[e.index]!, into.direction, outOf.direction, e.takeoff).map(
        fitted.map
      );
      const depth = path.reduce((m, q) => m + q.depth, 0) / path.length;
      pieces.push({ kind: 'elbow', depth, path, index: i, joints: [e.index, e.index] });
    });

    pieces.sort((p, q) => p.depth - q.depth);

    // Painted far to near, so everything before a piece in this list is behind
    // it. Where it crosses one of those and is not joined to it, it breaks it.
    const breaks: Crossing[][] = pieces.map((near, i) => {
      const marks: Crossing[] = [];
      for (let j = 0; j < i; j += 1) {
        const far = pieces[j]!;
        if (joined(near, far)) continue;
        marks.push(...polylineCrossings(outline(near), outline(far)));
      }
      return marks;
    });

    return { pieces, breaks, collapsed };
  }, [spool, view, ceiling]);

  const pieces = scene.pieces;

  const depthRange = useMemo(() => {
    if (!pieces.length) return { min: 0, max: 1 };
    const ds = pieces.map((p) => p.depth);
    const min = Math.min(...ds);
    const max = Math.max(...ds);
    return { min, max: max - min < 1e-6 ? min + 1 : max };
  }, [pieces]);

  const haze = t.mode === 'dark' ? '#0C1216' : '#FAFBFB';
  const nearness = (d: number) => (d - depthRange.min) / (depthRange.max - depthRange.min);
  const fade = (c: string, d: number) => mix(c, haze, 0.42 * (1 - nearness(d)));

  const od = dragging && grabbed === null ? 9 : 16;

  // The compass goes in whichever corner the spool has least business in.
  // Fixed in one corner it lands on the drawing about a quarter of the time,
  // and a compass on top of a leg costs more than it gives.
  const corner = useMemo(() => {
    const spots: Box[] = [
      { x: W - GIZMO - GIZMO_EDGE, y: H - GIZMO - GIZMO_EDGE, w: GIZMO, h: GIZMO },
      { x: GIZMO_EDGE, y: H - GIZMO - GIZMO_EDGE, w: GIZMO, h: GIZMO },
      { x: W - GIZMO - GIZMO_EDGE, y: GIZMO_EDGE, w: GIZMO, h: GIZMO },
      { x: GIZMO_EDGE, y: GIZMO_EDGE, w: GIZMO, h: GIZMO },
    ];
    const pts = geom.current.pts;
    const pipes: Seg[] = [];
    for (let i = 0; i < pts.length - 1; i += 1)
      pipes.push({ ax: pts[i]!.x, ay: pts[i]!.y, bx: pts[i + 1]!.x, by: pts[i + 1]!.y });
    // Ties go to the first spot, which is the corner a drawing usually has it in.
    let best = spots[0]!;
    let bestHit = Infinity;
    for (const spot of spots) {
      const hit = pipes.filter((s) => segmentHitsBox(s, spot)).length;
      if (hit < bestHit) {
        bestHit = hit;
        best = spot;
      }
    }
    return best;
  }, [scene]);

  // The figures. A leg square on to the viewer has no length on the page, so
  // its dimension is the only thing that says how long it is — which is how a
  // riser has been drawn on a plan since drawings were drawn.
  const labels = useMemo(() => {
    if (!showLabels || dragging || !spool.valid) return [];
    const pts = geom.current.pts;
    if (pts.length < 2) return [];

    const wants: LabelWant[] = [];
    spool.runs.forEach((r, i) => {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      const flat = scene.collapsed[i] ?? false;
      const lines = legText?.(i) ?? [`${r.centerToCenter}`];
      wants.push({
        key: `leg${i}`,
        ax: (a.x + b.x) / 2,
        ay: (a.y + b.y) / 2,
        ux: l > 1e-6 ? (b.x - a.x) / l : 1,
        uy: l > 1e-6 ? (b.y - a.y) / l : 0,
        collapsed: flat || l < od,
        lines,
        weight: 1000 + r.centerToCenter,
        tone: 'leg',
      });
    });

    spool.elbows.forEach((e, i) => {
      const lines = elbowText?.(i) ?? [`${e.angle.toFixed(0)}°`];
      const at = pts[e.index];
      if (!at) return;
      const into = pts[e.index - 1];
      const outOf = pts[e.index + 1];
      // Off the outside of the turn: away from both legs at once.
      let ux = 1;
      let uy = 0;
      if (into && outOf) {
        const vx = at.x - (into.x + outOf.x) / 2;
        const vy = at.y - (into.y + outOf.y) / 2;
        const l = Math.hypot(vx, vy);
        if (l > 1e-6) {
          ux = -vy / l;
          uy = vx / l;
        }
      }
      wants.push({ key: `elb${i}`, ax: at.x, ay: at.y, ux, uy, collapsed: false, lines, weight: 10 + i, tone: 'elbow' });
    });

    const pipes: Seg[] = [];
    for (let i = 0; i < pts.length - 1; i += 1)
      pipes.push({ ax: pts[i]!.x, ay: pts[i]!.y, bx: pts[i + 1]!.x, by: pts[i + 1]!.y });

    return placeLabels(wants, pipes, W, H, 2, [corner]);
  }, [showLabels, dragging, spool, scene, legText, elbowText, od, corner]);

  const axes = useMemo(() => {
    const o = { x: 0, y: 0, z: 0 };
    const L = 1;
    const mk = (v: Vec3) => project(v, view);
    const raw = [mk(o), mk({ x: L, y: 0, z: 0 }), mk({ x: 0, y: L, z: 0 }), mk({ x: 0, y: 0, z: L })];
    const map = fitProjection(raw, 74, 74, 12);
    const [O, X, Y, Z] = raw.map(map) as Projected[];
    return { O: O!, X: X!, Y: Y!, Z: Z! };
  }, [view]);

  const breakMarks = (i: number) =>
    (scene.breaks[i] ?? []).map((c, k) => {
      // Along the near piece, the one behind spans its own width divided by the
      // sine of the angle they meet at. Shallow crossings are capped rather
      // than run off to a break the length of the drawing.
      const reach = (od + 6) / 2 / Math.max(c.sin, 0.3);
      return (
        <Line
          key={`b${i}_${k}`}
          x1={c.x - c.ax * reach}
          y1={c.y - c.ay * reach}
          x2={c.x + c.ax * reach}
          y2={c.y + c.ay * reach}
          stroke={haze}
          strokeWidth={od + 6}
          strokeLinecap="butt"
        />
      );
    });

  const perpOf = (p: Extract<Piece, { kind: 'run' }>) => {
    const dx = p.b.x - p.a.x;
    const dy = p.b.y - p.a.y;
    const l = Math.hypot(dx, dy) || 1;
    return { x: (-dy / l) * (od / 2), y: (dx / l) * (od / 2) };
  };

  const viewRow = (views: readonly NamedView[]) => (
    <View style={{ flexDirection: 'row', gap: t.space.xs }}>
      {views.map((v) => {
        const on = here?.id === v.id;
        return (
          <Pressable
            key={v.id}
            accessibilityRole="button"
            accessibilityLabel={v.title}
            onPress={() => goTo(v)}
            hitSlop={6}
            style={{
              paddingHorizontal: t.space.sm,
              paddingVertical: 4,
              borderRadius: t.radius.sm,
              backgroundColor: on ? t.colors.dataSoft : 'transparent',
            }}
          >
            <Text style={[t.type.captionStrong, { color: on ? t.colors.data : t.colors.textFaint }]}>
              {v.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View
      style={{
        backgroundColor: t.mode === 'dark' ? t.colors.bgSunken : '#FAFBFB',
        borderTopWidth: t.hairline,
        borderBottomWidth: t.hairline,
        borderColor: t.colors.border,
      }}
    >
      <View
        style={{ position: 'relative' }}
        onLayout={(e) => {
          box.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
        }}
      >
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          <Defs>
            {pieces.map((p, i) =>
              p.kind === 'run' ? (
                <LinearGradient
                  key={`g${i}`}
                  id={`r${i}`}
                  gradientUnits="userSpaceOnUse"
                  x1={p.a.x + perpOf(p).x}
                  y1={p.a.y + perpOf(p).y}
                  x2={p.a.x - perpOf(p).x}
                  y2={p.a.y - perpOf(p).y}
                >
                  <Stop offset="0" stopColor={fade(sh.steel.edge, p.depth)} />
                  <Stop offset="0.17" stopColor={fade(sh.steel.mid, p.depth)} />
                  <Stop offset="0.4" stopColor={fade(sh.steel.light, p.depth)} />
                  <Stop offset="0.68" stopColor={fade(sh.steel.mid, p.depth)} />
                  <Stop offset="1" stopColor={fade(sh.steel.deep, p.depth)} />
                </LinearGradient>
              ) : (
                <LinearGradient
                  key={`g${i}`}
                  id={`e${i}`}
                  gradientUnits="userSpaceOnUse"
                  x1={chordNormal(p.path, od / 2).x1}
                  y1={chordNormal(p.path, od / 2).y1}
                  x2={chordNormal(p.path, od / 2).x2}
                  y2={chordNormal(p.path, od / 2).y2}
                >
                  <Stop offset="0" stopColor={fade(sh.steel.edge, p.depth)} />
                  <Stop offset="0.17" stopColor={fade(sh.steel.mid, p.depth)} />
                  <Stop offset="0.4" stopColor={fade(sh.steel.light, p.depth)} />
                  <Stop offset="0.68" stopColor={fade(sh.steel.mid, p.depth)} />
                  <Stop offset="1" stopColor={fade(sh.steel.deep, p.depth)} />
                </LinearGradient>
              )
            )}
          </Defs>

          {pieces.map((p, i) => {
            if (p.kind === 'run') {
              const dx = p.b.x - p.a.x;
              const dy = p.b.y - p.a.y;
              const l = Math.hypot(dx, dy) || 1;
              const nx = (-dy / l) * (od / 2);
              const ny = (dx / l) * (od / 2);
              const selected = selectedRun === p.index || grabbed === p.index;
              // The body is a round ended stroke rather than a rectangle, so a
              // leg turned end on to the camera draws as a disc of the full
              // pipe diameter — what looking down a bore actually looks like —
              // instead of collapsing to nothing. The outline follows: a ring
              // when it is end on, the two sides of the tube when it is not.
              const endOn = l < od * 0.9;
              const rim = selected ? t.colors.accent : fade(sh.rim, p.depth);
              const rimW = selected ? 2.2 : 1;
              return (
                <G key={i}>
                  {breakMarks(i)}
                  <Line
                    x1={p.a.x}
                    y1={p.a.y}
                    x2={p.b.x}
                    y2={p.b.y}
                    stroke={`url(#r${i})`}
                    strokeWidth={od}
                    strokeLinecap="round"
                  />
                  {endOn ? (
                    <>
                      <Circle
                        cx={(p.a.x + p.b.x) / 2}
                        cy={(p.a.y + p.b.y) / 2}
                        r={od / 2}
                        fill="none"
                        stroke={rim}
                        strokeWidth={rimW}
                      />
                      {/* Looking down the bore. The bore is what is there. */}
                      <Circle
                        cx={(p.a.x + p.b.x) / 2}
                        cy={(p.a.y + p.b.y) / 2}
                        r={od / 2 - 2.6}
                        fill="none"
                        stroke={rim}
                        strokeWidth={0.8}
                        strokeOpacity={0.8}
                      />
                    </>
                  ) : (
                    <Path
                      d={`M${p.a.x + nx},${p.a.y + ny} L${p.b.x + nx},${p.b.y + ny} M${p.b.x - nx},${p.b.y - ny} L${p.a.x - nx},${p.a.y - ny}`}
                      fill="none"
                      stroke={rim}
                      strokeWidth={rimW}
                    />
                  )}
                </G>
              );
            }
            const spine = polyline(p.path);
            const [left, right] = tubeSides(p.path, od / 2);
            const rim = fade(sh.rim, p.depth);
            return (
              <G key={i}>
                {breakMarks(i)}
                <Path
                  d={spine}
                  fill="none"
                  stroke={`url(#e${i})`}
                  strokeWidth={od}
                  strokeLinecap="butt"
                  strokeLinejoin="round"
                />
                <Path d={left} fill="none" stroke={rim} strokeWidth={1} strokeLinejoin="round" />
                <Path d={right} fill="none" stroke={rim} strokeWidth={1} strokeLinejoin="round" />
                {/* The two joints the fitting is welded at. A bought elbow and
                    the pipe either side are the same steel, so the joint is
                    what tells them apart, exactly as it does on the iron. */}
                {jointMark(p.path, od / 2, 0, rim)}
                {jointMark(p.path, od / 2, p.path.length - 1, rim)}
              </G>
            );
          })}

          {labels.map((l) => {
            const legLabel = l.tone === 'leg';
            const ink = legLabel
              ? selectedRun !== null && `leg${selectedRun}` === l.key
                ? t.colors.accent
                : t.colors.text
              : t.colors.data;
            return (
              <G key={l.key}>
                {l.leader ? (
                  <Line
                    x1={l.ax}
                    y1={l.ay}
                    x2={l.x}
                    y2={l.y}
                    stroke={t.colors.textFaint}
                    strokeWidth={0.7}
                    strokeDasharray="2 2"
                  />
                ) : null}
                <Rect
                  x={l.box.x}
                  y={l.box.y}
                  width={l.box.w}
                  height={l.box.h}
                  rx={3}
                  fill={haze}
                  opacity={0.88}
                />
                {l.lines.map((line, k) => (
                  <SvgText
                    key={k}
                    x={l.x}
                    y={l.box.y + 2 + 8.5 + k * 11}
                    fontSize={k === 0 ? 10.5 : 9}
                    fontWeight={k === 0 ? '700' : '500'}
                    fill={k === 0 ? ink : t.colors.textMuted}
                    textAnchor="middle"
                  >
                    {line}
                  </SvgText>
                ))}
              </G>
            );
          })}

          <G transform={`translate(${corner.x} ${corner.y})`}>
            {/* The drawing now uses the whole canvas, so the compass needs its
                own ground to stay readable when a leg runs under it. An axis
                square on to the viewer has no arm to draw, and gets the same
                treatment the pipe does: a dot, with its name set off it, so a
                plan does not stack three labels on one point. */}
            <Rect x={2} y={2} width={GIZMO - 4} height={GIZMO - 4} rx={10} fill={haze} opacity={0.93} />
            {AXES.map((a) => {
              const end = axes[a.key];
              const dx = end.x - axes.O.x;
              const dy = end.y - axes.O.y;
              const l = Math.hypot(dx, dy);
              if (l < 5)
                return (
                  <G key={a.key}>
                    <Circle cx={axes.O.x} cy={axes.O.y} r={2.6} fill={a.colour} />
                    <SvgText
                      x={axes.O.x + a.away.x * 11}
                      y={axes.O.y + a.away.y * 11}
                      fontSize={9}
                      fontWeight="700"
                      fill={a.colour}
                      textAnchor="middle"
                    >
                      {a.label}
                    </SvgText>
                  </G>
                );
              return (
                <G key={a.key}>
                  <Line x1={axes.O.x} y1={axes.O.y} x2={end.x} y2={end.y} stroke={a.colour} strokeWidth={1.6} />
                  <SvgText
                    x={end.x + (dx / l) * 5}
                    y={end.y + (dy / l) * 5 + 3}
                    fontSize={9}
                    fontWeight="700"
                    fill={a.colour}
                    textAnchor="middle"
                  >
                    {a.label}
                  </SvgText>
                </G>
              );
            })}
          </G>
        </Svg>
        <View style={StyleSheet.absoluteFill} {...pan.panHandlers} />
      </View>

      <View style={{ paddingHorizontal: t.layout.screenPadding, paddingBottom: t.space.md, gap: t.space.xs }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
            {viewRow(ISO_CORNERS)}
            <View style={{ width: t.hairline, height: 16, backgroundColor: t.colors.border }} />
            {viewRow([PLAN_VIEW, ...ELEVATIONS])}
          </View>
        </ScrollView>
        <Text style={[t.type.caption, { color: grabbed !== null ? t.colors.accent : t.colors.textFaint }]}>
          {grabbed !== null
            ? `Leg ${grabbed + 1} — ${lengthLabel?.(spool.runs[grabbed]?.centerToCenter ?? 0) ?? ''}`
            : here
              ? here.title
              : 'Turned by hand · pick a view above to square it up'}
        </Text>
      </View>
    </View>
  );
}
