import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { SpoolResult, Vec3, add, elbowCenterline, scale, sub } from '../../calc/spool';
import { useTheme } from '../../theme/ThemeProvider';
import { pipeShades } from '../diagram/primitives';
import {
  Camera,
  Crossing,
  ISO_CORNERS,
  ISO_VIEW,
  Projected,
  distanceToSegment,
  fitProjection,
  fitSphere,
  legDirections,
  polylineCrossings,
  project,
  settleCamera,
  spoolPlane,
} from './project';

const W = 340;
const H = 340;

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

export function SpoolView({
  spool,
  showLabels,
  onPickRun,
  selectedRun,
  onResizeLeg,
  lengthLabel,
}: {
  spool: SpoolResult;
  showLabels: boolean;
  onPickRun?: (index: number) => void;
  selectedRun?: number | null;
  onResizeLeg?: (index: number, nextLength: number) => void;
  lengthLabel?: (inches: number) => string;
}) {
  const t = useTheme();
  const sh = pipeShades(t);
  const [cam, setCam] = useState<Camera>(ISO_VIEW);
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

  // What the spool would go edge on to: the plane a flat one lies in, and the
  // direction of every leg.
  const plane = useMemo(() => spoolPlane(spool.points), [spool.points]);
  const dirs = useMemo(() => legDirections(spool.points), [spool.points]);

  // The drag writes the raw camera and the shown one is settled from it, so a
  // deadband is a place the view will not stop rather than a place the drag
  // cannot cross. Re-settling when the spool changes shape means a leg pulled
  // into the view axis is answered as it happens.
  const view = useMemo(() => settleCamera(cam, plane, dirs), [cam, plane, dirs]);

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
        },
        onPanResponderMove: (_e, g) => {
          if (Math.abs(g.dx) > GRAB_SLOP || Math.abs(g.dy) > GRAB_SLOP) grab.current.moved = true;

          if (grab.current.leg !== null) {
            const s = viewScale();
            const along = ((g.dx / s) * grab.current.ux + (g.dy / s) * grab.current.uy);
            const next = grab.current.startLength + along / (geom.current.scale || 1);
            resizeRef.current?.(grab.current.leg, Math.max(0.5, next));
            return;
          }

          if (grab.current.timer && !grab.current.moved) return;
          if (grab.current.timer) {
            clearTimeout(grab.current.timer);
            grab.current.timer = null;
          }
          setCam({
            yaw: start.current.yaw + g.dx * 0.011,
            pitch: start.current.pitch - g.dy * 0.011,
          });
        },
        onPanResponderRelease: () => {
          clearGrab();
          setDragging(false);
        },
        onPanResponderTerminate: () => {
          clearGrab();
          setDragging(false);
        },
      }),
    []
  );

  const scene = useMemo(() => {
    const none = { pieces: [] as Piece[], breaks: [] as Crossing[][] };
    if (!spool.valid || spool.points.length < 2) return none;
    const fitted = fitSphere(spool.points, view, W, H, 18);
    const pts = spool.points.map(fitted.map);
    geom.current = { pts, scale: fitted.scale };

    const pieces: Piece[] = [];

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

    return { pieces, breaks };
  }, [spool, view]);

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

  const axes = useMemo(() => {
    const o = { x: 0, y: 0, z: 0 };
    const L = 1;
    const mk = (v: Vec3) => project(v, view);
    const raw = [mk(o), mk({ x: L, y: 0, z: 0 }), mk({ x: 0, y: L, z: 0 }), mk({ x: 0, y: 0, z: L })];
    const map = fitProjection(raw, 74, 74, 12);
    const [O, X, Y, Z] = raw.map(map) as Projected[];
    return { O: O!, X: X!, Y: Y!, Z: Z! };
  }, [view]);

  const od = dragging && grabbed === null ? 9 : 16;

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
                    <Circle
                      cx={(p.a.x + p.b.x) / 2}
                      cy={(p.a.y + p.b.y) / 2}
                      r={od / 2}
                      fill="none"
                      stroke={rim}
                      strokeWidth={rimW}
                    />
                  ) : (
                    <Path
                      d={`M${p.a.x + nx},${p.a.y + ny} L${p.b.x + nx},${p.b.y + ny} M${p.b.x - nx},${p.b.y - ny} L${p.a.x - nx},${p.a.y - ny}`}
                      fill="none"
                      stroke={rim}
                      strokeWidth={rimW}
                    />
                  )}
                  {showLabels && !dragging ? (
                    <SvgText
                      x={(p.a.x + p.b.x) / 2}
                      y={(p.a.y + p.b.y) / 2 - od}
                      fontSize={10}
                      fontWeight="700"
                      fill={selected ? t.colors.accent : t.colors.text}
                      textAnchor="middle"
                    >
                      {`${p.index + 1}`}
                    </SvgText>
                  ) : null}
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

          <G transform={`translate(${W - 84} ${H - 84})`}>
            {/* The drawing now uses the whole canvas, so the compass needs its
                own ground to stay readable when a leg runs under it. */}
            <Rect x={2} y={2} width={76} height={76} rx={10} fill={haze} opacity={0.93} />
            <Line x1={axes.O.x} y1={axes.O.y} x2={axes.X.x} y2={axes.X.y} stroke="#C0553F" strokeWidth={1.6} />
            <Line x1={axes.O.x} y1={axes.O.y} x2={axes.Y.x} y2={axes.Y.y} stroke="#3E8F5B" strokeWidth={1.6} />
            <Line x1={axes.O.x} y1={axes.O.y} x2={axes.Z.x} y2={axes.Z.y} stroke="#2E6C9C" strokeWidth={1.6} />
            <SvgText x={axes.X.x} y={axes.X.y} fontSize={9} fontWeight="700" fill="#C0553F" textAnchor="middle">E</SvgText>
            <SvgText x={axes.Y.x} y={axes.Y.y} fontSize={9} fontWeight="700" fill="#3E8F5B" textAnchor="middle">UP</SvgText>
            <SvgText x={axes.Z.x} y={axes.Z.y} fontSize={9} fontWeight="700" fill="#2E6C9C" textAnchor="middle">N</SvgText>
          </G>
        </Svg>
        <View style={StyleSheet.absoluteFill} {...pan.panHandlers} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: t.layout.screenPadding,
          paddingBottom: t.space.md,
        }}
      >
        <Text style={[t.type.caption, { color: grabbed !== null ? t.colors.accent : t.colors.textFaint }]}>
          {grabbed !== null
            ? `Leg ${grabbed + 1} — ${lengthLabel?.(spool.runs[grabbed]?.centerToCenter ?? 0) ?? ''}`
            : 'Drag to rotate · hold a leg to resize'}
        </Text>
        <View style={{ flexDirection: 'row', gap: t.space.xs }}>
          {ISO_CORNERS.map((c) => {
            const here =
              Math.abs(Math.atan2(Math.sin(view.yaw - c.cam.yaw), Math.cos(view.yaw - c.cam.yaw))) < 0.02 &&
              Math.abs(view.pitch - c.cam.pitch) < 0.02;
            return (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityLabel={`Isometric view from the ${c.id}`}
                onPress={() => setCam(c.cam)}
                hitSlop={6}
                style={{
                  paddingHorizontal: t.space.sm,
                  paddingVertical: 3,
                  borderRadius: t.radius.sm,
                  backgroundColor: here ? t.colors.dataSoft : 'transparent',
                }}
              >
                <Text style={[t.type.captionStrong, { color: here ? t.colors.data : t.colors.textFaint }]}>
                  {c.id}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
