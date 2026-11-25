import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { useTheme, type Theme } from '../../theme/ThemeProvider';
import { clock, clockArcs, levelAverage, programTimes } from '../../calc/orbitalProgram';
import type { ProgramBody } from '../../state/orbitalBook';

// A program as the tube sees it: the cross-section in the middle, and each
// level an arc round it from the start at the top, clockwise, the way the
// head travels. The overlap, past 360, runs on round an outer ring. The
// deeper an arc's colour, the more current that level puts in. Tap a level
// to work on it.

/** The colours the levels are told apart by, in turn. */
export function levelInk(t: Theme, i: number): string {
  const c = t.colors;
  const ring = [c.accent, c.data, c.success, c.warnText, c.danger, c.primary];
  return ring[i % ring.length]!;
}

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
};

/** An arc from one bearing to another, clockwise from the top; a whole turn is drawn as two halves. */
function arcPath(cx: number, cy: number, r: number, from: number, to: number): string {
  const span = Math.min(to - from, 359.99);
  if (span <= 0) return '';
  const end = from + span;
  const a = polar(cx, cy, r, from);
  const b = polar(cx, cy, r, end);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${span > 180 ? 1 : 0} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

export function WeldClock({ program, size = 260, selected = null, onSelect, compact = false }: { program: ProgramBody; size?: number; selected?: number | null; onSelect?: (level: number) => void; compact?: boolean }) {
  const t = useTheme();
  const c = t.colors;
  const cx = size / 2;
  const cy = size / 2;
  const band = compact ? Math.max(3, size * 0.09) : size * 0.065;
  const r = size / 2 - band * (compact ? 1 : 2.6);
  const rOver = r + band * 1.35;
  const arcs = clockArcs(program);
  const avgs = program.levels.map(levelAverage);
  const hottest = Math.max(1, ...avgs.map((a) => a ?? 0));
  const times = programTimes(program);
  const od = program.od;
  const wall = program.wall;
  // The tube itself, to scale against the ring: the wall shown as it is to the OD.
  const tubeR = r - band * 1.6;
  const boreR = od && wall && od > 2 * wall ? tubeR * ((od - 2 * wall) / od) : tubeR * 0.82;

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }} accessible accessibilityRole="image" accessibilityLabel={`${program.levels.length} levels round the tube${times.weld !== null ? `, ${clock(times.weld)} round` : ''}`}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={c.bgSunken} strokeWidth={band} fill="none" />
        {!compact ? <Circle cx={cx} cy={cy} r={rOver} stroke={c.bgSubtle} strokeWidth={band * 0.55} fill="none" strokeDasharray="3 5" /> : null}
        {!compact ? (
          <>
            <Circle cx={cx} cy={cy} r={tubeR} fill={c.bgSunken} stroke={c.borderStrong} strokeWidth={1.2} />
            <Circle cx={cx} cy={cy} r={boreR} fill={c.bg} stroke={c.borderStrong} strokeWidth={1.2} />
          </>
        ) : null}
        {arcs.map((a) => {
          const ink = levelInk(t, a.level);
          const strength = 0.45 + 0.55 * ((avgs[a.level] ?? 0) / hottest);
          const on = selected === a.level;
          const w = on && !compact ? band * 1.25 : band;
          const main = arcPath(cx, cy, r, a.from, Math.min(a.to, 360));
          const over = a.to > 360 ? arcPath(cx, cy, rOver, Math.max(a.from, 360) - 360, a.to - 360) : '';
          const mid = polar(cx, cy, r + band * 1.6 + (on ? 2 : 0), Math.min((a.from + Math.min(a.to, 360)) / 2, 359));
          const press = onSelect ? () => onSelect(a.level) : undefined;
          return (
            <G key={a.level}>
              {main ? <Path d={main} stroke={ink} strokeOpacity={strength} strokeWidth={w} fill="none" strokeLinecap="butt" onPress={press} /> : null}
              {over ? <Path d={over} stroke={ink} strokeOpacity={strength} strokeWidth={band * 0.55} fill="none" onPress={press} /> : null}
              {!compact && a.from < 360 ? (
                <SvgText x={mid.x} y={mid.y + 4} fill={on ? c.text : c.textMuted} fontSize={on ? 13 : 11.5} fontWeight={on ? '700' : '600'} fontFamily={t.font.sansMedium} textAnchor="middle" onPress={press}>
                  {`L${a.level + 1}`}
                </SvgText>
              ) : null}
            </G>
          );
        })}
        {/* The start, at the top, and which way the head goes. */}
        {!compact ? (
          <>
            <Path d={`M ${cx - 6} ${cy - r - band * 1.1} L ${cx + 6} ${cy - r - band * 1.1} L ${cx} ${cy - r - band * 0.55} Z`} fill={c.text} />
            <Path d={arcPath(cx, cy, r - band * 1.05, 8, 34)} stroke={c.textFaint} strokeWidth={1.4} fill="none" />
            <Path d={(() => {
              const tip = polar(cx, cy, r - band * 1.05, 36);
              const l = polar(cx, cy, r - band * 1.05 - 4, 30);
              const rr = polar(cx, cy, r - band * 1.05 + 4, 30);
              return `M ${l.x} ${l.y} L ${tip.x} ${tip.y} L ${rr.x} ${rr.y}`;
            })()} stroke={c.textFaint} strokeWidth={1.4} fill="none" />
            <SvgText x={cx} y={cy - 6} fill={c.text} fontSize={size * 0.062} fontWeight="700" fontFamily={t.font.sansMedium} textAnchor="middle">
              {od !== null ? `${od.toFixed(3)}"` : 'OD —'}
            </SvgText>
            <SvgText x={cx} y={cy + size * 0.05} fill={c.textMuted} fontSize={size * 0.046} fontFamily={t.font.sansMedium} textAnchor="middle">
              {wall !== null ? `${wall.toFixed(3)} wall` : 'wall —'}
            </SvgText>
            <SvgText x={cx} y={cy + size * 0.11} fill={c.textMuted} fontSize={size * 0.046} fontFamily={t.font.sansMedium} textAnchor="middle">
              {times.weld !== null ? `${clock(times.weld)} round` : 'set the RPM'}
            </SvgText>
          </>
        ) : null}
      </Svg>
    </View>
  );
}
