import React from 'react';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import type { Band } from '../calc/sling';

// The pick, seen square on to the line between the two picks: the spool as it
// hangs, the hook straight over its centre of gravity, each sling from its pick
// up to the hook coloured by its angle (green, amber, red) with its tension,
// and the centre of gravity marked. Up is up.

export type RigPoint = { s: number; y: number };
export type RigDrawLeg = { at: RigPoint; band: Band; label: string; angle: string };

const H = 250;
const PAD = 26;

export function RigDiagram({ width, pipe, legs, hook, cg, od }: { width: number; pipe: RigPoint[][]; legs: RigDrawLeg[]; hook: RigPoint; cg: RigPoint; od: number }) {
  const t = useTheme();
  const c = t.colors;
  const ink = (b: Band) => (b === 'danger' ? c.danger : b === 'caution' ? c.warnText : b === 'fair' ? c.text : c.success);
  const all = [...pipe.flat(), ...legs.map((l) => l.at), hook, cg];
  const minS = Math.min(...all.map((p) => p.s));
  const maxS = Math.max(...all.map((p) => p.s));
  const minY = Math.min(...all.map((p) => p.y));
  const maxY = Math.max(...all.map((p) => p.y)) + 14;
  const k = Math.min((width - 2 * PAD) / Math.max(1, maxS - minS), (H - 2 * PAD) / Math.max(1, maxY - minY));
  const x = (s: number) => PAD + (s - minS) * k + (width - 2 * PAD - (maxS - minS) * k) / 2;
  const y = (v: number) => H - PAD - (v - minY) * k - (H - 2 * PAD - (maxY - minY) * k) / 2;
  const pipeW = Math.max(5, Math.min(18, od * k));
  const hx = x(hook.s);
  const hy = y(hook.y);
  return (
    <Svg width={width} height={H} accessibilityLabel="The pick, side on: the spool, the slings to the hook, and the centre of gravity">
      {/* The spool, as it hangs. */}
      {pipe.map((run, i) => (
        <Path key={`p${i}`} d={run.map((p, j) => `${j ? 'L' : 'M'}${x(p.s).toFixed(1)} ${y(p.y).toFixed(1)}`).join('')} stroke={c.textFaint} strokeWidth={pipeW} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      ))}
      {pipe.map((run, i) => (
        <Path key={`q${i}`} d={run.map((p, j) => `${j ? 'L' : 'M'}${x(p.s).toFixed(1)} ${y(p.y).toFixed(1)}`).join('')} stroke={c.bgRaised} strokeWidth={Math.max(1.5, pipeW * 0.35)} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.5} />
      ))}
      {/* The slings, and what each pulls. */}
      {legs.map((l, i) => {
        const lx = x(l.at.s);
        const ly = y(l.at.y);
        const mx = (lx + hx) / 2;
        const my = (ly + hy) / 2;
        const left = lx < hx;
        return (
          <G key={`l${i}`}>
            <Line x1={lx} y1={ly} x2={hx} y2={hy} stroke={ink(l.band)} strokeWidth={3.2} strokeLinecap="round" />
            <Circle cx={lx} cy={ly} r={5} fill={ink(l.band)} stroke={c.bg} strokeWidth={1.5} />
            <SvgText x={mx + (left ? -8 : 8)} y={my} fill={ink(l.band)} fontSize={12} fontWeight="700" textAnchor={left ? 'end' : 'start'}>
              {l.label}
            </SvgText>
            <SvgText x={lx + (left ? -4 : 4)} y={ly + 20} fill={c.textMuted} fontSize={11} textAnchor={left ? 'end' : 'start'}>
              {l.angle}
            </SvgText>
          </G>
        );
      })}
      {/* The hook, straight over the centre of gravity. */}
      <Line x1={hx} y1={hy} x2={hx} y2={hy - 14} stroke={c.text} strokeWidth={2.4} />
      <Path d={`M${hx} ${hy - 2} a5 5 0 1 1 -5 5`} stroke={c.text} strokeWidth={2.4} fill="none" />
      <Line x1={hx} y1={hy} x2={x(cg.s)} y2={y(cg.y)} stroke={c.textFaint} strokeWidth={1} strokeDasharray="3 4" />
      {/* The centre of gravity: a quartered circle. */}
      <G>
        <Circle cx={x(cg.s)} cy={y(cg.y)} r={8} fill={c.bg} stroke={c.glow} strokeWidth={2} />
        <Path d={`M${x(cg.s)} ${y(cg.y) - 8} A8 8 0 0 1 ${x(cg.s) + 8} ${y(cg.y)} L${x(cg.s)} ${y(cg.y)} Z M${x(cg.s)} ${y(cg.y) + 8} A8 8 0 0 1 ${x(cg.s) - 8} ${y(cg.y)} L${x(cg.s)} ${y(cg.y)} Z`} fill={c.glow} />
        <SvgText x={x(cg.s) + 12} y={y(cg.y) + 4} fill={c.glow} fontSize={11} fontWeight="700">
          CG
        </SvgText>
      </G>
    </Svg>
  );
}
