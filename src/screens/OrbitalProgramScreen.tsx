// One orbital program
// -------------------
// A weld schedule laid out to be seen and changed at once: the levels round
// the tube on the weld clock, the current against time under it, and the
// level picked on either open to edit below. Everything a program holds
// follows: the tube and the head, the slopes and purges, the tungsten and
// the gas, then every figure the equations work out on it, then how it is
// qualified. A program in development saves itself as it is changed; a
// qualified one is locked, and Revise opens a new version with the
// qualified one kept in its history.

import React, { useEffect, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { HintRow } from '../components/HintRow';
import { ChipRow } from '../components/ChipRow';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { NoteField, NumField, Banner } from '../components/FormFields';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { WarningBanner } from '../components/Results';
import { WeldClock, levelInk } from '../components/orbital/WeldClock';
import { CurrentProfile } from '../components/orbital/CurrentProfile';
import { Pill } from './OrbitalScreen';
import { useTheme } from '../theme/ThemeProvider';
import { useOrbitalEquations, useOrbitalGear, useOrbitalPrograms } from '../state/orbital';
import {
  MATERIALS,
  MAX_EXTRAS,
  MAX_LEVELS,
  NOTE_MAX,
  TEXT_MAX,
  copyProgram,
  gearName,
  idFor,
  newProgram,
  programProblem,
  putProgram,
  qualify,
  qualifyProblem,
  removeProgram,
  revise,
  tubeLabel,
  type Level,
  type Program,
} from '../state/orbitalBook';
import { equationSet, type Figure } from '../calc/orbitalEquations';
import { clock, degreesCheck, levelAverage, levelSeconds, programFigures, programTimes, programWarnings, spreadDegrees } from '../calc/orbitalProgram';
import { dayKey, usDate } from '../calc/days';
import { shareSheet } from '../print/share';
import { programHtml } from '../print/orbital';
import { VoicePressable } from '../voice/VoicePressable';
import { ShareProgramSheet } from '../components/orbital/ProgramShare';

type Props = NativeStackScreenProps<RootStackParamList, 'OrbitalProgram'>;

/** A figure to read: 3 places under 10, 2 under 100, then 1. */
export function fig(v: number): string {
  const a = Math.abs(v);
  return a >= 100 ? v.toFixed(1) : a >= 10 ? v.toFixed(2) : v.toFixed(3);
}

export function OrbitalProgramScreen({ navigation, route }: Props) {
  const t = useTheme();
  const c = t.colors;
  const { width } = useWindowDimensions();
  const programs = useOrbitalPrograms();
  const gear = useOrbitalGear();
  const equations = useOrbitalEquations();
  const eqs = equationSet(equations.value.equations);
  const { id, copy } = route.params;
  const saved = programs.value.programs.find((p) => p.id === id);
  const [draft, setDraft] = useState<Program | null>(null);
  const [formFor, setFormFor] = useState<string | null>(null);
  const [sel, setSel] = useState(0);
  const [why, setWhy] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [extraKey, setExtraKey] = useState('');
  const [extraVal, setExtraVal] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);

  // The form is built once per program opened, from the book or afresh.
  const key = `${id}|${copy ?? ''}|${programs.hydrated}`;
  if (formFor !== key && (programs.hydrated || id === 'new')) {
    setFormFor(key);
    const from = copy ? programs.value.programs.find((p) => p.id === copy) : undefined;
    setDraft(id === 'new' ? (from ? copyProgram(from, Date.now()) : newProgram(Date.now())) : (saved ?? null));
    setSel(0);
  }

  // Changed elsewhere since it was opened (a passed coupon named on it from its run sheet): take the newer one,
  // or the next save here would write the old one back over it.
  if (saved && draft && draft.id === saved.id && saved !== draft && saved.updatedAt > draft.updatedAt) setDraft(saved);

  // A program in development saves itself as it is changed, once it holds together.
  useEffect(() => {
    if (!draft || draft.id === 'new' || draft.status !== 'dev' || draft === saved) return;
    if (programProblem(draft)) return;
    programs.apply((b) => putProgram(b, draft).book);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  useEffect(() => {
    navigation.setOptions({ title: draft?.name.trim() || 'Program' });
  }, [navigation, draft?.name]);

  if (!draft) {
    return (
      <Screen>
        <Text style={[t.type.body, { color: c.textMuted, padding: t.layout.screenPadding }]}>{programs.hydrated ? 'That program is not in the book any more.' : 'Opening…'}</Text>
      </Screen>
    );
  }

  const p = draft;
  const locked = p.status === 'qualified';
  const heads = gear.value.gear.filter((g) => g.kind === 'head');
  const supplies = gear.value.gear.filter((g) => g.kind === 'supply');
  const head = heads.find((g) => g.id === p.headId);
  const supply = supplies.find((g) => g.id === p.supplyId);
  const level = p.levels[Math.min(sel, p.levels.length - 1)]!;
  const at = Math.min(sel, p.levels.length - 1);
  const times = programTimes(p);
  const deg = degreesCheck(p);
  const warnings = programWarnings(p, supply, head, dayKey(Date.now()));
  const figures = programFigures(p, head, eqs);
  const problem = programProblem(p);

  const patch = (x: Partial<Program>) => {
    if (locked) return;
    setWhy(null);
    setDraft((d) => (d ? { ...d, ...x, updatedAt: Date.now() } : d));
  };
  const setLevel = (i: number, x: Partial<Level>) => patch({ levels: p.levels.map((l, n) => (n === i ? { ...l, ...x } : l)) });
  const addLevel = () => {
    if (p.levels.length >= MAX_LEVELS) return;
    const levels = [...p.levels.slice(0, at + 1), { ...level }, ...p.levels.slice(at + 1)];
    patch({ levels });
    setSel(at + 1);
  };
  const dropLevel = () => {
    if (p.levels.length <= 1) return;
    patch({ levels: p.levels.filter((_, n) => n !== at) });
    setSel(Math.max(0, at - 1));
  };

  const create = () => {
    const problem0 = programProblem(p);
    if (problem0) return setWhy(problem0);
    const now = Date.now();
    const made = { ...p, id: idFor('program', p.name, now), createdAt: now, updatedAt: now };
    const out = putProgram(programs.value, made);
    if (!out.ok) return setWhy('The program book is full. Delete one you no longer weld to make room.');
    programs.apply((b) => putProgram(b, made).book);
    navigation.replace('OrbitalProgram', { id: made.id });
  };
  const markQualified = () => {
    const q = qualifyProblem(p);
    if (q) return setWhy(q);
    const next = qualify(p, Date.now());
    setDraft(next);
    programs.apply((b) => putProgram(b, next).book);
  };
  const openRevision = () => {
    const next = revise(p, Date.now());
    setDraft(next);
    programs.apply((b) => putProgram(b, next).book);
  };
  const share = async () => {
    setNote(null);
    const out = await shareSheet(programHtml(p, head, supply, eqs, dayKey(Date.now())), p.name);
    if (!out.ok) setNote(out.why);
  };

  const num = (label: string, value: number | null, onChange: (v: number | null) => void, suffix?: string) =>
    locked ? <DimensionInput label={label} value={value === null ? '' : String(value)} suffix={suffix} editable={false} /> : <NumField label={label} value={value} onChange={onChange} suffix={suffix} />;
  const words = (label: string, value: string, onChange: (v: string) => void, placeholder?: string) => (
    <DimensionInput label={label} value={value} onChangeText={locked ? undefined : (v) => onChange(v.slice(0, TEXT_MAX))} editable={!locked} placeholder={placeholder} keyboardType="default" />
  );
  const figRow = (f: Figure) => (
    <View key={f.id} style={{ flexDirection: 'row', alignItems: 'baseline', gap: t.space.md, paddingHorizontal: t.layout.screenPadding, paddingVertical: 6, borderTopWidth: t.hairline, borderTopColor: c.border }}>
      <View style={{ flex: 1 }}>
        <Text style={[t.type.body, { color: c.text }]}>{f.label}</Text>
        <Text style={[t.type.caption, { color: c.textFaint, fontSize: 12 }]}>{f.name}</Text>
      </View>
      <Text style={[t.type.statValue, { color: c.text, fontSize: 19 }]}>{fig(f.value)}</Text>
      <Text style={[t.type.caption, { color: c.textMuted, width: 56 }]}>{f.unit}</Text>
    </View>
  );
  const clockSize = Math.min(300, width - 2 * t.layout.screenPadding);

  return (
    <Screen>
      {programs.saveError ? <Banner tone="danger" icon="cloud-offline-outline" text="The last change could not be saved to this phone. What is on screen is ahead of what is stored." /> : null}
      <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md, gap: t.space.sm }}>
        <View style={{ flexDirection: 'row', gap: t.space.sm, alignItems: 'center', flexWrap: 'wrap' }}>
          <Pill text={locked ? 'Qualified' : 'Development'} tone={locked ? 'good' : 'warn'} />
          <Pill text={`Version ${p.version}`} tone="plain" />
          {p.id === 'new' ? <Pill text="Not saved yet" tone="plain" /> : null}
        </View>
        <Text style={[t.type.caption, { color: c.textMuted }]}>{[tubeLabel(p), head ? gearName(head) : 'no head chosen', supply ? gearName(supply) : ''].filter(Boolean).join(' · ')}</Text>
      </View>
      {locked ? (
        <Banner
          tone="ok"
          icon="lock-closed-outline"
          text={`Qualified to ${p.wps}${p.coupon ? ` on coupon ${p.coupon}` : ''}${p.qualifiedAt ? `, ${usDate(dayKey(p.qualifiedAt))}` : ''}. Locked: Revise opens version ${p.version + 1} in development, and this one is kept.`}
          action="Revise"
          onAction={openRevision}
        />
      ) : null}

      <View style={{ paddingTop: t.space.lg }}>
        <WeldClock program={p} size={clockSize} selected={at} onSelect={setSel} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding, paddingVertical: t.space.md, justifyContent: 'center' }}>
        {p.levels.map((l, i) => (
          <VoicePressable
            key={i}
            voiceLabel={`Level ${i + 1}`}
            onPress={() => setSel(i)}
            accessibilityRole="button"
            accessibilityState={{ selected: i === at }}
            accessibilityLabel={`Level ${i + 1}`}
            style={{ minWidth: 52, minHeight: 44, paddingHorizontal: 10, borderRadius: t.radius.md, borderWidth: i === at ? 2 : t.hairline, borderColor: i === at ? levelInk(t, i) : c.border, backgroundColor: i === at ? c.bgRaised : c.bgSubtle, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={[t.type.captionStrong, { color: levelInk(t, i) }]}>{`L${i + 1}`}</Text>
            <Text style={[t.type.caption, { color: c.textMuted, fontSize: 11 }]}>{`${l.deg}°`}</Text>
          </VoicePressable>
        ))}
      </View>
      <CurrentProfile program={p} selected={at} onSelect={setSel} />
      <Text style={[t.type.caption, { color: c.textMuted, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.sm }]}>
        {`Round ${clock(times.weld)} · arc on ${clock(times.arc)} · gas on to off ${clock(times.total)} · levels ${Math.round(deg.sum * 10) / 10}° of ${deg.want}°`}
      </Text>
      {warnings.map((w) => (
        <WarningBanner key={w} text={w} />
      ))}

      <SectionHeader title={`Level ${at + 1}`} meta={`${levelSeconds(level) !== null ? clock(levelSeconds(level)) : '—'} · avg ${levelAverage(level) !== null ? `${fig(levelAverage(level)!)} A` : '—'}`} />
      <FieldRow>
        {num('Degrees', level.deg, (v) => setLevel(at, { deg: v ?? 0 }), '°')}
        {num('Rotor speed', level.rpm, (v) => setLevel(at, { rpm: v ?? 0 }), 'RPM')}
      </FieldRow>
      <FieldRow>
        {num('Peak current', level.ip, (v) => setLevel(at, { ip: v ?? 0 }), 'A')}
        {num('Background', level.ib, (v) => setLevel(at, { ib: v ?? 0 }), 'A')}
      </FieldRow>
      <FieldRow>
        {num('Time at peak', level.tp, (v) => setLevel(at, { tp: v ?? 0 }), 's')}
        {num('At background', level.tb, (v) => setLevel(at, { tb: v ?? 0 }), 's')}
      </FieldRow>
      <Text style={[t.type.caption, { color: c.textMuted, paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.sm, marginBottom: t.space.md }]}>
        A level with no pulsing: set the background to the peak.
      </Text>
      {!locked ? (
        <ControlRow>
          <GhostButton label="Add a level" icon="add" onPress={addLevel} style={{ flex: 1 }} />
          {p.levels.length > 1 ? <GhostButton label="Remove this level" icon="remove" onPress={dropLevel} style={{ flex: 1 }} /> : null}
        </ControlRow>
      ) : null}
      {!locked && !deg.ok ? (
        <ControlRow>
          <GhostButton label="Spread the degrees evenly" icon="git-compare-outline" onPress={() => patch({ levels: spreadDegrees(p) })} style={{ flex: 1 }} />
        </ControlRow>
      ) : null}
      {figures.levels[at]?.length ? (
        <>
          <Text style={[t.type.label, { color: c.textMuted, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md, paddingBottom: t.space.sm }]}>Worked out on this level</Text>
          {figures.levels[at]!.map(figRow)}
        </>
      ) : null}

      <SectionHeader title="All the levels" meta={`${p.levels.length}`} />
      <View style={{ marginHorizontal: t.layout.screenPadding }}>
        <View style={{ flexDirection: 'row', paddingVertical: 4 }}>
          {['', '°', 'RPM', 'Peak / bkg', 'Avg', 'Time'].map((h, i) => (
            <Text key={i} style={[t.type.labelSmall, { color: c.textFaint, flex: i === 0 ? 0.6 : i === 3 ? 1.6 : 1 }]}>
              {h}
            </Text>
          ))}
        </View>
        {p.levels.map((l, i) => (
          <VoicePressable
            key={i}
            voiceLabel={`Row ${i + 1}`}
            onPress={() => setSel(i)}
            accessibilityRole="button"
            accessibilityLabel={`Level ${i + 1}: ${l.deg} degrees, ${l.rpm} RPM, ${l.ip} amps peak`}
            style={{ flexDirection: 'row', alignItems: 'center', minHeight: 40, borderTopWidth: t.hairline, borderTopColor: c.border, backgroundColor: i === at ? c.bgSubtle : 'transparent' }}
          >
            <Text style={[t.type.captionStrong, { color: levelInk(t, i), flex: 0.6 }]}>{`L${i + 1}`}</Text>
            <Text style={[t.type.caption, { color: c.text, flex: 1 }]}>{l.deg}</Text>
            <Text style={[t.type.caption, { color: c.text, flex: 1 }]}>{l.rpm || '—'}</Text>
            <Text style={[t.type.caption, { color: c.text, flex: 1.6 }]}>{l.ip ? `${l.ip} / ${l.ib < l.ip ? l.ib : '—'}` : '—'}</Text>
            <Text style={[t.type.caption, { color: c.text, flex: 1 }]}>{levelAverage(l) !== null ? fig(levelAverage(l)!) : '—'}</Text>
            <Text style={[t.type.caption, { color: c.text, flex: 1 }]}>{clock(levelSeconds(l))}</Text>
          </VoicePressable>
        ))}
      </View>

      <SectionHeader title="Tube and equipment" />
      <FieldRow>{words('Program name', p.name, (v) => patch({ name: v }), 'As stored on the supply: 316-050-065')}</FieldRow>
      {locked ? null : <ChipRow label="Material" options={MATERIALS.map((m) => ({ value: m, label: m }))} selected={(MATERIALS as readonly string[]).includes(p.material) ? p.material : 'Other'} onSelect={(m) => patch({ material: m === 'Other' ? '' : m })} />}
      {locked || !(MATERIALS as readonly string[]).includes(p.material) ? <FieldRow>{words('Material', p.material, (v) => patch({ material: v.slice(0, 20) }), 'Hastelloy C-276')}</FieldRow> : null}
      <FieldRow>
        {num('Tube OD', p.od, (v) => patch({ od: v }), 'in')}
        {num('Wall', p.wall, (v) => patch({ wall: v }), 'in')}
      </FieldRow>
      {heads.length ? (
        locked ? null : <ChipRow label="Weld head" options={[{ value: '', label: 'None' }, ...heads.map((g) => ({ value: g.id, label: gearName(g) }))]} selected={p.headId ?? ''} onSelect={(v) => patch({ headId: v || null })} />
      ) : (
        <ControlRow>
          <GhostButton label="Add a weld head" icon="add" onPress={() => navigation.navigate('OrbitalGear', { id: 'new' })} style={{ flex: 1 }} />
        </ControlRow>
      )}
      {supplies.length && !locked ? <ChipRow label="Power supply" options={[{ value: '', label: 'None' }, ...supplies.map((g) => ({ value: g.id, label: gearName(g) }))]} selected={p.supplyId ?? ''} onSelect={(v) => patch({ supplyId: v || null })} /> : null}

      <SectionHeader title="Sequence" meta="seconds" />
      <FieldRow>
        {num('Prepurge', p.seq.prepurge, (v) => patch({ seq: { ...p.seq, prepurge: v } }), 's')}
        {num('Upslope', p.seq.upslope, (v) => patch({ seq: { ...p.seq, upslope: v } }), 's')}
      </FieldRow>
      <FieldRow>
        {num('Rotation delay', p.seq.delay, (v) => patch({ seq: { ...p.seq, delay: v } }), 's')}
        {num('Downslope', p.seq.downslope, (v) => patch({ seq: { ...p.seq, downslope: v } }), 's')}
      </FieldRow>
      <FieldRow>
        {num('Postpurge', p.seq.postpurge, (v) => patch({ seq: { ...p.seq, postpurge: v } }), 's')}
        {num('Overlap', p.overlap, (v) => patch({ overlap: v }), '°')}
      </FieldRow>

      <SectionHeader title="Tungsten and gas" />
      <FieldRow>
        {num('Tungsten dia.', p.tungsten.dia, (v) => patch({ tungsten: { ...p.tungsten, dia: v } }), 'in')}
        {num('Arc gap', p.tungsten.gap, (v) => patch({ tungsten: { ...p.tungsten, gap: v } }), 'in')}
      </FieldRow>
      <FieldRow>{words('Tungsten type', p.tungsten.kind, (v) => patch({ tungsten: { ...p.tungsten, kind: v } }), '2% ceriated')}</FieldRow>
      <FieldRow>
        {words('Shield gas', p.gas.shield, (v) => patch({ gas: { ...p.gas, shield: v } }), 'Argon')}
        {num('Shield flow', p.gas.shieldCfh, (v) => patch({ gas: { ...p.gas, shieldCfh: v } }), 'CFH')}
      </FieldRow>
      <FieldRow>
        {words('ID purge gas', p.gas.purge, (v) => patch({ gas: { ...p.gas, purge: v } }), 'Argon')}
        {num('Purge flow', p.gas.purgeCfh, (v) => patch({ gas: { ...p.gas, purgeCfh: v } }), 'CFH')}
      </FieldRow>
      <FieldRow>
        {num('Oxygen under', p.gas.o2Max, (v) => patch({ gas: { ...p.gas, o2Max: v } }), 'ppm')}
        {num('Arc volts', p.volts, (v) => patch({ volts: v }), 'V')}
      </FieldRow>

      <SectionHeader title="Worked out" meta={`${figures.program.length + figures.levels.reduce((n, l) => n + l.length, 0)} figures`} />
      <HintRow text="Every equation in the Equations tab that this program has the figures for, worked out live. Each level's own are under its editor above." />
      {figures.program.map(figRow)}
      {figures.unworked.length ? (
        <Text style={[t.type.caption, { color: c.textMuted, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }]}>
          {`Not worked out yet: ${figures.unworked.map((u) => (u.why ? `${u.name} (${u.why})` : `${u.name} (needs ${u.needs.join(', ')})`)).join('; ')}.`}
        </Text>
      ) : null}
      <Text style={[t.type.label, { color: c.textMuted, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.lg, paddingBottom: t.space.sm }]}>This program's own figures</Text>
      {p.extras.map((x) => (
        <View key={x.key} style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingHorizontal: t.layout.screenPadding, minHeight: 44, borderTopWidth: t.hairline, borderTopColor: c.border }}>
          <Text style={[t.type.bodyStrong, { color: c.text, flex: 1 }]}>{x.key}</Text>
          <Text style={[t.type.body, { color: c.text }]}>{fig(x.value)}</Text>
          {!locked ? <GhostButton label={`Remove ${x.key}`} icon="close" onPress={() => patch({ extras: p.extras.filter((e) => e.key !== x.key) })} /> : null}
        </View>
      ))}
      {!locked && p.extras.length < MAX_EXTRAS ? (
        <>
          <FieldRow>
            <DimensionInput label="Name" value={extraKey} onChangeText={(v) => setExtraKey(v.replace(/[^A-Za-z0-9_]/g, '').slice(0, 16))} placeholder="k" keyboardType="default" autoCapitalize="none" />
            <NumField label="Value" value={extraVal} onChange={setExtraVal} />
          </FieldRow>
          <ControlRow>
            <GhostButton
              label="Add the figure"
              icon="add"
              style={{ flex: 1 }}
              onPress={() => {
                if (!/^[A-Za-z][A-Za-z0-9_]{0,15}$/.test(extraKey) || extraVal === null) return setWhy('A figure needs a name starting with a letter, and a value.');
                patch({ extras: [...p.extras.filter((e) => e.key.toLowerCase() !== extraKey.toLowerCase()), { key: extraKey, label: extraKey, value: extraVal }] });
                setExtraKey('');
                setExtraVal(null);
              }}
            />
          </ControlRow>
          <Text style={[t.type.caption, { color: c.textMuted, paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.sm }]}>
            A figure an equation of the crew's own asks for, by the name it uses: a factor, a length. Every equation that can then be worked out is.
          </Text>
        </>
      ) : null}

      <SectionHeader title="Qualification" />
      <FieldRow>
        {words('WPS', p.wps, (v) => patch({ wps: v }), 'WPS-OW-316-01')}
        {words('Coupon', p.coupon, (v) => patch({ coupon: v }), 'C-3')}
      </FieldRow>
      {locked ? null : <NoteField label="Note" value={p.note} onChangeText={(v) => patch({ note: v.slice(0, NOTE_MAX) })} placeholder="Heat lots matched; insert set B" max={NOTE_MAX} />}
      {locked && p.note ? <Text style={[t.type.body, { color: c.text, paddingHorizontal: t.layout.screenPadding }]}>{p.note}</Text> : null}

      {why ? <Text style={[t.type.bodyStrong, { color: c.danger, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }]}>{why}</Text> : null}
      {p.id === 'new' ? (
        <ControlRow>
          <AccentButton label="Create the program" icon="checkmark-outline" style={{ flex: 1 }} onPress={create} />
        </ControlRow>
      ) : (
        <>
          {!locked ? (
            <Text style={[t.type.caption, { color: problem ? c.danger : c.textMuted, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }]}>
              {problem ? `Not saved: ${problem}` : 'Saved as you go.'}
            </Text>
          ) : null}
          <ControlRow>
            <AccentButton label="Weld a coupon" icon="flask-outline" style={{ flex: 1 }} onPress={() => navigation.navigate('OrbitalRun', { programId: p.id, kind: 'coupon' })} />
            {locked ? <AccentButton label="Weld" icon="flame-outline" style={{ flex: 1 }} onPress={() => navigation.navigate('OrbitalRun', { programId: p.id, kind: 'production' })} /> : null}
          </ControlRow>
          {!locked ? (
            <ControlRow>
              <GhostButton label="Mark it qualified" icon="ribbon-outline" style={{ flex: 1 }} onPress={markQualified} />
            </ControlRow>
          ) : null}
          <ControlRow>
            <GhostButton label="Share by QR" icon="qr-code-outline" style={{ flex: 1 }} onPress={() => setSharing(true)} />
            <GhostButton label="Print / PDF" icon="print-outline" style={{ flex: 1 }} onPress={() => void share()} />
          </ControlRow>
          <ControlRow>
            <GhostButton label="Copy to a new one" icon="copy-outline" style={{ flex: 1 }} onPress={() => navigation.push('OrbitalProgram', { id: 'new', copy: p.id })} />
          </ControlRow>
          <ShareProgramSheet visible={sharing} onClose={() => setSharing(false)} program={p} />
          {note ? <Text style={[t.type.caption, { color: c.danger, paddingHorizontal: t.layout.screenPadding }]}>{note}</Text> : null}
          {p.history.length ? (
            <>
              <SectionHeader title="Earlier versions" meta={`${p.history.length}`} />
              {p.history.map((h) => (
                <Text key={`${h.version}-${h.updatedAt}`} style={[t.type.caption, { color: c.textMuted, paddingHorizontal: t.layout.screenPadding, paddingVertical: 4 }]}>
                  {`Version ${h.version} · ${h.status === 'qualified' ? `qualified to ${h.wps}${h.coupon ? `, coupon ${h.coupon}` : ''}` : 'development'} · ${h.levels.length} levels · ${usDate(dayKey(h.updatedAt))}`}
                </Text>
              ))}
            </>
          ) : null}
          <ControlRow>
            <GhostButton
              label={armed ? 'Tap again to delete it' : 'Delete this program'}
              icon="trash-outline"
              style={{ flex: 1 }}
              onPress={() => {
                if (!armed) return setArmed(true);
                programs.apply((b) => removeProgram(b, p.id));
                navigation.goBack();
              }}
            />
          </ControlRow>
        </>
      )}
    </Screen>
  );
}
