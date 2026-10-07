// The shift report
// ----------------
// The day, written up once at the end of it. The top of the screen is what
// the app already knows about the day on this job — read off the test log,
// the joint register, the heat book, the level log and the sketch book, and
// never typed again. Under it is what nobody else keeps: the welds made and
// rejected, the spools finished, the crew, and the crew's own words.
//
// "Build the report" writes the plain version from all of it. "Polish with
// Claude" sends the same facts to the Worker and gets the summary and the
// notes back as sentences, which the app checks against the record before it
// shows them (ai/shiftPolish.ts). Either way the text is here to read and
// edit before it goes, as text to a chat or as a PDF.

import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, Share, Text, TextInput, TextStyle, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { Well } from '../components/metal';
import { FooterNote } from '../components/Results';
import { Banner, DayStepper, NoteField, NumField } from '../components/FormFields';
import { JobChips, useJobFilter } from '../components/JobChips';
import { Theme, useTheme } from '../theme/ThemeProvider';
import { useShifts } from '../state/shifts';
import { usePressureTests } from '../state/pressureTests';
import { useJoints } from '../state/joints';
import { useHeats } from '../state/heats';
import { useLevels } from '../state/levels';
import { useSketches } from '../state/sketches';
import { useSpools } from '../state/spools';
import { useSettings } from '../state/settings';
import { sameProject } from '../state/project';
import {
  MAX_ROWS,
  NAME_MAX,
  REPORT_MAX,
  ShiftNotes,
  ShiftReport,
  TEXT_MAX,
  WELD_SIZES,
  diameterInches,
  newReport,
  putReport,
  reportFor,
  sizeLabel,
  weldTotal,
} from '../state/shiftLog';
import { hasWork, logFacts, plainReport, plainSummary, reportText, shiftFacts } from '../calc/shiftReport';
import { workDay } from '../calc/days';
import { PolishMiss, askShiftPolish, checkPolish, polishMissWords } from '../ai/shiftPolish';
import { API_BASE } from '../ai/apiBase';
import { shareSheet } from '../print/share';
import { shiftSheetHtml } from '../print/shiftSheet';
import { day as printDay } from '../print/turnover';

type Props = NativeStackScreenProps<RootStackParamList, 'ShiftReport'>;

const WEB_INPUT_RESET = (Platform.OS === 'web' ? { outlineStyle: 'none' } : null) as TextStyle | null;
const NOTE_FIELDS: { key: keyof ShiftNotes; label: string; hint: string }[] = [
  { key: 'issues', label: 'Issues / delays', hint: 'What held the crew up: crane, material, permits, weather' },
  { key: 'safety', label: 'Safety', hint: 'Near misses, hazards found, toolbox talk' },
  { key: 'tomorrow', label: 'Tomorrow', hint: 'What the crew goes to first' },
  { key: 'notes', label: 'Notes', hint: 'Anything else the foreman should know' },
];

/** A weld size with a count and two big buttons: the welds screen, one row per size in use. */
function WeldRow({ t, nps, count, onChange }: { t: Theme; nps: number; count: number; onChange: (n: number) => void }) {
  const step = (by: number) => (
    <Pressable
      onPress={() => {
        onChange(Math.max(0, Math.min(999, count + by)));
        void Haptics.selectionAsync();
      }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`${by > 0 ? 'One more' : 'One fewer'} ${sizeLabel(nps)} weld`}
      style={({ pressed }) => ({
        width: 48,
        height: 44,
        borderRadius: t.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? t.colors.bgSubtle : t.colors.bgRaised,
        borderWidth: 1,
        borderColor: t.colors.border,
      })}
    >
      <Ionicons name={by > 0 ? 'add' : 'remove'} size={22} color={t.colors.text} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingHorizontal: t.layout.screenPadding, paddingVertical: t.space.sm }}>
      <Text style={[t.type.bodyStrong, { color: t.colors.text, width: 64 }]}>{sizeLabel(nps)}</Text>
      {step(-1)}
      <Text style={[t.type.statValue, { color: count ? t.colors.data : t.colors.textFaint, width: 48, textAlign: 'center' }]}>{count}</Text>
      {step(1)}
      <Text style={[t.type.caption, { color: t.colors.textMuted, flex: 1 }]}>{count ? `${Math.round(nps * count * 10) / 10} DI` : ''}</Text>
    </View>
  );
}

export function ShiftReportScreen({ navigation }: Props) {
  const t = useTheme();
  const { log, apply, saveError, takeOver, clearDropped } = useShifts();
  const { log: tests } = usePressureTests();
  const { register } = useJoints();
  const { book: heats } = useHeats();
  const { log: levels } = useLevels();
  const { book: sketches } = useSketches();
  const { shelf } = useSpools();
  const { settings } = useSettings();

  // The job: picked here or on any screen, else the active one. A report is
  // for one job, so "All jobs" means the active job here.
  const job = useJobFilter(log.reports);
  const project = job.filter.kind === 'one' ? job.filter.id : job.active;
  const [day, setDay] = useState(() => workDay(Date.now(), settings.shift));
  const saved = reportFor(log, day, project);
  const report: ShiftReport = saved ?? newReport(day, project, Date.now());

  const [sizes, setSizes] = useState<number[]>([6, 4, 2]);
  const shown = useMemo(() => [...new Set([...report.welds.map((w) => w.nps), ...sizes])].sort((a, b) => b - a), [report.welds, sizes]);
  const [pickSize, setPickSize] = useState(false);
  const [rejectId, setRejectId] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [spool, setSpool] = useState('');
  const [busy, setBusy] = useState<'polish' | 'pdf' | 'text' | null>(null);
  const [notice, setNotice] = useState<{ tone: 'warn' | 'ok' | 'info'; text: string } | null>(null);

  useEffect(() => navigation.setOptions({ title: project ? `Shift report · ${project}` : 'Shift report' }), [navigation, project]);

  const facts = useMemo(
    () => shiftFacts(report, logFacts({ tests: tests.tests, joints: register.joints, heats: heats.heats, readings: levels.readings, sketches: sketches.sketches }, day, project, settings.shift), settings.shift),
    [report, tests.tests, register.joints, heats.heats, levels.readings, sketches.sketches, day, project, settings.shift],
  );
  const summary = plainSummary(facts);
  const jobSpools = useMemo(() => shelf.spools.filter((s) => sameProject(s.project, project)).map((s) => s.name), [shelf.spools, project]);

  /** A change to the day's report, made to the newest copy of it. */
  const change = (f: (r: ShiftReport) => ShiftReport) =>
    apply((l) => {
      const cur = reportFor(l, day, project) ?? newReport(day, project, Date.now());
      return putReport(l, f(cur), Date.now());
    });
  const edit = (patch: Partial<ShiftReport>) => change((r) => ({ ...r, ...patch }));
  const setWeld = (nps: number, count: number) =>
    change((r) => ({ ...r, welds: [...r.welds.filter((w) => w.nps !== nps), ...(count > 0 ? [{ nps, count }] : [])] }));

  const addReject = () => {
    const id = rejectId.trim();
    if (!id) return;
    change((r) => ({ ...r, rejects: [...r.rejects.filter((x) => x.id.toUpperCase() !== id.toUpperCase()), { id, note: rejectNote.trim() }].slice(0, MAX_ROWS) }));
    setRejectId('');
    setRejectNote('');
  };
  const toggleSpool = (name: string) =>
    change((r) => ({ ...r, spools: r.spools.some((s) => s.toUpperCase() === name.toUpperCase()) ? r.spools.filter((s) => s.toUpperCase() !== name.toUpperCase()) : [...r.spools, name].slice(0, MAX_ROWS) }));
  const addSpool = () => {
    const name = spool.trim();
    if (!name) return;
    if (!report.spools.some((s) => s.toUpperCase() === name.toUpperCase())) toggleSpool(name);
    setSpool('');
  };

  const build = () => {
    edit({ text: plainReport(facts, report.notes), polished: false });
    setNotice({ tone: 'ok', text: 'Built from the records. Read it over, change what you like, then share it.' });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const polish = async () => {
    if (busy) return;
    setBusy('polish');
    setNotice(null);
    const body = { facts, notes: report.notes };
    const out = await askShiftPolish(API_BASE, body);
    setBusy(null);
    if (typeof out === 'string') return setNotice({ tone: 'warn', text: polishMissWords(out as PolishMiss) });
    const check = checkPolish(body, out);
    if (!check.ok) {
      edit({ text: plainReport(facts, report.notes), polished: false });
      return setNotice({ tone: 'warn', text: `${check.why} The plain version is in its place.` });
    }
    edit({ text: reportText(facts, out.summary, { issues: out.issues, safety: out.safety, tomorrow: out.tomorrow, notes: out.notes }), polished: true });
    setNotice({ tone: 'ok', text: 'Claude wrote the summary and tidied the notes; the app checked every figure and name against the log. Read it over before it goes.' });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const text = report.text || '';
  const shareText = async () => {
    if (busy || !text) return;
    setBusy('text');
    try {
      await Share.share({ message: text, title: `Shift report ${facts.date}` }, { dialogTitle: 'Send the shift report', subject: `Shift report ${facts.date} · ${facts.job}` });
    } catch (e) {
      setNotice({ tone: 'warn', text: e instanceof Error && e.message ? e.message : 'The report could not be shared.' });
    }
    setBusy(null);
  };
  const sharePdf = async () => {
    if (busy || !text) return;
    setBusy('pdf');
    const out = await shareSheet(shiftSheetHtml({ title: `Shift report ${facts.date} ${facts.job}`, text, dateLine: `Printed ${printDay(Date.now())}`, polished: report.polished }), `Shift report ${facts.date}`);
    setBusy(null);
    if (!out.ok) setNotice({ tone: 'warn', text: out.why });
  };

  const [editing, setEditing] = useState(false);

  return (
    <Screen>
      {saveError ? <Banner tone="danger" icon="cloud-offline-outline" text="The last change could not be saved to this phone. What is on screen is ahead of what is stored." /> : null}
      {log.foreign ? (
        <Banner tone="danger" icon="alert-circle" text="This phone's shift reports were written by a newer version of the app, so nothing is being saved. Update the app, or start over and lose them." action="Start new" onAction={takeOver} />
      ) : null}
      {log.dropped ? <Banner tone="warn" icon="warning-outline" text={`${log.dropped} stored ${log.dropped === 1 ? 'report' : 'reports'} would not load.`} action="OK" onAction={clearDropped} /> : null}

      <View style={{ paddingTop: t.space.md }}>
        <JobChips f={job} />
      </View>
      <DayStepper day={day} onChange={setDay} today={workDay(Date.now(), settings.shift)} />

      <SectionHeader title="Already logged" meta={hasWork(facts) ? undefined : 'NOTHING YET'} />
      <View style={{ paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.md }}>
        <Text style={[t.type.body, { color: t.colors.text }]}>{summary}</Text>
        <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: t.space.sm }]}>
          Read off the test log, the joint register, the heat book, the level log and the sketch book for this day and job. Log work there and it shows here.
        </Text>
      </View>

      <SectionHeader title="Welds" meta={weldTotal(report.welds) ? `${weldTotal(report.welds)} WELDS · ${Math.round(diameterInches(report.welds) * 10) / 10} DI` : undefined} />
      {shown.map((nps) => (
        <WeldRow key={nps} t={t} nps={nps} count={report.welds.find((w) => w.nps === nps)?.count ?? 0} onChange={(n) => setWeld(nps, n)} />
      ))}
      {pickSize ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding, paddingVertical: t.space.md }}>
          {WELD_SIZES.filter((s) => !shown.includes(s)).map((s) => (
            <Pressable
              key={s}
              onPress={() => {
                setSizes((xs) => [...xs, s]);
                setPickSize(false);
              }}
              accessibilityRole="button"
              style={({ pressed }) => ({ paddingHorizontal: t.space.lg, height: t.layout.chipHeight, justifyContent: 'center', borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, backgroundColor: pressed ? t.colors.bgSubtle : t.colors.bgRaised })}
            >
              <Text style={[t.type.button, { color: t.colors.text }]}>{sizeLabel(s)}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <ControlRow>
          <GhostButton label="Another size" icon="add-outline" style={{ flex: 1 }} onPress={() => setPickSize(true)} />
        </ControlRow>
      )}

      <SectionHeader title="Rejected welds" meta={report.rejects.length ? `${report.rejects.length}` : undefined} />
      {report.rejects.map((x) => (
        <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingHorizontal: t.layout.screenPadding, paddingVertical: t.space.sm }}>
          <Ionicons name="close-circle" size={18} color={t.colors.danger} />
          <Text style={[t.type.body, { color: t.colors.text, flex: 1 }]} numberOfLines={1}>
            {x.note ? `${x.id} — ${x.note}` : x.id}
          </Text>
          <Pressable onPress={() => change((r) => ({ ...r, rejects: r.rejects.filter((y) => y.id !== x.id) }))} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove reject ${x.id}`}>
            <Ionicons name="close" size={18} color={t.colors.textFaint} />
          </Pressable>
        </View>
      ))}
      <FieldRow>
        <DimensionInput label="Weld" value={rejectId} onChangeText={setRejectId} placeholder="W-14" keyboardType="default" autoCapitalize="characters" />
        <DimensionInput label="Why" value={rejectNote} onChangeText={(v) => setRejectNote(v.slice(0, NAME_MAX))} placeholder="porosity" keyboardType="default" />
      </FieldRow>
      <ControlRow>
        <GhostButton label="Add the reject" icon="add-outline" style={{ flex: 1 }} onPress={addReject} />
      </ControlRow>

      <SectionHeader title="Spools completed" meta={report.spools.length ? `${report.spools.length}` : undefined} />
      {jobSpools.length || report.spools.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.md }}>
          {[...new Set([...report.spools, ...jobSpools])].map((name) => {
            const on = report.spools.some((s) => s.toUpperCase() === name.toUpperCase());
            return (
              <Pressable
                key={name}
                onPress={() => toggleSpool(name)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={({ pressed }) => ({
                  paddingHorizontal: t.space.lg,
                  height: t.layout.chipHeight,
                  justifyContent: 'center',
                  borderRadius: t.radius.md,
                  borderWidth: 1,
                  borderColor: on ? t.colors.data : t.colors.border,
                  backgroundColor: on ? (pressed ? t.colors.primaryPressed : t.colors.primary) : pressed ? t.colors.bgSubtle : t.colors.bgRaised,
                })}
              >
                <Text style={[t.type.button, { color: on ? t.colors.onPrimary : t.colors.text }]}>{name}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <FieldRow>
        <DimensionInput label="Spool mark" value={spool} onChangeText={(v) => setSpool(v.slice(0, NAME_MAX))} placeholder="SP-07" keyboardType="default" autoCapitalize="characters" />
        <View style={{ flex: 1, minWidth: 96, justifyContent: 'flex-end', paddingBottom: 2 }}>
          <GhostButton label="Add" icon="add-outline" onPress={addSpool} />
        </View>
      </FieldRow>

      <SectionHeader title="Crew" meta={report.crew !== null && report.hours !== null ? `${report.crew * report.hours} MAN-HOURS` : undefined} />
      <FieldRow>
        <NumField label="On the crew" value={report.crew} onChange={(v) => edit({ crew: v })} placeholder="4" />
        <NumField label="Hours each" suffix="h" value={report.hours} onChange={(v) => edit({ hours: v })} placeholder="10" />
      </FieldRow>

      <SectionHeader title="In your words" />
      {NOTE_FIELDS.map((n) => (
        <NoteField key={n.key} label={n.label} value={report.notes[n.key]} max={TEXT_MAX} placeholder={n.hint} onChangeText={(v) => change((r) => ({ ...r, notes: { ...r.notes, [n.key]: v } }))} />
      ))}
      {settings.gloveMode ? null : (
        <Text style={[t.type.caption, { color: t.colors.textFaint, paddingHorizontal: t.layout.screenPadding, marginTop: -t.space.sm, marginBottom: t.space.lg }]}>
          Shorthand is fine. Claude turns it into sentences; the plain report keeps it as typed.
        </Text>
      )}

      <SectionHeader title="The report" meta={text ? (report.polished ? 'CLAUDE · CHECKED' : 'PLAIN') : undefined} />
      {notice ? <Banner tone={notice.tone} icon={notice.tone === 'ok' ? 'checkmark-circle-outline' : 'information-circle-outline'} text={notice.text} action="OK" onAction={() => setNotice(null)} /> : null}
      <ControlRow>
        <GhostButton label="Build the report" icon="construct-outline" style={{ flex: 1 }} onPress={build} />
        <AccentButton label={busy === 'polish' ? 'Asking Claude…' : 'Polish with Claude'} icon="sparkles-outline" style={{ flex: 1 }} onPress={() => void polish()} />
      </ControlRow>
      {text ? (
        <>
          <View style={{ paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.lg }}>
            <Well style={{ padding: t.space.md, borderWidth: editing ? 2 : 1, borderColor: editing ? t.colors.data : t.colors.wellEdge }}>
              <TextInput
                multiline
                value={text}
                onChangeText={(v) => edit({ text: v.slice(0, REPORT_MAX) })}
                onFocus={() => setEditing(true)}
                onBlur={() => setEditing(false)}
                accessibilityLabel="The shift report, to read and edit"
                style={[t.type.body, { color: t.colors.text, minHeight: 240, textAlignVertical: 'top', padding: 0 }, WEB_INPUT_RESET]}
              />
            </Well>
            <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: t.space.sm }]}>
              {report.polished
                ? 'Claude’s version. Every figure and name in it was checked against the log; the words are yours to change.'
                : 'Built by the app from the records and your notes, word for word. Change anything, then share it.'}
            </Text>
          </View>
          <ControlRow>
            <GhostButton label={busy === 'text' ? 'Sharing…' : 'Send as text'} icon="chatbubble-outline" style={{ flex: 1 }} onPress={() => void shareText()} />
            <AccentButton label={busy === 'pdf' ? 'Making the PDF…' : 'Share as PDF'} icon="document-outline" style={{ flex: 1 }} onPress={() => void sharePdf()} />
          </ControlRow>
        </>
      ) : (
        <FooterNote text="Nothing built yet. Log the day above, then build the report, or have Claude write it from the same facts." />
      )}
      <FooterNote text="Every figure in the report comes from a record on this phone. Claude writes only the summary and tidies your notes, and the app refuses its version if it adds a figure, drops a rejected weld or a failed test, or changes a note you did not write." />
    </Screen>
  );
}
