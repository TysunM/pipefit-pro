// One pressure test
// -----------------
// The test package's form, on the phone that runs the test. Filled in from
// the top before pressure goes on — what is in the test, the figures, the
// gauges, the relief valve, the walk-down — then the hold is timed here, the
// readings logged as they are taken, the result written and the people sign
// on the glass. The record is saved on every touch.
//
// What the code says about the figures is worked out as they are typed, and
// shown at the top: the things that make the record wrong first, then the
// things to look at. A test is never stopped from being saved for any of
// them; the inspector decides, the app makes sure he sees.

import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { Segmented } from '../components/Segmented';
import { ChipRow } from '../components/ChipRow';
import { Plate } from '../components/metal';
import { FooterNote } from '../components/Results';
import { Banner, CheckRow, ClockField, DateField, DayStepper, NoteField, NumField, readNumber, useNow } from '../components/FormFields';
import { SignatureSheet, SignatureView } from '../components/SignatureSheet';
import { useTheme } from '../theme/ThemeProvider';
import { usePressureTests } from '../state/pressureTests';
import { useSketches } from '../state/sketches';
import { sameProject } from '../state/project';
import { sortSketches } from '../state/sketchStore';
import {
  CODE_LABEL,
  KIND_LABEL,
  MAX_GAUGES,
  NAME_MAX,
  PressureTest,
  ROLES,
  ROLE_LABEL,
  Role,
  SYSTEM_MAX,
  TEXT_MAX,
  TestCode,
  TestKind,
  TestResult,
  canAdd,
  deleteTest,
  endHold,
  freshId,
  getTest,
  holding,
  isSigned,
  logReading,
  putTest,
  retest,
  startHold,
  stepsFor,
  testName,
} from '../state/pressureLog';
import { CODE_HOLD_MIN, checkTest, codeRule, holdState, prelimPsi, problems, reliefMax, requiredHold } from '../calc/pressureTest';
import { clockLabel, stopwatch } from '../calc/days';
import { holdAlerts } from '../calc/holdAlerts';
import { useHoldAlerts } from '../state/holdAlerts';
import { ISO_GRID } from '../calc/iso';
import { shareSheet } from '../print/share';
import { testRecordHtml } from '../print/testRecord';
import { day as printDay } from '../print/turnover';

type Props = NativeStackScreenProps<RootStackParamList, 'PressureTest'>;

const MEDIA = ['Water', 'Air', 'Nitrogen'];
const fig = (n: number) => `${Math.round(n * 10) / 10}`;

export function PressureTestScreen({ route, navigation }: Props) {
  const t = useTheme();
  const { log, apply } = usePressureTests();
  const { book } = useSketches();
  const test = getTest(log, route.params.testId);
  const now = useNow(test ? holding(test) : false);
  const [signing, setSigning] = useState<Role | null>(null);
  const [gauge, setGauge] = useState('');
  const [confirm, setConfirm] = useState<null | 'delete' | 'restart'>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const title = test ? testName(test) : 'Pressure test';
  useEffect(() => navigation.setOptions({ title }), [navigation, title]);

  // A buzz when the hold has run long enough, for a phone in a shirt pocket.
  const hs = test ? holdState(test, now) : ({ phase: 'ready' } as const);
  const met = hs.phase === 'ready' ? null : hs.met;
  const wasMet = useRef<boolean | null>(null);
  useEffect(() => {
    if (hs.phase === 'holding' && wasMet.current === false && met) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    wasMet.current = hs.phase === 'holding' ? met : null;
  }, [hs.phase, met]);

  if (!test)
    return (
      <Screen>
        <Banner tone="warn" icon="trash-outline" text="This test is no longer on the phone." />
        <ControlRow>
          <GhostButton label="Back to the tests" icon="arrow-back" style={{ flex: 1 }} onPress={() => navigation.goBack()} />
        </ControlRow>
      </Screen>
    );

  /** A change to this test, made to the newest copy of it, never the one this render saw. */
  const change = (f: (x: PressureTest) => PressureTest) =>
    apply((l) => {
      const cur = getTest(l, test.id);
      return cur ? putTest(l, f(cur), Date.now()) : l;
    });
  const edit = (patch: Partial<PressureTest>) => change((x) => ({ ...x, ...patch }));

  const rule = codeRule(test.code, test.kind, test.designPsi);
  const need = requiredHold(test);
  const issues = problems(checkTest(test));
  const top = reliefMax(test);
  const prelim = prelimPsi(test);
  const later = log.tests.find((x) => x.id !== test.id && x.pkg.toUpperCase() === test.pkg.toUpperCase() && sameProject(x.project, test.project) && x.attempt > test.attempt);
  const jobIsos = sortSketches(book.sketches.filter((s) => sameProject(s.project, test.project)));
  const gaugeNow = readNumber(gauge);
  const lastPsi = test.readings[test.readings.length - 1]?.psi ?? test.hold.startPsi;

  const limitWords =
    rule.min === null
      ? test.code === 'spec'
        ? 'Job spec: no code figure'
        : 'Enter the design pressure'
      : rule.max !== null
        ? `${test.code}: ${rule.min}–${rule.max} psi`
        : `${test.code}: at least ${rule.min} psi`;

  const start = () => {
    const p = gaugeNow ?? test.testPsi;
    if (p === null) return setNote('Read the gauge and type it in first.');
    setNote(null);
    change((x) => startHold(x, Date.now(), p));
    setGauge('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  const reading = () => {
    if (gaugeNow === null) return setNote('Type the gauge reading to log it.');
    setNote(null);
    change((x) => logReading(x, Date.now(), gaugeNow));
    setGauge('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const end = () => {
    const p = gaugeNow ?? lastPsi;
    if (p === null) return setNote('Read the gauge and type it in first.');
    setNote(null);
    change((x) => endHold(x, Date.now(), p));
    setGauge('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const share = async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    const isos = test.isos.map((id) => book.sketches.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s);
    const out = await shareSheet(
      testRecordHtml({ test, dateLine: `Printed ${printDay(Date.now())}`, isos, grid: ISO_GRID, now: Date.now() }),
      `Pressure test ${testName(test)}`,
    );
    setBusy(false);
    if (!out.ok) setNote(out.why);
  };

  const startRetest = () => {
    if (later) return navigation.replace('PressureTest', { testId: later.id });
    if (!canAdd(log)) return setNote('The phone holds as many tests as it keeps. Share and delete old ones first.');
    const id = freshId(log, Date.now());
    apply((l) => putTest(l, { ...retest(test, Date.now()), id }, Date.now()));
    navigation.replace('PressureTest', { testId: id });
  };

  const statusIcon = test.result === 'pass' ? 'checkmark-circle' : test.result === 'fail' ? 'close-circle' : hs.phase === 'holding' ? 'timer-outline' : 'ellipse-outline';
  const statusInk = test.result === 'pass' ? t.colors.success : test.result === 'fail' ? t.colors.danger : hs.phase === 'holding' ? t.colors.data : t.colors.textMuted;
  const statusWord =
    test.result !== 'open'
      ? test.result === 'pass'
        ? 'Passed'
        : 'Failed'
      : hs.phase === 'holding'
        ? 'Holding'
        : hs.phase === 'held'
          ? 'Hold done; result not set'
          : 'Not started';

  return (
    <Screen>
      {/* What the record is, and what is wrong with it, before anything else. */}
      <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.lg }}>
        <Plate radius={t.radius.xl} style={{ padding: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name={statusIcon} size={28} color={statusInk} />
            <View style={{ flex: 1 }}>
              <Text style={[t.type.tileTitle, { color: t.colors.text }]}>{statusWord}</Text>
              <Text style={[t.type.caption, { color: t.colors.textMuted }]} numberOfLines={1}>
                {[KIND_LABEL[test.kind], CODE_LABEL[test.code], test.testPsi !== null ? `${fig(test.testPsi)} psi` : 'no test pressure', test.project || 'No project'].join(' · ')}
              </Text>
            </View>
          </View>
          {hs.phase !== 'ready' ? (
            <View style={{ gap: 6 }}>
              <Text style={[t.type.displaySmall, { color: hs.met ? t.colors.success : t.colors.data }]} accessibilityLiveRegion="polite">
                {stopwatch(hs.elapsedMs)}
                {hs.needMs !== null ? <Text style={[t.type.body, { color: t.colors.textMuted }]}>{`  of ${stopwatch(hs.needMs)}${hs.met ? ' · met' : ''}`}</Text> : null}
              </Text>
              {hs.needMs !== null ? (
                <View style={{ height: 6, borderRadius: 3, backgroundColor: t.colors.bgSubtle, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.min(100, (hs.elapsedMs / hs.needMs) * 100)}%`, height: '100%', backgroundColor: hs.met ? t.colors.success : t.colors.data }} />
                </View>
              ) : null}
            </View>
          ) : null}
          {issues.length ? (
            issues.map((c) => (
              <View key={c.id} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <Ionicons name={c.level === 'stop' ? 'alert-circle' : 'warning-outline'} size={17} color={c.level === 'stop' ? t.colors.danger : t.colors.warnText} style={{ marginTop: 1 }} />
                <Text style={[t.type.caption, { color: c.level === 'stop' ? t.colors.danger : t.colors.warnText, flex: 1 }]}>{c.text}</Text>
              </View>
            ))
          ) : (
            <Text style={[t.type.caption, { color: t.colors.textMuted }]}>Nothing to fix so far.</Text>
          )}
        </Plate>
      </View>

      {note ? (
        <View style={{ paddingTop: t.space.md }}>
          <Banner tone="warn" icon="information-circle-outline" text={note} action="OK" onAction={() => setNote(null)} />
        </View>
      ) : null}

      <SectionHeader title="The hold" meta={need !== null ? `${need} MIN NEEDED` : undefined} />
      {hs.phase === 'ready' ? (
        <>
          <FieldRow>
            <DimensionInput label="Gauge at test pressure" value={gauge} onChangeText={setGauge} suffix="psi" placeholder={test.testPsi !== null ? fig(test.testPsi) : ''} />
          </FieldRow>
          <ControlRow>
            <AccentButton label="Start the hold" icon="timer-outline" style={{ flex: 1 }} onPress={start} />
          </ControlRow>
          {prelim !== null ? (
            <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.md, marginBottom: t.space.lg }]}>
              {`B31.3 pneumatic: check at ${fig(prelim)} psi first, then go up in steps, holding at each. After the hold, drop to the ${test.designPsi !== null ? `${fig(test.designPsi)} psi ` : ''}design pressure to look for leaks.`}
            </Text>
          ) : null}
        </>
      ) : hs.phase === 'holding' ? (
        <>
          <FieldRow>
            <DimensionInput label="Gauge now" value={gauge} onChangeText={setGauge} suffix="psi" placeholder={lastPsi !== null ? fig(lastPsi) : ''} />
          </FieldRow>
          <ControlRow>
            <GhostButton label="Log reading" icon="add-outline" style={{ flex: 1 }} onPress={reading} />
            <AccentButton label="End the hold" icon="stop-circle-outline" style={{ flex: 1 }} onPress={end} />
          </ControlRow>
          <HoldAlertLine test={test} now={now} />
        </>
      ) : (
        <ControlRow>
          {confirm === 'restart' ? (
            <>
              <GhostButton label="Keep it" style={{ flex: 1 }} onPress={() => setConfirm(null)} />
              <GhostButton
                label="Clear the hold"
                icon="refresh-outline"
                style={{ flex: 1, borderColor: t.colors.danger }}
                onPress={() => {
                  setConfirm(null);
                  edit({ hold: { startAt: null, startPsi: null, endAt: null, endPsi: null }, readings: [] });
                }}
              />
            </>
          ) : (
            <GhostButton label="Hold it again" icon="refresh-outline" style={{ flex: 1 }} onPress={() => setConfirm('restart')} />
          )}
        </ControlRow>
      )}

      {/* The stamps, for a test written up after the fact — or one timed on another watch. */}
      <FieldRow>
        <ClockField label="Hold started" value={test.hold.startAt} day={test.day} onChange={(at) => change((x) => ({ ...x, hold: at === null ? { startAt: null, startPsi: null, endAt: null, endPsi: null } : { ...x.hold, startAt: at } }))} />
        {test.hold.startAt !== null ? (
          <NumField label="At" suffix="psi" value={test.hold.startPsi} onChange={(v) => change((x) => ({ ...x, hold: { ...x.hold, startPsi: v } }))} />
        ) : null}
      </FieldRow>
      {test.hold.startAt !== null ? (
        <FieldRow>
          <ClockField label="Hold ended" value={test.hold.endAt} day={test.day} onChange={(at) => change((x) => ({ ...x, hold: { ...x.hold, endAt: at, endPsi: at === null ? null : x.hold.endPsi } }))} />
          <NumField label="At" suffix="psi" value={test.hold.endPsi} onChange={(v) => change((x) => ({ ...x, hold: { ...x.hold, endPsi: v } }))} />
        </FieldRow>
      ) : null}
      {test.readings.map((r, i) => (
        <View
          key={`${r.at}-${i}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingHorizontal: t.layout.screenPadding, paddingVertical: t.space.sm, borderTopWidth: t.hairline, borderTopColor: t.colors.border }}
        >
          <Ionicons name="speedometer-outline" size={17} color={t.colors.textMuted} />
          <Text style={[t.type.body, { color: t.colors.text, flex: 1 }]}>{`${clockLabel(r.at)}  ·  ${fig(r.psi)} psi`}</Text>
          <Pressable onPress={() => change((x) => ({ ...x, readings: x.readings.filter((_, k) => k !== i) }))} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove the ${clockLabel(r.at)} reading`}>
            <Ionicons name="close" size={18} color={t.colors.textFaint} />
          </Pressable>
        </View>
      ))}

      <SectionHeader title="The test" />
      <FieldRow>
        <DimensionInput label="Test package" value={test.pkg} onChangeText={(v) => edit({ pkg: v.slice(0, NAME_MAX) })} placeholder="TP-014" keyboardType="default" autoCapitalize="characters" />
      </FieldRow>
      <DayStepper day={test.day} onChange={(d) => edit({ day: d })} />
      <NoteField label="What is in the test" value={test.system} max={SYSTEM_MAX} onChangeText={(v) => edit({ system: v })} placeholder="Lines CW-1001, CW-1002; isos 3-114 rev B, 3-115 rev A" />
      <Segmented<TestCode>
        label="Code"
        options={[
          { value: 'B31.3', label: 'B31.3' },
          { value: 'B31.1', label: 'B31.1' },
          { value: 'spec', label: 'Job spec' },
        ]}
        selected={test.code}
        onSelect={(code) => edit({ code })}
      />
      <Segmented<TestKind>
        label="Test"
        options={[
          { value: 'hydro', label: 'Hydro' },
          { value: 'pneumatic', label: 'Pneumatic' },
        ]}
        selected={test.kind}
        onSelect={(kind) =>
          // The fluid follows the test, unless somebody chose another.
          edit({ kind, medium: kind === 'hydro' && test.medium !== 'Water' && MEDIA.includes(test.medium) ? 'Water' : kind === 'pneumatic' && test.medium === 'Water' ? 'Air' : test.medium })
        }
      />
      <ChipRow
        label="Medium"
        options={[...MEDIA, 'Other'].map((m) => ({ value: m, label: m }))}
        selected={MEDIA.includes(test.medium) ? test.medium : 'Other'}
        onSelect={(m) => edit({ medium: m === 'Other' ? '' : m })}
      />
      {!MEDIA.includes(test.medium) ? (
        <FieldRow>
          <DimensionInput label="Medium" value={test.medium} onChangeText={(v) => edit({ medium: v.slice(0, NAME_MAX) })} placeholder="Water with inhibitor" keyboardType="default" />
        </FieldRow>
      ) : null}

      <SectionHeader title="Pressures" />
      <FieldRow>
        <NumField label="Design" suffix="psi" value={test.designPsi} onChange={(v) => edit({ designPsi: v })} />
        <NumField label="Design temp" suffix="°F" value={test.designTemp} onChange={(v) => edit({ designTemp: v })} />
      </FieldRow>
      <FieldRow>
        <NumField label="Test" suffix="psi" value={test.testPsi} onChange={(v) => edit({ testPsi: v })} readout={limitWords} />
        <NumField label="Test temp" suffix="°F" value={test.testTemp} onChange={(v) => edit({ testTemp: v })} />
      </FieldRow>
      <FieldRow>
        <NumField
          label="Hold the job asks"
          suffix="min"
          value={test.holdReq}
          onChange={(v) => edit({ holdReq: v })}
          placeholder={test.code === 'spec' ? '' : String(CODE_HOLD_MIN)}
          readout={test.code === 'spec' ? 'Job spec: type the hold it asks for' : `${test.code}: ${CODE_HOLD_MIN} min at least`}
        />
      </FieldRow>

      <SectionHeader title="Test gauges" meta={`${test.gauges.length} OF ${MAX_GAUGES}`} />
      {test.gauges.map((g, i) => (
        <View key={i} style={{ borderTopWidth: t.hairline, borderTopColor: t.colors.border, paddingTop: t.space.lg }}>
          <FieldRow>
            <DimensionInput
              label={`Gauge ${i + 1}`}
              value={g.id}
              keyboardType="default"
              autoCapitalize="characters"
              placeholder="Tag or serial"
              onChangeText={(v) => change((x) => ({ ...x, gauges: x.gauges.map((y, k) => (k === i ? { ...y, id: v.slice(0, NAME_MAX) } : y)) }))}
            />
            <NumField label="Range" suffix="psi" value={g.range} onChange={(v) => change((x) => ({ ...x, gauges: x.gauges.map((y, k) => (k === i ? { ...y, range: v } : y)) }))} />
          </FieldRow>
          <FieldRow>
            <DateField label="Calibration due" value={g.calDue} onChange={(d) => change((x) => ({ ...x, gauges: x.gauges.map((y, k) => (k === i ? { ...y, calDue: d } : y)) }))} />
            <View style={{ flex: 1, minWidth: 96, justifyContent: 'flex-end', paddingBottom: 2 }}>
              <GhostButton label="Remove" icon="trash-outline" onPress={() => change((x) => ({ ...x, gauges: x.gauges.filter((_, k) => k !== i) }))} />
            </View>
          </FieldRow>
        </View>
      ))}
      {test.gauges.length < MAX_GAUGES ? (
        <ControlRow>
          <GhostButton
            label={test.gauges.length ? 'Add another gauge' : 'Add a gauge'}
            icon="add-outline"
            style={{ flex: 1 }}
            // A new gauge row has nothing in it yet, so it is kept with an id to hold it until one is typed.
            onPress={() => change((x) => ({ ...x, gauges: [...x.gauges, { id: `G-${x.gauges.length + 1}`, range: null, calDue: '' }] }))}
          />
        </ControlRow>
      ) : null}

      <SectionHeader title="Relief valve" />
      <FieldRow>
        <DimensionInput label="Tag" value={test.reliefTag} onChangeText={(v) => edit({ reliefTag: v.slice(0, NAME_MAX) })} placeholder="PSV-3" keyboardType="default" autoCapitalize="characters" />
        <NumField label="Set at" suffix="psi" value={test.reliefPsi} onChange={(v) => edit({ reliefPsi: v })} readout={top !== null ? `B31.3: ${top} psi at most` : undefined} />
      </FieldRow>

      <SectionHeader title="Walk-down" meta={`${stepsFor(test.kind).filter((s) => test.steps.includes(s.id)).length} OF ${stepsFor(test.kind).length}`} />
      {(['before', 'after'] as const).map((when) => (
        <View key={when}>
          <Text style={[t.type.labelSmall, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.sm }]}>
            {when === 'before' ? 'Before pressure goes on' : 'After it comes off'}
          </Text>
          {stepsFor(test.kind)
            .filter((s) => s.when === when)
            .map((s) => (
              <CheckRow
                key={s.id}
                text={s.text}
                on={test.steps.includes(s.id)}
                onPress={() => change((x) => ({ ...x, steps: x.steps.includes(s.id) ? x.steps.filter((y) => y !== s.id) : [...x.steps, s.id] }))}
              />
            ))}
        </View>
      ))}

      <SectionHeader title="Boundary isos" meta={test.isos.length ? `${test.isos.length} ATTACHED` : undefined} />
      {jobIsos.length ? (
        jobIsos.map((s) => (
          <CheckRow
            key={s.id}
            text={s.name}
            sub={s.place || undefined}
            on={test.isos.includes(s.id)}
            onPress={() => change((x) => ({ ...x, isos: x.isos.includes(s.id) ? x.isos.filter((y) => y !== s.id) : [...x.isos, s.id] }))}
          />
        ))
      ) : (
        <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding }]}>
          No isos saved under this job. Mark the boundary on one in Iso sketch and it can go in the record.
        </Text>
      )}

      <SectionHeader title="Result" />
      <Segmented<TestResult>
        options={[
          { value: 'open', label: 'Open' },
          { value: 'pass', label: 'Passed' },
          { value: 'fail', label: 'Failed' },
        ]}
        selected={test.result}
        onSelect={(result) => edit({ result })}
      />
      <NoteField label="What was found" value={test.leaks} max={TEXT_MAX} onChangeText={(v) => edit({ leaks: v })} placeholder={test.result === 'fail' ? 'Where it leaked: weld, flange, valve packing' : 'No leaks, or where it leaked'} />
      <NoteField label="Notes" value={test.notes} max={TEXT_MAX} onChangeText={(v) => edit({ notes: v })} placeholder="Anything else the record should carry" />

      <SectionHeader title="Sign-off" />
      {ROLES.map((role) => {
        const s = test.people[role];
        return (
          <View key={role} style={{ borderTopWidth: t.hairline, borderTopColor: t.colors.border, paddingTop: t.space.lg }}>
            <FieldRow>
              <DimensionInput
                label={ROLE_LABEL[role]}
                value={s.name}
                keyboardType="default"
                autoCapitalize="words"
                placeholder="Name"
                // A different name is a different person: their signature is not this one's.
                onChangeText={(v) => change((x) => ({ ...x, people: { ...x.people, [role]: { name: v.slice(0, NAME_MAX), sig: x.people[role].name.trim() === v.trim() ? x.people[role].sig : '', signedAt: x.people[role].name.trim() === v.trim() ? x.people[role].signedAt : null } } }))}
              />
            </FieldRow>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.lg }}>
              {isSigned(s) ? (
                <>
                  <SignatureView sig={s.sig} />
                  <Text style={[t.type.caption, { color: t.colors.textMuted, flex: 1 }]}>{s.signedAt !== null ? `Signed ${clockLabel(s.signedAt)} ${new Date(s.signedAt).toLocaleDateString()}` : 'Signed'}</Text>
                  <Pressable onPress={() => change((x) => ({ ...x, people: { ...x.people, [role]: { ...x.people[role], sig: '', signedAt: null } } }))} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Clear the ${ROLE_LABEL[role]} signature`}>
                    <Text style={[t.type.labelSmall, { color: t.colors.textMuted }]}>Clear</Text>
                  </Pressable>
                </>
              ) : (
                <GhostButton
                  label={s.name.trim() ? `Sign as ${s.name.trim()}` : 'Type the name, then sign'}
                  icon="create-outline"
                  style={{ flex: 1 }}
                  onPress={() => (s.name.trim() ? setSigning(role) : setNote(`Type who is signing as ${ROLE_LABEL[role].toLowerCase()} first.`))}
                />
              )}
            </View>
          </View>
        );
      })}

      <SectionHeader title="The record" />
      <ControlRow>
        <AccentButton label={busy ? 'Making the PDF…' : 'Share the test record'} icon="share-outline" style={{ flex: 1 }} onPress={share} />
      </ControlRow>
      {test.result === 'fail' ? (
        <ControlRow>
          <GhostButton label={later ? 'Open the retest' : 'Start the retest'} icon="repeat-outline" style={{ flex: 1 }} onPress={startRetest} />
        </ControlRow>
      ) : null}
      <ControlRow>
        {confirm === 'delete' ? (
          <>
            <GhostButton label="Keep it" style={{ flex: 1 }} onPress={() => setConfirm(null)} />
            <GhostButton
              label="Delete the test"
              icon="trash-outline"
              style={{ flex: 1, borderColor: t.colors.danger }}
              onPress={() => {
                setConfirm(null);
                apply((l) => deleteTest(l, test.id));
                navigation.goBack();
              }}
            />
          </>
        ) : (
          <GhostButton label="Delete this test" icon="trash-outline" style={{ flex: 1 }} onPress={() => setConfirm('delete')} />
        )}
      </ControlRow>
      <FooterNote text="Code figures are ASME B31.3 and B31.1 minimums as built into the app. The test package, the engineer and the inspector govern; this checks the arithmetic and keeps the record." />

      <SignatureSheet
        visible={signing !== null}
        title={signing ? ROLE_LABEL[signing] : ''}
        name={signing ? test.people[signing].name : ''}
        onCancel={() => setSigning(null)}
        onDone={(sig) => {
          const role = signing;
          setSigning(null);
          if (role) change((x) => ({ ...x, people: { ...x.people, [role]: { ...x.people[role], sig, signedAt: Date.now() } } }));
        }}
      />
    </Screen>
  );
}

/** Under a running hold: when the phone will ring for it, or why it will not. */
function HoldAlertLine({ test, now }: { test: PressureTest; now: number }) {
  const t = useTheme();
  const { status, allow } = useHoldAlerts();
  if (status === 'none') return null;
  const ahead = holdAlerts([test], now);
  const at = (k: string) => ahead.find((a) => a.kind === k)?.at;
  const soon = at('soon');
  const met = at('met');
  const over = at('over');
  const words =
    requiredHold(test) === null
      ? 'Type the hold the spec asks for, and the phone rings when it is met.'
      : status === 'on'
        ? met
          ? `The phone rings at ${clockLabel(met)} when the hold is met${soon ? `, and at ${clockLabel(soon)} to get back to the gauge` : ''}, locked or not.`
          : over
            ? `Hold met. The phone rings again at ${clockLabel(over)} if it is still running.`
            : 'Hold met long since. End it so the record shows when.'
        : status === 'ask'
          ? 'Allow alerts and the phone rings when the hold is met, even locked in a pocket.'
          : 'Alerts are off for PipeFit in the phone’s settings, so the hold only buzzes with this screen open.';
  return (
    <View style={{ paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.sm, marginBottom: t.space.lg, gap: t.space.sm }}>
      <View style={{ flexDirection: 'row', gap: t.space.sm, alignItems: 'flex-start' }}>
        <Ionicons name={status === 'on' ? 'alarm-outline' : 'notifications-off-outline'} size={16} color={status === 'on' ? t.colors.accent : t.colors.warnText} />
        <Text style={[t.type.caption, { color: status === 'on' ? t.colors.textMuted : t.colors.warnText, flex: 1 }]}>{words}</Text>
      </View>
      {status !== 'on' && requiredHold(test) !== null ? (
        <GhostButton label={status === 'ask' ? 'Allow alerts' : 'Open the phone’s settings'} icon="notifications-outline" onPress={() => void allow()} />
      ) : null}
    </View>
  );
}
