import React, { useMemo, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { AccentButton, ControlRow } from '../components/Buttons';
import { KnotView } from '../components/knots/KnotView';
import { laidFault, laidOf, laidSet, pairFrame } from '../components/knots/laid';
import { lengthsAt } from '../components/knots/useStepPlayer';
import { VoicePressable } from '../voice/VoicePressable';
import { useTheme } from '../theme/ThemeProvider';
import { useKnotBook } from '../state/knots';
import { recordTest } from '../state/knotProgress';
import { knotById, reachAfter } from '../calc/knots/knots';
import { makeTest, seeded, type Question } from '../calc/knots/quiz';
import { ListRow } from './OrbitalScreen';

// Ten questions: what knot is that, which knot for the job, what comes next,
// is that safe, and which one is ready to load. Each answer says why; the best score is kept.

type Props = NativeStackScreenProps<RootStackParamList, 'KnotTest'>;

/** The knot a question is about, for "learn it" after a miss. */
const knotOf = (q: Question) => q.knot ?? (q.kind === 'job' ? q.answer : undefined);

export function KnotTestScreen({ navigation }: Props) {
  const t = useTheme();
  const c = t.colors;
  const { width } = useWindowDimensions();
  const book = useKnotBook();
  const [seed, setSeed] = useState(() => Date.now() % 1_000_000_007);
  const qs = useMemo(() => makeTest(seeded(seed)), [seed]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [at, setAt] = useState(0);
  const [finished, setFinished] = useState(false);
  const q = qs[at]!;
  const picked = answers[at] ?? null;
  const score = answers.filter((a, j) => a === qs[j]!.answer).length;
  const size = Math.min(width - 2 * t.layout.screenPadding, 300);

  const pick = (id: string) => {
    if (picked !== null) return;
    void Haptics.notificationAsync(id === q.answer ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    setAnswers((a) => {
      const n = [...a];
      n[at] = id;
      return n;
    });
  };
  const next = () => {
    if (picked === null) return;
    if (at < qs.length - 1) return setAt(at + 1);
    book.apply((b) => recordTest(b, score, qs.length));
    setFinished(true);
  };
  const again = () => {
    setSeed((s) => (s * 48271 + 11) % 1_000_000_007);
    setAnswers([]);
    setAt(0);
    setFinished(false);
  };

  if (finished) {
    const missed = qs.filter((qq, j) => answers[j] !== qq.answer);
    return (
      <Screen>
        <View style={{ alignItems: 'center', padding: t.layout.screenPadding, gap: t.space.sm }}>
          <Ionicons name={score >= 8 ? 'ribbon' : 'school-outline'} size={48} color={score >= 8 ? c.glow : c.textMuted} />
          <Text style={[t.type.sectionTitle, { color: c.text, fontSize: 28 }]}>{`${score} of ${qs.length}`}</Text>
          <Text style={[t.type.body, { color: c.textMuted, textAlign: 'center' }]}>
            {score === qs.length ? 'Every one right.' : score >= 8 ? 'Good. Go over the ones you missed.' : 'Go over the ones you missed, tie them by hand, and take it again.'}
            {book.value.test.best !== null ? ` Best: ${book.value.test.best} of ${book.value.test.of}.` : ''}
          </Text>
        </View>
        <ControlRow>
          <AccentButton label="Take it again" icon="refresh" style={{ flex: 1 }} onPress={again} />
        </ControlRow>
        {missed.length ? <SectionHeader title="Missed" meta={`${missed.length}`} /> : null}
        {missed.map((m, j) => {
          const id = knotOf(m);
          return <ListRow key={j} voice={`Missed ${j + 1}`} title={m.prompt} sub={m.why} onPress={() => (id ? navigation.navigate('Knot', { id, mode: m.kind === 'fault' ? 'check' : undefined }) : undefined)} />;
        })}
      </Screen>
    );
  }

  const k = q.knot ? knotById(q.knot) : undefined;
  return (
    <Screen>
      <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md, gap: t.space.sm }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {qs.map((qq, j) => (
            <View key={j} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: answers[j] !== undefined ? (answers[j] === qq.answer ? c.success : c.danger) : j === at ? c.glow : c.border }} />
          ))}
        </View>
        <Text style={[t.type.label, { color: c.textMuted }]}>{`Question ${at + 1} of ${qs.length}`}</Text>
        <Text style={[t.type.sectionTitle, { color: c.text }]}>{q.prompt}</Text>
      </View>
      {k && q.kind === 'fault' ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }}>
          {q.options.map((o, s) => {
            const fault = k.faults.find((f) => f.id === q.fault);
            const d = s === q.good || !fault ? laidSet(k) : laidFault(k, fault);
            const right = o.id === q.answer;
            const ink = picked === null ? c.border : right ? c.success : picked === o.id ? c.danger : c.border;
            const half = Math.floor((Math.min(width - 2 * t.layout.screenPadding, 440) - t.space.sm) / 2);
            return (
              <VoicePressable
                key={o.id}
                voiceLabel={o.label}
                onPress={() => pick(o.id)}
                accessibilityRole="button"
                accessibilityLabel={o.label}
                accessibilityState={{ selected: picked === o.id, disabled: picked !== null }}
                style={{ borderRadius: t.radius.lg + 3, borderWidth: picked !== null && (right || picked === o.id) ? 3 : 1.5, borderColor: ink }}
              >
                <KnotView knot={k} laid={d.laid} shown={d.shown} size={half - 6} frame={fault ? pairFrame(k, fault) : null} label={`${k.name}, ${o.label.toLowerCase()}`} />
              </VoicePressable>
            );
          })}
        </View>
      ) : k ? (
        <View style={{ alignItems: 'center', paddingVertical: t.space.md }}>
          <KnotView knot={k} laid={laidOf(k)} shown={lengthsAt(laidOf(k), reachAfter(k, q.shownStep ?? k.steps.length - 1))} size={size} label={q.kind === 'name' ? 'A knot' : `${k.name}, part tied`} />
        </View>
      ) : null}
      <View style={{ paddingHorizontal: t.layout.screenPadding, gap: t.space.sm, paddingTop: t.space.sm }}>
        {(q.kind === 'fault' ? [] : q.options).map((o) => {
          const right = o.id === q.answer;
          const mine = picked === o.id;
          const ink = picked === null ? c.border : right ? c.success : mine ? c.danger : c.border;
          return (
            <VoicePressable
              key={o.id}
              voiceLabel={o.label}
              onPress={() => pick(o.id)}
              accessibilityRole="button"
              accessibilityLabel={o.label}
              accessibilityState={{ selected: mine, disabled: picked !== null }}
              style={({ pressed }) => ({
                minHeight: 54,
                paddingHorizontal: t.space.lg,
                paddingVertical: t.space.md,
                borderRadius: t.radius.md,
                borderWidth: picked !== null && (right || mine) ? 2 : 1,
                borderColor: ink,
                backgroundColor: pressed && picked === null ? c.bgSubtle : c.bgRaised,
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.space.md,
              })}
            >
              <Text style={[t.type.body, { color: c.text, flex: 1 }]}>{o.label}</Text>
              {picked !== null && right ? <Ionicons name="checkmark-circle" size={22} color={c.success} /> : null}
              {picked !== null && mine && !right ? <Ionicons name="close-circle" size={22} color={c.danger} /> : null}
            </VoicePressable>
          );
        })}
      </View>
      {picked !== null ? (
        <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md, gap: t.space.sm }}>
          <Text style={[t.type.bodyStrong, { color: picked === q.answer ? c.success : c.danger }]}>{picked === q.answer ? 'Right.' : 'Not that one.'}</Text>
          <Text style={[t.type.body, { color: c.text }]}>{q.why}</Text>
        </View>
      ) : null}
      {picked !== null ? (
        <ControlRow>
          {at < qs.length - 1 ? (
            <AccentButton label="Next question" icon="arrow-forward" style={{ flex: 1 }} onPress={next} />
          ) : (
            <AccentButton label="See the score" icon="ribbon-outline" style={{ flex: 1 }} onPress={next} />
          )}
        </ControlRow>
      ) : null}
    </Screen>
  );
}
