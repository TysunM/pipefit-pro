// One orientation module, taken
// -----------------------------
// The course, section by section, read on the screen or aloud in English or
// Spanish; then the check; then the result, kept. A built-in module has its
// English course in the app; everything else is built by Claude once, where
// there is signal, and kept on the phone after.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { SectionHeader } from '../components/SectionHeader';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { Banner } from '../components/FormFields';
import { Chip } from '../components/JobChips';
import { Plate } from '../components/metal';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { useOrientationCourses, useOrientationDone, useOrientationModules } from '../state/orientations';
import { Course, LANGS, Lang, PASS_MARK, builtinModule, courseFor, keepCourse, passFor, passed, record, score, textKey } from '../state/orientation';
import { BUILTIN_COURSES } from '../state/orientationCourses';
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
  const [lang, setLang] = useState<Lang>(route.params.lang ?? 'en');
  const [stage, setStage] = useState<Stage>({ at: 'read' });
  const [building, setBuilding] = useState(false);
  const [miss, setMiss] = useState<CourseMiss | null>(null);
  const [reading, setReading] = useState<number | null>(null);

  const module = builtinModule(route.params.id) ?? store.modules.find((m) => m.id === route.params.id);
  const key = module ? textKey(module.text) : '';
  const speech = LANGS.find((l) => l.id === lang)!.speech;
  const course: Course | undefined = useMemo(() => {
    if (!module) return undefined;
    return courseFor(courses, module.id, lang, key) ?? (lang === 'en' ? BUILTIN_COURSES[module.id] : undefined);
  }, [module, courses, lang, key]);
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

  // A course in the other language is built the moment it is asked for.
  useEffect(() => {
    if (module && !course && !building && !miss) void build();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, module?.id, course]);

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
    applyDone((s) => record(s, { moduleId: module.id, title: course.title, lang, score: r.score, of: r.of, at: Date.now(), project: settings.projectId, textKey: key }));
    setStage({ at: 'done', answers, got: r.score, of: r.of, wrong: r.wrong });
    hush();
  };

  if (!module) {
    return (
      <Screen>
        <Banner tone="danger" icon="alert-circle" text="That module is no longer on this phone." />
      </Screen>
    );
  }

  const langRow = (
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

  if (!course) {
    return (
      <Screen>
        {langRow}
        {pass ? <Banner tone="ok" icon="checkmark-circle" text={`Passed ${pass.score} of ${pass.of} on ${new Date(pass.at).toLocaleDateString()}.`} /> : null}
        <HintRow text={building ? `Claude is reading the rules and writing the course${lang === 'es' ? ' in Spanish' : ''}. A minute, usually less.` : miss ? courseMissWords(miss) : 'The course is built from the rules below.'} />
        {miss ? (
          <ControlRow>
            <AccentButton label="Try again" icon="refresh-outline" style={{ flex: 1 }} onPress={() => void build()} />
          </ControlRow>
        ) : null}
        <SectionHeader title="The rules, as written" />
        <Text style={[t.type.body, { color: t.colors.text, paddingHorizontal: t.layout.screenPadding, paddingBottom: t.space.xl }]}>{module.text}</Text>
      </Screen>
    );
  }

  if (stage.at === 'read') {
    return (
      <Screen>
        {langRow}
        {pass ? <Banner tone="ok" icon="checkmark-circle" text={`Passed ${pass.score} of ${pass.of} on ${new Date(pass.at).toLocaleDateString()}. Take it again any time.`} /> : null}
        <HintRow text="Read each section, or tap the speaker to hear it. Then take the check: 80% passes, and a pass goes into your skills passport." />
        {course.sections.map((sec, i) => (
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
        ))}
        <View style={{ padding: t.layout.screenPadding, paddingTop: t.space.xl, gap: t.space.md }}>
          <AccentButton label={`Take the check · ${course.questions.length} questions`} icon="checkmark-done-outline" onPress={() => setStage({ at: 'check', answers: course.questions.map(() => null) })} />
          {lang === 'es' || !BUILTIN_COURSES[module.id] ? null : (
            <Text style={[t.type.caption, { color: t.colors.textFaint }]}>Need it in Spanish? Tap Español above; Claude builds it once, and it stays on the phone.</Text>
          )}
        </View>
      </Screen>
    );
  }

  if (stage.at === 'check') {
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

  const ok = passed({ score: stage.got, of: stage.of });
  return (
    <Screen>
      <Banner tone={ok ? 'ok' : 'warn'} icon={ok ? 'checkmark-circle' : 'alert-circle'} text={ok ? `Passed: ${stage.got} of ${stage.of}. It is in your skills passport.` : `${stage.got} of ${stage.of}: not a pass yet. Read the ones you missed and take it again.`} />
      {stage.wrong.map((i) => {
        const qu = course.questions[i]!;
        return (
          <View key={i} style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.lg, gap: 4 }}>
            <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>{qu.q}</Text>
            <Text style={[t.type.caption, { color: t.colors.danger }]}>{`You said: ${qu.choices[stage.answers[i] ?? 0]}`}</Text>
            <Text style={[t.type.caption, { color: t.colors.success }]}>{`Right: ${qu.choices[qu.answer]}`}</Text>
            {qu.why ? <Text style={[t.type.caption, { color: t.colors.textMuted }]}>{qu.why}</Text> : null}
          </View>
        );
      })}
      <View style={{ padding: t.layout.screenPadding, paddingTop: t.space.xl, gap: t.space.md }}>
        {ok ? <AccentButton label="Back to the modules" icon="arrow-back" onPress={() => navigation.goBack()} /> : <AccentButton label="Read it again" icon="refresh-outline" onPress={() => setStage({ at: 'read' })} />}
        {ok ? <GhostButton label="Open the skills passport" icon="ribbon-outline" onPress={() => navigation.navigate('Passport')} /> : <GhostButton label="Back to the modules" onPress={() => navigation.goBack()} />}
      </View>
    </Screen>
  );
}
