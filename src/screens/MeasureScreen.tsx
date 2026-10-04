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
import { Linking, Pressable, Share, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { FooterNote } from '../components/Results';
import { Banner } from '../components/FormFields';
import { ArCapture } from '../components/ArCapture';
import { useTheme } from '../theme/ThemeProvider';
import { useUnits } from '../hooks/useUnits';
import { M_TO_IN, V3, slopeBand, trace } from '../calc/spatial';
import { useLaser } from '../state/laser';
import { clockLabel } from '../calc/days';
import { WEB_APP_URL } from '../ai/apiBase';

type Props = NativeStackScreenProps<RootStackParamList, 'Measure'>;

export function MeasureScreen({ navigation }: Props) {
  const t = useTheme();
  const u = useUnits();
  const [points, setPoints] = useState<V3[]>([]);
  const laser = useLaser();
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
      `${Math.abs(l.slope).toFixed(1)}° ±${slopeBand(l.run).toFixed(1)}° ${l.slope >= 0 ? 'up' : 'down'}`,
    ].join(' · '),
  );
  const share = () =>
    void Share.share({ message: ['AR measure (planning figures, ±1–2 cm)', ...lines, `Total ${len(r.total)}`].join('\n') }).catch(() => undefined);

  return (
    <Screen>
      <HintRow text="A laser meter for figures you cut from, and the camera for tracing a route before the tape comes out. Connect the meter once and every length field in the app offers its last reading." />

      <SectionHeader title="Laser meter" meta={laser.status === 'on' ? laser.name.toUpperCase() : laser.status === 'connecting' ? 'CONNECTING' : undefined} />
      <View style={{ paddingHorizontal: t.layout.screenPadding, gap: t.space.md, marginBottom: t.space.lg }}>
        {laser.note ? <Banner tone="warn" icon="information-circle-outline" text={laser.note} action="OK" onAction={laser.clearNote} /> : null}
        {!laser.supported ? (
          <>
            <Text style={[t.type.body, { color: t.colors.textMuted }]}>
              A Leica DISTO or a Bosch GLM connects in Chrome, not in the installed app. This opens the web app in Chrome on this screen.
            </Text>
            <AccentButton label="Open in Chrome" icon="open-outline" onPress={() => void Linking.openURL(`${WEB_APP_URL}/#measure`)} />
          </>
        ) : laser.status === 'on' ? (
          <>
            <Text style={[t.type.body, { color: t.colors.text }]}>
              {laser.readings.length
                ? 'Take a reading on the meter. Any length field on any screen shows it as a blue chip; tap the chip to fill the field.'
                : `Connected to ${laser.name}. Press the measure button on the meter.`}
            </Text>
            {laser.readings.map((r, i) => (
              <View key={r.at} style={{ flexDirection: 'row', alignItems: 'baseline', gap: t.space.md }}>
                <Text style={[i ? t.type.body : t.type.displaySmall, { color: i ? t.colors.textMuted : t.colors.data }]}>{len(r.metres * M_TO_IN)}</Text>
                <Text style={[t.type.caption, { color: t.colors.textFaint }]}>
                  {[clockLabel(r.at), r.tilt !== null ? `${r.tilt.toFixed(1)}° tilt` : ''].filter(Boolean).join(' · ')}
                </Text>
              </View>
            ))}
            {laser.raw ? (
              <Text style={[t.type.caption, { color: t.colors.warnText }]} selectable>
                {`A frame the app could not read: ${laser.raw}. Screenshot this if readings are not showing.`}
              </Text>
            ) : null}
            <GhostButton label="Disconnect" icon="close-outline" onPress={laser.disconnect} />
          </>
        ) : (
          <>
            <Text style={[t.type.body, { color: t.colors.textMuted }]}>
              Turn the meter on with its Bluetooth on, then connect. Leica DISTO (D1, D2, D110, D510, X-series) and Bosch GLM (50 C, 100-25 C, 120 C).
            </Text>
            <AccentButton label={laser.status === 'connecting' ? 'Connecting…' : 'Connect a laser meter'} icon="bluetooth-outline" onPress={() => void laser.connect()} />
          </>
        )}
      </View>

      <SectionHeader title="AR tracing" meta={points.length ? `${points.length} POINTS` : undefined} />
      <View style={{ paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.lg }}>
        <ArCapture onDone={(p) => setPoints(p)} format={len} />
      </View>
      <View style={{ paddingHorizontal: t.layout.screenPadding, gap: 4, marginBottom: t.space.md }}>
        {[
          'Mark the same face of the pipe every time: all on top, or all on the side. Top to top is centre to centre.',
          'Stand within two or three metres and move the phone slowly before you mark. Bare steel and white walls track worst; tape or chalk on the pipe helps.',
          'Mark a point on the run first, then where it ends, then the next point: the turn is worked against the run before it.',
          'Hold the phone still on each point as you tap Mark. For fall, lay the phone on the pipe in the Level tool: it reads a tenth of a degree, the camera only a degree or so over a short leg.',
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
                {`Run ${len(l.run)} · ${l.rise >= 0 ? 'Rise' : 'Drop'} ${len(l.rise)} · ${Math.abs(l.slope).toFixed(1)}° ±${slopeBand(l.run).toFixed(1)}° ${l.slope >= 0 ? 'up' : 'down'}`}
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
