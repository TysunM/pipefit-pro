// A weld off a program
// --------------------
// The run sheet for one coupon or production weld, built from its program,
// its head and the equations: each step in the order it is done with this
// weld's own figures in it, ticked off as it goes; the oxygen read against
// the program's limit; the look at the finished weld; how it came out. A
// failed coupon gets the usual first moves for what it shows. A coupon that
// passes on a program in development is named on the program, ready for it
// to be qualified. The reasoning is in calc/orbitalRun.ts.

import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { HintRow } from '../components/HintRow';
import { ChipRow } from '../components/ChipRow';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { CheckRow, NoteField, NumField } from '../components/FormFields';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { Chip } from '../components/JobChips';
import { Pill } from './OrbitalScreen';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { useOrbitalEquations, useOrbitalGear, useOrbitalPrograms, useOrbitalRuns } from '../state/orbital';
import { NOTE_MAX, TEXT_MAX, idFor, newRun, putProgram, putRun, removeRun, type Run } from '../state/orbitalBook';
import { equationSet } from '../calc/orbitalEquations';
import { FAULTS, INSPECT, faultOf, runFigures, runProblem, runSteps } from '../calc/orbitalRun';
import { clock } from '../calc/orbitalProgram';
import { shareSheet } from '../print/share';
import { runHtml } from '../print/orbital';
import { SulphurNote, useSulphurWords } from '../components/SulphurNote';

type Props = NativeStackScreenProps<RootStackParamList, 'OrbitalRun'>;

export function OrbitalRunScreen({ navigation, route }: Props) {
  const t = useTheme();
  const c = t.colors;
  const { settings } = useSettings();
  const runs = useOrbitalRuns();
  const programs = useOrbitalPrograms();
  const gear = useOrbitalGear();
  const equations = useOrbitalEquations();
  const eqs = equationSet(equations.value.equations);
  const params = route.params;
  const saved = params.id ? runs.value.runs.find((r) => r.id === params.id) : undefined;
  const [draft, setDraft] = useState<Run | null>(null);
  const [formFor, setFormFor] = useState<string | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const sulphur = useSulphurWords([draft?.heatA ?? '', draft?.heatB ?? '']);
  const key = params.id ?? `${params.programId}|${params.kind}`;
  if (formFor !== key && runs.hydrated && programs.hydrated) {
    setFormFor(key);
    if (params.id) setDraft(saved ?? null);
    else {
      const from = programs.value.programs.find((p) => p.id === params.programId);
      setDraft(from ? { ...newRun(from, params.kind!, Date.now()), project: settings.projectId } : null);
    }
  }

  if (!draft) {
    return (
      <Screen>
        <Text style={[t.type.body, { color: c.textMuted, padding: t.layout.screenPadding }]}>{runs.hydrated ? 'That weld, or its program, is not in the book any more.' : 'Opening…'}</Text>
      </Screen>
    );
  }

  const r = draft;
  const program = programs.value.programs.find((p) => p.id === r.programId);
  const head = program?.headId ? gear.value.gear.find((g) => g.id === program.headId) : undefined;
  const supply = program?.supplyId ? gear.value.gear.find((g) => g.id === program.supplyId) : undefined;
  const steps = program ? runSteps(program, supply, head, eqs, r) : [];
  const figures = program ? runFigures(program, head, eqs, r) : null;
  const checks = new Set(r.checks);
  const stepsDone = steps.filter((s) => checks.has(s.id)).length;
  const looked = INSPECT.filter((i) => checks.has(i.id)).length;
  const o2Max = program?.gas.o2Max ?? null;
  const o2Over = r.o2 !== null && o2Max !== null && r.o2 > o2Max;

  const patch = (x: Partial<Run>) => {
    setWhy(null);
    setDraft((d) => (d ? { ...d, ...x } : d));
  };
  const tick = (id: string) => patch({ checks: checks.has(id) ? r.checks.filter((x) => x !== id) : [...r.checks, id] });
  const text = (label: string, value: string, onChange: (v: string) => void, placeholder: string, caps: 'characters' | 'words' = 'characters') => (
    <DimensionInput label={label} value={value} onChangeText={(v) => onChange(v.slice(0, TEXT_MAX))} placeholder={placeholder} keyboardType="default" autoCapitalize={caps} />
  );

  const save = () => {
    const problem = runProblem(r);
    if (problem) return setWhy(problem);
    const now = Date.now();
    const kept: Run = { ...r, id: r.id === 'new' ? idFor('run', `${r.kind}-${r.weld}`, now) : r.id, weld: r.weld.trim(), note: r.note.trim() };
    runs.apply((b) => putRun(b, kept));
    // A passed coupon on a program in development is named on it, ready to qualify.
    if (program && kept.kind === 'coupon' && kept.result === 'pass' && program.status === 'dev' && !program.coupon.trim()) {
      programs.apply((b) => putProgram(b, { ...program, coupon: kept.weld, updatedAt: now }).book);
    }
    navigation.goBack();
  };
  const share = async () => {
    if (!program) return;
    setNote(null);
    const out = await shareSheet(runHtml(r, program, head, supply, eqs, sulphur?.text), `${r.kind === 'coupon' ? 'Coupon' : 'Weld'} ${r.weld}`);
    if (!out.ok) setNote(out.why);
  };

  return (
    <Screen>
      <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md, gap: t.space.sm }}>
        <View style={{ flexDirection: 'row', gap: t.space.sm, flexWrap: 'wrap' }}>
          <Pill text={r.kind === 'coupon' ? 'Coupon' : 'Production weld'} tone="plain" />
          {program?.status === 'qualified' ? <Pill text="Qualified program" tone="good" /> : <Pill text="Development program" tone="warn" />}
          {r.result ? <Pill text={r.result} tone={r.result === 'pass' ? 'good' : 'bad'} /> : null}
        </View>
        <Text style={[t.type.sectionTitle, { color: c.text }]}>{`${r.programName} · v${r.version}`}</Text>
        {program && program.version !== r.version ? (
          <Text style={[t.type.caption, { color: c.warnText }]}>{`The program is at version ${program.version} now; this weld was made on version ${r.version}.`}</Text>
        ) : null}
        {!program ? <Text style={[t.type.caption, { color: c.danger }]}>Its program has been deleted: the steps cannot be shown.</Text> : null}
        {program && program.status !== 'qualified' && r.kind === 'production' ? (
          <Text style={[t.type.caption, { color: c.danger }]}>This program is in development: production welds are made on a qualified program.</Text>
        ) : null}
      </View>

      <SectionHeader title="The weld" />
      <FieldRow>
        {text(r.kind === 'coupon' ? 'Coupon' : 'Weld number', r.weld, (v) => patch({ weld: v }), r.kind === 'coupon' ? 'C-4' : 'W-112')}
        {text('Line', r.line, (v) => patch({ line: v }), 'WFI-2001')}
      </FieldRow>
      <FieldRow>
        {text('Heat, side A', r.heatA, (v) => patch({ heatA: v }), 'Heat no.')}
        {text('Heat, side B', r.heatB, (v) => patch({ heatB: v }), 'Heat no.')}
      </FieldRow>
      <SulphurNote heats={[r.heatA, r.heatB]} />
      <FieldRow>{text('Operator', r.operator, (v) => patch({ operator: v }), 'Name or stamp', 'words')}</FieldRow>

      <SectionHeader title="Purge" />
      <FieldRow>
        <NumField label="Length purged" value={r.purgeLen} onChange={(v) => patch({ purgeLen: v })} suffix="in" />
        <NumField label="Volume changes" value={r.changes} onChange={(v) => patch({ changes: v })} />
      </FieldRow>
      {figures?.purgeMin !== null && figures?.purgeMin !== undefined ? (
        <Text style={[t.type.bodyStrong, { color: c.text, paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.sm, marginBottom: t.space.md }]}>{`About ${clock(figures.purgeMin * 60)} at the program's purge flow.`}</Text>
      ) : null}
      <FieldRow>
        <NumField label="Oxygen read" value={r.o2} onChange={(v) => patch({ o2: v })} suffix="ppm" />
      </FieldRow>
      {r.o2 !== null && o2Max !== null ? (
        <Text style={[t.type.bodyStrong, { color: o2Over ? c.danger : c.success, paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.sm, marginBottom: t.space.md }]}>
          {o2Over ? `Over the program's ${o2Max} ppm: keep purging, and look for a leak.` : `Under the program's ${o2Max} ppm.`}
        </Text>
      ) : null}

      <SectionHeader title="Steps" meta={`${stepsDone} of ${steps.length}`} />
      {steps.map((s) => (
        <CheckRow key={s.id} on={checks.has(s.id)} text={s.title} sub={s.detail} onPress={() => tick(s.id)} />
      ))}

      <SectionHeader title="The look" meta={`${looked} of ${INSPECT.length}`} />
      <HintRow text="Inside and out: a borescope or a mirror for the ID. How much of each is too much is your spec's, ASME BPE or the client's." />
      {INSPECT.map((i) => (
        <CheckRow key={i.id} on={checks.has(i.id)} text={i.text} onPress={() => tick(i.id)} />
      ))}

      <SectionHeader title="How it came out" />
      <ChipRow options={[{ value: 'pass', label: 'Pass' }, { value: 'fail', label: 'Fail' }]} selected={r.result ?? ''} onSelect={(v) => patch({ result: v as Run['result'] })} />
      {r.kind === 'coupon' && program?.status === 'dev' ? (
        <Text style={[t.type.caption, { color: c.textMuted, paddingHorizontal: t.layout.screenPadding }]}>A coupon that passes is named on the program, ready to mark it qualified.</Text>
      ) : null}
      {r.result === 'fail' ? (
        <>
          <Text style={[t.type.body, { color: c.text, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }]}>
            What does it show? Change one thing at a time, weld another coupon, and write down what you changed.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }}>
            {FAULTS.map((f) => (
              <Chip key={f.id} label={f.label} on={r.faults.includes(f.id)} onPress={() => patch({ faults: r.faults.includes(f.id) ? r.faults.filter((x) => x !== f.id) : [...r.faults, f.id] })} />
            ))}
          </View>
          {r.faults.map((id) => {
            const f = faultOf(id);
            if (!f) return null;
            return (
              <View key={id} style={{ marginHorizontal: t.layout.screenPadding, marginTop: t.space.md, padding: t.space.md, borderRadius: t.radius.lg, backgroundColor: c.warnBg, borderWidth: t.hairline, borderColor: c.warnBorder, gap: 4 }}>
                <Text style={[t.type.bodyStrong, { color: c.warnText }]}>{f.label}</Text>
                {f.moves.map((m) => (
                  <Text key={m} style={[t.type.caption, { color: c.text }]}>{`• ${m}`}</Text>
                ))}
              </View>
            );
          })}
        </>
      ) : null}
      <NoteField label="Note" value={r.note} onChangeText={(v) => patch({ note: v.slice(0, NOTE_MAX) })} placeholder="Raised L3 by 2 A; ID clean" max={NOTE_MAX} />

      {why ? <Text style={[t.type.bodyStrong, { color: c.danger, paddingHorizontal: t.layout.screenPadding, paddingBottom: t.space.md }]}>{why}</Text> : null}
      <ControlRow>
        <AccentButton label="Save" icon="checkmark-outline" onPress={save} style={{ flex: 1 }} />
        {program ? <GhostButton label="Print / PDF" icon="print-outline" onPress={() => void share()} /> : null}
      </ControlRow>
      {note ? <Text style={[t.type.caption, { color: c.danger, paddingHorizontal: t.layout.screenPadding }]}>{note}</Text> : null}
      {r.id !== 'new' ? (
        <ControlRow>
          <GhostButton
            label={armed ? 'Tap again to delete it' : 'Delete this record'}
            icon="trash-outline"
            style={{ flex: 1 }}
            onPress={() => {
              if (!armed) return setArmed(true);
              runs.apply((b) => removeRun(b, r.id));
              navigation.goBack();
            }}
          />
        </ControlRow>
      ) : null}
    </Screen>
  );
}
