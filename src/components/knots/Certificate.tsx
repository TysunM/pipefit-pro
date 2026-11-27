import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { ROPE_INK } from '../../calc/knots/rope';
import { FINE_PRINT, TIERS, clock, tierOf, type CertTotals } from '../../calc/knots/cert';
import { balanced } from './certArt';
import { useTheme } from '../../theme/ThemeProvider';

// The Knot Certified certificate: paper in a rope frame, a rubber stamp that
// reads KNOT CERTIFIED (or KNOT QUITE, or KNOT YET, the CERTIFIED struck
// through), the run's numbers, and fine print that says it certifies nothing.
// Paper and ink whatever the theme: it's a certificate.

const PAPER = '#f4ecd8';
const INK = '#2b2116';
const FADED = '#6b5a44';
const STAMP = '#b3261e';
const ROPE = ROPE_INK.a;

function Frame({ w, h }: { w: number; h: number }) {
  const inset = 10;
  // The turns sit on the rope's rounded corners, inside the card, not clipped by its edge.
  const c = inset + 6;
  const corners = [
    [c, c],
    [w - c, c],
    [c, h - c],
    [w - c, h - c],
  ] as const;
  return (
    <Svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      {/* The rope round the edge: its edge, its core, then the lay across it. */}
      <Rect x={inset} y={inset} width={w - 2 * inset} height={h - 2 * inset} rx={14} fill="none" stroke={ROPE.edge} strokeWidth={11} />
      <Rect x={inset} y={inset} width={w - 2 * inset} height={h - 2 * inset} rx={14} fill="none" stroke={ROPE.core} strokeWidth={7} />
      <Rect x={inset} y={inset} width={w - 2 * inset} height={h - 2 * inset} rx={14} fill="none" stroke={ROPE.lay} strokeWidth={7} strokeDasharray="2.5 5" />
      {/* A turn of rope at each corner. */}
      {corners.map(([x, y], i) => (
        <React.Fragment key={i}>
          <Circle cx={x} cy={y} r={7.5} fill={PAPER} stroke={ROPE.edge} strokeWidth={8.5} />
          <Circle cx={x} cy={y} r={7.5} fill="none" stroke={ROPE.core} strokeWidth={5} />
          <Circle cx={x} cy={y} r={7.5} fill="none" stroke={ROPE.lay} strokeWidth={5} strokeDasharray="2 4" />
        </React.Fragment>
      ))}
    </Svg>
  );
}

export function Certificate({ totals, at, width }: { totals: CertTotals; at: number; width: number }) {
  const t = useTheme();
  const tier = TIERS[tierOf(totals)];
  const [h, setH] = React.useState(0);
  // Each weight is its own family on Android: name the face, and ask for a weight only while the fonts load.
  const f = t.font;
  const w = t.weight;
  // The stamp's words on one line however narrow the phone: sized to the card.
  const stampSize = Math.max(17, Math.min(26, (width - 120) / 10.5));
  const date = new Date(at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const line = (label: string, value: string) => (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={[{ color: INK, fontSize: 18, fontFamily: f.sans }, w('800')]}>{value}</Text>
      <Text style={[{ color: FADED, fontSize: 10, fontFamily: f.sans, letterSpacing: 1 }, w('700')]}>{label}</Text>
    </View>
  );
  return (
    <View
      accessible
      accessibilityLabel={`Certificate: ${tier.title}. ${totals.tied} of ${totals.of} knots tied from memory in ${clock(totals.ms)}, ${totals.slips} off the line, ${totals.wrong} wrong calls. ${FINE_PRINT}`}
      onLayout={(e) => setH(e.nativeEvent.layout.height)}
      style={{ width, alignSelf: 'center', backgroundColor: PAPER, borderRadius: 18, paddingHorizontal: 30, paddingTop: 30, paddingBottom: 26, gap: 8, overflow: 'hidden' }}
    >
      {h ? <Frame w={width} h={h} /> : null}
      <Text style={[{ color: INK, fontFamily: f.serif, fontSize: 30, textAlign: 'center', marginTop: 6 }, w('700')]}>{balanced(tier.title, 30, 'serif', width - 60)}</Text>

      {/* The stamp, slapped on at an angle: room above and below for the corners it swings out. */}
      <View style={{ alignItems: 'center', marginVertical: 20 }}>
        <View style={{ transform: [{ rotate: '-9deg' }], borderWidth: 3, borderColor: STAMP, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, alignItems: 'center', opacity: 0.88 }}>
          <View style={{ borderWidth: 1.5, borderColor: STAMP, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 4, alignItems: 'center' }}>
            <Text numberOfLines={1} style={[{ color: STAMP, fontSize: stampSize, fontFamily: f.sans, letterSpacing: 3 }, w('900')]}>{tier.stamp}</Text>
            {tier.struck ? (
              <Text style={[{ color: STAMP, fontSize: 16, fontFamily: f.sans, letterSpacing: 4, textDecorationLine: 'line-through' }, w('900')]}>{tier.struck}</Text>
            ) : (
              <Text style={[{ color: STAMP, fontSize: 14, fontFamily: f.sans, letterSpacing: 6 }, w('900')]}>{tierOf(totals) === 'grand' ? '★ ★ ★' : '★ ★'}</Text>
            )}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginTop: 6, paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#cdbf9f' }}>
        {line('TIME', clock(totals.ms))}
        {line('OFF THE LINE', String(totals.slips))}
        {line('WRONG CALLS', String(totals.wrong))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ color: FADED, fontFamily: f.sansRegular, fontSize: 11.5 }}>{date}</Text>
        <Text style={{ color: FADED, fontFamily: f.serifItalic, fontSize: 11.5, ...(t.fontsLoaded ? {} : { fontStyle: 'italic' as const }) }}>Witnessed by one very tired rope</Text>
      </View>
      <Text style={{ color: FADED, fontFamily: f.sansRegular, fontSize: 10.5, lineHeight: 14, textAlign: 'center', marginTop: 4 }}>{FINE_PRINT}</Text>
    </View>
  );
}
