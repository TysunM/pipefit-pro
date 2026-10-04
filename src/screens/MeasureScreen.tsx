// AR measure
// ----------
// Trace a route with the phone's camera before the tape comes out: mark the
// points, and each leg comes back as a length, a run, a rise and a slope, and
// each turn as the advance, roll and rise of an offset — ready to work in the
// rolling offset screen.
//
// It is a planning figure, not a cut figure. Phone AR is good to a centimetre
// or two on a textured surface at arm's length and worse on bare steel or
// across a room, and the screen says so every time it shows a number.

import React, { useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { ControlRow, GhostButton } from '../components/Buttons';
import { FooterNote } from '../components/Results';
import { Banner } from '../components/FormFields';
import { ArCapture } from '../components/ArCapture';
import { useTheme } from '../theme/ThemeProvider';
import { useUnits } from '../hooks/useUnits';
import { V3, trace } from '../calc/spatial';

type Props = NativeStackScreenProps<RootStackParamList, 'Measure'>;

export function MeasureScreen({ navigation }: Props) {
  const t = useTheme();
  const u = useUnits();
  const [points, setPoints] = useState<V3[]>([]);
  const r = trace(points);
  // One way to write a length everywhere on the screen and in the camera: 64 1/4" or 1632.0 mm.
  const len = (inches: number) => {
    const x = Math.abs(inches);
    return u.system === 'imperial' ? u.frac(x) || `${u.num(x)}"` : `${u.num(x)} mm`;
  };

  const lines = r.legs.map((l, i) =>
    [
      `${i + 1} → ${i + 2}: ${len(l.length)}`,
      `run ${len(l.run)}, ${l.rise >= 0 ? 'rise' : 'drop'} ${len(l.rise)}`,
      `${Math.abs(l.slope).toFixed(1)}° ${l.slope >= 0 ? 'up' : 'down'}`,
    ].join(' · '),
  );
  const share = () =>
    void Share.share({ message: ['AR measure (planning figures, ±1–2 cm)', ...lines, `Total ${len(r.total)}`].join('\n') }).catch(() => undefined);

  return (
    <Screen>
      <HintRow text="Mark points along the route with the camera. Each leg comes back as length, run, rise and slope; each turn as an offset you can work in Rolling offset. Plan with it, then tape it before you cut." />

      <SectionHeader title="Measure" meta={points.length ? `${points.length} POINTS` : undefined} />
      <View style={{ paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.lg }}>
        <ArCapture onDone={(p) => setPoints(p)} format={len} />
      </View>
      <View style={{ paddingHorizontal: t.layout.screenPadding, gap: 4, marginBottom: t.space.md }}>
        {[
          'Mark the same face of the pipe every time: all on top, or all on the side. Top to top is centre to centre.',
          'Stand within two or three metres and move the phone slowly before you mark. Bare steel and white walls track worst; tape or chalk on the pipe helps.',
          'Mark a point on the run first, then where it ends, then the next point: the turn is worked against the run before it.',
        ].map((s) => (
          <View key={s} style={{ flexDirection: 'row', gap: t.space.sm }}>
            <Text style={[t.type.caption, { color: t.colors.textMuted }]}>•</Text>
            <Text style={[t.type.caption, { color: t.colors.textMuted, flex: 1 }]}>{s}</Text>
          </View>
        ))}
      </View>

      {r.legs.length ? (
        <>
          <SectionHeader title="Legs" meta={`TOTAL ${len(r.total)}`} />
          {r.legs.map((l, i) => (
            <View key={i} style={{ paddingHorizontal: t.layout.screenPadding, paddingVertical: t.space.md, borderTopWidth: t.hairline, borderTopColor: t.colors.border, gap: 2 }}>
              <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>{`${i + 1} → ${i + 2}   ${len(l.length)}`}</Text>
              <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
                {`Run ${len(l.run)} · ${l.rise >= 0 ? 'Rise' : 'Drop'} ${len(l.rise)} · ${Math.abs(l.slope).toFixed(1)}° ${l.slope >= 0 ? 'up' : 'down'}`}
                {l.fallPerFt !== null && Math.abs(l.slope) < 10 ? ` · ${Math.abs(l.fallPerFt).toFixed(2)}"/ft ${l.fallPerFt >= 0 ? 'fall' : 'rise'}` : ''}
              </Text>
              {i > 0 && r.offsets[i - 1] ? (
                (() => {
                  const o = r.offsets[i - 1]!;
                  return (
                    <Pressable
                      onPress={() => navigation.navigate('RollingOffset', { rise: Math.abs(o.rise), roll: Math.abs(o.roll), run: Math.abs(o.advance) })}
                      accessibilityRole="button"
                      accessibilityLabel={`Work this offset in Rolling offset`}
                      style={({ pressed }) => ({
                        marginTop: t.space.sm,
                        padding: t.space.md,
                        borderRadius: t.radius.md,
                        borderWidth: 1,
                        borderColor: t.colors.border,
                        backgroundColor: pressed ? t.colors.bgSubtle : t.colors.bgRaised,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: t.space.md,
                      })}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[t.type.captionStrong, { color: t.colors.text }]}>{`Offset from leg ${i}: true offset ${len(o.trueOffset)}`}</Text>
                        <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
                          {`${o.rise >= 0 ? 'Rise' : 'Drop'} ${len(o.rise)} · roll ${len(o.roll)} ${o.roll >= 0 ? 'right' : 'left'} · advance ${len(o.advance)}`}
                        </Text>
                      </View>
                      <Ionicons name="arrow-forward" size={18} color={t.colors.accent} />
                    </Pressable>
                  );
                })()
              ) : null}
            </View>
          ))}
          <View style={{ height: t.space.lg }} />
          <ControlRow>
            <GhostButton label="Share the figures" icon="share-outline" style={{ flex: 1 }} onPress={share} />
            <GhostButton label="Clear" icon="trash-outline" style={{ flex: 1 }} onPress={() => setPoints([])} />
          </ControlRow>
        </>
      ) : points.length === 1 ? (
        <Banner tone="info" icon="information-circle-outline" text="One point marked. A measurement needs two." />
      ) : null}

      <FooterNote text="Phone AR is good to a centimetre or two on a textured surface at arm's length, and worse on bare steel, white walls or across a room. Use these figures to plan and order; tape the run before you cut." />
    </Screen>
  );
}
