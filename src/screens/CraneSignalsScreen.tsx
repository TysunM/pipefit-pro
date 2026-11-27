import React, { useMemo, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { HintRow } from '../components/HintRow';
import { Segmented } from '../components/Segmented';
import { FooterNote } from '../components/Results';
import { useNow } from '../components/FormFields';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { FIGURE_ASPECT, SignalFigure, SignalFrame } from '../components/SignalFigure';
import { useScrollHost } from '../components/scrollHost';
import { VoicePressable } from '../voice/VoicePressable';
import { useTheme } from '../theme/ThemeProvider';
import { useCraneBook } from '../state/crane';
import { recordCraneTest, recordQuick, recordSeen } from '../state/craneProgress';
import { GROUPS, SIGNALS, signalById, type Signal, type SignalId } from '../calc/crane/signals';
import { MISS_MS, makeRun, makeTest, runTime, type Question } from '../calc/crane/drill';
import { seeded } from '../calc/knots/quiz';
import { seconds } from '../components/knots/TieGame';
import { Pill } from './OrbitalScreen';

// The standard hand signals for cranes: each one shown on a loop with how it's
// given, what it tells the operator and the one it's mixed up with; then a
// ten-question test, and the quick read: every signal once against the clock.

type Props = NativeStackScreenProps<RootStackParamList, 'CraneSignals'>;
type Mode = 'learn' | 'test' | 'quick';

const RULES = [
  'Agree the signals with the operator before the lift. The chart is posted on the crane or near the lift.',
  'One signal person gives the signals. Anyone can give Stop or Emergency stop, and the operator stops for it from anyone.',
  "Main hoist or whip line first, then the motion. If the operator loses sight of the signal person or can't read the signal, the operator stops.",
];

export function CraneSignalsScreen(_: Props) {
  const [mode, setMode] = useState<Mode>('learn');
  return (
    <Screen>
      <Segmented
        options={[
          { value: 'learn', label: 'Learn' },
          { value: 'test', label: 'Test' },
          { value: 'quick', label: 'Quick read' },
        ]}
        selected={mode}
        onSelect={setMode}
      />
      {mode === 'learn' ? <Learn /> : mode === 'test' ? <Test onLearn={() => setMode('learn')} /> : <Quick />}
    </Screen>
  );
}

function Learn() {
  const t = useTheme();
  const c = t.colors;
  const { width } = useWindowDimensions();
  const host = useScrollHost();
  const [id, setId] = useState<SignalId>('stop');
  const [left, setLeft] = useState(false);
  const [playing, setPlaying] = useState(true);
  const s = signalById(id)!;
  const inner = Math.min(width, t.layout.maxContentWidth) - 2 * t.layout.screenPadding;
  const big = Math.min(280, Math.round(inner / FIGURE_ASPECT));
  const cols = inner >= 560 ? 5 : inner >= 420 ? 4 : 3;
  const tileW = Math.floor((inner - (cols - 1) * t.space.sm) / cols);
  const tileH = Math.round((tileW - 8) / FIGURE_ASPECT);

  const show = (next: SignalId) => {
    setId(next);
    setLeft(false);
    setPlaying(true);
    if (host) host.scrollBy(-host.y());
  };

  return (
    <>
      <View style={{ marginHorizontal: t.layout.screenPadding, padding: t.space.md, borderRadius: t.radius.lg, backgroundColor: c.bgRaised, borderWidth: t.hairline, borderColor: c.border, gap: t.space.sm }}>
        <View style={{ alignItems: 'center' }}>
          <SignalFigure signal={s} left={left} height={big} playing={playing} label={`The signal person giving ${s.name}`} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm, flexWrap: 'wrap' }}>
          <Text style={[t.type.sectionTitle, { color: c.text }]}>{s.name}</Text>
          {s.crane ? <Pill text={s.crane} tone="plain" /> : null}
        </View>
        <Text style={[t.type.bodyStrong, { color: c.text }]}>{s.does}</Text>
        <Text style={[t.type.body, { color: c.textMuted }]}>{s.given}</Text>
        <View style={{ flexDirection: 'row', gap: t.space.sm, alignItems: 'flex-start' }}>
          <Ionicons name="swap-horizontal-outline" size={18} color={c.warnText} style={{ marginTop: 2 }} />
          <Text style={[t.type.body, { color: c.text, flex: 1 }]}>{s.tell}</Text>
        </View>
      </View>
      <ControlRow>
        {s.period > 0 ? <GhostButton label={playing ? 'Pause' : 'Play'} icon={playing ? 'pause' : 'play'} style={{ flex: 1 }} onPress={() => setPlaying((p) => !p)} /> : null}
        {!s.twoHands ? <GhostButton label={left ? 'Right hand' : 'Left hand'} icon="swap-horizontal" style={{ flex: 1 }} onPress={() => setLeft((l) => !l)} /> : null}
      </ControlRow>

      {GROUPS.map((g) => (
        <View key={g.id}>
          <SectionHeader title={g.title} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding }}>
            {SIGNALS.filter((x) => x.group === g.id).map((x) => (
              <VoicePressable
                key={x.id}
                voiceLabel={x.name}
                accessibilityRole="button"
                accessibilityLabel={x.name}
                accessibilityState={{ selected: x.id === id }}
                onPress={() => show(x.id)}
                style={({ pressed }) => ({ width: tileW, paddingVertical: 6, alignItems: 'center', borderRadius: t.radius.md, borderWidth: x.id === id ? 2 : t.hairline, borderColor: x.id === id ? c.glow : c.border, backgroundColor: pressed ? c.bgSubtle : c.bgRaised, gap: 2 })}
              >
                <SignalFrame signal={x} height={tileH} f={0.25} label={x.name} />
                <Text style={[t.type.labelSmall, { color: c.text, textAlign: 'center', paddingHorizontal: 4 }]} numberOfLines={3}>
                  {x.name}
                </Text>
              </VoicePressable>
            ))}
          </View>
        </View>
      ))}

      <SectionHeader title="On the job" />
      {RULES.map((r) => (
        <HintRow key={r} text={r} />
      ))}
      <FooterNote text="The standard hand signals in OSHA 29 CFR 1926 Subpart CC, Appendix A. Knowing them doesn't make a signal person: that takes a qualified evaluator. Where a site or country uses other signals, use the chart posted for the lift." />
    </>
  );
}

/** Four signals to pick from, shown as figures. */
function FigurePick({ q, picked, onPick, playing }: { q: Question; picked: SignalId | null; onPick: (id: SignalId) => void; playing: boolean }) {
  const t = useTheme();
  const c = t.colors;
  const { width } = useWindowDimensions();
  const inner = Math.min(width, t.layout.maxContentWidth) - 2 * t.layout.screenPadding;
  const half = Math.floor((inner - t.space.sm) / 2);
  const h = Math.min(190, Math.round((half - 12) / FIGURE_ASPECT));
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.sm }}>
      {q.options.map((o, i) => {
        const right = o === q.id;
        const mine = picked === o;
        const ink = picked === null ? c.border : right ? c.success : mine ? c.danger : c.border;
        return (
          <VoicePressable
            key={o}
            voiceLabel={`Number ${i + 1}`}
            accessibilityRole="button"
            accessibilityLabel={picked === null ? `Signal ${i + 1}` : signalById(o)!.name}
            accessibilityState={{ selected: mine, disabled: picked !== null }}
            onPress={() => onPick(o)}
            style={{ width: half, alignItems: 'center', paddingVertical: 6, borderRadius: t.radius.lg, borderWidth: picked !== null && (right || mine) ? 3 : 1.5, borderColor: ink, backgroundColor: c.bgRaised }}
          >
            <SignalFigure signal={signalById(o)!} left={q.left[i]} height={h} playing={playing} label={`Signal ${i + 1}`} />
            <Text style={[t.type.labelSmall, { color: picked === null ? c.textFaint : c.text, textAlign: 'center' }]}>{picked === null ? `${i + 1}` : signalById(o)!.name}</Text>
          </VoicePressable>
        );
      })}
    </View>
  );
}

/** Four names to pick from. */
function NamePick({ q, picked, onPick }: { q: Question; picked: SignalId | null; onPick: (id: SignalId) => void }) {
  const t = useTheme();
  const c = t.colors;
  return (
    <View style={{ paddingHorizontal: t.layout.screenPadding, gap: t.space.sm, paddingTop: t.space.sm }}>
      {q.options.map((o) => {
        const right = o === q.id;
        const mine = picked === o;
        const ink = picked === null ? c.border : right ? c.success : mine ? c.danger : c.border;
        const name = signalById(o)!.name;
        return (
          <VoicePressable
            key={o}
            voiceLabel={name}
            onPress={() => onPick(o)}
            accessibilityRole="button"
            accessibilityLabel={name}
            accessibilityState={{ selected: mine, disabled: picked !== null }}
            style={({ pressed }) => ({ minHeight: 52, paddingHorizontal: t.space.lg, paddingVertical: t.space.md, borderRadius: t.radius.md, borderWidth: picked !== null && (right || mine) ? 2 : 1, borderColor: ink, backgroundColor: pressed && picked === null ? c.bgSubtle : c.bgRaised, flexDirection: 'row', alignItems: 'center', gap: t.space.md })}
          >
            <Text style={[t.type.body, { color: c.text, flex: 1 }]}>{name}</Text>
            {picked !== null && right ? <Ionicons name="checkmark-circle" size={22} color={c.success} /> : null}
            {picked !== null && mine && !right ? <Ionicons name="close-circle" size={22} color={c.danger} /> : null}
          </VoicePressable>
        );
      })}
    </View>
  );
}

function Shown({ s, left }: { s: Signal; left: boolean }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const inner = Math.min(width, t.layout.maxContentWidth) - 2 * t.layout.screenPadding;
  return (
    <View style={{ alignItems: 'center', paddingVertical: t.space.sm }}>
      <SignalFigure signal={s} left={left} height={Math.min(250, Math.round(inner / FIGURE_ASPECT))} label="A signal person giving a signal" />
    </View>
  );
}

function Bar({ qs, answers, at }: { qs: Question[]; answers: (SignalId | undefined)[]; at: number }) {
  const t = useTheme();
  const c = t.colors;
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {qs.map((qq, j) => (
        <View key={j} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: answers[j] !== undefined ? (answers[j] === qq.id ? c.success : c.danger) : j === at ? c.glow : c.border }} />
      ))}
    </View>
  );
}

function Test({ onLearn }: { onLearn: () => void }) {
  const t = useTheme();
  const c = t.colors;
  const book = useCraneBook();
  const [seed, setSeed] = useState(() => Date.now() % 1_000_000_007);
  // The ones got wrong come up more; drawn once per test, not on every answer.
  const qs = useMemo(() => makeTest(seeded(seed), book.value.seen), [seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [answers, setAnswers] = useState<(SignalId | undefined)[]>([]);
  const [at, setAt] = useState(0);
  const [finished, setFinished] = useState(false);
  const q = qs[at]!;
  const picked = answers[at] ?? null;
  const score = answers.filter((a, j) => a === qs[j]!.id).length;
  const s = signalById(q.id)!;

  const pick = (id: SignalId) => {
    if (picked !== null) return;
    const right = id === q.id;
    void Haptics.notificationAsync(right ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    book.apply((b) => recordSeen(b, q.id, right));
    setAnswers((a) => {
      const n = [...a];
      n[at] = id;
      return n;
    });
  };
  const next = () => {
    if (picked === null) return;
    if (at < qs.length - 1) return setAt(at + 1);
    book.apply((b) => recordCraneTest(b, score, qs.length));
    setFinished(true);
  };
  const again = () => {
    setSeed((x) => (x * 48271 + 11) % 1_000_000_007);
    setAnswers([]);
    setAt(0);
    setFinished(false);
  };

  if (finished) {
    const missed = qs.filter((qq, j) => answers[j] !== qq.id);
    return (
      <>
        <View style={{ alignItems: 'center', padding: t.layout.screenPadding, gap: t.space.sm }}>
          <Ionicons name={score >= 8 ? 'ribbon' : 'school-outline'} size={48} color={score >= 8 ? c.glow : c.textMuted} />
          <Text style={[t.type.sectionTitle, { color: c.text, fontSize: 28 }]}>{`${score} of ${qs.length}`}</Text>
          <Text style={[t.type.body, { color: c.textMuted, textAlign: 'center' }]}>
            {score === qs.length ? 'Every one right.' : 'The ones you missed come up more next time.'}
            {book.value.test.best !== null ? ` Best: ${book.value.test.best} of ${book.value.test.of}.` : ''}
          </Text>
        </View>
        <ControlRow>
          <AccentButton label="Take it again" icon="refresh" style={{ flex: 1 }} onPress={again} />
          <GhostButton label="Learn them" icon="book-outline" style={{ flex: 1 }} onPress={onLearn} />
        </ControlRow>
        {missed.length ? <SectionHeader title="Missed" meta={`${missed.length}`} /> : null}
        {missed.map((m) => {
          const x = signalById(m.id)!;
          return <HintRow key={m.id} text={`${x.name}: ${x.given}`} />;
        })}
      </>
    );
  }

  return (
    <>
      <View style={{ paddingHorizontal: t.layout.screenPadding, gap: t.space.sm }}>
        <Bar qs={qs} answers={answers} at={at} />
        <Text style={[t.type.label, { color: c.textMuted }]}>{`Question ${at + 1} of ${qs.length}`}</Text>
        <Text style={[t.type.sectionTitle, { color: c.text }]}>{q.ask === 'read' ? 'Which signal is that?' : `Which one is ${s.name}?`}</Text>
      </View>
      {q.ask === 'read' ? (
        <>
          <Shown s={s} left={q.left[q.options.indexOf(q.id)] ?? false} />
          <NamePick q={q} picked={picked} onPick={pick} />
        </>
      ) : (
        <FigurePick q={q} picked={picked} onPick={pick} playing />
      )}
      {picked !== null ? (
        <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md, gap: t.space.sm }}>
          <Text style={[t.type.bodyStrong, { color: picked === q.id ? c.success : c.danger }]}>{picked === q.id ? 'Right.' : `Not that one: that's ${signalById(picked)!.name}.`}</Text>
          <Text style={[t.type.body, { color: c.text }]}>{`${s.name}: ${s.does}`}</Text>
          <Text style={[t.type.body, { color: c.textMuted }]}>{s.tell}</Text>
        </View>
      ) : null}
      {picked !== null ? (
        <ControlRow>
          <AccentButton label={at < qs.length - 1 ? 'Next question' : 'See the score'} icon={at < qs.length - 1 ? 'arrow-forward' : 'ribbon-outline'} style={{ flex: 1 }} onPress={next} />
        </ControlRow>
      ) : null}
    </>
  );
}

function Quick() {
  const t = useTheme();
  const c = t.colors;
  const book = useCraneBook();
  const [seed, setSeed] = useState(() => Date.now() % 1_000_000_007);
  const qs = useMemo(() => makeRun(seeded(seed)), [seed]);
  const [started, setStarted] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(SignalId | undefined)[]>([]);
  const [done, setDone] = useState<{ ms: number; missed: number; best: boolean } | null>(null);
  const now = useNow(started !== null && !done, 100);
  const at = answers.length;
  const missed = answers.filter((a, j) => a !== qs[j]!.id).length;
  const best = book.value.quick.best;

  const start = () => {
    setSeed((x) => (x * 48271 + 11) % 1_000_000_007);
    setAnswers([]);
    setDone(null);
    setStarted(Date.now());
  };
  const pick = (id: SignalId) => {
    if (started === null || done) return;
    const q = qs[at]!;
    const right = id === q.id;
    void Haptics.notificationAsync(right ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    book.apply((b) => recordSeen(b, q.id, right));
    const next = [...answers, id];
    setAnswers(next);
    if (next.length === qs.length) {
      const ms = Date.now() - started;
      const miss = next.filter((a, j) => a !== qs[j]!.id).length;
      const run = { ms, missed: miss, at: Date.now() };
      const isBest = !best || miss < best.missed || (miss === best.missed && ms < best.ms);
      book.apply((b) => recordQuick(b, run));
      setDone({ ms, missed: miss, best: isBest });
    }
  };

  if (started === null || done) {
    const wrong = done ? qs.filter((q, j) => answers[j] !== q.id) : [];
    return (
      <>
        {done ? (
          <View style={{ alignItems: 'center', padding: t.layout.screenPadding, gap: t.space.sm }}>
            <Ionicons name={done.missed === 0 ? 'ribbon' : 'stopwatch-outline'} size={48} color={done.missed === 0 ? c.glow : c.textMuted} />
            <Text style={[t.type.sectionTitle, { color: c.text, fontSize: 28 }]}>{seconds(runTime(done.ms, done.missed))}</Text>
            <Text style={[t.type.body, { color: c.textMuted, textAlign: 'center' }]}>
              {done.missed === 0 ? `All ${qs.length} read right, in ${seconds(done.ms)}.` : `${done.missed} of ${qs.length} missed: ${seconds(done.ms)} and ${done.missed * (MISS_MS / 1000)} seconds for the misses.`}
              {done.best ? ' Your best yet.' : best ? ` Best: ${seconds(runTime(best.ms, best.missed))}${best.missed ? `, ${best.missed} missed` : ''}.` : ''}
            </Text>
          </View>
        ) : (
          <>
            <HintRow text={`Every signal once, as the operator sees it: read each one as fast as you can. A miss costs ${MISS_MS / 1000} seconds.`} />
            {best ? <HintRow text={`Your best: ${seconds(runTime(best.ms, best.missed))}${best.missed ? `, ${best.missed} missed` : ', none missed'}.`} /> : null}
          </>
        )}
        <ControlRow>
          <AccentButton label={done ? 'Go again' : 'Start'} icon={done ? 'refresh' : 'play'} style={{ flex: 1 }} onPress={start} />
        </ControlRow>
        {wrong.length ? <SectionHeader title="Missed" meta={`${wrong.length}`} /> : null}
        {wrong.map((m) => {
          const x = signalById(m.id)!;
          return <HintRow key={m.id} text={`${x.name}: ${x.tell}`} />;
        })}
      </>
    );
  }

  const q = qs[at]!;
  const s = signalById(q.id)!;
  return (
    <>
      <View style={{ paddingHorizontal: t.layout.screenPadding, gap: t.space.sm }}>
        <Bar qs={qs} answers={answers} at={at} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[t.type.label, { color: c.textMuted, flex: 1 }]}>{`${at + 1} of ${qs.length}${missed ? ` · ${missed} missed` : ''}`}</Text>
          <Text style={[t.type.bodyStrong, { color: c.text, fontVariant: ['tabular-nums'] }]}>{seconds(Math.max(0, now - started))}</Text>
        </View>
      </View>
      <Shown key={at} s={s} left={q.left[q.options.indexOf(q.id)] ?? false} />
      <NamePick key={`o${at}`} q={q} picked={null} onPick={pick} />
    </>
  );
}
