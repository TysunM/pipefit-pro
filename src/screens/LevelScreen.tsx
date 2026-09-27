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
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DeviceMotion } from 'expo-sensors';
import { Screen } from '../components/Screen';
import { GlowBar, Plate, Well } from '../components/metal';
import { SectionHeader } from '../components/SectionHeader';
import { stamp } from '../components/stamp';
import { HintRow } from '../components/HintRow';
import { FooterNote } from '../components/Results';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { Theme, useTheme } from '../theme/ThemeProvider';
import { Hold, Orientation, inchesPerFoot, levelWord, sightDir } from '../calc/sight';
import { useLevels } from '../state/levels';
import { TAG_MAX, addReading, deleteReading } from '../state/levelLog';

const RATE_MS = 60;

const tidy = (n: number) => (Math.abs(n) < 0.05 ? '0.0' : n.toFixed(1));

/** Fall per foot as the list shows it, signed the way the level reads. */
const fall = (inPerFt: number) => `${inPerFt >= 0 ? '' : '−'}${Math.abs(inPerFt).toFixed(2)}″/ft`;

export function LevelScreen() {
  const t = useTheme();
  const [hold, setHold] = useState<Hold>('edge');
  const [slope, setSlope] = useState<number | null>(null);
  const [held, setHeld] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const { log, hydrated, apply } = useLevels();
  // The figure being named, captured when Save is pressed so the sheet names
  // the reading that was on screen, not whatever the level reads by the time
  // the name is typed.
  const [naming, setNaming] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

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
          {/* The readout, let into the plate and trimmed in copper. On the
              mark it turns blue, the one change a glance at arm's length
              catches before the words are read. */}
          <View style={{ marginHorizontal: t.layout.screenPadding, marginBottom: t.space.lg }}>
            <Well
              trim
              radius={t.radius.lg}
              style={[
                { paddingVertical: t.space.xl, alignItems: 'center', gap: t.space.xs },
                word?.exact ? { borderColor: t.colors.data, borderWidth: 2 } : {},
              ]}
            >
              <Text style={[t.type.label, { color: t.colors.textMuted }]}>
                {held !== null ? 'HELD' : 'SLOPE OFF LEVEL'}
              </Text>
              <Text style={[t.type.display, { fontSize: 56, color: word?.exact ? t.colors.data : t.colors.text }]}>
                {shown === null ? '—' : `${tidy(shown)}°`}
              </Text>
              <Text style={[t.type.bodyStrong, { fontSize: 19, color: word?.exact ? t.colors.data : t.colors.textMuted }]}>
                {word?.word ?? 'Reading…'}
              </Text>
              {shown !== null && Math.abs(shown) < 85 ? (
                <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
                  {`${inchesPerFoot(shown) >= 0 ? '' : '−'}${Math.abs(inchesPerFoot(shown)).toFixed(2)} inch per foot of run`}
                </Text>
              ) : null}
            </Well>
            <GlowBar width={140} style={{ marginTop: -6 }} />
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

          <ControlRow>
            <AccentButton
              label="Save reading"
              icon="bookmark-outline"
              onPress={() => {
                if (shown !== null) setNaming(shown);
              }}
              style={{ flex: 1, opacity: shown === null ? 0.5 : 1 }}
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

      <SectionHeader title="Saved pipes" meta={hydrated ? `${log.readings.length} kept` : 'loading'} />
      {hydrated && log.readings.length === 0 ? (
        <Text style={[t.type.body, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, textAlign: 'center' }]}>
          Nothing saved yet. Save a reading by the pipe it was taken on, and it stays on this phone for the foreman or the inspector.
        </Text>
      ) : null}
      {log.readings.map((r) => (
        <View key={r.id} style={{ marginHorizontal: t.layout.screenPadding, marginBottom: t.space.sm }}>
          <Plate radius={t.radius.lg} style={{ padding: t.space.lg, flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[t.type.bodyStrong, { color: t.colors.text }]} numberOfLines={1}>
                {r.tag}
              </Text>
              <Text style={[t.type.caption, { color: t.colors.textMuted }]} numberOfLines={1}>
                {`${tidy(r.slope)}° · ${fall(r.inPerFt)} · ${stamp(r.createdAt)}`}
              </Text>
            </View>
            {confirm === r.id ? (
              <View style={{ flexDirection: 'row', gap: t.space.sm }}>
                <GhostButton label="Keep" onPress={() => setConfirm(null)} />
                <GhostButton
                  label="Delete"
                  icon="trash-outline"
                  onPress={() => {
                    setConfirm(null);
                    apply((l) => deleteReading(l, r.id));
                  }}
                />
              </View>
            ) : (
              <Pressable onPress={() => setConfirm(r.id)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Delete ${r.tag}`}>
                <Ionicons name="trash-outline" size={20} color={t.colors.textFaint} />
              </Pressable>
            )}
          </Plate>
        </View>
      ))}

      <TagSheet
        t={t}
        slope={naming}
        onCancel={() => setNaming(null)}
        onSave={(tag) => {
          const slopeNow = naming;
          setNaming(null);
          if (slopeNow !== null && tag) apply((l) => addReading(l, tag, slopeNow, Date.now()));
        }}
      />

      <FooterNote text="Slope only. A compass is bent by every rack and beam on a job, so a bearing is offered where it can be qualified — inside a spool leg, beside the field strength that earned it." />
    </Screen>
  );
}

/** Asks which pipe the reading was taken on. */
function TagSheet({ t, slope, onCancel, onSave }: { t: Theme; slope: number | null; onCancel: () => void; onSave: (tag: string) => void }) {
  const [tag, setTag] = useState('');
  useEffect(() => {
    if (slope !== null) setTag('');
  }, [slope]);
  return (
    <Modal visible={slope !== null} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'center' }} onPress={onCancel}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ margin: t.space.xxl, padding: t.space.xxl, borderRadius: t.radius.xl, backgroundColor: t.colors.bg, gap: t.space.md }}
        >
          <Text style={[t.type.sectionTitle, { color: t.colors.text }]}>Save this reading</Text>
          <Text style={[t.type.body, { color: t.colors.textMuted }]}>
            {slope === null ? '' : `${tidy(slope)}° · ${fall(inchesPerFoot(slope))}`}
          </Text>
          <TextInput
            value={tag}
            onChangeText={(v) => setTag(v.slice(0, TAG_MAX))}
            placeholder="Which pipe: line number, spool mark, location"
            placeholderTextColor={t.colors.textFaint}
            accessibilityLabel="Pipe name"
            autoCorrect={false}
            autoFocus
            style={{
              height: t.layout.fieldHeight,
              borderRadius: t.radius.md,
              borderWidth: 1,
              borderColor: t.colors.border,
              backgroundColor: t.colors.bgRaised,
              color: t.colors.text,
              paddingHorizontal: t.space.lg,
              fontFamily: t.font.sansMedium,
              fontSize: 17,
              ...t.weight('600'),
            }}
          />
          <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.sm }}>
            <GhostButton label="Cancel" onPress={onCancel} style={{ flex: 1 }} />
            <AccentButton
              label="Save"
              icon="checkmark"
              style={{ flex: 1, opacity: tag.trim() ? 1 : 0.5 }}
              onPress={() => {
                if (tag.trim()) onSave(tag.trim());
              }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
