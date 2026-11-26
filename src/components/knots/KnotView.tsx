import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import type { Knot } from '../../calc/knots/knots';
import { VIEW, draw, pointAt, type Laid, type Prop } from '../../calc/knots/rope';

// A knot drawn as far as it is tied: the rope, the pipe or post it is round,
// the path still to go as a dashed guide, and the working end marked where it
// is now. The drawing itself is rope.ts; this only puts it on the screen.

export type Tip = { rope: number; glow?: boolean; arrow?: boolean; /** Off the line: the ring goes red. */ warn?: boolean };
/** A part to pull to set the knot: where it is, the way to pull, and whether it is the one to grab. */
export type PullMark = { x: number; y: number; dx: number; dy: number; grab?: boolean; done?: boolean };

// Each drawing's own gradient id: on the web a url(#id) takes the first in the
// page, and the same knot drawn on a screen behind (hidden) would paint the pipe black.
let drawn = 0;

function PropArt({ prop, id }: { prop: Prop; id: string }) {
  if (prop.kind === 'pipe') {
    return (
      <>
        <Rect x={-6} y={prop.y - prop.r} width={VIEW + 12} height={2 * prop.r} fill={`url(#${id})`} stroke="#3e4650" strokeWidth={1.6} />
        <Rect x={-6} y={prop.y - prop.r * 0.62} width={VIEW + 12} height={prop.r * 0.28} fill="#ffffff" opacity={0.28} />
      </>
    );
  }
  return (
    <>
      <Rect x={prop.x - prop.r} y={-6} width={2 * prop.r} height={VIEW + 12} fill={`url(#${id}v)`} stroke="#3e4650" strokeWidth={1.6} />
      <Rect x={prop.x - prop.r * 0.62} y={-6} width={prop.r * 0.28} height={VIEW + 12} fill="#ffffff" opacity={0.28} />
    </>
  );
}

export function KnotView({
  knot,
  laid,
  shown,
  size,
  guide,
  tip,
  label,
  pulls,
  shift = 0,
  marks,
  frame,
  pullArrows = true,
}: {
  knot: Knot;
  laid: Laid;
  /** How far along each rope it is shown, in drawing units. */
  shown: readonly number[];
  size: number;
  /** The path still to go for this step: from, to, along one rope. */
  guide?: { rope: number; from: number; to: number } | null;
  tip?: Tip | null;
  label?: string;
  /** The parts to pull to set it, with arrows; `shift` moves the arrows along as it is pulled. */
  pulls?: readonly PullMark[] | null;
  shift?: number;
  /** Numbered rings on the places to check. */
  marks?: readonly { n: number | string; x: number; y: number }[] | null;
  /** Part of the drawing to fill the view with, zoomed in (drawing units, square). */
  frame?: { x: number; y: number; s: number } | null;
  /** The arrows on the parts to pull; from memory, only the rings to grab. */
  pullArrows?: boolean;
}) {
  const t = useTheme();
  const parts = useMemo(() => draw(knot.ropes, knot.props, laid, shown), [knot, laid, shown]);
  const scale = size / VIEW;
  // The path still to go, broken where it runs behind the pipe: the guide shows only what you would see.
  const guidePath = useMemo(() => {
    if (!guide || guide.to - guide.from < 2) return null;
    const s = laid.samples[guide.rope]!;
    const lv = laid.level[guide.rope]!;
    let d = '';
    let pen = false;
    s.forEach((p, k) => {
      if (p.len < guide.from - 0.5 || p.len > guide.to + 0.5 || lv[k]! < 0) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${Math.round(p.x * 10) / 10} ${Math.round(p.y * 10) / 10}`;
      pen = true;
    });
    return d || null;
  }, [guide, laid]);
  const end = tip ? pointAt(laid.samples[tip.rope]!, shown[tip.rope] ?? 0) : null;
  const gid = useRef(`steel-${knot.id}-${(drawn += 1)}`).current;

  // The glow on the end to drag: a ring that breathes, so it is found at a glance.
  const pulse = useRef(new Animated.Value(0)).current;
  const glowing = !!tip?.glow || !!pulls?.some((p) => p.grab && !p.done);
  useEffect(() => {
    if (!glowing) return;
    const loop = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }), Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [glowing, pulse]);
  const ring = 22 * scale + 10;

  return (
    <View style={{ width: size, height: size, borderRadius: t.radius.lg, overflow: 'hidden', backgroundColor: t.colors.bgSunken }} accessible accessibilityRole="image" accessibilityLabel={label ?? knot.name}>
      <Svg width={size} height={size} viewBox={frame ? `${frame.x} ${frame.y} ${frame.s} ${frame.s}` : `0 0 ${VIEW} ${VIEW}`}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#59636e" />
            <Stop offset="0.35" stopColor="#c3cbd4" />
            <Stop offset="0.7" stopColor="#8b97a4" />
            <Stop offset="1" stopColor="#4a535d" />
          </LinearGradient>
          <LinearGradient id={`${gid}v`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#59636e" />
            <Stop offset="0.35" stopColor="#c3cbd4" />
            <Stop offset="0.7" stopColor="#8b97a4" />
            <Stop offset="1" stopColor="#4a535d" />
          </LinearGradient>
        </Defs>
        {parts.map((p, i) =>
          p.kind === 'prop' ? (
            <PropArt key={i} prop={p.prop} id={gid} />
          ) : (
            <Path
              key={i}
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth={p.width}
              strokeLinecap={p.cap}
              strokeLinejoin="round"
              strokeDasharray={p.dash}
              strokeDashoffset={p.dashOffset}
              opacity={p.opacity}
            />
          ),
        )}
        {guidePath ? <Path d={guidePath} fill="none" stroke={t.colors.glow} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 9" opacity={0.9} /> : null}
        {(pullArrows ? (pulls ?? []) : []).map((p, i) => {
          // An arrow out from the part to pull, the way to pull it.
          const o = 14 + shift;
          const x0 = p.x + p.dx * o;
          const y0 = p.y + p.dy * o;
          const x1 = x0 + p.dx * 26;
          const y1 = y0 + p.dy * 26;
          const col = p.done ? t.colors.success : t.colors.glow;
          return (
            <React.Fragment key={`pull${i}`}>
              <Path d={`M${x0} ${y0}L${x1} ${y1}`} stroke="#1a1208" strokeWidth={8} strokeLinecap="round" />
              <Path d={`M${x0} ${y0}L${x1} ${y1}`} stroke={col} strokeWidth={5} strokeLinecap="round" />
              <Path d={`M${x1 + p.dx * 12} ${y1 + p.dy * 12}L${x1 - p.dy * 9} ${y1 + p.dx * 9}L${x1 + p.dy * 9} ${y1 - p.dx * 9}Z`} fill={col} stroke="#1a1208" strokeWidth={1.4} />
            </React.Fragment>
          );
        })}
        {(marks ?? []).map((m, i) => {
          // A ring round the place, its number on a badge pushed in from the drawing's edge.
          const bx = Math.max(12, Math.min(VIEW - 12, m.x + 17));
          const by = Math.max(12, Math.min(VIEW - 12, m.y - 17));
          return (
            <React.Fragment key={`mark${i}`}>
              <Circle cx={m.x} cy={m.y} r={19} fill="none" stroke="#1a1208" strokeWidth={5} opacity={0.6} />
              <Circle cx={m.x} cy={m.y} r={19} fill="none" stroke={t.colors.glow} strokeWidth={2.6} strokeDasharray="5 4" />
              <Circle cx={bx} cy={by} r={10} fill={t.colors.glow} stroke="#1a1208" strokeWidth={1.6} />
              <SvgText x={bx} y={by + 4.2} fill="#1a1208" fontSize={12} fontWeight="800" textAnchor="middle">
                {String(m.n)}
              </SvgText>
            </React.Fragment>
          );
        })}
        {end && tip?.arrow ? (
          <Path
            d={`M${end.x + end.dx * 22} ${end.y + end.dy * 22}L${end.x + end.dx * 11 - end.dy * 7} ${end.y + end.dy * 11 + end.dx * 7}L${end.x + end.dx * 11 + end.dy * 7} ${end.y + end.dy * 11 - end.dx * 7}Z`}
            fill={t.colors.glow}
            stroke="#1a1208"
            strokeWidth={1.2}
          />
        ) : null}
      </Svg>
      {(pulls ?? [])
        .filter((p) => p.grab && !p.done)
        .map((p, i) => (
          <Animated.View
            key={`grab${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: p.x * scale - ring / 2,
              top: p.y * scale - ring / 2,
              width: ring,
              height: ring,
              borderRadius: ring / 2,
              borderWidth: 3,
              borderColor: t.colors.glow,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 0.35] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.25] }) }],
            }}
          />
        ))}
      {end && tip?.glow ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: end.x * scale - ring / 2,
            top: end.y * scale - ring / 2,
            width: ring,
            height: ring,
            borderRadius: ring / 2,
            borderWidth: tip.warn ? 4 : 3,
            borderColor: tip.warn ? t.colors.danger : t.colors.glow,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 0.35] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.25] }) }],
          }}
        />
      ) : null}
    </View>
  );
}
