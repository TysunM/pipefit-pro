// The pressure test log
// ---------------------
// Every hydro and pneumatic test on the job, newest first: what is still
// open or running, what failed and waits on a retest, what passed. One tap
// opens the record; one button starts a test on the active job.

import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Plate } from '../components/metal';
import { SectionHeader } from '../components/SectionHeader';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { HintRow } from '../components/HintRow';
import { Banner, useNow } from '../components/FormFields';
import { JobChips, useJobFilter } from '../components/JobChips';
import { Theme, useTheme } from '../theme/ThemeProvider';
import { usePressureTests } from '../state/pressureTests';
import { MAX_TESTS, PressureTest, canAdd, deleteTest, freshId, holding, newTest, putTest, retested, testName } from '../state/pressureLog';
import { checkTest, holdState, problems } from '../calc/pressureTest';
import { dayLabel, stopwatch } from '../calc/days';

type Props = NativeStackScreenProps<RootStackParamList, 'PressureTests'>;

function TestRow({ t, test, now, job, onOpen, onDelete, superseded }: { t: Theme; test: PressureTest; now: number; job?: string; onOpen: () => void; onDelete: () => void; superseded: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const hs = holdState(test, now);
  const stops = problems(checkTest(test)).filter((c) => c.level === 'stop').length;
  const ink = test.result === 'pass' ? t.colors.success : test.result === 'fail' ? t.colors.danger : hs.phase === 'holding' ? t.colors.data : t.colors.textMuted;
  const icon = test.result === 'pass' ? 'checkmark-circle' : test.result === 'fail' ? 'close-circle' : hs.phase === 'holding' ? 'timer-outline' : 'ellipse-outline';
  const state =
    test.result === 'pass'
      ? 'Passed'
      : test.result === 'fail'
        ? superseded
          ? 'Failed · retested'
          : 'Failed · retest needed'
        : hs.phase === 'holding'
          ? `Holding · ${stopwatch(hs.elapsedMs)}${hs.met ? ' · met' : ''}`
          : hs.phase === 'held'
            ? 'Hold done · result not set'
            : 'Not started';
  return (
    <Plate style={[{ marginHorizontal: t.layout.screenPadding, marginBottom: t.space.md }, confirming ? { borderColor: t.colors.danger } : {}]}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Open ${testName(test)}, ${state}`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space.md,
          padding: t.space.lg,
          backgroundColor: pressed ? (t.mode === 'dark' ? 'rgba(0,0,0,0.25)' : 'rgba(90,70,48,0.08)') : 'transparent',
        })}
      >
        <Ionicons name={icon} size={26} color={ink} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[t.type.bodyStrong, { color: t.colors.text }]} numberOfLines={1}>
            {testName(test)}
          </Text>
          {job !== undefined ? (
            <Text style={[t.type.labelSmall, { color: job ? t.colors.accent : t.colors.textFaint, fontSize: 11 }]} numberOfLines={1}>
              {job || 'No project'}
            </Text>
          ) : null}
          <Text style={[t.type.caption, { color: t.colors.textMuted }]} numberOfLines={1}>
            {[dayLabel(test.day), test.kind === 'hydro' ? 'Hydro' : 'Pneumatic', test.testPsi !== null ? `${test.testPsi} psi` : 'no test pressure'].join(' · ')}
          </Text>
          <Text style={[t.type.caption, { color: ink }]} numberOfLines={1}>
            {state}
          </Text>
          {stops ? (
            <Text style={[t.type.caption, { color: t.colors.danger }]} numberOfLines={1}>
              {`${stops} thing${stops === 1 ? '' : 's'} to fix on the record`}
            </Text>
          ) : null}
          {test.system ? (
            <Text style={[t.type.caption, { color: t.colors.textFaint }]} numberOfLines={1}>
              {test.system}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={t.colors.textFaint} />
      </Pressable>
      {confirming ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingHorizontal: t.space.lg, paddingBottom: t.space.lg }}>
          <Text style={[t.type.captionStrong, { color: t.colors.danger, flex: 1 }]}>Delete this test record?</Text>
          <Pressable onPress={() => setConfirming(false)} hitSlop={10} accessibilityRole="button">
            <Text style={[t.type.labelSmall, { color: t.colors.textMuted }]}>Keep</Text>
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Confirm delete ${testName(test)}`}>
            <Text style={[t.type.labelSmall, { color: t.colors.danger }]}>Delete</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => setConfirming(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete ${testName(test)}`} style={{ position: 'absolute', top: 0, right: 0, padding: t.space.md }}>
          <Ionicons name="trash-outline" size={16} color={t.colors.textFaint} />
        </Pressable>
      )}
    </Plate>
  );
}

export function PressureTestsScreen({ navigation }: Props) {
  const t = useTheme();
  const { log, hydrated, saveError, apply, clearDropped, takeOver } = usePressureTests();
  const job = useJobFilter(log.tests);
  const mine = job.mine(log.tests);
  const now = useNow(mine.some(holding));
  const [full, setFull] = useState(false);

  const open = mine.filter((x) => x.result === 'open');
  const failed = mine.filter((x) => x.result === 'fail');
  const passed = mine.filter((x) => x.result === 'pass');
  const jobOf = (x: PressureTest) => (job.filter.kind === 'all' ? x.project : undefined);

  const start = () => {
    if (!canAdd(log)) return setFull(true);
    const at = Date.now();
    const id = freshId(log, at);
    // A test started with All jobs showing goes to the active job, the one new work is saved to.
    const project = job.filter.kind === 'one' ? job.filter.id : job.active;
    apply((l) => putTest(l, { ...newTest(project, at), id }, at));
    navigation.navigate('PressureTest', { testId: id });
  };

  const row = (x: PressureTest) => (
    <TestRow key={x.id} t={t} test={x} now={now} job={jobOf(x)} superseded={retested(log, x)} onOpen={() => navigation.navigate('PressureTest', { testId: x.id })} onDelete={() => apply((l) => deleteTest(l, x.id))} />
  );

  return (
    <Screen>
      {log.foreign ? (
        <Banner tone="danger" icon="alert-circle" text="This phone's test log was written by a newer version of the app, so nothing is being saved. Update the app to get it back, or start a new log and lose what it held." action="Start new" onAction={takeOver} />
      ) : null}
      {saveError ? <Banner tone="danger" icon="cloud-offline-outline" text="The last change could not be saved to this phone. What is on screen is ahead of what is stored." /> : null}
      {log.dropped ? (
        <Banner tone="warn" icon="warning-outline" text={`${log.dropped} stored ${log.dropped === 1 ? 'test' : 'tests'} would not load and ${log.dropped === 1 ? 'was' : 'were'} left out.`} action="OK" onAction={clearDropped} />
      ) : null}
      {full ? (
        <Banner tone="warn" icon="archive-outline" text={`The phone keeps ${MAX_TESTS} tests and has them. Share the old records as PDFs and delete them to make room.`} action="OK" onAction={() => setFull(false)} />
      ) : null}

      <HintRow text="Every test is saved as it is filled in. Time the hold here, log the gauge as you read it, and sign on the glass: the PDF is the record QC keeps." />
      <JobChips f={job} />
      <View style={{ height: t.space.md }} />
      <ControlRow>
        <AccentButton label="Start a test" icon="add" style={{ flex: 1 }} onPress={start} />
      </ControlRow>

      {open.length ? (
        <>
          <SectionHeader title="Open" meta={`${open.length} ${open.length === 1 ? 'test' : 'tests'}`} />
          {open.map(row)}
        </>
      ) : null}
      {failed.length ? (
        <>
          <SectionHeader title="Failed" meta={`${failed.length} ${failed.length === 1 ? 'test' : 'tests'}`} />
          {failed.map(row)}
        </>
      ) : null}
      {passed.length ? (
        <>
          <SectionHeader title="Passed" meta={`${passed.length} ${passed.length === 1 ? 'test' : 'tests'}`} />
          {passed.map(row)}
        </>
      ) : null}

      {hydrated && !mine.length ? (
        <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.xl, alignItems: 'center', gap: t.space.md }}>
          <Ionicons name="speedometer-outline" size={34} color={t.colors.textFaint} />
          <Text style={[t.type.body, { color: t.colors.textMuted, textAlign: 'center' }]}>
            {log.tests.length ? `No tests under ${job.label}. Pick another job above.` : 'No tests yet. Start one before the pump goes on, and the record fills in as the test runs.'}
          </Text>
        </View>
      ) : null}
      {passed.length ? (
        <ControlRow>
          <GhostButton label="All tests, in the turnover package" icon="document-text-outline" style={{ flex: 1 }} onPress={() => navigation.navigate('Projects')} />
        </ControlRow>
      ) : null}
    </Screen>
  );
}
