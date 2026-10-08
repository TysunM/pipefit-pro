// Site orientation
// ----------------
// The modules a new hire takes, built-in and the company's own, each with
// whether it has been passed. A company puts its rules in here: pasted,
// typed, or read off a printed page with the camera. The pack of modules is
// shared to every other phone as a file. The reasoning is in
// state/orientation.ts.
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { Banner, CheckRow, NoteField } from '../components/FormFields';
import { DimensionInput, FieldRow } from '../components/DimensionInput';
import { Chip } from '../components/JobChips';
import { PageScanSheet } from '../components/PageScanSheet';
import { useTheme } from '../theme/ThemeProvider';
import { useOrientationDone, useOrientationModules } from '../state/orientations';
import { LANGS, Lang, MAX_QUESTIONS, Module, ModuleView, Question, TEXT_MAX, deleteModule, modulesOf, orientationPack, orientationSummary, putModule, setOff, validQuestion } from '../state/orientation';
import { backupFileName } from '../state/backup';
import { shareBackup } from '../state/backupFile';
import { dayKey, usDate } from '../calc/days';

type Props = NativeStackScreenProps<RootStackParamList, 'Orientation'>;

export function OrientationScreen({ navigation }: Props) {
  const t = useTheme();
  const { store, apply, saveError, takeOver } = useOrientationModules();
  const { done } = useOrientationDone();
  const [lang, setLang] = useState<Lang>('en');
  const [open, setOpen] = useState<Module | 'new' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const rows = modulesOf(store, done);
  const builtins = rows.filter((r) => r.builtin);
  const own = rows.filter((r) => !r.builtin);

  const share = async () => {
    setNote(null);
    const out = await shareBackup(orientationPack(store, new Date()), backupFileName(new Date(), 'orientation'));
    setNote(out.ok ? 'The pack is on its way. On another phone: Settings → Back up and restore → Restore from a backup file.' : out.why);
  };

  const Row = ({ r }: { r: ModuleView }) => (
    <Pressable
      onPress={() => navigation.navigate('OrientationCourse', { id: r.module.id, lang })}
      accessibilityRole="button"
      accessibilityLabel={`${r.module.title}, ${r.pass ? 'passed' : r.off ? 'not required' : 'not yet'}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space.md,
        marginHorizontal: t.layout.screenPadding,
        minHeight: 56,
        paddingVertical: t.space.sm,
        borderTopWidth: t.hairline,
        borderTopColor: t.colors.border,
        backgroundColor: pressed ? t.colors.bgSubtle : 'transparent',
        opacity: r.off ? 0.55 : 1,
      })}
    >
      <Ionicons name={r.pass ? 'checkmark-circle' : r.off ? 'remove-circle-outline' : 'ellipse-outline'} size={22} color={r.pass ? t.colors.success : t.colors.textFaint} />
      <View style={{ flex: 1 }}>
        <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>{r.module.title}</Text>
        <Text style={[t.type.caption, { color: t.colors.textMuted }]} numberOfLines={1}>
          {r.pass
            ? `${r.pass.acknowledged ? 'Read and signed off' : `Passed ${r.pass.score} of ${r.pass.of}`}, ${usDate(dayKey(r.pass.at))}${r.pass.lang === 'es' ? ', en español' : ''}`
            : r.off
              ? 'Not required here'
              : `${r.module.required ? 'Not yet' : 'Optional'}${!r.builtin ? ` · ${r.module.questions.length >= 3 ? `${r.module.questions.length} questions` : 'read-through'}${r.module.lang === 'es' ? ' · español' : ''}` : ''}`}
        </Text>
      </View>
      {r.builtin ? (
        <Pressable onPress={() => apply((s) => setOff(s, r.module.id, !r.off))} hitSlop={8} accessibilityRole="button" accessibilityLabel={r.off ? 'Require this module' : 'Do not require this module'}>
          <Ionicons name={r.off ? 'add-circle-outline' : 'eye-off-outline'} size={20} color={t.colors.textFaint} />
        </Pressable>
      ) : (
        <Pressable onPress={() => setOpen(r.module)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Edit ${r.module.title}`}>
          <Ionicons name="create-outline" size={20} color={t.colors.textFaint} />
        </Pressable>
      )}
      <Ionicons name="chevron-forward" size={18} color={t.colors.textFaint} />
    </Pressable>
  );

  return (
    <Screen>
      {store.foreign ? <Banner tone="danger" icon="alert-circle" text="This phone's orientation was written by a newer version of the app, so nothing is being saved. Update the app, or start over and lose the company's modules." action="Start new" onAction={takeOver} /> : null}
      {saveError ? <Banner tone="danger" icon="cloud-offline-outline" text="The last change could not be saved to this phone." /> : null}
      <HintRow text="The course a new hire takes before the gate, in the language they think in. Nine modules of general practice are built in, in English and Spanish, with no signal and no server; the company's own rules go beside them and come first." />
      <Text style={[t.type.bodyStrong, { color: t.colors.text, paddingHorizontal: t.layout.screenPadding }]}>{orientationSummary(rows)}</Text>
      <View style={{ flexDirection: 'row', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding, paddingVertical: t.space.md }}>
        {LANGS.map((l) => (
          <Chip key={l.id} label={l.label} on={lang === l.id} onPress={() => setLang(l.id)} />
        ))}
      </View>
      <ControlRow>
        <AccentButton label="Add the company's rules" icon="add" style={{ flex: 1 }} onPress={() => setOpen('new')} />
        {own.length ? <GhostButton label="Share pack" icon="share-outline" onPress={() => void share()} /> : null}
      </ControlRow>
      {note ? <Text style={[t.type.caption, { color: note.startsWith('The pack') ? t.colors.success : t.colors.danger, paddingHorizontal: t.layout.screenPadding }]}>{note}</Text> : null}

      {own.length ? (
        <View>
          <SectionHeader title="This company" meta={`${own.filter((r) => r.pass).length} of ${own.length} passed`} />
          {own.map((r) => (
            <Row key={r.module.id} r={r} />
          ))}
        </View>
      ) : null}
      <View>
        <SectionHeader title="General practice" meta={`${builtins.filter((r) => r.pass).length} of ${builtins.filter((r) => !r.off).length} passed`} />
        {builtins.map((r) => (
          <Row key={r.module.id} r={r} />
        ))}
      </View>
      <Text style={[t.type.caption, { color: t.colors.textFaint, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.lg }]}>
        A pass is 80% or better, and goes into the skills passport. A company module is taught from its rules as written, with the questions the company writes; with none, a read-through signed off is the pass. A module whose rules change is taken again. Tap the eye to drop a built-in module this site does not need.
      </Text>

      <ModuleSheet module={open} store={store} onClose={() => setOpen(null)} apply={apply} />
    </Screen>
  );
}

/** A company module added or changed: a title and the rules, pasted, typed or read off a page. */
function ModuleSheet({ module, store, onClose, apply }: { module: Module | 'new' | null; store: Parameters<typeof putModule>[0]; onClose: () => void; apply: (f: (s: Parameters<typeof putModule>[0]) => Parameters<typeof putModule>[0]) => void }) {
  const t = useTheme();
  const had = module && module !== 'new' ? module : null;
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [required, setRequired] = useState(true);
  const [lang, setLang] = useState<Lang>('en');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [armed, setArmed] = useState(false);
  const [formFor, setFormFor] = useState<string | null>(null);
  const key = module === null ? null : had ? had.id : 'new';
  if (key !== null && formFor !== key) {
    setFormFor(key);
    setTitle(had?.title ?? '');
    setText(had?.text ?? '');
    setRequired(had?.required ?? true);
    setLang(had?.lang ?? 'en');
    setQuestions(had?.questions ?? []);
    setEditing(null);
    setWhy(null);
    setArmed(false);
  }
  if (key === null && formFor !== null) setFormFor(null);

  const save = () => {
    const out = putModule(store, { id: had?.id, title, text, required, lang, questions }, Date.now());
    if (!out.ok) return setWhy(out.why);
    apply(() => out.store);
    onClose();
  };

  return (
    <Modal visible={module !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'center' }} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ margin: t.space.lg, maxHeight: '92%', borderRadius: t.radius.xl, backgroundColor: t.colors.bg }}>
          <ScrollView contentContainerStyle={{ paddingVertical: t.space.xl, gap: t.space.sm }} keyboardShouldPersistTaps="handled">
            <Text style={[t.type.sectionTitle, { color: t.colors.text, paddingHorizontal: t.space.xl }]}>{had ? had.title : "The company's rules"}</Text>
            <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.space.xl }]}>
              One module is one subject: the site rules, the PPE policy, the permit system. Paste the text, type it, or read it off the printed page. It is taught from exactly these words, with the questions you write below; where the server has a Claude key, Claude writes the course and a Spanish one too.
            </Text>
            <FieldRow>
              <DimensionInput label="Title" value={title} onChangeText={setTitle} placeholder="Site rules" keyboardType="default" autoCapitalize="sentences" />
            </FieldRow>
            <NoteField label="The rules" value={text} onChangeText={(v) => setText(v.slice(0, TEXT_MAX))} placeholder="Paste or type the rules as the company wrote them." max={TEXT_MAX} />
            <View style={{ paddingHorizontal: t.layout.screenPadding }}>
              <GhostButton label="Read a page with the camera" icon="camera-outline" onPress={() => setScanning(true)} />
            </View>
            <CheckRow on={required} text="Required" sub="Every new hire takes it. Off: offered, not counted." onPress={() => setRequired((r) => !r)} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding, paddingVertical: t.space.sm }}>
              <Text style={[t.type.label, { color: t.colors.textMuted, width: 90 }]}>Written in</Text>
              {LANGS.map((l) => (
                <Chip key={l.id} label={l.label} on={lang === l.id} onPress={() => setLang(l.id)} />
              ))}
            </View>
            <SectionHeader title="The check" meta={questions.length ? `${questions.length} of ${MAX_QUESTIONS}` : 'none yet'} />
            <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding }]}>
              Three or more and they are the check, 80% to pass. Fewer, and a read-through signed off is the pass until Claude writes questions.
            </Text>
            {questions.map((qu, i) => (
              <Pressable key={i} onPress={() => setEditing(i)} accessibilityRole="button" accessibilityLabel={`Edit question ${i + 1}`} style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingHorizontal: t.layout.screenPadding, paddingVertical: t.space.sm }}>
                <Text style={[t.type.body, { color: t.colors.text, flex: 1 }]} numberOfLines={2}>{`${i + 1}. ${qu.q}`}</Text>
                <Ionicons name="create-outline" size={18} color={t.colors.textFaint} />
              </Pressable>
            ))}
            {questions.length < MAX_QUESTIONS ? (
              <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.sm }}>
                <GhostButton label="Add a question" icon="add" onPress={() => setEditing('new')} />
              </View>
            ) : null}
            {why ? <Text style={[t.type.caption, { color: t.colors.danger, paddingHorizontal: t.layout.screenPadding }]}>{why}</Text> : null}
            <View style={{ gap: t.space.md, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }}>
              <AccentButton label={had ? 'Save changes' : 'Add the module'} icon="save-outline" onPress={save} />
              <View style={{ flexDirection: 'row', gap: t.space.md }}>
                {had ? (
                  <GhostButton
                    label={armed ? 'Tap again to remove' : 'Remove'}
                    icon={armed ? 'warning-outline' : 'trash-outline'}
                    style={{ flex: 1 }}
                    onPress={() => {
                      if (!armed) return setArmed(true);
                      apply((s) => deleteModule(s, had.id));
                      onClose();
                    }}
                  />
                ) : null}
                <GhostButton label="Cancel" style={{ flex: 1 }} onPress={onClose} />
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
      <PageScanSheet visible={scanning} onClose={() => setScanning(false)} onText={(page) => setText((v) => `${v.trim()}${v.trim() ? '\n\n' : ''}${page}`.slice(0, TEXT_MAX))} />
      <QuestionSheet
        which={editing}
        question={editing === null || editing === 'new' ? null : questions[editing] ?? null}
        onClose={() => setEditing(null)}
        onSave={(qu) => {
          setQuestions((qs) => (editing === 'new' || editing === null ? [...qs, qu] : qs.map((x, i) => (i === editing ? qu : x))));
          setEditing(null);
        }}
        onRemove={() => {
          setQuestions((qs) => (typeof editing === 'number' ? qs.filter((_, i) => i !== editing) : qs));
          setEditing(null);
        }}
      />
    </Modal>
  );
}

const LETTERS = ['A', 'B', 'C', 'D'];

/** One question of the company's check: the question, four choices, which is right, and why. */
function QuestionSheet({ which, question, onClose, onSave, onRemove }: { which: number | 'new' | null; question: Question | null; onClose: () => void; onSave: (q: Question) => void; onRemove: () => void }) {
  const t = useTheme();
  const [q, setQ] = useState('');
  const [choices, setChoices] = useState(['', '', '', '']);
  const [answer, setAnswer] = useState<number | null>(null);
  const [why, setWhy] = useState('');
  const [bad, setBad] = useState<string | null>(null);
  const [formFor, setFormFor] = useState<string | null>(null);
  const key = which === null ? null : String(which);
  if (key !== null && formFor !== key) {
    setFormFor(key);
    setQ(question?.q ?? '');
    setChoices([0, 1, 2, 3].map((i) => question?.choices[i] ?? ''));
    setAnswer(question ? question.answer : null);
    setWhy(question?.why ?? '');
    setBad(null);
  }
  if (key === null && formFor !== null) setFormFor(null);

  const field = {
    minHeight: t.layout.fieldHeight,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.bgRaised,
    color: t.colors.text,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.sm,
    fontFamily: t.font.sansMedium,
    fontSize: 16,
    ...t.weight('600'),
  };

  const save = () => {
    const filled = choices.map((c) => c.trim()).filter(Boolean);
    if (filled.length < 2) return setBad('Give at least two choices.');
    if (answer === null || !choices[answer]?.trim()) return setBad('Mark which choice is right.');
    // The right answer keeps its place once the blank choices are dropped.
    const kept = choices.map((c, i) => ({ c: c.trim(), i })).filter((x) => x.c);
    const ok = validQuestion({ q, choices: kept.map((x) => x.c), answer: kept.findIndex((x) => x.i === answer), why });
    if (!ok) return setBad('Write the question.');
    onSave(ok);
  };

  return (
    <Modal visible={which !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'center' }} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ margin: t.space.lg, maxHeight: '92%', borderRadius: t.radius.xl, backgroundColor: t.colors.bg }}>
          <ScrollView contentContainerStyle={{ padding: t.space.xl, gap: t.space.md }} keyboardShouldPersistTaps="handled">
            <Text style={[t.type.sectionTitle, { color: t.colors.text }]}>{question ? 'This question' : 'A question'}</Text>
            <Text style={[t.type.caption, { color: t.colors.textMuted }]}>Ask what the rules say. The wrong choices are what a new hire might believe. Tap the letter of the right one.</Text>
            <TextInput value={q} onChangeText={setQ} placeholder="The question" placeholderTextColor={t.colors.textFaint} accessibilityLabel="Question" multiline style={field} />
            {choices.map((c, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
                <Pressable
                  onPress={() => setAnswer(i)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: answer === i }}
                  accessibilityLabel={`Choice ${LETTERS[i]} is right`}
                  style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: answer === i ? t.colors.success : t.colors.border, backgroundColor: answer === i ? t.colors.success : 'transparent' }}
                >
                  <Text style={[t.type.button, { color: answer === i ? '#FFFFFF' : t.colors.textMuted }]}>{LETTERS[i]}</Text>
                </Pressable>
                <TextInput
                  value={c}
                  onChangeText={(v) => setChoices((cs) => cs.map((x, k) => (k === i ? v : x)))}
                  placeholder={i < 2 ? `Choice ${LETTERS[i]}` : `Choice ${LETTERS[i]}, optional`}
                  placeholderTextColor={t.colors.textFaint}
                  accessibilityLabel={`Choice ${LETTERS[i]}`}
                  style={[field, { flex: 1 }]}
                />
              </View>
            ))}
            <TextInput value={why} onChangeText={setWhy} placeholder="Why, in one sentence (shown after a wrong answer)" placeholderTextColor={t.colors.textFaint} accessibilityLabel="Why" multiline style={field} />
            {bad ? <Text style={[t.type.caption, { color: t.colors.danger }]}>{bad}</Text> : null}
            <AccentButton label={question ? 'Save the question' : 'Add the question'} icon="checkmark" onPress={save} />
            <View style={{ flexDirection: 'row', gap: t.space.md }}>
              {question ? <GhostButton label="Remove" icon="trash-outline" style={{ flex: 1 }} onPress={onRemove} /> : null}
              <GhostButton label="Cancel" style={{ flex: 1 }} onPress={onClose} />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
