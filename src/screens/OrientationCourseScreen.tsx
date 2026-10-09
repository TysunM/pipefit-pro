// One orientation module, taken
// -----------------------------
// The course, section by section, read on the screen or aloud in English or
// Spanish; then the check; then the result, kept. A built-in module has its
// course in the app in both languages. A company module is taught from the
// rules as written, cut into sections, with the company's own questions as
// the check, or a read-through signed off when it wrote none; Claude, where
// there is a key and signal, writes a better course and a Spanish one, built
// once and kept on the phone.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { AccentButton, GhostButton } from '../components/Buttons';
import { Banner } from '../components/FormFields';
import { Chip } from '../components/JobChips';
import { Plate } from '../components/metal';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { useOrientationCourses, useOrientationDone, useOrientationModules } from '../state/orientations';
import {
  Course,
  LANGS,
  Lang,
  PASS_MARK,
  Section,
  builtinModule,
  courseFor,
  keepCourse,
  manualCourse,
  passFor,
  passed,
  readingCourse,
  record,
  score,
  textKey,
  withOwnQuestions,
} from '../state/orientation';
import { builtinCourse } from '../state/orientationCourses';
import { CourseMiss, askOrientation, courseMissWords } from '../ai/orientation';
import { API_BASE } from '../ai/apiBase';
import { hush, say } from '../audio/say';

type Props = NativeStackScreenProps<RootStackParamList, 'OrientationCourse'>;

type Stage = { at: 'read' } | { at: 'check'; answers: (number | null)[] } | { at: 'done'; answers: (number | null)[]; got: number; of: number; wrong: number[] };

export function OrientationCourseScreen({ route, navigation }: Props) {
  const t = useTheme();
  const { settings } = useSettings();
  const { store } = useOrientationModules();
  const { courses, apply: applyCourses } = useOrientationCourses();
  const { done, apply: applyDone } = useOrientationDone();
  const module = builtinModule(route.params.id) ?? store.modules.find((m) => m.id === route.params.id);
  // A module written in Spanish is a Spanish module; the chips are for the built-in ones.
  const fixedLang: Lang | null = module && module.lang === 'es' ? 'es' : null;
  const [lang, setLang] = useState<Lang>(fixedLang ?? route.params.lang ?? 'en');
  const [stage, setStage] = useState<Stage>({ at: 'read' });
  const [building, setBuilding] = useState(false);
  const [miss, setMiss] = useState<CourseMiss | null>(null);
  const [reading, setReading] = useState<number | null>(null);

  const key = module ? textKey(module.text) : '';

  // What there is to teach from, in order of preference: a course Claude
  // built for these words, the built-in course, the rules cut into sections
  // with the company's questions. The company's questions win where it
  // wrote enough of them.
  const built = module ? courseFor(courses, module.id, lang, key) : undefined;
  const shipped = module ? builtinCourse(module.id, lang) : undefined;
  const course: Course | undefined = useMemo(() => {
    if (!module) return undefined;
    const c = built ?? shipped ?? manualCourse(module);
    return c ? withOwnQuestions(c, module) : undefined;
  }, [module, built, shipped]);
  /** The rules in sections, for a module with no check at all. */
  const rulesOnly: { title: string; sections: Section[] } | undefined = module && !course ? readingCourse(module) : undefined;
  const claudeWanted = !!module && !built && !shipped;
  // The rules as written are in the module's own language, whatever chip is on.
  const taughtIn: Lang = built || shipped ? lang : (module?.lang ?? lang);
  const speech = LANGS.find((l) => l.id === taughtIn)!.speech;
  const pass = module ? passFor(done, module.id, key) : undefined;

  useEffect(() => navigation.setOptions({ title: module?.title ?? 'Orientation' }), [navigation, module?.title]);
  useEffect(() => () => hush(), []);

  const build = async () => {
    if (!module || building) return;
    setBuilding(true);
    setMiss(null);
    const out = await askOrientation(API_BASE, { title: module.title, text: module.text, lang });
    setBuilding(false);
    if (typeof out === 'string') return setMiss(out);
    applyCourses((s) => keepCourse(s, { moduleId: module.id, lang, textKey: key, course: out, builtAt: Date.now() }));
  };

  // A company module is offered to Claude the moment it is opened; the rules
  // as written teach it in the meantime, and after, if Claude cannot be had.
  useEffect(() => {
    if (claudeWanted && !building && !miss) void build();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, module?.id, claudeWanted]);

  const speak = (i: number, text: string) => {
    if (reading === i) {
      hush();
      setReading(null);
      return;
    }
    setReading(i);
    say(text, speech);
  };

  const finish = (answers: (number | null)[]) => {
    if (!course || !module) return;
    const r = score(course, answers);
    applyDone((s) => record(s, { moduleId: module.id, title: course.title, lang: taughtIn, score: r.score, of: r.of, at: Date.now(), project: settings.projectId, textKey: key }));
    setStage({ at: 'done', answers, got: r.score, of: r.of, wrong: r.wrong });
    hush();
  };

  /** A module with no check: the read-through, signed off, is the pass. */
  const acknowledge = () => {
    if (!module) return;
    applyDone((s) => record(s, { moduleId: module.id, title: module.title, lang: taughtIn, score: 1, of: 1, at: Date.now(), project: settings.projectId, textKey: key, acknowledged: true }));
    setStage({ at: 'done', answers: [], got: 1, of: 1, wrong: [] });
    hush();
  };

  if (!module) {
    return (
      <Screen>
        <Banner tone="danger" icon="alert-circle" text="That module is no longer on this phone." />
      </Screen>
    );
  }

  const langRow = fixedLang ? null : (
    <View style={{ flexDirection: 'row', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding, paddingVertical: t.space.md }}>
      {LANGS.map((l) => (
        <Chip
          key={l.id}
          label={l.label}
          on={lang === l.id}
          onPress={() => {
            hush();
            setReading(null);
            setMiss(null);
            setLang(l.id);
            setStage({ at: 'read' });
          }}
        />
      ))}
    </View>
  );

  const passLine = pass ? (
    <Banner tone="ok" icon="checkmark-circle" text={`${pass.acknowledged ? 'Read and signed off' : `Passed ${pass.score} of ${pass.of}`} on ${new Date(pass.at).toLocaleDateString()}. Take it again any time.`} />
  ) : null;

  /** Where the course came from, and what Claude would add. */
  const sourceLine = (() => {
    if (built) return null;
    if (shipped) return null;
    if (building) return `Claude is reading the rules and writing the course${lang === 'es' ? ' in Spanish' : ''}. A minute, usually less. The rules as written are below in the meantime.`;
    const own = module.questions.length >= 3 ? `The check is the ${module.questions.length} questions the company wrote.` : course ? '' : 'No questions are written for this module, so a read-through signed off is the pass. Add questions in the editor, or let Claude write them.';
    const es = lang === 'es' && module.lang !== 'es' ? ' Shown in English: there is no Spanish course on this phone for it.' : '';
    const why = miss ? `${courseMissWords(miss).split('.')[0]}. ` : '';
    return `${why}Taught from the rules as written, cut into sections.${es} ${own}`.trim();
  })();

  const sectionCards = (sections: Section[]) =>
    sections.map((sec, i) => (
      <View key={i} style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.lg }}>
        <Plate radius={t.radius.lg} style={{ padding: 14, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
            <Text style={[t.type.tileTitle, { color: t.colors.text, flex: 1 }]} accessibilityRole="header">
              {sec.heading}
            </Text>
            <Pressable onPress={() => speak(i, `${sec.heading}. ${sec.points.join(' ')}`)} hitSlop={8} accessibilityRole="button" accessibilityLabel={reading === i ? 'Stop reading' : `Read ${sec.heading} aloud`}>
              <Ionicons name={reading === i ? 'stop-circle' : 'volume-high-outline'} size={26} color={reading === i ? t.colors.accent : t.colors.textMuted} />
            </Pressable>
          </View>
          {sec.points.map((p, j) => (
            <View key={j} style={{ flexDirection: 'row', gap: t.space.sm }}>
              <Text style={[t.type.body, { color: t.colors.accent }]}>•</Text>
              <Text style={[t.type.body, { color: t.colors.text, flex: 1 }]}>{p}</Text>
            </View>
          ))}
        </Plate>
      </View>
    ));

  if (!course && rulesOnly && stage.at !== 'done') {
    return (
      <Screen>
        {langRow}
        {passLine}
        <HintRow text="Read each section, or tap the speaker to hear it. There is no check on this module: signing off that you have read it is the pass, and it goes into your skills passport." />
        {sourceLine ? <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding }]}>{sourceLine}</Text> : null}
        {sectionCards(rulesOnly.sections)}
        <View style={{ padding: t.layout.screenPadding, paddingTop: t.space.xl, gap: t.space.md }}>
          <AccentButton label="I have read and understood these rules" icon="checkmark-done-outline" onPress={acknowledge} />
          {miss ? <GhostButton label="Ask Claude for a course" icon="refresh-outline" onPress={() => void build()} /> : null}
        </View>
      </Screen>
    );
  }

  if (stage.at === 'read' && course) {
    return (
      <Screen>
        {langRow}
        {passLine}
        <HintRow text="Read each section, or tap the speaker to hear it. Then take the check: 80% passes, and a pass goes into your skills passport." />
        {sourceLine ? <Text style={[t.type.caption, { color: t.colors.textMuted, paddingHorizontal: t.layout.screenPadding }]}>{sourceLine}</Text> : null}
        {sectionCards(course.sections)}
        <View style={{ padding: t.layout.screenPadding, paddingTop: t.space.xl, gap: t.space.md }}>
          <AccentButton label={`Take the check · ${course.questions.length} questions`} icon="checkmark-done-outline" onPress={() => setStage({ at: 'check', answers: course.questions.map(() => null) })} />
          {miss ? <GhostButton label="Ask Claude for a course" icon="refresh-outline" onPress={() => void build()} /> : null}
          {!fixedLang && lang === 'en' && !shipped ? (
            <Text style={[t.type.caption, { color: t.colors.textFaint }]}>Need it in Spanish? Tap Español: Claude builds it once where the server has a key, and it stays on the phone. Or add the company's Spanish version as its own module, written in Spanish.</Text>
          ) : null}
        </View>
      </Screen>
    );
  }

  if (stage.at === 'check' && course) {
    const answered = stage.answers.filter((a) => a !== null).length;
    return (
      <Screen>
        <HintRow text={`${answered} of ${course.questions.length} answered. One answer each; the pass mark is ${Math.round(PASS_MARK * 100)}%.`} />
        {course.questions.map((qu, i) => (
          <View key={i} style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.lg, gap: t.space.sm }}>
            <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>{`${i + 1}. ${qu.q}`}</Text>
            {qu.choices.map((c, j) => {
              const on = stage.answers[i] === j;
              return (
                <Pressable
                  key={j}
                  onPress={() => setStage({ at: 'check', answers: stage.answers.map((a, k) => (k === i ? j : a)) })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingVertical: 8 }}
                >
                  <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? t.colors.accent : t.colors.textFaint} />
                  <Text style={[t.type.body, { color: t.colors.text, flex: 1 }]}>{c}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
        <View style={{ padding: t.layout.screenPadding, paddingTop: t.space.xl, gap: t.space.md }}>
          <AccentButton label="Hand it in" icon="checkmark" onPress={() => answered === course.questions.length && finish(stage.answers)} />
          {answered < course.questions.length ? <Text style={[t.type.caption, { color: t.colors.textFaint }]}>Answer every question first.</Text> : null}
          <GhostButton label="Back to the course" onPress={() => setStage({ at: 'read' })} />
        </View>
      </Screen>
    );
  }

  if (stage.at !== 'done') {
    // No course and no rules to read: nothing to teach from.
    return (
      <Screen>
        <Banner tone="warn" icon="alert-circle" text="This module has no rules to teach from." />
      </Screen>
    );
  }

  const ok = passed({ score: stage.got, of: stage.of });
  const signedOff = stage.of === 1 && !course;
  return (
    <Screen>
      <Banner
        tone={ok ? 'ok' : 'warn'}
        icon={ok ? 'checkmark-circle' : 'alert-circle'}
        text={
          signedOff
            ? 'Read and signed off. It is in your skills passport.'
            : ok
              ? `Passed: ${stage.got} of ${stage.of}. It is in your skills passport.`
              : `${stage.got} of ${stage.of}: not a pass yet. Read the ones you missed and take it again.`
        }
      />
      {course
        ? stage.wrong.map((i) => {
            const qu = course.questions[i]!;
            return (
              <View key={i} style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.lg, gap: 4 }}>
                <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>{qu.q}</Text>
                <Text style={[t.type.caption, { color: t.colors.danger }]}>{`You said: ${qu.choices[stage.answers[i] ?? 0]}`}</Text>
                <Text style={[t.type.caption, { color: t.colors.success }]}>{`Right: ${qu.choices[qu.answer]}`}</Text>
                {qu.why ? <Text style={[t.type.caption, { color: t.colors.textMuted }]}>{qu.why}</Text> : null}
              </View>
            );
          })
        : null}
      <View style={{ padding: t.layout.screenPadding, paddingTop: t.space.xl, gap: t.space.md }}>
        {ok ? <AccentButton label="Back to the modules" icon="arrow-back" onPress={() => navigation.goBack()} /> : <AccentButton label="Read it again" icon="refresh-outline" onPress={() => setStage({ at: 'read' })} />}
        {ok ? <GhostButton label="Open the skills passport" icon="ribbon-outline" onPress={() => navigation.navigate('Passport')} /> : <GhostButton label="Back to the modules" onPress={() => navigation.goBack()} />}
      </View>
    </Screen>
  );
}
