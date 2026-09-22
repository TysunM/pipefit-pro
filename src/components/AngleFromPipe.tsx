// Reading a fitting angle off the iron
// ------------------------------------
// The angle field on these screens has always been a number you decided. Most
// of the time it is 45 because 45 is what is on the truck. But when you are
// tying into a line somebody else hung, the angle is not a decision — it is a
// fact about the pipe in front of you, and it is measurable.
//
// Two readings, because a fitting angle is not a slope. It is the difference
// between where the pipe comes from and where it goes, so it needs one on each
// side of the fitting. A level run makes the second reading the whole answer,
// which is the common case, so there is a button that says the run is level
// and skips straight to the one that matters.
//
// Both readings are slopes off gravity. Nothing here touches the compass, so
// nothing here is bent by the rack. The price of that is that both legs must
// lie in one vertical plane — which is the definition of the offset these
// screens solve, not a restriction added on top of it.
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DeviceMotion } from 'expo-sensors';
import { useTheme } from '../theme/ThemeProvider';
import { FITTING_ANGLES } from '../calc/pipe';
import {
  Orientation,
  STEADY_DEG,
  Steadiness,
  angleFromSlopes,
  levelWord,
  nearestFitting,
  sightDir,
  steadyDir,
} from '../calc/sight';

const BURST_MS = 1000;
const RATE_MS = 50;
const tidy = (n: number) => (Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1));

type Side = 'run' | 'travel';

export function AngleFromPipe({
  visible,
  onClose,
  onUse,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  onUse: (angleDeg: number) => void;
  /** What the angle is called on the screen that asked for it. */
  title: string;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const [live, setLive] = useState<number | null>(null);
  const [run, setRun] = useState<number | null>(null);
  const [travel, setTravel] = useState<number | null>(null);
  const [taking, setTaking] = useState<Side | null>(null);
  const [last, setLast] = useState<Steadiness | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const burst = useRef<Orientation[]>([]);
  const takingRef = useRef<Side | null>(null);

  useEffect(() => {
    if (!visible) return;
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
            setLive(sightDir(o, 'edge').slope);
            if (takingRef.current) burst.current.push(o);
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
  }, [visible]);

  useEffect(() => {
    if (visible) return;
    setRun(null);
    setTravel(null);
    setLast(null);
    setTaking(null);
    takingRef.current = null;
    burst.current = [];
  }, [visible]);

  const take = (side: Side) => {
    burst.current = [];
    setTaking(side);
    takingRef.current = side;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      takingRef.current = null;
      setTaking(null);
      const s = steadyDir(burst.current.map((o) => ({ o, hold: 'edge' as const })));
      setLast(s);
      if (!s) return;
      if (side === 'run') setRun(s.dir.slope);
      else setTravel(s.dir.slope);
      void Haptics.notificationAsync(
        s.spreadDeg <= STEADY_DEG
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
    }, BURST_MS);
  };

  const angle = run !== null && travel !== null ? angleFromSlopes(run, travel) : null;
  const near = angle === null ? null : nearestFitting(angle, FITTING_ANGLES);

  const reading = (side: Side, label: string, value: number | null, hint: string) => {
    const busy = taking === side;
    return (
      <View
        style={{
          flex: 1,
          padding: t.space.md,
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor: value !== null ? t.colors.data : t.colors.border,
          backgroundColor: value !== null ? t.colors.dataSoft : t.colors.bgRaised,
          gap: 4,
        }}
      >
        <Text style={[t.type.label, { color: t.colors.textMuted }]}>{label}</Text>
        <Text style={[t.type.h2, { color: value !== null ? t.colors.data : t.colors.textFaint }]}>
          {value !== null ? `${tidy(value)}°` : '—'}
        </Text>
        <Text numberOfLines={2} style={[t.type.caption, { color: t.colors.textFaint }]}>
          {hint}
        </Text>
        <Pressable
          onPress={() => take(side)}
          disabled={busy}
          accessibilityRole="button"
          style={{
            marginTop: 2,
            height: t.layout.chipHeight,
            borderRadius: t.radius.sm,
            borderWidth: 1,
            borderColor: t.colors.borderStrong,
            backgroundColor: t.colors.bgRaised,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: busy ? 0.6 : 1,
          }}
        >
          <Text style={[t.type.captionStrong, { color: t.colors.text }]}>
            {busy ? 'Hold still…' : value !== null ? 'Again' : 'Take'}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay }} onPress={onClose} />
      <View
        style={{
          backgroundColor: t.colors.bg,
          borderTopLeftRadius: t.radius.xl,
          borderTopRightRadius: t.radius.xl,
          paddingBottom: insets.bottom + t.space.lg,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: t.layout.screenPadding,
            paddingVertical: t.space.lg,
            borderBottomWidth: t.hairline,
            borderBottomColor: t.colors.border,
          }}
        >
          <Text style={[t.type.h3, { color: t.colors.text, flex: 1 }]}>{`${title} off the pipe`}</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={t.colors.textMuted} />
          </Pressable>
        </View>

        {unavailable ? (
          <Text style={[t.type.body, { color: t.colors.textMuted, padding: t.layout.screenPadding }]}>
            The motion sensors are not reachable here, so the angle cannot be read off the pipe. Type it instead.
          </Text>
        ) : (
          <View style={{ padding: t.layout.screenPadding, gap: t.space.lg }}>
            <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
              {`Lay the phone along each side of the fitting. Live: ${live === null ? '—' : `${tidy(live)}° · ${levelWord(live).word.toLowerCase()}`}`}
            </Text>

            <View style={{ flexDirection: 'row', gap: t.space.sm }}>
              {reading('run', 'RUN IN', run, 'The pipe coming into the fitting')}
              {reading('travel', 'PIECE OUT', travel, 'The piece leaving it')}
            </View>

            {/* Most runs are level, and a reading you do not have to take is
                worth more than one you do. */}
            <Pressable
              onPress={() => {
                setRun(0);
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              accessibilityRole="button"
              style={{
                height: t.layout.chipHeight,
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: t.colors.border,
                backgroundColor: t.colors.bgSubtle,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={[t.type.captionStrong, { color: t.colors.text }]}>
                The run in is level — skip that reading
              </Text>
            </Pressable>

            {last && last.spreadDeg > STEADY_DEG ? (
              <Text style={[t.type.caption, { color: t.colors.accent }]}>
                {`The hand moved ${tidy(last.spreadDeg)}° during that reading. Lay the phone on the pipe and take it again.`}
              </Text>
            ) : null}

            <View
              style={{
                padding: t.space.lg,
                borderRadius: t.radius.lg,
                backgroundColor: t.colors.bgSunken,
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Text style={[t.type.label, { color: t.colors.textMuted }]}>{title.toUpperCase()}</Text>
              <Text style={[t.type.display, { color: t.colors.text }]}>
                {angle === null ? '—' : `${tidy(angle)}°`}
              </Text>
              <Text style={[t.type.caption, { color: t.colors.textFaint, textAlign: 'center' }]}>
                {angle === null
                  ? 'Take both readings, or say the run is level'
                  : near && Math.abs(near.offBy) < 0.05
                    ? `A ${tidy(near.at)}° fitting, exactly`
                    : near
                      ? `${Math.abs(near.offBy).toFixed(1)}° ${near.offBy > 0 ? 'over' : 'under'} a ${tidy(near.at)}° fitting`
                      : ''}
              </Text>
            </View>

            <Pressable
              onPress={() => {
                if (angle === null) return;
                onUse(angle);
                onClose();
              }}
              disabled={angle === null}
              accessibilityRole="button"
              style={{
                height: t.layout.controlHeight,
                borderRadius: t.radius.md,
                backgroundColor: angle !== null ? t.colors.primary : t.colors.bgSubtle,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={[t.type.bodyStrong, { color: angle !== null ? t.colors.onPrimary : t.colors.textFaint }]}
              >
                Use it
              </Text>
            </Pressable>

            <Text style={[t.type.caption, { color: t.colors.textFaint }]}>
              Both readings come off gravity, so nothing here is bent by the steel around you. It does assume
              both legs lie in one vertical plane — which is what makes an offset simple rather than rolling.
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
