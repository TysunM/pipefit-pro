import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Polyline } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { FOOT_L, FOOT_R, HEAD, HEAD_R, HIP_L, HIP_R, mirror, project, projectDir, solve, type Limb, type V } from '../calc/crane/figure';
import type { Signal } from '../calc/crane/signals';

// The signal person giving a signal, on a loop: a hi-vis vest and hat, the
// gloves picked out so the hand is what you read, and each moving hand's path
// drawn faintly behind it so a still frame still says circle, sweep or push.
// Paused, or with Reduce Motion on, it holds one frame.

const BOX = { x0: -92, x1: 92, y0: 26, y1: 198 };
const BOX_W = BOX.x1 - BOX.x0;
const BOX_H = BOX.y1 - BOX.y0;
export const FIGURE_ASPECT = BOX_W / BOX_H;
const STILL_AT = 0.25;

/** Where a signal is in its beat, 0 to 1, looping while it plays. */
export function useBeat(period: number, playing: boolean): number {
  const [f, setF] = useState(STILL_AT);
  const [still, setStill] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => live && setStill(r))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!playing || still || !(period > 0)) {
      setF(STILL_AT);
      return;
    }
    const t0 = Date.now();
    let raf = 0;
    const tick = () => {
      setF(((Date.now() - t0) / 1000 / period + STILL_AT) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [period, playing, still]);
  return f;
}

export function SignalFigure({ signal, left = false, height, playing = true, label }: { signal: Signal; left?: boolean; height: number; playing?: boolean; label?: string }) {
  const f = useBeat(signal.period, playing);
  return <SignalFrame signal={signal} left={left} height={height} f={f} label={label} />;
}

export function SignalFrame({ signal, left = false, height, f, label }: { signal: Signal; left?: boolean; height: number; f: number; label?: string }) {
  const t = useTheme();
  const c = t.colors;
  const k = height / BOX_H;
  // Small, the hands are drawn bigger: they are what is read.
  const hs = height < 150 ? 1.3 : 1;
  const width = Math.round(height * FIGURE_ASPECT);
  const at = (p: V) => {
    const q = project(p);
    return { x: (q.x - BOX.x0) * k, y: (BOX.y1 - q.y) * k, depth: q.depth };
  };
  const poseAt = (g: number) => (left ? mirror(signal.pose(g)) : signal.pose(g));
  const body = solve(poseAt(f));

  // Each moving hand's path through one beat.
  const trails = useMemo(() => {
    if (!(signal.period > 0)) return [];
    const n = 24;
    const r: string[] = [];
    const l: string[] = [];
    let span = { r: 0, l: 0 };
    let first: Record<'r' | 'l', V> | null = null;
    for (let i = 0; i <= n; i += 1) {
      const b = solve(poseAt(i / n));
      if (!first) first = { r: b.r.hand, l: b.l.hand };
      for (const side of ['r', 'l'] as const) {
        const p = at(b[side].hand);
        (side === 'r' ? r : l).push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
        const d = Math.hypot(b[side].hand[0] - first[side][0], b[side].hand[1] - first[side][1], b[side].hand[2] - first[side][2]);
        span = { ...span, [side]: Math.max(span[side], d) };
      }
    }
    return [span.r > 2.5 ? r.join(' ') : null, span.l > 2.5 ? l.join(' ') : null].filter((x): x is string => !!x);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal, left, height]);

  const ink = c.text;
  const glove = c.data;
  const vest = c.glow;
  const P = (p: V) => {
    const q = at(p);
    return `${q.x.toFixed(1)},${q.y.toFixed(1)}`;
  };
  const line = (a: V, b: V, w: number, color: string, key: string) => {
    const p = at(a);
    const q = at(b);
    return <Line key={key} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={color} strokeWidth={w * k} strokeLinecap="round" />;
  };

  const hand = (l: Limb, key: string) => {
    const h = at(l.hand);
    const g = l.grip;
    const ray = (dir: V | undefined, length: number, w: number, color = glove) => {
      if (!dir) return null;
      const d = projectDir(l.hand, dir, length);
      return <Line x1={h.x} y1={h.y} x2={h.x + d.x * k * hs} y2={h.y - d.y * k * hs} stroke={color} strokeWidth={w * k * hs} strokeLinecap="round" />;
    };
    return (
      <G key={key}>
        {g.kind === 'flat' ? (
          <>
            {ray(g.dir, 11, 7.5, c.bg)}
            {ray(g.dir, 11, 6)}
          </>
        ) : null}
        {g.kind === 'point' ? (
          <>
            {ray(g.dir, 12, 5, c.bg)}
            {ray(g.dir, 12, 3.4)}
          </>
        ) : null}
        {g.kind === 'thumb' || g.kind === 'flex' ? (
          <>
            {ray(g.dir, 12, 5.8, c.bg)}
            {ray(g.dir, 12, 4)}
          </>
        ) : null}
        {g.kind === 'flex' ? (
          <>
            {ray(g.fingers, 3 + 8 * (g.open ?? 0), 5, c.bg)}
            {ray(g.fingers, 3 + 8 * (g.open ?? 0), 3.2)}
          </>
        ) : null}
        <Circle cx={h.x} cy={h.y} r={(g.kind === 'flat' ? 4.2 : 5.2) * k * hs} fill={glove} stroke={c.bg} strokeWidth={1.2} />
      </G>
    );
  };
  const arm = (l: Limb, key: string) => (
    <G key={key}>
      {line(l.shoulder, l.elbow, 8.5, ink, 'u')}
      {line(l.elbow, l.hand, 7, ink, 'f')}
      {hand(l, 'h')}
    </G>
  );
  const depthOf = (l: Limb) => (at(l.elbow).depth + at(l.hand).depth) / 2;
  const limbs = [
    { l: body.r, key: 'r' },
    { l: body.l, key: 'l' },
  ];
  const behind = limbs.filter((x) => depthOf(x.l) < 0);
  const front = limbs.filter((x) => depthOf(x.l) >= 0);

  const head = at(HEAD);
  const hat = at([HEAD[0], HEAD[1] + 3, HEAD[2] + 1]);
  const r = HEAD_R * k;
  const ground = at([0, FOOT_R[1] - 2, 3]);

  return (
    <Svg width={width} height={height} accessibilityLabel={label ?? 'A signal person giving a signal'}>
      <Ellipse cx={ground.x} cy={ground.y} rx={34 * k} ry={7 * k} fill={ink} opacity={0.1} />
      {/* Legs and boots. */}
      {line(HIP_R, FOOT_R, 11, c.textMuted, 'lr')}
      {line(HIP_L, FOOT_L, 11, c.textMuted, 'll')}
      {line(FOOT_R, [FOOT_R[0] - 3, FOOT_R[1], FOOT_R[2] + 7], 8, ink, 'br')}
      {line(FOOT_L, [FOOT_L[0] + 3, FOOT_L[1], FOOT_L[2] + 7], 8, ink, 'bl')}
      {behind.map((x) => arm(x.l, x.key))}
      {/* The body: the vest's front and its near side, two bands of tape. */}
      <Polygon points={[P([19, 146, 7]), P([19, 146, -7]), P([15, 92, -7]), P([15, 92, 7])].join(' ')} fill={vest} opacity={0.75} stroke={ink} strokeWidth={1.2} strokeLinejoin="round" />
      <Polygon points={[P([-19, 146, 7]), P([19, 146, 7]), P([15, 92, 7]), P([-15, 92, 7])].join(' ')} fill={vest} stroke={ink} strokeWidth={1.4} strokeLinejoin="round" />
      {[124, 106].map((y) => (
        <Polyline key={y} points={[P([-17.5 + (146 - y) * 0.08, y, 7.4]), P([17.5 - (146 - y) * 0.08, y, 7.4]), P([17.5 - (146 - y) * 0.08, y, -6])].join(' ')} fill="none" stroke="#D9DEE3" strokeWidth={3.2 * k} />
      ))}
      {line([0, 146, 0], [0, 155, 0], 6, ink, 'neck')}
      <Circle cx={head.x} cy={head.y} r={r} fill={c.bgRaised} stroke={ink} strokeWidth={1.5} />
      <Path d={`M${hat.x - 11.5 * k} ${hat.y} A${11.5 * k} ${10 * k} 0 0 1 ${hat.x + 11.5 * k} ${hat.y} Z`} fill={vest} stroke={ink} strokeWidth={1.4} strokeLinejoin="round" />
      {line([HEAD[0] - 15, HEAD[1] + 3, HEAD[2] + 3], [HEAD[0] + 13, HEAD[1] + 3, HEAD[2] + 2], 2.6, ink, 'brim')}
      {trails.map((pts, i) => (
        <Polyline key={`t${i}`} points={pts} fill="none" stroke={c.textMuted} strokeWidth={1.6} strokeDasharray="3 3" />
      ))}
      {front.map((x) => arm(x.l, x.key))}
    </Svg>
  );
}
