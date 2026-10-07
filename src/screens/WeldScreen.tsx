// One weld
// --------
// Logged as it is finished, the way it goes on the weld map: line, number,
// day, size, joint, process, WPS, the stamps, the heats either side, and the
// line's NDE. A new weld is saved and the form stays up with the next number,
// so a run of welds goes in one after another. An existing one shows every
// examination it has had, the results and reports, and its repairs.
import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { ChipRow } from '../components/ChipRow';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { DayStepper, NoteField } from '../components/FormFields';
import { Chip } from '../components/JobChips';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { useWelds, useWelders } from '../state/welds';
import { useHeats } from '../state/heats';
import { useSketches } from '../state/sketches';
import { findHeat } from '../state/heatBook';
import { sameProject } from '../state/project';
import {
  ExamResult,
  JOINT_TYPES,
  JointType,
  NDE_METHODS,
  NDE_PERCENTS,
  NdeMethod,
  PROCESSES,
  Process,
  STATE_LABEL,
  addWeld,
  deleteWeld,
  getWeld,
  linesOf,
  logRepair,
  nextNumber,
  pickWeld,
  putWeld,
  removeExam,
  setResult,
  stampKey,
  stampProblems,
  weldName,
  weldState,
} from '../state/weldLog';
import { dayKey, usDate } from '../calc/days';
import { sizeLabel } from '../calc/materials';

type Props = NativeStackScreenProps<RootStackParamList, 'Weld'>;

const SIZES = [0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 30, 36];
const splitHeats = (s: string) => s.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);

export function WeldScreen({ navigation, route }: Props) {
  const t = useTheme();
  const { settings } = useSettings();
  const { log, apply } = useWelds();
  const { roster } = useWelders();
  const { book } = useHeats();
  const { book: sketches } = useSketches();
  const id = route.params?.id;
  const existing = id ? getWeld(log, id) : undefined;
  const project = existing?.project ?? settings.projectId;
  const jobWelds = useMemo(() => log.welds.filter((w) => sameProject(w.project, project)), [log.welds, project]);
  const last = jobWelds[0];

  const [line, setLine] = useState(existing?.line ?? route.params?.line ?? last?.line ?? '');
  const [number, setNumber] = useState(existing?.number ?? nextNumber(log, project, route.params?.line ?? last?.line ?? ''));
  const [numberTouched, setNumberTouched] = useState(!!existing);
  const [day, setDay] = useState(existing?.day ?? dayKey(Date.now()));
  const [nps, setNps] = useState<number | null>(existing ? existing.nps : (last?.nps ?? settings.defaultNps));
  const [type, setType] = useState<JointType>(existing?.type ?? 'BW');
  const [process, setProcess] = useState<Process>(existing?.process ?? last?.process ?? 'GTAW');
  const [wps, setWps] = useState(existing?.wps ?? last?.wps ?? '');
  const [welders, setWelders] = useState<string[]>(existing?.welders ?? last?.welders ?? []);
  const [stampText, setStampText] = useState('');
  const [heats, setHeats] = useState((existing?.heats ?? []).join(', '));
  const [pct, setPct] = useState(existing?.pct ?? last?.pct ?? 5);
  const [method, setMethod] = useState<NdeMethod>(existing?.method ?? last?.method ?? 'RT');
  const [sketchId, setSketchId] = useState(existing?.sketchId ?? last?.sketchId ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [said, setSaid] = useState<{ text: string; bad: boolean } | null>(null);
  const [armed, setArmed] = useState(false);
  const [pickWith, setPickWith] = useState<NdeMethod>(existing?.method ?? 'RT');

  useEffect(() => navigation.setOptions({ title: existing ? `Weld ${weldName(existing)}` : 'Log a weld' }), [navigation, existing]);
  // A new weld's number follows the line until it is typed.
  useEffect(() => {
    if (!existing && !numberTouched) setNumber(nextNumber(log, project, line));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line, log.welds.length]);

  const stamps = [...new Set([...roster.welders.map((w) => w.stamp), ...welders])];
  const problems = stampProblems(roster, log.welds, welders, process, day);
  const heatList = splitHeats(heats);
  const unknownHeats = heatList.filter((h) => !findHeat(book, h));
  const jobIsos = sketches.sketches.filter((s) => sameProject(s.project, project));
  const lines = linesOf(jobWelds).slice(0, 8);

  const form = { project, line: line.trim(), number: number.trim(), sketchId, day, nps, type, process, wps: wps.trim(), welders, heats: heatList, pct, method, note: note.trim() };

  const save = () => {
    const now = Date.now();
    if (!form.number) return setSaid({ text: 'Give the weld its number from the map.', bad: true });
    if (existing) {
      const out = putWeld(log, { ...existing, ...form }, now);
      if (!out.ok) return setSaid({ text: out.why, bad: true });
      apply(() => out.log);
      navigation.goBack();
      return;
    }
    const out = addWeld(log, form, now);
    if (!out.ok) return setSaid({ text: out.why, bad: true });
    apply(() => out.log);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    const next = nextNumber(out.log, project, form.line);
    setSaid({ text: `Weld ${form.number}${form.line ? ` on ${form.line}` : ''} logged. Next: ${next}.`, bad: false });
    setNumber(next);
    setNumberTouched(false);
    setHeats('');
    setNote('');
  };

  const addStamp = () => {
    const s = stampText.trim().toUpperCase();
    if (!stampKey(s)) return;
    if (!welders.some((x) => stampKey(x) === stampKey(s))) setWelders([...welders, s]);
    setStampText('');
  };

  return (
    <Screen>
      {existing ? (
        <Text style={[t.type.bodyStrong, { color: { accepted: t.colors.success, repair: t.colors.danger, picked: t.colors.data, welded: t.colors.textMuted }[weldState(existing)], paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }]}>
          {`${STATE_LABEL[weldState(existing)]}${existing.repairs ? ` · repaired ${existing.repairs}×` : ''}`}
        </Text>
      ) : null}

      <View style={{ paddingTop: t.space.md }}>
        <FieldRow>
          <DimensionInput label="Line or iso" value={line} onChangeText={setLine} placeholder={'2"-CW-1201'} keyboardType="default" autoCapitalize="characters" />
          <DimensionInput
            label="Weld no."
            value={number}
            onChangeText={(s) => {
              setNumber(s);
              setNumberTouched(true);
            }}
            placeholder="14"
            keyboardType="default"
            autoCapitalize="characters"
          />
        </FieldRow>
      </View>
      {lines.length > 1 && !existing ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.sm, marginBottom: t.space.md }}>
          {lines.map((l) => (
            <Chip key={l} label={l} on={l === line} onPress={() => setLine(l)} />
          ))}
        </View>
      ) : null}
      <DayStepper day={day} onChange={setDay} />

      <ChipRow label="Size" options={SIZES.map((n) => ({ value: n, label: sizeLabel(n) }))} selected={nps} onSelect={setNps} />
      <ChipRow label="Joint" options={JOINT_TYPES.map((j) => ({ value: j.id, label: j.label }))} selected={type} onSelect={setType} />
      <ChipRow label="Process" options={PROCESSES.map((p) => ({ value: p, label: p }))} selected={process} onSelect={setProcess} />
      <FieldRow>
        <DimensionInput label="WPS" value={wps} onChangeText={setWps} placeholder="WPS-101" keyboardType="default" autoCapitalize="characters" />
      </FieldRow>

      <SectionHeader title="Welders" meta={welders.length ? welders.join(' / ') : 'none'} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.md }}>
        {stamps.map((s) => {
          const on = welders.some((x) => stampKey(x) === stampKey(s));
          return <Chip key={s} label={s} on={on} onPress={() => setWelders(on ? welders.filter((x) => stampKey(x) !== stampKey(s)) : [...welders, s])} />;
        })}
      </View>
      <FieldRow>
        <DimensionInput label="Another stamp" value={stampText} onChangeText={setStampText} placeholder="W-07" keyboardType="default" autoCapitalize="characters" />
      </FieldRow>
      {stampText.trim() ? (
        <ControlRow>
          <GhostButton label={`Add ${stampText.trim().toUpperCase()}`} icon="add" style={{ flex: 1 }} onPress={addStamp} />
        </ControlRow>
      ) : null}
      {problems.map((p) => (
        <Text key={p} style={[t.type.caption, { color: t.colors.warnText, paddingHorizontal: t.layout.screenPadding, paddingBottom: t.space.xs }]}>
          {p}
        </Text>
      ))}

      <FieldRow>
        <DimensionInput label="Heats" value={heats} onChangeText={setHeats} placeholder="A1234, B5678" keyboardType="default" autoCapitalize="characters" />
      </FieldRow>
      {unknownHeats.length ? (
        <Text style={[t.type.caption, { color: t.colors.warnText, paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.sm, marginBottom: t.space.md }]}>
          {`Not in the heat book: ${unknownHeats.join(', ')}. Add ${unknownHeats.length === 1 ? 'it' : 'them'} there with the MTR for traceability.`}
        </Text>
      ) : null}

      <ChipRow label="NDE" options={NDE_PERCENTS.map((p) => ({ value: p, label: p ? `${p}%` : 'Visual' }))} selected={pct} onSelect={setPct} />
      {pct ? <ChipRow label="Method" options={NDE_METHODS.filter((m) => m !== 'VT').map((m) => ({ value: m, label: m }))} selected={method} onSelect={setMethod} /> : null}
      {jobIsos.length ? (
        <ChipRow label="Iso" options={[{ value: '', label: 'None' }, ...jobIsos.map((s) => ({ value: s.id, label: s.name }))]} selected={sketchId} onSelect={setSketchId} />
      ) : null}
      <NoteField label="Note" value={note} onChangeText={setNote} placeholder="Purged, preheat, anything for QC" max={200} />

      {said ? <Text style={[t.type.captionStrong, { color: said.bad ? t.colors.danger : t.colors.success, paddingHorizontal: t.layout.screenPadding, paddingBottom: t.space.sm }]}>{said.text}</Text> : null}
      <ControlRow>
        <AccentButton label={existing ? 'Save' : `Log weld ${number || ''}`.trim()} icon="checkmark" style={{ flex: 1 }} onPress={save} />
      </ControlRow>

      {existing ? (
        <>
          <SectionHeader title="Examinations" meta={existing.exams.length ? `${existing.exams.length}` : 'none'} />
          {existing.exams.map((e, i) => (
            <View key={e.id} style={{ marginHorizontal: t.layout.screenPadding, paddingVertical: t.space.sm, borderTopWidth: t.hairline, borderTopColor: t.colors.border, gap: t.space.sm }}>
              <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>{`${e.method} · ${e.reason}${e.round ? ` ${e.round}` : ''} · picked ${usDate(e.day)}${e.resultDay ? ` · result ${usDate(e.resultDay)}` : ''}`}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm }}>
                {(['pending', 'accept', 'reject'] as ExamResult[]).map((r) => (
                  <Chip key={r} label={r === 'pending' ? 'Waiting' : r === 'accept' ? 'Accept' : 'Reject'} on={e.result === r} onPress={() => apply((l) => setResult(l, existing.id, e.id, r, e.report, Date.now()))} />
                ))}
                {i === existing.exams.length - 1 ? <Chip label="Take off" icon="close" on={false} onPress={() => apply((l) => removeExam(l, existing.id, e.id, Date.now()))} /> : null}
              </View>
              <FieldRow>
                <DimensionInput label="Report no." value={e.report} onChangeText={(s) => apply((l) => setResult(l, existing.id, e.id, e.result, s, Date.now()))} placeholder="RT-0412" keyboardType="default" autoCapitalize="characters" />
              </FieldRow>
            </View>
          ))}
          {weldState(existing) === 'repair' ? (
            <ControlRow>
              <AccentButton label={`Repaired: re-shoot as ${existing.number}R${existing.repairs + 1}`} icon="construct-outline" style={{ flex: 1 }} onPress={() => apply((l) => logRepair(l, existing.id, Date.now()))} />
            </ControlRow>
          ) : weldState(existing) !== 'picked' ? (
            <>
              <ChipRow label="Pick" options={NDE_METHODS.map((m) => ({ value: m, label: m }))} selected={pickWith} onSelect={setPickWith} />
              <ControlRow>
                <GhostButton label={`Pick for ${pickWith}, by the spec`} icon="scan-outline" style={{ flex: 1 }} onPress={() => apply((l) => pickWeld(l, existing.id, { method: pickWith, reason: 'spec' }, Date.now()))} />
              </ControlRow>
              <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding }]}>Random and tracer picks are made on the NDE page, so the sampling keeps count.</Text>
            </>
          ) : null}

          <View style={{ paddingTop: t.space.xl }}>
            <ControlRow>
              <GhostButton
                label={armed ? `Tap again to delete weld ${weldName(existing)}` : 'Delete this weld'}
                icon={armed ? 'warning-outline' : 'trash-outline'}
                style={{ flex: 1 }}
                onPress={() => {
                  if (!armed) return setArmed(true);
                  apply((l) => deleteWeld(l, existing.id));
                  navigation.goBack();
                }}
              />
            </ControlRow>
          </View>
        </>
      ) : null}
    </Screen>
  );
}
