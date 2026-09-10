import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import { SpoolResult, Vec3 } from '../../calc/spool';
import { useTheme } from '../../theme/ThemeProvider';
import { pipeShades } from '../diagram/primitives';
import { Camera, ISO_VIEW, Projected, clampPitch, distanceToSegment, fitProjection, fitSphere, project } from './project';

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

type Piece =
  | { kind: 'run'; depth: number; a: Projected; b: Projected; index: number }
  | { kind: 'elbow'; depth: number; at: Projected; index: number };

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
            pitch: clampPitch(start.current.pitch - g.dy * 0.011),
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

  const pieces = useMemo<Piece[]>(() => {
    if (!spool.valid || spool.points.length < 2) return [];
    const fitted = fitSphere(spool.points, cam, W, H, 18);
    const pts = spool.points.map(fitted.map);
    geom.current = { pts, scale: fitted.scale };

    const out: Piece[] = [];
    spool.runs.forEach((_r, i) => {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      out.push({ kind: 'run', depth: (a.depth + b.depth) / 2, a, b, index: i });
    });
    spool.elbows.forEach((e, i) => {
      const at = pts[e.index]!;
      out.push({ kind: 'elbow', depth: at.depth, at, index: i });
    });
    return out.sort((p, q) => p.depth - q.depth);
  }, [spool, cam]);

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
    const mk = (v: Vec3) => project(v, cam);
    const raw = [mk(o), mk({ x: L, y: 0, z: 0 }), mk({ x: 0, y: L, z: 0 }), mk({ x: 0, y: 0, z: L })];
    const map = fitProjection(raw, 74, 74, 12);
    const [O, X, Y, Z] = raw.map(map) as Projected[];
    return { O: O!, X: X!, Y: Y!, Z: Z! };
  }, [cam]);

  const od = dragging && grabbed === null ? 9 : 16;

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
                <RadialGradient key={`g${i}`} id={`e${i}`} cx="35%" cy="30%" r="75%">
                  <Stop offset="0" stopColor={fade(sh.elbow.light, p.depth)} />
                  <Stop offset="0.55" stopColor={fade(sh.elbow.mid, p.depth)} />
                  <Stop offset="1" stopColor={fade(sh.elbow.deep, p.depth)} />
                </RadialGradient>
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
              return (
                <G key={i}>
                  <Path
                    d={`M${p.a.x + nx},${p.a.y + ny} L${p.b.x + nx},${p.b.y + ny} L${p.b.x - nx},${p.b.y - ny} L${p.a.x - nx},${p.a.y - ny} Z`}
                    fill={`url(#r${i})`}
                    stroke={selected ? t.colors.accent : fade(sh.rim, p.depth)}
                    strokeWidth={selected ? 2.2 : 1}
                  />
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
            return (
              <Circle
                key={i}
                cx={p.at.x}
                cy={p.at.y}
                r={od * 0.6}
                fill={`url(#e${i})`}
                stroke={fade(sh.rim, p.depth)}
                strokeWidth={1}
              />
            );
          })}

          <G transform={`translate(${W - 84} ${H - 84})`}>
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
        <Text
          style={[t.type.captionStrong, { color: t.colors.data }]}
          onPress={() => setCam(ISO_VIEW)}
          accessibilityRole="button"
        >
          Reset view
        </Text>
      </View>
    </View>
  );
}
