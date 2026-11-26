// Orbital welding
// ---------------
// The whole of it on one page, laid out the way the work goes: the equipment,
// the programs welded on it, the welds made off them. The strip at the top is
// that flow, with what is in each step; the tabs under it list each step,
// and the equations that work the programs out. The reasoning is in
// state/orbitalBook.ts and calc/orbitalProgram.ts.

import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Segmented } from '../components/Segmented';
import { SectionHeader } from '../components/SectionHeader';
import { HintRow } from '../components/HintRow';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { ReceiveProgramSheet } from '../components/orbital/ProgramShare';
import { QcSigningSheet } from '../components/orbital/QcSigning';
import { Banner } from '../components/FormFields';
import { WeldClock } from '../components/orbital/WeldClock';
import { useTheme, type Theme } from '../theme/ThemeProvider';
import { useOrbitalEquations, useOrbitalGear, useOrbitalPrograms, useOrbitalRuns, useOrbitalSigning } from '../state/orbital';
import { FAMILIES, GEAR_NUM, KIND_LABEL, familyOf, gearName, tubeLabel, type Gear, type GearKind, type Program, type Run } from '../state/orbitalBook';
import { editedFromShipped, equationSet } from '../calc/orbitalEquations';
import { clock, programTimes } from '../calc/orbitalProgram';
import { runLabel } from '../calc/orbitalRun';
import { dayKey, usDate } from '../calc/days';
import { VoicePressable } from '../voice/VoicePressable';

type Props = NativeStackScreenProps<RootStackParamList, 'Orbital'>;
type Tab = 'programs' | 'gear' | 'equations' | 'runs';

const TABS: { value: Tab; label: string }[] = [
  { value: 'programs', label: 'Programs' },
  { value: 'gear', label: 'Equipment' },
  { value: 'equations', label: 'Equations' },
  { value: 'runs', label: 'Welds' },
];

/** A small word in a coloured box: QUALIFIED, DEVELOPMENT, PASS. */
export function Pill({ text, tone }: { text: string; tone: 'good' | 'warn' | 'bad' | 'plain' }) {
  const t = useTheme();
  const c = t.colors;
  const ink = tone === 'good' ? c.success : tone === 'warn' ? c.warnText : tone === 'bad' ? c.danger : c.textMuted;
  const bg = tone === 'warn' ? c.warnBg : c.bgSubtle;
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: bg, borderWidth: t.hairline, borderColor: ink }}>
      <Text style={[t.type.labelSmall, { color: ink }]}>{text}</Text>
    </View>
  );
}

/** One row of a list, tapped to open. */
export function ListRow({ title, sub, right, left, onPress, voice }: { title: string; sub?: string; right?: React.ReactNode; left?: React.ReactNode; onPress: () => void; voice: string }) {
  const t = useTheme();
  return (
    <VoicePressable
      voiceLabel={voice}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, sub].filter(Boolean).join(', ')}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space.md,
        marginHorizontal: t.layout.screenPadding,
        minHeight: 60,
        paddingVertical: t.space.sm,
        borderTopWidth: t.hairline,
        borderTopColor: t.colors.border,
        backgroundColor: pressed ? t.colors.bgSubtle : 'transparent',
      })}
    >
      {left}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[t.type.bodyStrong, { color: t.colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {sub ? (
          <Text style={[t.type.caption, { color: t.colors.textMuted }]} numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right}
      <Ionicons name="chevron-forward" size={18} color={t.colors.textFaint} />
    </VoicePressable>
  );
}

function FlowTile({ t, step, icon, title, line, on, onPress }: { t: Theme; step: number; icon: React.ComponentProps<typeof Ionicons>['name']; title: string; line: string; on: boolean; onPress: () => void }) {
  const c = t.colors;
  return (
    <VoicePressable
      voiceLabel={title}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={`Step ${step}, ${title}: ${line}`}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 92,
        padding: t.space.md,
        gap: 4,
        borderRadius: t.radius.lg,
        borderWidth: on ? 2 : t.hairline,
        borderColor: on ? c.accent : c.border,
        backgroundColor: pressed ? c.bgSubtle : c.bgRaised,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: on ? c.accent : c.bgSunken, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[t.type.captionStrong, { color: on ? c.onAccent : c.textMuted, fontSize: 11.5 }]}>{step}</Text>
        </View>
        <Ionicons name={icon} size={18} color={on ? c.accent : c.textMuted} />
      </View>
      <Text style={[t.type.captionStrong, { color: c.text }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[t.type.caption, { color: c.textMuted, fontSize: 12 }]} numberOfLines={2}>
        {line}
      </Text>
    </VoicePressable>
  );
}

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function gearLine(g: Gear): string {
  const f = familyOf(g.family);
  const bits = f.nums
    .filter((k) => g[k] !== null)
    .slice(0, 3)
    .map((k) => (k === 'odMin' && g.odMax !== null ? '' : k === 'odMax' && g.odMin !== null ? `${g.odMin}–${g.odMax} in OD` : `${g[k]} ${GEAR_NUM[k].unit}`.trim()))
    .filter(Boolean);
  return [f.label, ...bits, g.serial ? `SN ${g.serial}` : ''].filter(Boolean).join(' · ');
}

export function OrbitalScreen({ navigation, route }: Props) {
  const t = useTheme();
  const c = t.colors;
  const [tab, setTab] = useState<Tab>(route.params?.tab ?? 'programs');
  const [receiving, setReceiving] = useState(false);
  const [qcOpen, setQcOpen] = useState(false);
  const signing = useOrbitalSigning().value;
  const gear = useOrbitalGear();
  const programs = useOrbitalPrograms();
  const equations = useOrbitalEquations();
  const runs = useOrbitalRuns();
  const today = dayKey(Date.now());
  const ps = programs.value.programs;
  const gs = gear.value.gear;
  const rs = runs.value.runs;
  const eqs = equationSet(equations.value.equations);
  const heads = gs.filter((g) => g.kind === 'head').length;
  const supplies = gs.filter((g) => g.kind === 'supply').length;
  const qualified = ps.filter((p) => p.status === 'qualified').length;
  const passed = rs.filter((r) => r.result === 'pass').length;
  const gearById = new Map(gs.map((g) => [g.id, g]));
  const stores = [gear, programs, equations, runs];
  const foreign = stores.some((s) => s.value.foreign);
  const saveError = stores.some((s) => s.saveError);
  const dropped = stores.reduce((n, s) => n + s.value.dropped, 0);

  const programRow = (p: Program) => {
    const head = p.headId ? gearById.get(p.headId) : undefined;
    const times = programTimes(p);
    return (
      <ListRow
        key={p.id}
        voice={p.name}
        title={p.name}
        sub={[tubeLabel(p), head ? gearName(head) : 'no head', `${count(p.levels.length, 'level')}${times.weld !== null ? `, ${clock(times.weld)}` : ''}`, `v${p.version}`].filter(Boolean).join(' · ')}
        left={<WeldClock program={p} size={46} compact />}
        right={<Pill text={p.status === 'qualified' ? 'Qualified' : 'Development'} tone={p.status === 'qualified' ? 'good' : 'warn'} />}
        onPress={() => navigation.navigate('OrbitalProgram', { id: p.id })}
      />
    );
  };

  const runRow = (r: Run) => (
    <ListRow
      key={r.id}
      voice={runLabel(r)}
      title={runLabel(r)}
      sub={[`${r.programName} v${r.version}`, r.line, r.operator, usDate(dayKey(r.at))].filter(Boolean).join(' · ')}
      right={r.result ? <Pill text={r.result} tone={r.result === 'pass' ? 'good' : 'bad'} /> : <Pill text="open" tone="plain" />}
      onPress={() => navigation.navigate('OrbitalRun', { id: r.id })}
    />
  );

  return (
    <Screen>
      {foreign ? <Banner tone="danger" icon="alert-circle" text="Part of the orbital book on this phone was written by a newer version of the app, so it is not being saved. Update the app." /> : null}
      {saveError ? <Banner tone="danger" icon="cloud-offline-outline" text="The last change could not be saved to this phone. What is on screen is ahead of what is stored." /> : null}
      {dropped ? <Banner tone="warn" icon="alert-circle-outline" text={`${count(dropped, 'record')} in the orbital book would not load and ${dropped === 1 ? 'was' : 'were'} left out.`} /> : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }}>
        <FlowTile t={t} step={1} icon="hardware-chip-outline" title="Equipment" line={gs.length ? `${count(supplies, 'supply', 'supplies')}, ${count(heads, 'head')}` : 'Add the heads and supplies'} on={tab === 'gear'} onPress={() => setTab('gear')} />
        <Ionicons name="chevron-forward" size={16} color={c.textFaint} />
        <FlowTile t={t} step={2} icon="options-outline" title="Programs" line={ps.length ? `${qualified} qualified, ${ps.length - qualified} in development` : 'Write the first schedule'} on={tab === 'programs'} onPress={() => setTab('programs')} />
        <Ionicons name="chevron-forward" size={16} color={c.textFaint} />
        <FlowTile t={t} step={3} icon="flame-outline" title="Welds" line={rs.length ? `${rs.length} made, ${passed} passed` : 'Coupons and welds'} on={tab === 'runs'} onPress={() => setTab('runs')} />
      </View>

      <View style={{ paddingTop: t.space.lg }}>
        <Segmented options={TABS} selected={tab} onSelect={setTab} />
      </View>

      {tab === 'programs' ? (
        <>
          <HintRow text="A program is a weld schedule for one tube on one head: its levels round the turn, the slopes, the gas and the tungsten. It stays in development until a coupon passes and its WPS is named; then it is qualified and locked." />
          <ControlRow>
            <AccentButton label="New program" icon="add" style={{ flex: 1 }} onPress={() => navigation.navigate('OrbitalProgram', { id: 'new' })} />
          </ControlRow>
          <ControlRow>
            <GhostButton label="Receive a program" icon="qr-code-outline" style={{ flex: 1 }} onPress={() => setReceiving(true)} />
            <GhostButton label="QC signing" icon="shield-checkmark-outline" style={{ flex: 1 }} onPress={() => setQcOpen(true)} />
          </ControlRow>
          {signing.signer || signing.qcs.length ? (
            <View style={{ flexDirection: 'row', gap: t.space.sm, alignItems: 'center', paddingHorizontal: t.layout.screenPadding, paddingBottom: t.space.sm }}>
              <Ionicons name="shield-checkmark" size={16} color={t.colors.success} />
              <Text style={[t.type.caption, { color: t.colors.textMuted, flex: 1 }]}>
                {signing.signer
                  ? `This is the QC phone: programs shared from here are signed by ${signing.signer.name}.`
                  : `Qualified programs are taken only signed by ${signing.qcs.map((q) => q.name).join(' or ')}.`}
              </Text>
            </View>
          ) : null}
          <ReceiveProgramSheet visible={receiving} onClose={() => setReceiving(false)} onOpen={(id) => navigation.navigate('OrbitalProgram', { id })} />
          <QcSigningSheet visible={qcOpen} onClose={() => setQcOpen(false)} />
          {ps.filter((p) => p.status === 'qualified').length ? <SectionHeader title="Qualified" meta={`${qualified}`} /> : null}
          {ps.filter((p) => p.status === 'qualified').map(programRow)}
          {ps.filter((p) => p.status === 'dev').length ? <SectionHeader title="In development" meta={`${ps.length - qualified}`} /> : null}
          {ps.filter((p) => p.status === 'dev').map(programRow)}
          {!ps.length ? <Text style={[t.type.body, { color: c.textMuted, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }]}>No programs yet. Add the head first under Equipment, so the program can check it fits and work out the tungsten.</Text> : null}
        </>
      ) : null}

      {tab === 'gear' ? (
        <>
          <HintRow text="Every power supply, head and module on the job, filled in from its own manual: the OD range, the fastest rotor, the electrode constant, when it is due for calibration. Programs check themselves against these." />
          <ControlRow>
            <AccentButton label="Add equipment" icon="add" style={{ flex: 1 }} onPress={() => navigation.navigate('OrbitalGear', { id: 'new' })} />
          </ControlRow>
          {(['supply', 'head', 'module'] as GearKind[]).map((k) => {
            const xs = gs.filter((g) => g.kind === k);
            if (!xs.length) return null;
            return (
              <View key={k}>
                <SectionHeader title={KIND_LABEL[k]} meta={`${xs.length}`} />
                {xs.map((g) => {
                  const overdue = !!g.calDue && g.calDue < today;
                  return (
                    <ListRow
                      key={g.id}
                      voice={gearName(g)}
                      title={gearName(g)}
                      sub={gearLine(g)}
                      right={g.calDue ? <Pill text={overdue ? 'cal overdue' : `cal ${usDate(g.calDue)}`} tone={overdue ? 'bad' : 'plain'} /> : null}
                      onPress={() => navigation.navigate('OrbitalGear', { id: g.id })}
                    />
                  );
                })}
              </View>
            );
          })}
          {!gs.length ? (
            <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md, gap: t.space.sm }}>
              {FAMILIES.filter((f) => f.kind !== 'module').map((f) => (
                <Text key={f.id} style={[t.type.caption, { color: c.textMuted }]}>
                  <Text style={{ color: c.text, fontWeight: '600' }}>{f.label}. </Text>
                  {f.blurb}
                </Text>
              ))}
            </View>
          ) : null}
        </>
      ) : null}

      {tab === 'equations' ? (
        <>
          <HintRow text="Every figure the programs work out comes from one of these, and anyone can open one, test it, change it or write a new one. Equations use names: a program offers OD, wall, gap, C and each level's RPM, Ip, Ib, tp, tb and deg, and an answer feeds the next equation by its own name." />
          <ControlRow>
            <AccentButton label="Write an equation" icon="add" style={{ flex: 1 }} onPress={() => navigation.navigate('OrbitalEquation', { id: 'new' })} />
          </ControlRow>
          <SectionHeader title="Built in" meta={`${eqs.filter((e) => e.builtIn).length}`} />
          {eqs
            .filter((e) => e.builtIn)
            .map((e) => (
              <ListRow
                key={e.id}
                voice={e.name}
                title={e.name}
                sub={`${e.out.key} = ${e.expr}${e.out.unit ? `  (${e.out.unit})` : ''}`}
                right={editedFromShipped(e) ? <Pill text="changed" tone="warn" /> : null}
                onPress={() => navigation.navigate('OrbitalEquation', { id: e.id })}
              />
            ))}
          {eqs.some((e) => !e.builtIn) ? <SectionHeader title="The crew's own" meta={`${eqs.filter((e) => !e.builtIn).length}`} /> : null}
          {eqs
            .filter((e) => !e.builtIn)
            .map((e) => (
              <ListRow key={e.id} voice={e.name} title={e.name} sub={`${e.out.key} = ${e.expr}${e.out.unit ? `  (${e.out.unit})` : ''}`} onPress={() => navigation.navigate('OrbitalEquation', { id: e.id })} />
            ))}
        </>
      ) : null}

      {tab === 'runs' ? (
        <>
          <HintRow text="Each coupon and production weld, with its run sheet: the steps ticked, the oxygen read, how it came out, and on a failed coupon the usual first moves. Start one from its program." />
          {rs.length ? (
            <>
              <SectionHeader title="Coupons" meta={`${rs.filter((r) => r.kind === 'coupon').length}`} />
              {rs.filter((r) => r.kind === 'coupon').map(runRow)}
              <SectionHeader title="Production welds" meta={`${rs.filter((r) => r.kind === 'production').length}`} />
              {rs.filter((r) => r.kind === 'production').map(runRow)}
            </>
          ) : (
            <Text style={[t.type.body, { color: c.textMuted, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }]}>
              No welds yet. Open a program and tap Weld a coupon.
            </Text>
          )}
        </>
      ) : null}
    </Screen>
  );
}
