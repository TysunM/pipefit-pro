import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { clock, currentProfile, type Segment } from '../../calc/orbitalProgram';
import type { ProgramBody } from '../../state/orbitalBook';
import { levelInk } from './WeldClock';

// The program as the power supply runs it: current up the side, time along
// the bottom, gas on to gas off. The purges are the gas alone; the slopes
// ramp; each level is its band from background to peak, pulsing where the
// pulses are few enough to see, with its average drawn through it. Tap a
// level to work on it.

const H = 168;
const PAD = { l: 34, r: 8, t: 16, b: 24 };

export function CurrentProfile({ program, selected = null, onSelect }: { program: ProgramBody; selected?: number | null; onSelect?: (level: number) => void }) {
  const t = useTheme();
  const c = t.colors;
  const [w, setW] = useState(0);
  const segs = currentProfile(program);
  const end = segs.length ? segs[segs.length - 1]!.t1 : 0;
  const top = Math.max(10, ...program.levels.map((l) => l.ip)) * 1.12;
  const plotW = Math.max(1, w - PAD.l - PAD.r);
  const plotH = H - PAD.t - PAD.b;
  const x = (s: number) => PAD.l + (end > 0 ? (s / end) * plotW : 0);
  const y = (a: number) => PAD.t + plotH - (a / top) * plotH;
  const ticks = [0, top / 2 / 1.12, top / 1.12].map((a) => Math.round(a));

  const draw = (s: Segment, i: number) => {
    if (s.kind === 'prepurge' || s.kind === 'postpurge') {
      return (
        <G key={i}>
          <Rect x={x(s.t0)} y={y(top * 0.08)} width={Math.max(1, x(s.t1) - x(s.t0))} height={y(0) - y(top * 0.08)} fill={c.dataSoft} />
          {x(s.t1) - x(s.t0) > 30 ? (
            <SvgText x={(x(s.t0) + x(s.t1)) / 2} y={y(top * 0.08) - 4} fill={c.textFaint} fontSize={10} fontFamily={t.font.sansMedium} textAnchor="middle">
              gas
            </SvgText>
          ) : null}
        </G>
      );
    }
    if (s.kind === 'upslope' || s.kind === 'downslope') return <Line key={i} x1={x(s.t0)} y1={y(s.from)} x2={x(s.t1)} y2={y(s.to)} stroke={c.text} strokeWidth={1.6} />;
    if (s.kind === 'delay') return <Line key={i} x1={x(s.t0)} y1={y(s.amps)} x2={x(s.t1)} y2={y(s.amps)} stroke={c.textMuted} strokeWidth={1.6} strokeDasharray="4 3" />;
    if (s.kind !== 'level') return null;
    const ink = levelInk(t, s.level);
    const on = selected === s.level;
    const x0 = x(s.t0);
    const x1 = x(s.t1);
    const press = onSelect ? () => onSelect(s.level) : undefined;
    const l = program.levels[s.level]!;
    const period = l.tp + l.tb;
    const pulses = s.pulsed && period > 0 ? (s.t1 - s.t0) / period : 0;
    let teeth = '';
    // Drawn pulse by pulse only where each gets room to be seen; packed tighter, the band says it.
    if (s.pulsed && pulses > 0 && (x1 - x0) / pulses >= 6) {
      // Square pulses, peak then background, as the supply runs them.
      let tt = s.t0;
      teeth = `M ${x(tt)} ${y(s.ib)}`;
      while (tt < s.t1 - 1e-9) {
        const pk = Math.min(tt + l.tp, s.t1);
        const bg = Math.min(pk + l.tb, s.t1);
        teeth += ` L ${x(tt)} ${y(s.ip)} L ${x(pk)} ${y(s.ip)} L ${x(pk)} ${y(s.ib)} L ${x(bg)} ${y(s.ib)}`;
        tt = bg;
      }
    }
    return (
      <G key={i} onPress={press}>
        <Rect x={x0} y={PAD.t} width={Math.max(1, x1 - x0)} height={plotH} fill={on ? c.accentSoft : 'transparent'} onPress={press} />
        {s.pulsed ? <Rect x={x0} y={y(s.ip)} width={Math.max(1, x1 - x0)} height={Math.max(1, y(s.ib) - y(s.ip))} fill={ink} fillOpacity={0.16} /> : null}
        {teeth ? <Path d={teeth} stroke={ink} strokeWidth={1} fill="none" strokeOpacity={0.7} /> : null}
        <Line x1={x0} y1={y(s.avg)} x2={x1} y2={y(s.avg)} stroke={ink} strokeWidth={on ? 3 : 2.2} />
        <SvgText x={(x0 + x1) / 2} y={PAD.t + 10} fill={on ? c.text : c.textMuted} fontSize={on ? 12 : 10.5} fontWeight={on ? '700' : '600'} fontFamily={t.font.sansMedium} textAnchor="middle">
          {`L${s.level + 1}`}
        </SvgText>
      </G>
    );
  };

  return (
    <View
      onLayout={(e) => setW(Math.floor(e.nativeEvent.layout.width))}
      style={{ marginHorizontal: t.layout.screenPadding, height: H }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Current against time: ${program.levels.length} levels, ${clock(end)} gas on to gas off`}
    >
      {w > 0 ? (
        <Svg width={w} height={H}>
          {ticks.map((a) => (
            <G key={a}>
              <Line x1={PAD.l} y1={y(a)} x2={w - PAD.r} y2={y(a)} stroke={c.border} strokeWidth={a === 0 ? 1.2 : 0.6} />
              <SvgText x={PAD.l - 5} y={y(a) + 4} fill={c.textFaint} fontSize={10} fontFamily={t.font.sansMedium} textAnchor="end">
                {`${a}`}
              </SvgText>
            </G>
          ))}
          <SvgText x={4} y={PAD.t - 4} fill={c.textFaint} fontSize={10} fontFamily={t.font.sansMedium}>
            A
          </SvgText>
          {segs.map(draw)}
          <SvgText x={PAD.l} y={H - 6} fill={c.textFaint} fontSize={10} fontFamily={t.font.sansMedium}>
            0
          </SvgText>
          <SvgText x={w - PAD.r} y={H - 6} fill={c.textFaint} fontSize={10} fontFamily={t.font.sansMedium} textAnchor="end">
            {clock(end)}
          </SvgText>
        </Svg>
      ) : null}
    </View>
  );
}
