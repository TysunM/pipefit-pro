// Reading a leg off the phone
// ---------------------------
// Hold it along the pipe, press, and the leg is pointed where the pipe points.
//
// The screen has one job beyond taking the reading, and it is the one that
// makes it usable on a job rather than a demo: it says how much to believe.
// A slope read off gravity is good to a fraction of a degree and does not care
// that the pipe is galvanised, the plant is dark or the rack is steel. A
// bearing read off the compass cares about all the steel around it and can be
// tens of degrees out with no sign that anything is wrong.
//
// So the two are shown apart, each with what it is worth. The slope is the
// big figure. The bearing sits under it with the field strength that produced
// it and a plain line about whether that field is the earth's. And a reading
// taken by a shaking hand says so instead of averaging the shake into a
// confident wrong number.
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DeviceMotion, Magnetometer } from 'expo-sensors';
import { useTheme } from '../theme/ThemeProvider';
import { LegDir, dirLabel, turnDeg } from '../calc/direction';
import {
  FieldCheck,
  Hold,
  Orientation,
  STEADY_DEG,
  Steadiness,
  checkField,
  sightDir,
  steadyDir,
} from '../calc/sight';

/** How long a reading is gathered over, and how fast the sensor is polled. */
const BURST_MS = 1200;
const RATE_MS = 50;

const tidy = (n: number) => (Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1));

export function SightSheet({
  visible,
  onClose,
  onUse,
  legNumber,
}: {
  visible: boolean;
  onClose: () => void;
  onUse: (dir: LegDir) => void;
  legNumber: number;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const [hold, setHold] = useState<Hold>('edge');
  const [live, setLive] = useState<LegDir | null>(null);
  const [field, setField] = useState<FieldCheck | null>(null);
  const [taking, setTaking] = useState(false);
  const [took, setTook] = useState<Steadiness | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);

  const burst = useRef<{ o: Orientation; hold: Hold }[]>([]);
  const holdRef = useRef(hold);
  holdRef.current = hold;
  const takingRef = useRef(false);

  // The sensors run only while the sheet is open. A motion listener left
  // running behind a closed sheet is a flat battery on a ten hour shift.
  useEffect(() => {
    if (!visible) return;
    let motion: { remove: () => void } | null = null;
    let mag: { remove: () => void } | null = null;
    let dead = false;

    (async () => {
      const ok = await DeviceMotion.isAvailableAsync().catch(() => false);
      if (dead) return;
      // Available is not the same as usable. On the web build the browser
      // reports motion support and then throws when a listener is attached,
      // which took the whole screen down rather than falling back. So the
      // test is whether attaching works, not whether it claims to.
      if (ok) {
        try {
          DeviceMotion.setUpdateInterval(RATE_MS);
          motion = DeviceMotion.addListener((m) => {
            const r = m.rotation;
            if (!r) return;
            const o: Orientation = { alpha: r.alpha, beta: r.beta, gamma: r.gamma };
            setLive(sightDir(o, holdRef.current));
            if (takingRef.current) burst.current.push({ o, hold: holdRef.current });
          });
        } catch {
          motion = null;
        }
      }
      if (dead) return;
      if (!motion) {
        setUnavailable(
          'The motion sensors are not reachable here, so a leg cannot be sighted. Use the pad, or type the bearing and slope.',
        );
        return;
      }

      try {
        if (await Magnetometer.isAvailableAsync().catch(() => false)) {
          Magnetometer.setUpdateInterval(250);
          mag = Magnetometer.addListener((m) => setField(checkField(m)));
        }
      } catch {
        // No compass is a missing bearing, not a broken screen: the slope,
        // which is the figure worth having, comes off gravity regardless.
        mag = null;
      }
    })();

    return () => {
      dead = true;
      motion?.remove();
      mag?.remove();
    };
  }, [visible]);

  // Leaving the sheet leaves nothing behind it.
  useEffect(() => {
    if (visible) return;
    setTook(null);
    setTaking(false);
    takingRef.current = false;
    burst.current = [];
  }, [visible]);

  const take = () => {
    burst.current = [];
    setTook(null);
    setTaking(true);
    takingRef.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      takingRef.current = false;
      setTaking(false);
      const s = steadyDir(burst.current);
      setTook(s);
      void Haptics.notificationAsync(
        s && s.spreadDeg <= STEADY_DEG
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
    }, BURST_MS);
  };

  const shown = took?.dir ?? live;
  const steady = took ? took.spreadDeg <= STEADY_DEG : null;

  const holdButton = (id: Hold, label: string, sub: string, icon: keyof typeof Ionicons.glyphMap) => {
    const on = hold === id;
    return (
      <Pressable
        key={id}
        onPress={() => {
          setHold(id);
          setTook(null);
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        style={{
          flex: 1,
          padding: t.space.md,
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor: on ? t.colors.primary : t.colors.border,
          backgroundColor: on ? t.colors.primary : t.colors.bgRaised,
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Ionicons name={icon} size={19} color={on ? t.colors.onPrimary : t.colors.textMuted} />
        <Text style={[t.type.captionStrong, { color: on ? t.colors.onPrimary : t.colors.text }]}>{label}</Text>
        <Text
          numberOfLines={2}
          style={[t.type.caption, { color: on ? t.colors.onPrimary : t.colors.textFaint, textAlign: 'center' }]}
        >
          {sub}
        </Text>
      </Pressable>
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
          <Text style={[t.type.h3, { color: t.colors.text, flex: 1 }]}>{`Sight leg ${legNumber}`}</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={t.colors.textMuted} />
          </Pressable>
        </View>

        {unavailable ? (
          <Text style={[t.type.body, { color: t.colors.textMuted, padding: t.layout.screenPadding }]}>
            {unavailable}
          </Text>
        ) : (
          <View style={{ padding: t.layout.screenPadding, gap: t.space.lg }}>
            <View style={{ flexDirection: 'row', gap: t.space.sm }}>
              {holdButton('edge', 'Lay on', 'Top edge along the pipe. The steadiest.', 'phone-landscape-outline')}
              {holdButton('sight', 'Sight', 'Camera down the run. For pipe you cannot reach.', 'camera-outline')}
            </View>

            {/* Slope is the figure that can be trusted, so it is the figure. */}
            <View
              style={{
                padding: t.space.lg,
                borderRadius: t.radius.lg,
                backgroundColor: t.colors.bgSunken,
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Text style={[t.type.label, { color: t.colors.textMuted }]}>SLOPE · OFF GRAVITY</Text>
              <Text style={[t.type.display, { color: t.colors.text }]}>
                {shown ? `${tidy(shown.slope)}°` : '—'}
              </Text>
              <Text style={[t.type.caption, { color: t.colors.textFaint }]}>
                {shown ? dirLabel(shown) : 'Point the phone along the pipe'}
              </Text>
            </View>

            <View
              style={{
                padding: t.space.md,
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: field?.disturbed ? t.colors.warnBorder : t.colors.border,
                backgroundColor: field?.disturbed ? t.colors.warnBg : t.colors.bgRaised,
                gap: 2,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
                <Ionicons
                  name={field?.disturbed ? 'warning-outline' : 'compass-outline'}
                  size={17}
                  color={field?.disturbed ? t.colors.warnText : t.colors.textMuted}
                />
                <Text style={[t.type.captionStrong, { color: t.colors.textMuted, flex: 1 }]}>
                  {`BEARING${field ? ` · FIELD ${field.strength.toFixed(0)} µT` : ''}`}
                </Text>
                <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>
                  {shown ? `${Math.round(turnDeg(shown.bearing))}°` : '—'}
                </Text>
              </View>
              <Text style={[t.type.caption, { color: field?.disturbed ? t.colors.warnText : t.colors.textFaint }]}>
                {field?.note ?? 'No magnetometer on this device — the bearing is not measured.'}
              </Text>
            </View>

            {took ? (
              <Text
                style={[
                  t.type.caption,
                  { color: steady ? t.colors.data : t.colors.accent, textAlign: 'center' },
                ]}
              >
                {steady
                  ? `Held to ${tidy(took.spreadDeg)}° over ${took.samples} readings.`
                  : `The hand moved ${tidy(took.spreadDeg)}° during the reading. Lay the phone on the pipe and take it again.`}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', gap: t.space.sm }}>
              <Pressable
                onPress={take}
                disabled={taking}
                accessibilityRole="button"
                style={{
                  flex: 1,
                  height: t.layout.controlHeight,
                  borderRadius: t.radius.md,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  backgroundColor: t.colors.bgRaised,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: taking ? 0.6 : 1,
                }}
              >
                <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>
                  {taking ? 'Hold still…' : took ? 'Take again' : 'Take reading'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!took) return;
                  onUse(took.dir);
                  onClose();
                }}
                disabled={!took}
                accessibilityRole="button"
                style={{
                  flex: 1,
                  height: t.layout.controlHeight,
                  borderRadius: t.radius.md,
                  backgroundColor: took ? t.colors.primary : t.colors.bgSubtle,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={[t.type.bodyStrong, { color: took ? t.colors.onPrimary : t.colors.textFaint }]}
                >
                  Use it
                </Text>
              </Pressable>
            </View>

            <Text style={[t.type.caption, { color: t.colors.textFaint }]}>
              This reads which way the leg runs, not how long it is. Phone measuring is out by one to seven per
              cent, which on ten feet is an inch to nine inches — so the length still comes off your tape.
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
