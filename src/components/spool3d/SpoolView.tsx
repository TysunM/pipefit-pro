import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { SpoolResult, Vec3, add, elbowCenterline, scale, sub } from '../../calc/spool';
import { useTheme } from '../../theme/ThemeProvider';
import { pipeShades } from '../diagram/primitives';
import { Box } from './dimension';
import { Scene, ScenePiece, buildScene, polyline, runNormal, runSides, tubeSides, weldTick } from './scene';
import {
  Camera,
  ELEVATIONS,
  ISO_CORNERS,
  ISO_VIEW,
  LOST,
  NamedView,
  PLAN_VIEW,
  Projected,
  Transform,
  bestCorner,
  swing,
  distanceToSegment,
  fitProjection,
  project,
  viewAt,
} from './project';

const W = 360;
const H = 360;
/** Room round the drawing for the figures that hang off it. */
const PAD = 30;
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
  legText,
  elbowText,
  onCamera,
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
  /**
   * Where the viewer is standing, whenever that changes.
   *
   * The aim pad lays its buttons out at the angles its directions draw at, so
   * it has to be told when the drawing turns or it starts pointing at places
   * the pipe no longer goes.
   */
  onCamera?: (cam: Camera) => void;
}) {
  const t = useTheme();
  const sh = pipeShades(t);
  // Held in a ref so a caller passing a fresh closure each render does not
  // make this fire on every render instead of on every turn of the view.
  const onCameraRef = useRef(onCamera);
  onCameraRef.current = onCamera;
  // The view opens on the corner this spool reads best from, not on a fixed
  // one. Which corner that is depends only on the shape, so it is worked out
  // from the shape.
  const [cam, setCam] = useState<Camera>(() => bestCorner(spool.points).cam);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    onCameraRef.current?.(cam);
  }, [cam]);
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
  const geom = useRef<{ pts: Projected[]; scale: number; transform: Transform }>({
    pts: [],
    scale: 1,
    transform: { scale: 1, midX: 0, midY: 0, midDepth: 0 },
  });
  const grab = useRef<{
    leg: number | null;
    timer: ReturnType<typeof setTimeout> | null;
    startLength: number;
    ux: number;
    uy: number;
    /** The scale the pull began at. Frozen, so the pull stays one to one. */
    scale: number;
    moved: boolean;
  }>({ leg: null, timer: null, startLength: 0, ux: 1, uy: 0, scale: 1, moved: false });
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

  // Pulling a leg is a different thing from turning the spool, and it wants the
  // opposite of a refit. On isometric paper you pick a scale, draw, and redraw
  // the whole thing smaller if the run outgrows the sheet — you do not rescale
  // while the pencil is moving. Rescaling under a thumb costs three things at
  // once: a leg can shrink on the page while its length is going up, its
  // neighbours appear to shorten though nothing about them changed, and the
  // length runs away because the finger's travel is divided by a scale that is
  // itself moving. So the drawing is pinned for the whole pull and refits on
  // release.
  const [hold, setHold] = useState<Transform | null>(null);

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
    // Letting go is where the whole drawing rescales to fit what the spool has
    // become — the one moment it should, and the paper equivalent of redrawing
    // the run at a smaller scale once it has outgrown the sheet.
    setHold(null);
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
              grab.current.scale = geom.current.scale || 1;
              setHold(geom.current.transform);
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
            // Divided by the scale the pull began at, not the live one, so the
            // same inch of thumb is always the same inch of pipe.
            const next = grab.current.startLength + along / grab.current.scale;
            resizeRef.current?.(grab.current.leg, Math.max(0.5, next));
            return;
          }

          if (grab.current.timer && !grab.current.moved) return;
          if (grab.current.timer) {
            clearTimeout(grab.current.timer);
            grab.current.timer = null;
          }
          // Walking round the job, and nothing else. The tilt the view was
          // opened at is the tilt it keeps, so an isometric stays at the
          // thirty degrees it is read at however far the thumb travels. Plan
          // and the elevations are on the buttons, chosen by name.
          setCam(swing(start.current, g.dx));
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

  const od = dragging && grabbed === null ? 9 : 16;

  // One scene, shared with the sheet that gets printed. Everything about which
  // piece is in front, where they cross, where the figures go and which corner
  // the compass can have is worked out in scene.ts, so the drawing in a man's
  // hand is the drawing on his screen.
  const scene: Scene = useMemo(
    () =>
      buildScene({
        spool,
        cam: view,
        width: W,
        height: H,
        pad: PAD,
        od,
        maxScale: ceiling,
        hold,
        // A drag carries no figures: they cannot be placed faster than a thumb
        // moves, and a figure in the wrong place reads worse than none.
        text: showLabels && !dragging ? { legText, elbowText } : null,
      }),
    [spool, view, ceiling, hold, od, showLabels, dragging, legText, elbowText]
  );

  geom.current = { pts: scene.pts, scale: scene.scale, transform: scene.transform };
  const pieces = scene.pieces;
  const labels = scene.labels;

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


  // Knocking out what is behind
  // ---------------------------
  // A piece in front has to cut the one behind it, or a drawing of a spool is
  // a heap of overlapping tubes. This used to be done by finding where the
  // outlines crossed and painting a background-coloured bar through each
  // crossing, along the near piece's direction, reaching its own width over
  // the sine of the angle the two met at.
  //
  // Three things were wrong with that and all three showed on a phone. The
  // reach was capped at a sine of 0.3, so a shallow crossing erased about
  // ninety points of a three hundred and sixty point canvas — enough to take a
  // whole short leg out and leave it floating unattached. The bar ran along a
  // single chord of the near piece, which on an elbow points somewhere the
  // elbow does not go, so the knockout landed off the pipe and left a wedge.
  // And nothing tied the bar's length to how much of the far piece the near
  // one actually covered, so it was guesswork either way.
  //
  // A piece is already drawn as a stroke. So it knocks out its own silhouette:
  // the same geometry, in the background colour, painted immediately before
  // the body. It cannot reach past where the piece is, because it is where the
  // piece is. No crossings to find, no angle to divide by, nothing to cap.
  const knockout = (piece: ScenePiece) =>
    piece.kind === 'run' ? (
      <Line
        x1={piece.a.x}
        y1={piece.a.y}
        x2={piece.b.x}
        y2={piece.b.y}
        stroke={haze}
        strokeWidth={od}
        strokeLinecap="round"
      />
    ) : (
      <Path
        d={polyline(piece.path)}
        fill="none"
        stroke={haze}
        strokeWidth={od}
        strokeLinecap="butt"
        strokeLinejoin="round"
      />
    );

  const perpOf = (p: Extract<ScenePiece, { kind: 'run' }>) => {
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
                  {knockout(p)}
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
                {knockout(p)}
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
                {[0, p.path.length - 1].map((at) => {
                  const w = weldTick(p.path, od / 2, at);
                  return w ? (
                    <Line
                      key={at}
                      x1={w.x1}
                      y1={w.y1}
                      x2={w.x2}
                      y2={w.y2}
                      stroke={rim}
                      strokeWidth={0.9}
                      strokeOpacity={0.75}
                    />
                  ) : null;
                })}
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
