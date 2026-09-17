import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { ChipRow } from '../components/ChipRow';
import { SectionHeader } from '../components/SectionHeader';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { HintRow } from '../components/HintRow';
import { Divider } from '../components/Divider';
import { useTheme, Theme } from '../theme/ThemeProvider';
import { CastIronFlangeClass, boltHoleAngles, boltUp, boltUpSizes } from '../calc/boltUp';
import {
  BoltUpState,
  PASSES,
  boltLevel,
  boltUpProgress,
  currentPass,
  expectedBolt,
  isFinished,
  passOrder,
  passTorque,
  resetBoltUp,
  startBoltUp,
  tapBolt,
  undoBolt,
} from '../calc/boltUpSequence';
import { formatInches } from '../calc/ftin';
import { useSettings } from '../state/settings';
import { useJoints } from '../state/joints';
import {
  Joint,
  JointSpec,
  ReCheck,
  Register,
  SCRATCH_ID,
  addCheck,
  freshId,
  getJoint,
  isDone,
  isScratch,
  isSettled,
  lastCheck,
  newJoint,
  putJoint,
  removeCheck,
  sinceLabel,
  withFlange,
  withState,
} from '../state/register';
import { boltCentre, flangeFace } from '../components/flange/face';

type Props = NativeStackScreenProps<RootStackParamList, 'FlangeBoltUp'>;

/** Bolt counts the handbook flanges actually use, for setting one by hand. */
const COUNTS = [4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 52, 60, 64, 68];

const FACE_MIN = 300;
const FACE_MAX = 360;

type BoltSkin = { fill: string; border: string; text: string; width: number };

/**
 * Untouched, then one step per pass: snug, two thirds, full, checked.
 *
 * These are flat, saturated colours rather than the soft tints the rest of the
 * app uses, and they are not taken from the theme. The reason is legibility at
 * a distance: a fitter glancing at the face has to tell a bolt at a third from
 * a bolt at two thirds across the width of a phone, in daylight, and the
 * theme's tinted backgrounds sit within a few points of each other. Four
 * distinct hues, one per pass, is the only arrangement that survives that.
 *
 * Numerals are dark on the two light fills and white on the two dark ones, so
 * every bolt number clears 4.5:1 against what it sits on.
 */
const BOLT_RAMP: readonly BoltSkin[] = [
  { fill: '#FACC15', border: '#CA9A04', text: '#1C1917', width: 2 }, // 30%, snug
  { fill: '#F97316', border: '#C2540A', text: '#1C1917', width: 2 }, // 60%
  { fill: '#2563EB', border: '#1D4FD8', text: '#FFFFFF', width: 2 }, // full torque
  { fill: '#15803D', border: '#106431', text: '#FFFFFF', width: 2 }, // checked
];

function boltSkin(t: Theme, level: number): BoltSkin {
  return (
    BOLT_RAMP[level - 1] ?? {
      fill: t.colors.bgSubtle,
      border: t.colors.borderStrong,
      text: t.colors.textMuted,
      width: 1,
    }
  );
}

const LEVEL_LABELS = ['Not started', 'Snug, 30%', 'Two thirds, 60%', 'Full torque', 'Checked'];

/**
 * Resolves which joint the screen is working before anything is drawn.
 *
 * Without a `jointId` it is the unnamed working joint, which is seeded from the
 * app's default pipe size the first time and then simply picked back up — the
 * bolt-up you were part-way through is still there whether you left the screen,
 * backed out of the app or put the phone in your pocket.
 *
 * The split is so the inner component can take a joint that definitely exists,
 * and so remounting it on a change of id resets the fields that shadow the
 * record.
 */
export function FlangeBoltUpScreen({ route, navigation }: Props) {
  const t = useTheme();
  const { settings } = useSettings();
  const { register, hydrated, apply } = useJoints();

  const jointId = route.params?.jointId ?? SCRATCH_ID;
  const joint = getJoint(register, jointId);

  // Seeded only once the store has been read, or it would be written and then
  // immediately replaced by whatever was on disk.
  useEffect(() => {
    if (!hydrated || joint) return;
    const opening = boltUp(settings.defaultNps, '125') ?? boltUp(6, '125');
    apply((r) =>
      getJoint(r, jointId)
        ? r
        : putJoint(
            r,
            newJoint(jointId, { cls: '125', nps: opening?.nps ?? 6, bolts: opening?.bolts ?? 8 }, Date.now()),
          ),
    );
  }, [hydrated, joint, jointId, settings.defaultNps, apply]);

  if (!joint) {
    return (
      <Screen>
        <View style={{ padding: t.layout.screenPadding, paddingTop: t.space.xxxl, alignItems: 'center' }}>
          <Text style={[t.type.body, { color: t.colors.textMuted, textAlign: 'center' }]}>
            {hydrated ? 'That joint is no longer in the register.' : 'Reading the register\u2026'}
          </Text>
        </View>
      </Screen>
    );
  }

  return <Bolting key={joint.id} joint={joint} register={register} apply={apply} navigation={navigation} />;
}

function Bolting({
  joint,
  register,
  apply,
  navigation,
}: {
  joint: Joint;
  register: Register;
  apply: (f: (r: Register) => Register) => void;
  navigation: Props['navigation'];
}) {
  const t = useTheme();

  const { cls, nps, bolts, state } = joint;
  const [torque, setTorque] = useState(joint.torque === null ? '' : String(joint.torque));
  const [width, setWidth] = useState(FACE_MAX);
  const [showDone, setShowDone] = useState(false);
  const [naming, setNaming] = useState(false);
  const [checking, setChecking] = useState(false);

  const flange = useMemo(() => boltUp(nps ?? NaN, cls), [nps, cls]);
  const sizes = useMemo(() => boltUpSizes(cls), [cls]);

  const write = useCallback(
    (next: Joint) => apply((r) => putJoint(r, next)),
    [apply],
  );
  const setState = useCallback(
    (next: BoltUpState) => write(withState(joint, next, Date.now())),
    [joint, write],
  );
  const setFlange = useCallback(
    (spec: JointSpec) => write(withFlange(joint, spec, Date.now())),
    [joint, write],
  );

  const expected = expectedBolt(state);
  const pass = currentPass(state);
  const done = isFinished(state);
  const progress = boltUpProgress(state);
  const order = useMemo(() => (done ? [] : passOrder(bolts, state.pass)), [bolts, state.pass, done]);

  const finalTorque = Number(torque);
  const target = pass ? passTorque(finalTorque, state.pass) : NaN;

  // The wrong-bolt flash. It is pinned to the bolt the sequence wanted, not the
  // one that was hit, because pointing at the mistake does not tell anyone what
  // to do next — pointing at the right bolt does.
  const flash = useRef(new Animated.Value(0)).current;
  const wrongCount = state.wrongCount;
  useEffect(() => {
    if (!wrongCount) return;
    flash.setValue(0);
    Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [wrongCount, flash]);

  // A bolt count set by hand belongs to no table size, so nps goes null and
  // the picture falls back to generic proportions rather than a wrong flange.
  const setBolts = (n: number) => {
    setFlange({ cls, nps: null, bolts: n });
    setShowDone(false);
  };

  const pickSize = (size: number) => {
    const f = boltUp(size, cls);
    if (!f) return;
    setFlange({ cls, nps: f.nps, bolts: f.bolts });
    setShowDone(false);
  };

  const pickClass = (c: CastIronFlangeClass) => {
    const f = boltUp(nps ?? NaN, c) ?? boltUp(boltUpSizes(c)[0] ?? 1, c);
    if (!f) return;
    setFlange({ cls: c, nps: f.nps, bolts: f.bolts });
    setShowDone(false);
  };

  const commitTorque = (text: string) => {
    setTorque(text);
    const n = Number(text);
    const value = text.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null;
    if (value !== joint.torque) write({ ...joint, torque: value, updatedAt: Date.now() });
  };

  /**
   * Naming the unnamed joint moves the work it holds into a record of its own
   * and leaves the scratch slot clear for the next one, so the screen you come
   * back to unnamed is never someone else's half-finished joint.
   */
  const saveName = (tag: string, note: string) => {
    setNaming(false);
    const now = Date.now();
    if (!isScratch(joint)) {
      write({ ...joint, tag, note, updatedAt: now });
      return;
    }
    // The id is worked out here rather than inside the reducer: a reducer must
    // be a pure function of the state it is handed, and navigating is not.
    const id = freshId(register, tag || `joint-${now.toString(36)}`);
    const moved: Joint = { ...joint, id, tag, note, createdAt: now, updatedAt: now };
    const cleared = newJoint(SCRATCH_ID, { cls, nps, bolts }, now);
    apply((r) => putJoint(putJoint(r, moved), cleared));
    navigation.setParams({ jointId: id });
  };

  const onBolt = (bolt: number) => {
    const r = tapBolt(state, bolt);
    setState(r.state);
    if (r.ok) {
      Haptics.impactAsync(
        r.finished ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light,
      ).catch(() => {});
      if (r.finished) setShowDone(true);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  // The picture is the flange in front of you: the bolt circle sits inside the
  // rim at the ratio the table gives, so a 2" joint reads narrow and a 24" one
  // reads wide.
  const bcFrac = flange ? flange.boltCircle / flange.flangeOd : 0.85;
  const avail = Math.max(FACE_MIN, Math.min(width - t.layout.screenPadding * 2, FACE_MAX));
  const L = flangeFace(bolts, avail, bcFrac);
  const { face, c, odR, bcR, marker } = L;

  const scale = flange ? odR / (flange.flangeOd / 2) : 0;
  const gasketOdR = flange ? (flange.gasketOd / 2) * scale : bcR * 0.82;
  const gasketIdR = flange ? (flange.gasketId / 2) * scale : bcR * 0.58;

  const angles = boltHoleAngles(bolts);

  return (
    <Screen>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} />

      <JointBar
        t={t}
        joint={joint}
        onName={() => setNaming(true)}
        onRegister={() => navigation.navigate('Joints')}
      />

      <PassBanner
        t={t}
        state={state}
        expected={expected}
        target={target}
        progress={progress}
        order={order}
      />

      <View style={{ alignItems: 'center', paddingBottom: t.space.lg }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={L.scrolls}
          contentContainerStyle={{ paddingHorizontal: t.space.md }}
        >
          <View style={{ width: face, height: face }}>
            <Svg width={face} height={face}>
              <Circle cx={c} cy={c} r={odR} fill={t.colors.bgSubtle} stroke={t.colors.border} strokeWidth={1} />
              {/* The gasket, so the sealing face is the thing the bolts surround. */}
              <Circle
                cx={c}
                cy={c}
                r={gasketOdR}
                fill={t.colors.accentSoft}
                stroke={t.colors.borderStrong}
                strokeWidth={1}
              />
              {/* The bore, which is a hole and should read as one. */}
              <Circle
                cx={c}
                cy={c}
                r={gasketIdR}
                fill={t.colors.bg}
                stroke={t.colors.borderStrong}
                strokeWidth={1.5}
              />
              <Circle
                cx={c}
                cy={c}
                r={bcR}
                fill="none"
                stroke={t.colors.textFaint}
                strokeWidth={1}
                strokeDasharray="4 5"
                opacity={0.7}
              />
              <Line x1={c} y1={c - odR} x2={c} y2={c + odR} stroke={t.colors.textFaint} strokeWidth={0.75} opacity={0.4} />
              <Line x1={c - odR} y1={c} x2={c + odR} y2={c} stroke={t.colors.textFaint} strokeWidth={0.75} opacity={0.4} />
            </Svg>

            {angles.map((deg, i) => {
              const bolt = i + 1;
              const { x, y } = boltCentre(L, deg);
              return (
                <BoltMarker
                  key={bolt}
                  t={t}
                  bolt={bolt}
                  level={boltLevel(state, bolt)}
                  size={marker}
                  ring={L.ring}
                  slop={L.slop}
                  x={x}
                  y={y}
                  next={!done && bolt === expected}
                  flash={flash}
                  onPress={() => onBolt(bolt)}
                />
              );
            })}
          </View>
        </ScrollView>
      </View>

      <ControlRow>
        <GhostButton
          label="Undo"
          icon="arrow-undo-outline"
          style={{ flex: 1 }}
          onPress={() => {
            setState(undoBolt(state));
            setShowDone(false);
          }}
        />
        <GhostButton
          label="Start over"
          icon="refresh-outline"
          style={{ flex: 1 }}
          onPress={() => {
            setState(resetBoltUp(state));
            setShowDone(false);
          }}
        />
      </ControlRow>

      {isDone(joint) ? (
        <ReTorque
          t={t}
          joint={joint}
          onRecord={() => setChecking(true)}
          onRemove={(at) => write(removeCheck(joint, at, Date.now()))}
        />
      ) : null}

      <Divider />

      <HintRow text="A flange is never pulled down round the circle. Every bolt is followed by the one straight across it, in three passes, then checked round at full torque. The screen will only take the bolt the sequence is asking for — tap anything else and it points you back." />

      <SectionHeader title="The joint" meta={flange ? `${flange.label} · class ${cls}` : `${bolts} bolts`} />

      <ChipRow
        label="CLASS"
        options={[
          { value: '125' as CastIronFlangeClass, label: '125 lb' },
          { value: '250' as CastIronFlangeClass, label: '250 lb' },
        ]}
        selected={cls}
        onSelect={pickClass}
      />

      <ChipRow
        label="SIZE"
        options={sizes.map((s) => ({ value: s, label: boltUp(s, cls)?.label ?? `${s}"` }))}
        selected={flange ? nps : null}
        onSelect={pickSize}
      />

      <ChipRow
        label="BOLTS"
        options={COUNTS.map((n) => ({ value: n, label: String(n) }))}
        selected={bolts}
        onSelect={setBolts}
      />

      {flange ? (
        <View style={{ paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.lg }}>
          <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
            {`${flange.bolts} × ${formatInches(flange.boltDiameter)} bolts, ${formatInches(
              flange.boltLength,
            )} long, on a ${formatInches(flange.boltCircle)} bolt circle. Ring gasket ${formatInches(
              flange.gasketId,
            )} × ${formatInches(flange.gasketOd)}.`}
          </Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.lg }}>
          <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
            {`${bolts} bolts, set by hand. The sequence works off the count alone, so this covers a flange that is not in the cast iron tables.`}
          </Text>
        </View>
      )}

      <Divider />
      <SectionHeader title="Torque" meta="from the job's bolting spec" />
      <View style={{ paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.lg }}>
        <TextInput
          value={torque}
          onChangeText={commitTorque}
          keyboardType="decimal-pad"
          placeholder="Final torque, ft-lb"
          placeholderTextColor={t.colors.textFaint}
          accessibilityLabel="Final torque in foot pounds"
          style={{
            height: t.layout.fieldHeight,
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: t.colors.border,
            backgroundColor: t.colors.bgRaised,
            color: t.colors.text,
            paddingHorizontal: t.space.lg,
            fontSize: 23,
            fontWeight: '700',
          }}
        />
        <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: t.space.md }]}>
          The app splits the figure into passes. It does not supply it: final torque depends on the gasket, the stud
          material and whether the threads are lubricated, and a guessed figure either crushes the gasket or leaves the
          joint loose.
        </Text>
      </View>

      <Divider />
      <SectionHeader title="The passes" />
      {PASSES.map((p, i) => {
        const active = !done && i === state.pass;
        const finished = done || i < state.pass;
        return (
          <View
            key={p.number}
            style={{
              marginHorizontal: t.layout.screenPadding,
              marginBottom: t.space.md,
              padding: t.space.lg,
              borderRadius: t.radius.md,
              borderWidth: active ? 1.5 : 1,
              borderColor: active ? t.colors.accent : t.colors.border,
              backgroundColor: active ? t.colors.accentSoft : t.colors.bgRaised,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
              <Ionicons
                name={finished ? 'checkmark-circle' : active ? 'ellipse' : 'ellipse-outline'}
                size={16}
                color={finished ? t.colors.success : active ? t.colors.accent : t.colors.textFaint}
              />
              <Text style={[t.type.labelSmall, { color: t.colors.textMuted }]}>
                {`${p.label} · ${Math.round(p.target * 100)}% · ${p.order === 'cross' ? 'across' : 'round'}`}
              </Text>
            </View>
            <Text style={[t.type.body, { color: t.colors.text, marginTop: t.space.sm }]}>{p.note}</Text>
          </View>
        );
      })}

      <Divider />
      <SectionHeader title="What the colours mean" />
      <View style={{ paddingHorizontal: t.layout.screenPadding }}>
        {LEVEL_LABELS.map((label, level) => {
          const skin = boltSkin(t, level);
          return (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingVertical: 6 }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: skin.fill,
                  borderWidth: skin.width,
                  borderColor: skin.border,
                }}
              />
              <Text style={[t.type.body, { color: t.colors.textMuted }]}>{label}</Text>
            </View>
          );
        })}
      </View>

      <DoneSheet t={t} visible={showDone} bolts={bolts} onClose={() => setShowDone(false)} />
      <NameSheet
        t={t}
        visible={naming}
        joint={joint}
        onCancel={() => setNaming(false)}
        onSave={saveName}
      />
      <CheckSheet
        t={t}
        visible={checking}
        joint={joint}
        onCancel={() => setChecking(false)}
        onSave={(moved, torqueText, note) => {
          setChecking(false);
          const n = Number(torqueText);
          const value = torqueText.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null;
          write(addCheck(joint, { moved, torque: value, note }, Date.now()));
        }}
      />
    </Screen>
  );
}

function PassBanner({
  t,
  state,
  expected,
  target,
  progress,
  order,
}: {
  t: Theme;
  state: BoltUpState;
  expected: number;
  target: number;
  progress: { done: number; total: number };
  order: number[];
}) {
  const pass = currentPass(state);
  const done = isFinished(state);
  const wrong = state.lastWrong;

  return (
    <View style={{ backgroundColor: t.colors.bgSubtle, paddingHorizontal: t.layout.screenPadding, paddingVertical: t.space.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
        <Ionicons
          name={done ? 'checkmark-done-outline' : 'git-compare-outline'}
          size={18}
          color={done ? t.colors.success : t.colors.textMuted}
        />
        <Text style={[t.type.label, { color: done ? t.colors.success : t.colors.textMuted }]}>
          {done
            ? 'All four passes recorded'
            : `Pass ${pass?.number} of ${PASSES.length} · ${Math.round((pass?.target ?? 0) * 100)}% · ${
                pass?.order === 'cross' ? 'across' : 'round'
              }`}
        </Text>
        <Text style={[t.type.labelSmall, { color: t.colors.textFaint, marginLeft: 'auto' }]}>
          {`${progress.done}/${progress.total}`}
        </Text>
      </View>

      <Text
        style={[t.type.displaySmall, { color: done ? t.colors.success : t.colors.text, marginTop: t.space.xs }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {done ? 'Joint complete' : `Bolt ${expected}`}
      </Text>

      {!done ? (
        <Text style={[t.type.bodyStrong, { color: t.colors.data, marginTop: t.space.xs }]} numberOfLines={2}>
          {Number.isFinite(target)
            ? `${Math.round(target)} ft-lb · ${state.step + 1} of ${state.bolts} on this pass`
            : `${state.step + 1} of ${state.bolts} on this pass`}
        </Text>
      ) : null}

      {!done && order.length ? (
        <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: t.space.sm }]} numberOfLines={1}>
          {`Then ${order.slice(state.step + 1, state.step + 5).join(' → ') || 'the next pass'}`}
        </Text>
      ) : null}

      {!done && wrong !== null ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm, marginTop: t.space.md }}>
          <Ionicons name="alert-circle" size={16} color={t.colors.danger} />
          <Text style={[t.type.captionStrong, { color: t.colors.danger, flex: 1 }]}>
            {`Bolt ${wrong} is out of sequence. Bolt ${expected} is next.`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function BoltMarker({
  t,
  bolt,
  level,
  size,
  ring,
  slop,
  x,
  y,
  next,
  flash,
  onPress,
}: {
  t: Theme;
  bolt: number;
  level: number;
  size: number;
  ring: number;
  slop: number;
  x: number;
  y: number;
  next: boolean;
  flash: Animated.Value;
  onPress: () => void;
}) {
  const skin = boltSkin(t, level);

  return (
    <View style={{ position: 'absolute', left: x - ring / 2, top: y - ring / 2, width: ring, height: ring }}>
      {next ? (
        <>
          <View
            style={{
              position: 'absolute',
              width: ring,
              height: ring,
              borderRadius: ring / 2,
              borderWidth: 2,
              borderColor: t.colors.primary,
            }}
          />
          <Animated.View
            style={{
              position: 'absolute',
              width: ring,
              height: ring,
              borderRadius: ring / 2,
              borderWidth: 3,
              borderColor: t.colors.danger,
              backgroundColor: t.colors.danger,
              opacity: flash,
            }}
          />
        </>
      ) : null}
      <Pressable
        onPress={onPress}
        hitSlop={slop}
        accessibilityRole="button"
        accessibilityLabel={`Bolt ${bolt}, ${LEVEL_LABELS[level] ?? ''}${next ? ', next in the sequence' : ''}`}
        style={({ pressed }) => ({
          position: 'absolute',
          left: (ring - size) / 2,
          top: (ring - size) / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: skin.width,
          borderColor: skin.border,
          backgroundColor: skin.fill,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.65 : 1,
        })}
      >
        <Text style={{ color: skin.text, fontSize: Math.max(9, Math.min(15, size * 0.45)), fontWeight: '700' }}>
          {bolt}
        </Text>
      </Pressable>
    </View>
  );
}

function DoneSheet({ t, visible, bolts, onClose }: { t: Theme; visible: boolean; bolts: number; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'center' }} onPress={onClose}>
        <View
          style={{
            margin: t.space.xxl,
            padding: t.space.xxl,
            borderRadius: t.radius.xl,
            backgroundColor: t.colors.bg,
            alignItems: 'center',
            gap: t.space.md,
          }}
        >
          <Ionicons name="checkmark-circle" size={52} color={t.colors.success} />
          <Text style={[t.type.sectionTitle, { color: t.colors.text, fontFamily: t.font.serif, textAlign: 'center' }]}>
            Joint complete
          </Text>
          <Text style={[t.type.body, { color: t.colors.textMuted, textAlign: 'center' }]}>
            {`Three cross passes and the check round, on all ${bolts} bolts, in order.`}
          </Text>
          <Text style={[t.type.caption, { color: t.colors.textMuted, textAlign: 'center' }]}>
            The app recorded the sequence. It did not measure torque, and it cannot see the gasket. Check the joint again
            once the line has been up to temperature.
          </Text>
          <GhostButton label="Close" onPress={onClose} style={{ alignSelf: 'stretch', marginTop: t.space.sm }} />
        </View>
      </Pressable>
    </Modal>
  );
}


/**
 * Which joint is on screen, and the way into the register.
 *
 * The unnamed joint reads as what it is rather than as a blank: it is still
 * saved, so the bar says so, and offers a name for the times you want the
 * joint kept as a record instead of just picked back up.
 */
function JointBar({
  t,
  joint,
  onName,
  onRegister,
}: {
  t: Theme;
  joint: Joint;
  onName: () => void;
  onRegister: () => void;
}) {
  const named = !isScratch(joint) && joint.tag.trim() !== '';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space.md,
        paddingHorizontal: t.layout.screenPadding,
        paddingVertical: t.space.md,
        borderBottomWidth: t.hairline,
        borderBottomColor: t.colors.border,
      }}
    >
      <Ionicons name={named ? 'pricetag' : 'pricetag-outline'} size={17} color={t.colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={[t.type.bodyStrong, { color: t.colors.text }]} numberOfLines={1}>
          {named ? joint.tag : 'Unnamed joint'}
        </Text>
        <Text style={[t.type.caption, { color: t.colors.textMuted }]} numberOfLines={1}>
          {named ? joint.note || 'Saved as you go' : 'Saved as you go'}
        </Text>
      </View>
      <Pressable onPress={onName} hitSlop={10} accessibilityRole="button">
        <Text style={[t.type.labelSmall, { color: t.colors.data }]}>{named ? 'Rename' : 'Name it'}</Text>
      </Pressable>
      <Pressable onPress={onRegister} hitSlop={10} accessibilityRole="button" accessibilityLabel="Open the joint register">
        <Ionicons name="list-outline" size={20} color={t.colors.text} />
      </Pressable>
    </View>
  );
}

function NameSheet({
  t,
  visible,
  joint,
  onCancel,
  onSave,
}: {
  t: Theme;
  visible: boolean;
  joint: Joint;
  onCancel: () => void;
  onSave: (tag: string, note: string) => void;
}) {
  const [tag, setTag] = useState(joint.tag);
  const [note, setNote] = useState(joint.note);

  // The fields hold what the record holds every time the sheet opens, so a
  // cancelled edit never leaks into the next one.
  useEffect(() => {
    if (visible) {
      setTag(joint.tag);
      setNote(joint.note);
    }
  }, [visible, joint.tag, joint.note]);

  const field = {
    height: t.layout.fieldHeight,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.bgRaised,
    color: t.colors.text,
    paddingHorizontal: t.space.lg,
    fontSize: 17,
    fontWeight: '600' as const,
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'center' }} onPress={onCancel}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            margin: t.space.xxl,
            padding: t.space.xxl,
            borderRadius: t.radius.xl,
            backgroundColor: t.colors.bg,
            gap: t.space.md,
          }}
        >
          <Text style={[t.type.sectionTitle, { color: t.colors.text, fontFamily: t.font.serif }]}>
            {isScratch(joint) ? 'Name this joint' : 'Rename this joint'}
          </Text>
          <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
            Whatever you would call it out by \u2014 a line number, a spool mark, a valve tag.
          </Text>
          <TextInput
            value={tag}
            onChangeText={setTag}
            placeholder="8-CWS-102 FL-3"
            placeholderTextColor={t.colors.textFaint}
            accessibilityLabel="Joint tag"
            autoCapitalize="characters"
            autoCorrect={false}
            style={field}
          />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Where it is, or anything worth remembering"
            placeholderTextColor={t.colors.textFaint}
            accessibilityLabel="Joint note"
            style={field}
          />
          <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.sm }}>
            <GhostButton label="Cancel" onPress={onCancel} style={{ flex: 1 }} />
            <AccentButton
              label="Save"
              icon="checkmark"
              style={{ flex: 1 }}
              onPress={() => onSave(tag.trim(), note.trim())}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** The date a check was taken, written the way it would go on a turnover sheet. */
const checkDate = (at: number): string =>
  new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * The re-torque log, on a joint that has been finished once.
 *
 * A bolted joint is a spring holding a gasket squashed, and taking the line up
 * to temperature relaxes all of it at once — the gasket creeps, the bolts and
 * flanges grow at different rates. So a joint that was right cold can be slack
 * hot, and the heading says which of those this one is rather than only that
 * somebody went back to look.
 */
function ReTorque({
  t,
  joint,
  onRecord,
  onRemove,
}: {
  t: Theme;
  joint: Joint;
  onRecord: () => void;
  onRemove: (at: number) => void;
}) {
  const last = lastCheck(joint);
  const settled = isSettled(joint);
  const tone = settled ? t.colors.success : last ? t.colors.accent : t.colors.textMuted;
  const heading = settled
    ? 'Nothing moved last time'
    : last
      ? 'Still taking up'
      : 'Not checked since it came up to temperature';

  return (
    <>
      <Divider />
      <SectionHeader
        title="Re-torque"
        meta={joint.checks.length ? `${joint.checks.length} check${joint.checks.length === 1 ? '' : 's'}` : undefined}
      />

      <View style={{ paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm, marginBottom: t.space.sm }}>
          <Ionicons
            name={settled ? 'checkmark-circle' : last ? 'alert-circle' : 'time-outline'}
            size={18}
            color={tone}
          />
          <Text style={[t.type.bodyStrong, { color: tone, flex: 1 }]}>{heading}</Text>
        </View>
        <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
          {settled
            ? 'A check that finds every bolt tight is the one that closes a joint out. Check it again if the line cycles hard.'
            : last
              ? 'Bolts took up on the last check, so the joint is still relaxing. Go back to it after another cycle.'
              : 'Hot service relaxes a joint that was right when it was cold. Once the line has been up to temperature and back, go round it again and record what you find.'}
        </Text>
      </View>

      {joint.checks
        .slice()
        .reverse()
        .map((c) => (
          <CheckRow key={c.at} t={t} check={c} onRemove={() => onRemove(c.at)} />
        ))}

      <ControlRow>
        <AccentButton label="Record a check" icon="create-outline" style={{ flex: 1 }} onPress={onRecord} />
      </ControlRow>
    </>
  );
}

function CheckRow({ t, check, onRemove }: { t: Theme; check: ReCheck; onRemove: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const now = Date.now();
  return (
    <View
      style={{
        marginHorizontal: t.layout.screenPadding,
        marginBottom: t.space.md,
        padding: t.space.lg,
        borderRadius: t.radius.md,
        borderWidth: t.hairline,
        borderColor: confirming ? t.colors.danger : t.colors.border,
        backgroundColor: t.colors.bgRaised,
        gap: 5,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
        <Ionicons
          name={check.moved ? 'alert-circle' : 'checkmark-circle'}
          size={16}
          color={check.moved ? t.colors.accent : t.colors.success}
        />
        <Text style={[t.type.bodyStrong, { color: check.moved ? t.colors.accent : t.colors.success, flex: 1 }]}>
          {check.moved ? 'Bolts took up' : 'All tight'}
        </Text>
        {confirming ? (
          <>
            <Pressable onPress={() => setConfirming(false)} hitSlop={10} accessibilityRole="button">
              <Text style={[t.type.labelSmall, { color: t.colors.textMuted }]}>Keep</Text>
            </Pressable>
            <Pressable
              onPress={onRemove}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Confirm delete the check from ${checkDate(check.at)}`}
            >
              <Text style={[t.type.labelSmall, { color: t.colors.danger }]}>Delete</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={() => setConfirming(true)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Delete the check from ${checkDate(check.at)}`}
          >
            <Ionicons name="trash-outline" size={15} color={t.colors.textFaint} />
          </Pressable>
        )}
      </View>
      <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
        {`${checkDate(check.at)} · ${sinceLabel(check.at, now)}${
          check.torque ? ` · ${Math.round(check.torque)} ft-lb` : ''
        }`}
      </Text>
      {check.note ? <Text style={[t.type.caption, { color: t.colors.text }]}>{check.note}</Text> : null}
    </View>
  );
}

/**
 * Recording a check.
 *
 * Whether anything moved is asked as two buttons with no default on purpose.
 * It is the reading the whole log exists for, and a preselected answer is one
 * somebody taps past without going and looking.
 */
function CheckSheet({
  t,
  visible,
  joint,
  onCancel,
  onSave,
}: {
  t: Theme;
  visible: boolean;
  joint: Joint;
  onCancel: () => void;
  onSave: (moved: boolean, torque: string, note: string) => void;
}) {
  const [moved, setMoved] = useState<boolean | null>(null);
  const [torque, setTorque] = useState('');
  const [note, setNote] = useState('');

  // The torque box starts empty, with the joint's own figure only as a hint.
  // Pre-filling it would put a number nobody typed into a record, and the
  // point of a record is that everything in it was actually observed.
  useEffect(() => {
    if (visible) {
      setMoved(null);
      setTorque('');
      setNote('');
    }
  }, [visible]);

  const field = {
    height: t.layout.fieldHeight,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.bgRaised,
    color: t.colors.text,
    paddingHorizontal: t.space.lg,
    fontSize: 17,
    fontWeight: '600' as const,
  };

  const answer = (value: boolean, label: string, icon: keyof typeof Ionicons.glyphMap, colour: string) => {
    const on = moved === value;
    return (
      <Pressable
        onPress={() => setMoved(value)}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={label}
        style={{
          flex: 1,
          height: t.layout.controlHeight,
          borderRadius: t.radius.md,
          borderWidth: on ? 2 : 1,
          borderColor: on ? colour : t.colors.border,
          backgroundColor: on ? colour : t.colors.bgRaised,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: t.space.sm,
        }}
      >
        <Ionicons name={icon} size={18} color={on ? '#FFFFFF' : colour} />
        <Text style={[t.type.button, { color: on ? '#FFFFFF' : t.colors.text }]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'center' }} onPress={onCancel}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            margin: t.space.xxl,
            padding: t.space.xxl,
            borderRadius: t.radius.xl,
            backgroundColor: t.colors.bg,
            gap: t.space.md,
          }}
        >
          <Text style={[t.type.sectionTitle, { color: t.colors.text, fontFamily: t.font.serif }]}>
            Re-torque check
          </Text>
          <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
            Go round the flange at full torque. Did any bolt take up?
          </Text>

          <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.xs }}>
            {answer(true, 'Bolts moved', 'alert-circle-outline', t.colors.accent)}
            {answer(false, 'All tight', 'checkmark-circle-outline', t.colors.success)}
          </View>

          <TextInput
            value={torque}
            onChangeText={setTorque}
            keyboardType="decimal-pad"
            placeholder={joint.torque ? `Torque used \u2014 spec is ${Math.round(joint.torque)}` : 'Torque used, ft-lb'}
            placeholderTextColor={t.colors.textFaint}
            accessibilityLabel="Re-torque check torque"
            style={field}
          />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="What you found, if it is worth keeping"
            placeholderTextColor={t.colors.textFaint}
            accessibilityLabel="Re-torque check note"
            style={field}
          />

          <View style={{ flexDirection: 'row', gap: t.space.md, marginTop: t.space.sm }}>
            <GhostButton label="Cancel" onPress={onCancel} style={{ flex: 1 }} />
            <AccentButton
              label="Save"
              icon="checkmark"
              style={{ flex: 1, opacity: moved === null ? 0.4 : 1 }}
              onPress={() => {
                if (moved === null) return;
                onSave(moved, torque, note.trim());
              }}
            />
          </View>
          {moved === null ? (
            <Text style={[t.type.caption, { color: t.colors.textFaint, textAlign: 'center' }]}>
              Answer the question above to save the check.
            </Text>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
