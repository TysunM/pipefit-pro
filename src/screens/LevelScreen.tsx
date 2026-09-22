// A level, in the pocket you already carry
// ----------------------------------------
// The sighting sheet inside the spool builder came first and it was put in the
// wrong place: four taps deep, inside a leg, behind the aim pad. A level is
// not something you reach for while building a spool. It is something you
// reach for twenty times a shift — is that run falling the right way, is that
// riser plumb, what is the fall on that line somebody else hung.
//
// So it is a tool on the front page like the other thirteen, and it works with
// no spool open at all. The sheet inside the builder stays, because sending a
// reading straight into a leg is worth the two extra taps when a spool is
// already up.
//
// The figure is slope, off gravity. Not bearing: the compass is bent by every
// rack and every beam on a job and this screen would be lying half the time it
// was used. Bearing belongs where it can be qualified, which is the sighting
// sheet, next to the field strength that earned it.
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { DeviceMotion } from 'expo-sensors';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { FooterNote } from '../components/Results';
import { ControlRow, GhostButton } from '../components/Buttons';
import { useTheme } from '../theme/ThemeProvider';
import { Hold, Orientation, inchesPerFoot, levelWord, sightDir } from '../calc/sight';

const RATE_MS = 60;

const tidy = (n: number) => (Math.abs(n) < 0.05 ? '0.0' : n.toFixed(1));

export function LevelScreen() {
  const t = useTheme();
  const [hold, setHold] = useState<Hold>('edge');
  const [slope, setSlope] = useState<number | null>(null);
  const [held, setHeld] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const holdRef = useRef(hold);
  holdRef.current = hold;
  // Only buzz when it crosses into level, not on every frame it sits there.
  const wasExact = useRef(false);

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let dead = false;
    (async () => {
      const ok = await DeviceMotion.isAvailableAsync().catch(() => false);
      if (dead) return;
      if (ok) {
        try {
          DeviceMotion.setUpdateInterval(RATE_MS);
          sub = DeviceMotion.addListener((m) => {
            const r = m.rotation;
            if (!r) return;
            const o: Orientation = { alpha: r.alpha, beta: r.beta, gamma: r.gamma };
            const s = sightDir(o, holdRef.current).slope;
            setSlope(s);
            const exact = levelWord(s).exact;
            if (exact && !wasExact.current) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            wasExact.current = exact;
          });
        } catch {
          sub = null;
        }
      }
      if (dead) return;
      if (!sub) setUnavailable(true);
    })();
    return () => {
      dead = true;
      sub?.remove();
    };
  }, []);

  const shown = held ?? slope;
  const word = shown === null ? null : levelWord(shown);

  return (
    <Screen>
      <HintRow text="Lay the phone on the pipe. The figure is read off gravity, so it holds in the dark, on galvanised, and with a rack of steel beside you." />

      {unavailable ? (
        <FooterNote text="The motion sensors are not reachable on this device, so it cannot be used as a level." />
      ) : (
        <>
          <View
            style={{
              marginHorizontal: t.layout.screenPadding,
              marginBottom: t.space.lg,
              paddingVertical: t.space.xl,
              borderRadius: t.radius.lg,
              borderWidth: 2,
              borderColor: word?.exact ? t.colors.data : t.colors.border,
              backgroundColor: word?.exact ? t.colors.dataSoft : t.colors.bgSunken,
              alignItems: 'center',
              gap: t.space.xs,
            }}
          >
            <Text style={[t.type.label, { color: t.colors.textMuted }]}>
              {held !== null ? 'HELD' : 'SLOPE OFF LEVEL'}
            </Text>
            <Text style={[t.type.display, { color: word?.exact ? t.colors.data : t.colors.text }]}>
              {shown === null ? '—' : `${tidy(shown)}°`}
            </Text>
            <Text style={[t.type.bodyStrong, { color: word?.exact ? t.colors.data : t.colors.textMuted }]}>
              {word?.word ?? 'Reading…'}
            </Text>
            {shown !== null && Math.abs(shown) < 85 ? (
              <Text style={[t.type.caption, { color: t.colors.textFaint }]}>
                {`${inchesPerFoot(shown) >= 0 ? '' : '−'}${Math.abs(inchesPerFoot(shown)).toFixed(2)} inch per foot of run`}
              </Text>
            ) : null}
          </View>

          <ControlRow>
            <GhostButton
              label={hold === 'edge' ? 'Lay on pipe' : 'Sight along'}
              icon={hold === 'edge' ? 'phone-landscape-outline' : 'camera-outline'}
              onPress={() => setHold((h) => (h === 'edge' ? 'sight' : 'edge'))}
              style={{ flex: 1 }}
            />
            <GhostButton
              label={held !== null ? 'Release' : 'Hold reading'}
              icon={held !== null ? 'play-outline' : 'pause-outline'}
              onPress={() => {
                setHeld((h) => (h !== null ? null : slope));
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={{ flex: 1 }}
            />
          </ControlRow>

          <HintRow
            text={
              held !== null
                ? 'Held, so it can be read after the phone comes off the pipe overhead.'
                : 'Hold the reading before you take the phone down from somewhere you cannot see it.'
            }
          />
        </>
      )}

      <FooterNote text="Slope only. A compass is bent by every rack and beam on a job, so a bearing is offered where it can be qualified — inside a spool leg, beside the field strength that earned it." />
    </Screen>
  );
}
