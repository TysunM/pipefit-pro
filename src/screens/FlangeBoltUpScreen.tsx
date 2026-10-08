import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Coach } from '../components/Coach';
import { Segmented } from '../components/Segmented';
import { StopSlider } from '../components/StopSlider';
import { FlangeIcon } from '../components/FlangeIcon';
import { Well, useSvgIds } from '../components/metal';
import { SectionHeader } from '../components/SectionHeader';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { HintRow } from '../components/HintRow';
import { Divider } from '../components/Divider';
import { useTheme, Theme } from '../theme/ThemeProvider';
import { boltHoleAngles, boltUp, boltUpSizes } from '../calc/boltUp';
import { isSteelClass, referenceTorque, steelFlange, steelSizes, studLabel, threadsPerInch } from '../calc/steelFlange';
import {
  BoltUpState,
  GASKETS,
  Gasket,
  METHODS,
  MethodId,
  ROUND_LOADS,
  Round,
  answerMoved,
  boltLevel,
  boltUpProgress,
  confirmGap,
  currentRound,
  currentStep,
  expectedBolts,
  isAsked,
  isFinished,
  loadTorque,
  loadWords,
  method,
  methodBar,
  methodsFor,
  nextStep,
  planOf,
  resetBoltUp,
  stepWords,
  tapBolt,
  undoBolt,
} from '../calc/boltUpSequence';
import { formatInches } from '../calc/ftin';
import { ChipRow } from '../components/ChipRow';
import { useSettings } from '../state/settings';
import { cleanProject } from '../state/project';
import { useJoints } from '../state/joints';
import {
  Joint,
  JointClass,
  JointSpec,
  ReCheck,
  Register,
  SCRATCH_ID,
  addCheck,
  freshId,
  getJoint,
  isCastIron,
  isDone,
  isScratch,
  isSettled,
  lastCheck,
  newJoint,
  putJoint,
  removeCheck,
  retightenDue,
  sinceLabel,
  withFlange,
  withGasket,
  withMethod,
  withState,
  recentNames,
} from '../state/register';
import { PERSON_MAX } from '../state/readSettings';
import { useInstruments } from '../state/instruments';
import { Instrument, findInstrument, goodOn, tagKey, usable } from '../state/calibration';
import { Chip } from '../components/JobChips';
import { dayKey } from '../calc/days';
import { useVoice } from '../voice/VoiceProvider';
import { useSpokenFigures } from '../voice/figures';
import { FaceLayout, boltCentre, fittedFace, flangeFace } from '../components/flange/face';

type Props = NativeStackScreenProps<RootStackParamList, 'FlangeBoltUp'>;

/** Bolt counts the handbook flanges actually use, for setting one by hand. */
const COUNTS = [4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 52, 60, 64, 68];

const FACE_MIN = 300;
const FACE_MAX = 360;
/** Closest two bolts are drawn full screen: a gloved fingertip apart. */
const FULL_PITCH = 40;

type BoltSkin = { fill: string; border: string; text: string; width: number };

/**
 * Untouched, then one step per load: snugged, 20-30%, 50-70%, full, checked.
 *
 * These are flat, saturated colours rather than the soft tints the rest of the
 * app uses, and they are not taken from the theme. The reason is legibility at
 * a distance: a fitter glancing at the face has to tell a bolt at a third from
 * a bolt at two thirds across the width of a phone, in daylight, and the
 * theme's tinted backgrounds sit within a few points of each other. Five
 * distinct hues, one per load, is the only arrangement that survives that.
 *
 * Numerals are dark on the light fills and white on the dark ones, so every
 * bolt number clears 4.5:1 against what it sits on.
 */
const BOLT_RAMP: readonly BoltSkin[] = [
  { fill: '#CBD5E1', border: '#94A3B8', text: '#1C1917', width: 2 }, // snugged
  { fill: '#FACC15', border: '#CA9A04', text: '#1C1917', width: 2 }, // 20-30%
  { fill: '#F97316', border: '#C2540A', text: '#1C1917', width: 2 }, // 50-70%
  { fill: '#2563EB', border: '#1D4FD8', text: '#FFFFFF', width: 2 }, // full load
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

const LEVEL_LABELS = ['Not started', 'Snugged', '20–30%', '50–70%', 'Full load', 'Checked'];

/** Every class a joint can be, as the chips offer them. */
const CLASS_OPTIONS: { value: JointClass; label: string }[] = [
  { value: '150', label: '150' },
  { value: '300', label: '300' },
  { value: '600', label: '600' },
  { value: '900', label: '900' },
  { value: '1500', label: '1500' },
  { value: '2500', label: '2500' },
  { value: '125', label: '125 cast iron' },
  { value: '250', label: '250 cast iron' },
];
const CLASS_IDS = CLASS_OPTIONS.map((c) => c.value);

type FlangeRow = { nps: number; label: string; bolts: number };

/** The flange of a size in a class, from whichever table holds that class. */
function flangeFor(nps: number, cls: JointClass): FlangeRow | undefined {
  if (isCastIron(cls)) {
    const f = boltUp(nps, cls);
    return f ? { nps: f.nps, label: f.label, bolts: f.bolts } : undefined;
  }
  const f = steelFlange(nps, cls);
  return f ? { nps: f.nps, label: f.label, bolts: f.bolts } : undefined;
}

const sizesOf = (cls: JointClass): FlangeRow[] => (isCastIron(cls) ? boltUpSizes(cls) : steelSizes(cls)).map((n) => flangeFor(n, cls)!).filter(Boolean);

const orderWords = (o: Round['order']): string => (o === 'across' ? 'across' : o === 'round' ? 'round' : o === 'quadrant' ? 'by quadrant' : 'together');

/** A round's load the way the list shows it. */
const roundLoad = (r: Round): string => (r.kind === 'staged' ? (r.load === 1 ? '20–30% → 50–70% → 100%' : '20–30%') : loadWords(r.load));

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
    const opening = flangeFor(settings.defaultNps, '150') ?? flangeFor(6, '150');
    apply((r) =>
      getJoint(r, jointId)
        ? r
        : putJoint(
            r,
            newJoint(jointId, { cls: '150', nps: opening?.nps ?? 6, bolts: opening?.bolts ?? 8 }, Date.now()),
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
  const { register: instruments } = useInstruments();
  const t = useTheme();
  const { settings } = useSettings();

  const { cls, nps, bolts, state, gasket } = joint;
  const [torque, setTorque] = useState(joint.torque === null ? '' : String(joint.torque));
  const [width, setWidth] = useState(FACE_MAX);
  const [showDone, setShowDone] = useState(false);
  const [full, setFull] = useState(false);
  const [naming, setNaming] = useState(false);
  const [checking, setChecking] = useState(false);

  const castIron = useMemo(() => (nps !== null && isCastIron(cls) ? boltUp(nps, cls) : undefined), [nps, cls]);
  const steel = useMemo(() => (nps !== null && isSteelClass(cls) ? steelFlange(nps, cls) : undefined), [nps, cls]);
  const flange: FlangeRow | undefined = castIron ?? steel;
  const sizes = useMemo(() => sizesOf(cls), [cls]);

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

  const rounds = planOf(state);
  const round = currentRound(state);
  const step = currentStep(state);
  const expected = expectedBolts(state);
  const first = expected[0] ?? 0;
  const asked = isAsked(state);
  const gap = state.gapPending;
  const done = isFinished(state);
  const progress = boltUpProgress(state);
  const after = nextStep(state)?.bolts[0];
  const locked = progress.done > 0 && !done;

  const finalTorque = Number(torque);
  const target = step ? loadTorque(finalTorque, step.load) : NaN;

  const methods = useMemo(() => methodsFor(bolts, gasket), [bolts, gasket]);
  const barred = useMemo(() => METHODS.filter((m) => methodBar(m.id, bolts, gasket) !== null), [bolts, gasket]);
  const chosen = method(state.method);

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

  const changeFlange = (spec: JointSpec) => {
    setFlange(spec);
    setShowDone(false);
  };

  // A bolt count set by hand belongs to no table size, so nps goes null and
  // the picture falls back to generic proportions rather than a wrong flange.
  const setBolts = (n: number) => changeFlange({ cls, nps: null, bolts: n });

  const pickSize = (size: number) => {
    const f = flangeFor(size, cls);
    if (f) changeFlange({ cls, nps: f.nps, bolts: f.bolts });
  };

  const pickClass = (c: JointClass) => {
    const f = flangeFor(nps ?? NaN, c) ?? sizesOf(c).find((row) => row.bolts >= 8) ?? sizesOf(c)[0];
    if (f) changeFlange({ cls: c, nps: f.nps, bolts: f.bolts });
  };

  const pickMethod = (id: MethodId) => {
    if (locked || id === state.method) return;
    write(withMethod(joint, id, Date.now()));
    setShowDone(false);
  };

  const pickGasket = (g: Gasket) => write(withGasket(joint, g, Date.now()));

  // Spoken: "flange bolt-up, 12 bolt", or "6 inch, class 300" for the table's
  // flange. A new flange starts the bolt-up over, so once a bolt is logged a
  // spoken one is refused rather than wiping the record.
  useSpokenFigures('FlangeBoltUp', (f) => {
    const c = f.cls ? (String(f.cls.n) as JointClass) : cls;
    if (f.cls && !CLASS_IDS.includes(c)) return `No class ${f.cls.n} table. Classes run 150 to 2500, and 125 or 250 cast iron.`;
    let spec: JointSpec | null = null;
    if (f.size) {
      const row = flangeFor(f.size.n, c);
      if (!row) return `No ${f.size.n} inch flange in the class ${c} table. Sizes run ${sizesOf(c)[0]?.label ?? ''} to ${sizesOf(c).at(-1)?.label ?? ''}.`;
      spec = { cls: c, nps: row.nps, bolts: row.bolts };
    } else if (f.bolts) spec = { cls: c, nps: null, bolts: f.bolts.n };
    else if (f.cls) {
      const row = flangeFor(nps ?? NaN, c) ?? sizesOf(c)[0];
      if (row) spec = { cls: c, nps: row.nps, bolts: row.bolts };
    }
    if (!spec || (spec.bolts === bolts && spec.nps === nps && spec.cls === cls)) return;
    if (locked) return `Bolt-up in progress, ${progress.done} logged. Tap Start over first, then say the flange.`;
    changeFlange(spec);
  });

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
    const moved: Joint = {
      ...joint,
      id,
      tag,
      note,
      createdAt: now,
      updatedAt: now,
      project: cleanProject(settings.projectId),
      // Whoever carries the phone is taken to be the one bolting it up until
      // somebody says otherwise on the record.
      boltedBy: joint.boltedBy.trim() ? joint.boltedBy : settings.fitterName.trim(),
    };
    const cleared = newJoint(SCRATCH_ID, { cls, nps, bolts, method: state.method, gasket }, now);
    apply((r) => putJoint(putJoint(r, moved), cleared));
    navigation.setParams({ jointId: id });
  };

  const onBolt = (bolt: number) => {
    const r = tapBolt(state, bolt);
    setState(r.state);
    if (r.ok) {
      Haptics.impactAsync(
        r.asked || r.gapCheck ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light,
      ).catch(() => {});
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  // The answer to a check round: a nut that turned means another round; none
  // turning closes the joint.
  const answer = (moved: boolean) => {
    const next = answerMoved(state, moved);
    setState(next);
    if (!moved) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      setShowDone(true);
    }
  };

  const gapDone = () => setState(confirmGap(state));

  // Hands-free: "done" is the button, "undo" is Undo, "repeat" says the step
  // again. Each answer is what the phone says back, worked out from the state
  // the command leaves, so it never lags a render behind.
  const voice = useVoice();
  const spoken = (s: BoltUpState): string => {
    if (isFinished(s)) return 'That was the last round. Joint complete.';
    if (isAsked(s)) return 'Check round done. Did any nut turn? Answer on the screen.';
    if (s.gapPending) return 'Gap check. Feelers round the flange, bring the low side up, then say done.';
    const r = currentRound(s);
    const st = currentStep(s);
    if (!r || !st) return 'Nothing to do.';
    if (r.kind === 'snug') return 'Snug every bolt by hand, nuts marked, ten to twenty foot pounds, then say done.';
    const tq = loadTorque(finalTorque, st.load);
    const load = st.pressure ? `Pressure ${st.pressure}.` : Number.isFinite(tq) ? `${Math.round(tq)} foot pounds.` : `${Math.round(st.load * 100)} percent.`;
    const intro = s.step === 0 ? `${r.label}, ${Math.round(st.load * 100)} percent. ` : '';
    return `${intro}${stepWords(st, s.bolts)}. ${load}`;
  };
  useEffect(() => {
    voice.useBolts((act) => {
      if (act === 'repeat') return spoken(state);
      if (act === 'undo') {
        const back = undoBolt(state);
        setState(back);
        setShowDone(false);
        return `Back. ${spoken(back)}`;
      }
      if (done) return 'The joint is complete.';
      if (isAsked(state)) return spoken(state);
      if (state.gapPending) {
        const cleared = confirmGap(state);
        setState(cleared);
        return spoken(cleared);
      }
      const r = tapBolt(state, first);
      onBolt(first);
      return spoken(r.state);
    });
  });
  const { useBolts, setHandsFree } = voice;
  useEffect(() => {
    const off = navigation.addListener('blur', () => setHandsFree(false));
    return () => {
      off();
      useBolts(null);
      setHandsFree(false);
    };
  }, [navigation, useBolts, setHandsFree]);

  // The picture is the flange in front of you: the bolt circle sits inside the
  // rim at the ratio the table gives, so a 2" joint reads narrow and a 24" one
  // reads wide. A flange with too many bolts to draw at a fingertip's pitch is
  // drawn fitted on the page, whole and small, and full screen at full size.
  const bcFrac = castIron ? castIron.boltCircle / castIron.flangeOd : 0.85;
  const avail = Math.max(FACE_MIN, Math.min(width - t.layout.screenPadding * 2, FACE_MAX));
  const crowded = flangeFace(bolts, avail, bcFrac).scrolls;
  const L = fittedFace(bolts, avail, bcFrac);
  const angles = useMemo(() => boltHoleAngles(bolts), [bolts]);

  const face = (layout: FaceLayout) => (
    <BoltFace
      t={t}
      L={layout}
      flange={castIron}
      angles={angles}
      state={state}
      expected={done ? [] : expected}
      after={done ? undefined : after}
      flash={flash}
      onBolt={onBolt}
    />
  );
  const logButton = done ? null : asked ? (
    <View style={{ gap: t.space.md }}>
      <AccentButton label="No nut turned: joint done" icon="checkmark-done-outline" onPress={() => answer(false)} />
      <GhostButton label="A nut turned: go round again" icon="refresh-outline" onPress={() => answer(true)} />
    </View>
  ) : gap ? (
    <AccentButton label="Gap checked, carry on" icon="resize-outline" onPress={gapDone} />
  ) : round?.kind === 'snug' ? (
    <AccentButton label="All snugged" icon="checkmark-outline" onPress={() => onBolt(first)} />
  ) : step ? (
    <AccentButton label={`${stepWords(step, bolts)} ${step.pressure ? 'tensioned' : 'torqued'}`} icon="checkmark-outline" onPress={() => onBolt(first)} />
  ) : null;
  const undo = () => {
    setState(undoBolt(state));
    setShowDone(false);
  };

  const reference = steel && Number.isFinite(referenceTorque(steel.stud, 50_000, 0.16))
    ? `For a ${studLabel(steel.stud)} B7 stud at 50 ksi, the PCC-1 Appendix K figure is ${Math.round(referenceTorque(steel.stud, 50_000, 0.16))} ft-lb with moly anti-seize (K 0.16) or ${Math.round(referenceTorque(steel.stud, 50_000, 0.20))} ft-lb with machine oil (K 0.20). A reference to check the spec against, not the spec.`
    : '';

  return (
    <Screen>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} />

      <Coach screen="FlangeBoltUp" done={[!isScratch(joint) && joint.tag.trim() !== '', Boolean(flange), joint.torque !== null, progress.done > 0 || done, done, Boolean(joint.witnessedBy.trim()) && Boolean(joint.wrench)]} />

      <JointBar
        t={t}
        joint={joint}
        onName={() => setNaming(true)}
        onRegister={() => navigation.navigate('Joints')}
      />

      <PassBanner t={t} state={state} target={target} progress={progress} />

      <View style={{ alignItems: 'center', paddingBottom: t.space.lg }}>{face(L)}</View>

      <View style={{ paddingHorizontal: t.layout.screenPadding, gap: t.space.md, marginBottom: t.space.md }}>
        {logButton}
        {voice.enabled && !done ? (
          <GhostButton
            label={voice.handsFree ? 'Stop hands-free' : 'Hands-free: say “done”'}
            icon={voice.handsFree ? 'stop-circle-outline' : 'mic-outline'}
            onPress={() => voice.setHandsFree(!voice.handsFree)}
          />
        ) : null}
        {crowded ? (
          <GhostButton label={`Full screen · ${bolts} bolts at full size`} icon="expand-outline" onPress={() => setFull(true)} />
        ) : null}
      </View>

      <ControlRow>
        <GhostButton
          label="Undo"
          icon="arrow-undo-outline"
          style={{ flex: 1 }}
          onPress={undo}
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

      {isScratch(joint) ? null : (
        <SignOff
          t={t}
          joint={joint}
          suggest={(role) => recentNames(register, role, 4)}
          wrenches={instruments.instruments}
          onChange={(patch) => write({ ...joint, ...patch, updatedAt: Date.now() })}
        />
      )}

      {isDone(joint) ? (
        <ReTorque
          t={t}
          joint={joint}
          onRecord={() => setChecking(true)}
          onRemove={(at) => write(removeCheck(joint, at, Date.now()))}
        />
      ) : null}

      <Divider />

      <HintRow text="Snug first, then the rounds the method lists, a gap check after each, then round the flange at 100% until no nut turns. That is ASME PCC-1. The screen only takes the bolt the sequence is asking for — tap anything else and it points you back." />

      <SectionHeader title="The joint" meta={flange ? `${flange.label} · class ${cls}` : `${bolts} bolts`} />

      <ChipRow label="Class" options={CLASS_OPTIONS} selected={cls} onSelect={pickClass} />

      <SizeRow t={t} sizes={sizes} selected={flange ? nps : null} onSelect={pickSize} />

      <StopSlider label="Bolts" stops={COUNTS} selected={bolts} onSelect={setBolts} />

      <View style={{ paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.lg }}>
        <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
          {castIron
            ? `${castIron.bolts} × ${formatInches(castIron.boltDiameter)} bolts, ${formatInches(castIron.boltLength)} long, on a ${formatInches(castIron.boltCircle)} bolt circle. Ring gasket ${formatInches(castIron.gasketId)} × ${formatInches(castIron.gasketOd)}. Cast iron is flat-faced and brittle: a full-face gasket and the lower torque its spec gives.`
            : steel
              ? `${steel.bolts} × ${studLabel(steel.stud)} studs, ${threadsPerInch(steel.stud)} threads per inch, ASME B16.5 class ${cls}. Bolt circle and gasket from the job's drawing. The class sets the studs; the studs, the material, the lubricant and the gasket set the torque.`
              : `${bolts} bolts, set by hand. The sequence works off the count alone, so this covers a flange that is not in the tables.`}
        </Text>
      </View>

      <ChipRow label="Gasket" options={GASKETS.map((g) => ({ value: g.id, label: g.label }))} selected={gasket} onSelect={pickGasket} />
      <View style={{ paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.lg }}>
        <Text style={[t.type.caption, { color: t.colors.textMuted }]}>{GASKETS.find((g) => g.id === gasket)?.words}</Text>
      </View>

      <Divider />
      <SectionHeader title="Method" meta="ASME PCC-1" />
      <ChipRow label="Method" options={methods.map((m) => ({ value: m.id, label: m.short }))} selected={state.method} onSelect={pickMethod} />
      <View style={{ paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.lg, gap: t.space.sm }}>
        <Text style={[t.type.body, { color: t.colors.text }]}>{`${chosen.name}. ${chosen.what}`}</Text>
        <Text style={[t.type.caption, { color: t.colors.textMuted }]}>{chosen.from}.</Text>
        {locked ? <Text style={[t.type.caption, { color: t.colors.warnText }]}>Bolt-up in progress. Start over to change the method.</Text> : null}
        {barred.length ? (
          <Text style={[t.type.caption, { color: t.colors.textFaint }]}>
            {barred.map((m) => `${m.short}: ${methodBar(m.id, bolts, gasket)}`).join(' ')}
          </Text>
        ) : null}
      </View>

      <Divider />
      <SectionHeader title="Torque" meta="from the job's bolting spec" />
      <View style={{ paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.lg }}>
        <Well style={{ height: t.layout.fieldHeight, justifyContent: 'center' }}>
          <TextInput
            value={torque}
            onChangeText={commitTorque}
            keyboardType="decimal-pad"
            placeholder="Final torque, ft-lb"
            placeholderTextColor={t.colors.textFaint}
            accessibilityLabel="Final torque in foot pounds"
            style={[t.type.fieldValue, { color: t.colors.data, paddingHorizontal: t.space.lg, height: '100%' }]}
          />
        </Well>
        <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: t.space.md }]}>
          The app splits the figure into rounds. It does not supply it: final torque depends on the stud size and
          material, the lubricant and the gasket, and a guessed figure either crushes the gasket or leaves the joint
          loose.
        </Text>
        {reference ? <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: t.space.sm }]}>{reference}</Text> : null}
      </View>

      <Divider />
      <SectionHeader title="The rounds" meta={chosen.short} />
      {rounds.map((r, i) => {
        const active = !done && i === state.round;
        const finished = done || i < state.round;
        return (
          <View
            key={`${r.label}-${i}`}
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
              <Text style={[t.type.labelSmall, { color: t.colors.textMuted, flex: 1 }]} numberOfLines={2}>
                {`${r.label} · ${roundLoad(r)} · ${orderWords(r.order)}${r.gapCheck ? ' · gap check after' : ''}`}
              </Text>
            </View>
            <Text style={[t.type.body, { color: t.colors.text, marginTop: t.space.sm }]}>{r.note}</Text>
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

      <FullFace
        t={t}
        visible={full && crowded}
        onClose={() => setFull(false)}
        L={flangeFace(bolts, Math.max(FACE_MIN, width), bcFrac, FULL_PITCH)}
        fitTo={(size) => fittedFace(bolts, size, bcFrac)}
        at={done || !first ? null : angles[first - 1] ?? null}
        banner={<PassBanner t={t} state={state} target={target} progress={progress} />}
        face={face}
        logButton={logButton}
        onUndo={undo}
      />
      <DoneSheet t={t} visible={showDone} bolts={bolts} rounds={rounds.length} methodName={chosen.name} onClose={() => setShowDone(false)} />
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

/**
 * The flange face: rim, gasket, bore, bolt circle and the bolts on it. The
 * bolt being asked for is lit, and a line runs from it to the one that
 * follows, so the eye is already on the far side of the flange before the
 * wrench is. Both are drawn under the markers, never over a number.
 */
function BoltFace({
  t,
  L,
  flange,
  angles,
  state,
  expected,
  after,
  flash,
  onBolt,
}: {
  t: Theme;
  L: FaceLayout;
  flange: ReturnType<typeof boltUp>;
  angles: number[];
  state: BoltUpState;
  expected: readonly number[];
  after: number | undefined;
  flash: Animated.Value;
  onBolt: (bolt: number) => void;
}) {
  const gid = useSvgIds('glow');
  const { face, c, odR, bcR, marker } = L;
  const scale = flange ? odR / (flange.flangeOd / 2) : 0;
  const gasketOdR = flange ? (flange.gasketOd / 2) * scale : bcR * 0.82;
  const gasketIdR = flange ? (flange.gasketId / 2) * scale : bcR * 0.58;
  const centre = (bolt: number | undefined) => {
    const deg = bolt === undefined ? undefined : angles[bolt - 1];
    return deg === undefined ? null : boltCentre(L, deg);
  };
  const at = centre(expected[0]);
  const to = centre(after);

  return (
    <View style={{ width: face, height: face }}>
      <Svg width={face} height={face}>
        <Circle cx={c} cy={c} r={odR} fill={t.colors.bgSubtle} stroke={t.colors.border} strokeWidth={1} />
        {/* The gasket, so the sealing face is the thing the bolts surround. */}
        <Circle cx={c} cy={c} r={gasketOdR} fill={t.colors.dataSoft} stroke={t.colors.borderStrong} strokeWidth={1} />
        {/* The bore, which is a hole and should read as one. */}
        <Circle cx={c} cy={c} r={gasketIdR} fill={t.colors.bg} stroke={t.colors.borderStrong} strokeWidth={1.5} />
        <Circle cx={c} cy={c} r={bcR} fill="none" stroke={t.colors.textFaint} strokeWidth={1} strokeDasharray="4 5" opacity={0.7} />
        <Line x1={c} y1={c - odR} x2={c} y2={c + odR} stroke={t.colors.textFaint} strokeWidth={0.75} opacity={0.4} />
        <Line x1={c - odR} y1={c} x2={c + odR} y2={c} stroke={t.colors.textFaint} strokeWidth={0.75} opacity={0.4} />
        {at ? (
          <>
            <Defs>
              <RadialGradient id={gid('a')} cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0" stopColor={t.colors.primary} stopOpacity={0.75} />
                <Stop offset="0.55" stopColor={t.colors.primary} stopOpacity={0.28} />
                <Stop offset="1" stopColor={t.colors.primary} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            {to ? (
              <Line
                x1={at.x}
                y1={at.y}
                x2={to.x}
                y2={to.y}
                stroke={t.colors.accent}
                strokeWidth={2}
                strokeDasharray="7 5"
                strokeLinecap="round"
                opacity={0.9}
              />
            ) : null}
            <Circle cx={at.x} cy={at.y} r={Math.max(L.ring * 1.15, 22)} fill={`url(#${gid('a')})`} />
          </>
        ) : null}
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
            next={expected.includes(bolt)}
            flash={flash}
            onPress={() => onBolt(bolt)}
          />
        );
      })}
    </View>
  );
}

/**
 * A crowded flange over the whole phone, status bar and all. It opens on the
 * whole flange, as big as the screen holds it, so nothing is ever cut off;
 * Zoom in draws it at a gloved pitch, bigger than the screen, and glides to
 * the bolt being asked for each time one is logged (drag to look around).
 */
function FullFace({
  t,
  visible,
  onClose,
  L,
  fitTo,
  at,
  banner,
  face,
  logButton,
  onUndo,
}: {
  t: Theme;
  visible: boolean;
  onClose: () => void;
  /** The zoomed face, bigger than the screen. */
  L: FaceLayout;
  /** The whole face, fitted to a square of the size given. */
  fitTo: (size: number) => FaceLayout;
  at: number | null;
  banner: React.ReactNode;
  face: (L: FaceLayout) => React.ReactNode;
  logButton: React.ReactNode;
  onUndo: () => void;
}) {
  const insets = useSafeAreaInsets();
  const win = useWindowDimensions();
  const across = useRef<ScrollView | null>(null);
  const down = useRef<ScrollView | null>(null);
  const [view, setView] = useState({ w: win.width, h: win.height / 2 });
  const [zoom, setZoom] = useState(false);

  // Every time it opens, it opens on the whole flange.
  useEffect(() => {
    if (visible) setZoom(false);
  }, [visible]);

  // Zoomed, follow the bolt: centre it in the window whenever it changes.
  useEffect(() => {
    if (!visible || !zoom || at === null) return;
    const p = boltCentre(L, at);
    const go = () => {
      across.current?.scrollTo({ x: Math.max(0, p.x - view.w / 2), animated: true });
      down.current?.scrollTo({ y: Math.max(0, p.y - view.h / 2), animated: true });
    };
    // The first time, the scroll views are only just laid out.
    const id = setTimeout(go, 60);
    return () => clearTimeout(id);
  }, [visible, zoom, at, L, view.w, view.h]);

  const whole = fitTo(Math.max(160, Math.min(view.w, view.h) - 8));

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {visible ? <StatusBar hidden /> : null}
      <View style={{ flex: 1, backgroundColor: t.colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        {banner}
        <View style={{ flex: 1 }} onLayout={(e) => setView({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {zoom ? (
            <ScrollView ref={down} showsVerticalScrollIndicator={false}>
              <ScrollView ref={across} horizontal showsHorizontalScrollIndicator={false}>
                {face(L)}
              </ScrollView>
            </ScrollView>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{face(whole)}</View>
          )}
        </View>
        <View style={{ paddingVertical: t.space.md, gap: t.space.md }}>
          <View style={{ paddingHorizontal: t.layout.screenPadding }}>{logButton}</View>
          <ControlRow>
            <GhostButton label="Undo" icon="arrow-undo-outline" style={{ flex: 1 }} onPress={onUndo} />
            <GhostButton
              label={zoom ? 'Whole' : 'Zoom'}
              icon={zoom ? 'scan-outline' : 'search-outline'}
              style={{ flex: 1 }}
              onPress={() => setZoom((z) => !z)}
            />
            <GhostButton label="Exit" icon="contract-outline" style={{ flex: 1 }} onPress={onClose} />
          </ControlRow>
        </View>
      </View>
    </Modal>
  );
}

function PassBanner({
  t,
  state,
  target,
  progress,
}: {
  t: Theme;
  state: BoltUpState;
  target: number;
  progress: { done: number; total: number };
}) {
  const rounds = planOf(state);
  const round = currentRound(state);
  const step = currentStep(state);
  const done = isFinished(state);
  const asked = isAsked(state);
  const gap = state.gapPending;
  const wrong = state.lastWrong;
  const next = nextStep(state);
  const expected = expectedBolts(state);

  const headline = done
    ? 'Joint complete'
    : asked
      ? 'Did any nut turn?'
      : gap
        ? 'Gap check'
        : round?.kind === 'snug'
          ? 'Snug every bolt'
          : step
            ? stepWords(step, state.bolts)
            : '';
  const line = done
    ? `${rounds.length} rounds recorded`
    : `${round?.label ?? ''} ${round && round.kind !== 'snug' ? `of ${rounds.length}` : ''} · ${step ? loadWords(step.load) : round ? roundLoad(round) : ''} · ${round ? orderWords(round.order) : ''}`;
  const detail = done
    ? null
    : asked
      ? 'Go round once more if it did. If nothing moved, the joint is done and the four-hour dwell starts.'
      : gap
        ? 'Feelers round the flange. Bring the low side up before the next round.'
        : round?.kind === 'snug'
          ? 'Hand-tight, nuts on one side, ends marked, then 10 to 20 ft-lb.'
          : step?.pressure
            ? `Pressure ${step.pressure} from the tensioner table · step ${state.step + 1} of ${round?.steps.length ?? 0}`
            : Number.isFinite(target)
              ? `${Math.round(target)} ft-lb · step ${state.step + 1} of ${round?.steps.length ?? 0}`
              : `step ${state.step + 1} of ${round?.steps.length ?? 0}`;

  return (
    <View style={{ backgroundColor: t.colors.bgSubtle, paddingHorizontal: t.layout.screenPadding, paddingVertical: t.space.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
        <Ionicons
          name={done ? 'checkmark-done-outline' : asked ? 'help-circle-outline' : gap ? 'resize-outline' : 'git-compare-outline'}
          size={18}
          color={done ? t.colors.success : t.colors.textMuted}
        />
        <Text style={[t.type.label, { color: done ? t.colors.success : t.colors.textMuted, flex: 1 }]} numberOfLines={1}>
          {line}
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
        {headline}
      </Text>

      {detail ? (
        <Text style={[t.type.bodyStrong, { color: t.colors.data, marginTop: t.space.xs }]} numberOfLines={2}>
          {detail}
        </Text>
      ) : null}

      {!done && next && expected.length ? (
        <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: t.space.sm }]} numberOfLines={1}>
          {`Then ${stepWords(next, state.bolts).toLowerCase()}`}
        </Text>
      ) : null}

      {!done && wrong !== null && expected.length ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm, marginTop: t.space.md }}>
          <Ionicons name="alert-circle" size={16} color={t.colors.danger} />
          <Text style={[t.type.captionStrong, { color: t.colors.danger, flex: 1 }]}>
            {`Bolt ${wrong} is out of sequence. ${stepWords({ bolts: expected, load: 1 }, state.bolts)} ${expected.length > 1 ? 'are' : 'is'} next.`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * The sizes as a row of flanges. Each one is drawn with its own bolt count,
 * so a man who knows his flange has eight holes finds it by the picture.
 */
function SizeRow({
  t,
  sizes,
  selected,
  onSelect,
}: {
  t: Theme;
  sizes: { nps: number; label: string; bolts: number }[];
  selected: number | null;
  onSelect: (nps: number) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: t.space.lg }}>
      <Text style={[t.type.label, { color: t.colors.textMuted, width: 64, marginLeft: t.layout.screenPadding }]}>Size</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: t.space.sm, paddingRight: t.layout.screenPadding, paddingLeft: t.space.md }}
      >
        {sizes.map((s) => {
          const on = s.nps === selected;
          return (
            <Pressable
              key={s.nps}
              onPress={() => onSelect(s.nps)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${s.label} flange, ${s.bolts} bolts`}
              style={({ pressed }) => ({
                width: 64,
                paddingVertical: t.space.sm,
                borderRadius: t.radius.md,
                alignItems: 'center',
                gap: 4,
                borderWidth: 1,
                borderColor: on ? t.colors.primary : t.colors.border,
                backgroundColor: on ? (pressed ? t.colors.primaryPressed : t.colors.primary) : pressed ? t.colors.bgSubtle : t.colors.bgRaised,
              })}
            >
              <FlangeIcon bolts={s.bolts} active={on} />
              <Text style={[t.type.labelSmall, { color: on ? t.colors.onPrimary : t.colors.text }]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
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
        <Text style={{ fontFamily: t.font.sans, color: skin.text, fontSize: Math.max(8, Math.min(15, size * (size < 20 ? 0.56 : 0.45))), ...t.weight('700') }}>
          {bolt}
        </Text>
      </Pressable>
    </View>
  );
}

function DoneSheet({ t, visible, bolts, rounds, methodName, onClose }: { t: Theme; visible: boolean; bolts: number; rounds: number; methodName: string; onClose: () => void }) {
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
          <Text style={[t.type.sectionTitle, { color: t.colors.text, textAlign: 'center' }]}>
            Joint complete
          </Text>
          <Text style={[t.type.body, { color: t.colors.textMuted, textAlign: 'center' }]}>
            {`${rounds} rounds on all ${bolts} bolts, in order, by the ${methodName}. No nut turned on the last check round.`}
          </Text>
          <Text style={[t.type.caption, { color: t.colors.textMuted, textAlign: 'center' }]}>
            The app recorded the sequence. It did not measure torque, and it cannot see the gasket. Retighten after a dwell
            of at least four hours and record it below, and again once the line has been up to temperature.
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

/**
 * Who bolted it and who watched. Both go on the turnover record, and a
 * finished joint missing either is listed there as open. The names used
 * before sit under each field, so the inspector who witnesses every joint on
 * the job is one tap and spelled the same way on every record.
 */
function SignOff({
  t,
  joint,
  suggest,
  wrenches,
  onChange,
}: {
  t: Theme;
  joint: Joint;
  suggest: (role: 'boltedBy' | 'witnessedBy') => string[];
  /** The calibration register, for the wrench. */
  wrenches: readonly Instrument[];
  onChange: (patch: Partial<Pick<Joint, 'boltedBy' | 'witnessedBy' | 'wrench'>>) => void;
}) {
  const done = isDone(joint);
  const row = (role: 'boltedBy' | 'witnessedBy', label: string, placeholder: string) => {
    const value = joint[role];
    const picks = suggest(role).filter((n) => n.toUpperCase() !== value.trim().toUpperCase());
    return (
      <View style={{ gap: t.space.sm }}>
        <Text style={[t.type.labelSmall, { color: t.colors.textMuted }]}>{label}</Text>
        <Well style={{ height: t.layout.fieldHeight, justifyContent: 'center' }}>
          <TextInput
            value={value}
            onChangeText={(v) => onChange({ [role]: v.slice(0, PERSON_MAX) })}
            placeholder={placeholder}
            placeholderTextColor={t.colors.textFaint}
            accessibilityLabel={label}
            autoCapitalize="words"
            autoCorrect={false}
            style={[t.type.fieldValue, { color: t.colors.text, paddingHorizontal: t.space.lg, height: '100%' }]}
          />
        </Well>
        {picks.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm }}>
            {picks.map((n) => (
              <Pressable
                key={n}
                onPress={() => onChange({ [role]: n })}
                accessibilityRole="button"
                accessibilityLabel={`${label}: ${n}`}
                style={({ pressed }) => ({
                  height: 34,
                  paddingHorizontal: 12,
                  borderRadius: 17,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  backgroundColor: pressed ? t.colors.metalLo : t.colors.metalHi,
                  justifyContent: 'center',
                })}
              >
                <Text style={[t.type.caption, { color: t.colors.text }]}>{n}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    );
  };
  const missing = [!joint.boltedBy.trim() && 'who bolted it', !joint.witnessedBy.trim() && 'a witness'].filter(Boolean);
  return (
    <>
      <SectionHeader title="Sign-off" meta="on the turnover record" />
      <View style={{ paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.lg, gap: t.space.lg }}>
        {row('boltedBy', 'Bolted by', 'Name and badge #')}
        {row('witnessedBy', 'Witnessed by', 'QC inspector or foreman')}
        {(() => {
          // The wrench, from the calibration register, judged on the day it was pulled up.
          const on = dayKey(joint.completedAt ?? Date.now());
          const good = usable(wrenches, 'torque', on);
          const mine = joint.wrench ? findInstrument({ instruments: [...wrenches], foreign: false, dropped: 0 }, joint.wrench) : undefined;
          const verdict = mine ? goodOn(mine, on) : null;
          if (!good.length && !joint.wrench) return null;
          return (
            <View style={{ gap: t.space.sm }}>
              <Text style={[t.type.labelSmall, { color: t.colors.textMuted }]}>Torque wrench</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm }}>
                {good.map((w) => (
                  <Chip key={w.id} label={`${w.tag}${w.max ? ` · ${w.max} ft-lb` : ''}`} on={tagKey(w.tag) === tagKey(joint.wrench)} onPress={() => onChange({ wrench: tagKey(w.tag) === tagKey(joint.wrench) ? '' : w.tag })} />
                ))}
                {joint.wrench && !good.some((w) => tagKey(w.tag) === tagKey(joint.wrench)) ? <Chip label={joint.wrench} on onPress={() => onChange({ wrench: '' })} /> : null}
              </View>
              {verdict && !verdict.ok ? <Text style={[t.type.caption, { color: t.colors.danger }]}>{`Calibration register: ${verdict.why}.`}</Text> : null}
              {joint.wrench && !mine ? <Text style={[t.type.caption, { color: t.colors.warnText }]}>{`${joint.wrench} is not on the calibration register.`}</Text> : null}
            </View>
          );
        })()}
        <Text style={[t.type.caption, { color: done && missing.length ? t.colors.warnText : t.colors.textMuted }]}>
          {done && missing.length
            ? `Finished, but ${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} not recorded. The turnover package lists it as open until it is.`
            : 'Printed in the bolt-up record of the turnover package. Set your own name in Settings and it fills Bolted by on every joint you name.'}
        </Text>
      </View>
    </>
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
    fontFamily: t.font.sansMedium,
    fontSize: 17,
    ...t.weight('600'),
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
          <Text style={[t.type.sectionTitle, { color: t.colors.text }]}>
            {isScratch(joint) ? 'Name this joint' : 'Rename this joint'}
          </Text>
          <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
            Whatever you would call it out by — a line number, a spool mark, a valve tag.
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
  const due = retightenDue(joint);
  const now = Date.now();
  const waiting = due !== null && now < due;
  const tone = settled ? t.colors.success : last ? t.colors.accent : waiting ? t.colors.textMuted : t.colors.warnText;
  const heading = settled
    ? 'Nothing moved last time'
    : last
      ? 'Still taking up'
      : waiting
        ? `Retighten after ${new Date(due).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
        : 'Retightening round due';

  return (
    <>
      <Divider />
      <SectionHeader
        title="Retighten"
        meta={joint.checks.length ? `${joint.checks.length} round${joint.checks.length === 1 ? '' : 's'}` : 'PCC-1 dwell, 4 h'}
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
            ? 'A round that finds every bolt tight is the one that closes a joint out. Go round again if the line cycles hard.'
            : last
              ? 'Bolts took up on the last round, so the joint is still relaxing. Go back to it after another cycle.'
              : 'PCC-1 asks for a dwell of at least four hours, then a round at 100% straight round the flange, before the test or start-up. Soft gaskets relax most. Then again once the line has been up to temperature, to the owner\'s procedure.'}
        </Text>
      </View>

      {joint.checks
        .slice()
        .reverse()
        .map((c) => (
          <CheckRow key={c.at} t={t} check={c} onRemove={() => onRemove(c.at)} />
        ))}

      <ControlRow>
        <AccentButton label="Record a retightening round" icon="create-outline" style={{ flex: 1 }} onPress={onRecord} />
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
    fontFamily: t.font.sansMedium,
    fontSize: 17,
    ...t.weight('600'),
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
          <Text style={[t.type.sectionTitle, { color: t.colors.text }]}>
            Retightening round
          </Text>
          <Text style={[t.type.caption, { color: t.colors.textMuted }]}>
            Straight round the flange at 100%, in order. Did any nut take up?
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
            accessibilityLabel="Retightening round torque"
            style={field}
          />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="What you found, if it is worth keeping"
            placeholderTextColor={t.colors.textFaint}
            accessibilityLabel="Retightening round note"
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
