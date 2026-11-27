import React, { useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { Banner } from '../components/FormFields';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { TieGame } from '../components/knots/TieGame';
import { laidOf } from '../components/knots/laid';
import { VoicePressable } from '../voice/VoicePressable';
import { useTheme } from '../theme/ThemeProvider';
import { useKnotBook } from '../state/knots';
import { recordMystery } from '../state/knotProgress';
import { KNOTS, knotById } from '../calc/knots/knots';
import { seeded } from '../calc/knots/quiz';
import { clock } from '../calc/knots/cert';
import { ROUNDS, mysteryBeats, mysteryRounds, mysteryTotals, verdictOf, whyNot, type MysteryResult, type MysteryRound } from '../calc/knots/mystery';
import { ListRow } from './OrbitalScreen';

// Mystery knot: the job is given, never the knot. Pick the knot for it from all
// of them, then tie it from memory: the line hidden, a buzz off it, every over
// or under called. A wrong pick says why, and the right knot is tied anyway.

type Props = NativeStackScreenProps<RootStackParamList, 'KnotMystery'>;
type Phase = 'intro' | 'pick' | 'tie' | 'done';

export function KnotMysteryScreen({ navigation }: Props) {
  const t = useTheme();
  const c = t.colors;
  const { width } = useWindowDimensions();
  const book = useKnotBook();
  const [phase, setPhase] = useState<Phase>('intro');
  const [rounds, setRounds] = useState<MysteryRound[]>([]);
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<MysteryResult[]>([]);
  const [tied, setTied] = useState<{ ms: number; slips: number; wrong: number } | null>(null);
  const [session, setSession] = useState(0);
  const size = Math.min(width - 2 * t.layout.screenPadding, 440);
  const best = book.value.mystery.best;

  const start = () => {
    setRounds(mysteryRounds(seeded(Date.now() % 1_000_000_007)));
    setAt(0);
    setPicked(null);
    setTied(null);
    setResults([]);
    setSession((n) => n + 1);
    setPhase('pick');
  };
  const pick = (id: string) => {
    if (picked) return;
    const right = id === rounds[at]!.knot;
    void Haptics.notificationAsync(right ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    setPicked(id);
  };
  const next = (r: MysteryResult) => {
    const all = [...results, r];
    setResults(all);
    if (all.length < rounds.length) {
      setAt(all.length);
      setPicked(null);
      setTied(null);
      setPhase('pick');
      return;
    }
    book.apply((b) => recordMystery(b, mysteryTotals(all), Date.now(), mysteryBeats));
    setPhase('done');
  };

  const bar = (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {rounds.map((r, j) => {
        const done = results[j];
        return <View key={j} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: done ? (done.picked === done.knot ? c.success : c.danger) : j === at ? c.glow : c.border }} />;
      })}
    </View>
  );

  if (phase === 'intro') {
    return (
      <Screen>
        <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.lg, gap: t.space.sm, alignItems: 'center' }}>
          <Ionicons name="help-circle" size={44} color={c.glow} />
          <Text style={[t.type.sectionTitle, { color: c.text, fontSize: 28, textAlign: 'center' }]}>Mystery knot</Text>
          <Text style={[t.type.body, { color: c.textMuted, textAlign: 'center' }]}>
            {`You get the job, never the knot. Pick the knot for it from all ${KNOTS.length}, then tie it from memory. ${ROUNDS} jobs.`}
          </Text>
        </View>
        <SectionHeader title="How it goes" />
        <View style={{ paddingHorizontal: t.layout.screenPadding, gap: t.space.sm }}>
          {[
            'Read the job. Pick the knot that does it. Picking right is the score that counts most.',
            'Wrong pick: it says what your knot is for and which knot the job wants. Then you tie that one.',
            'Tie it from memory: no line, no steps, every over or under called.',
          ].map((r) => (
            <View key={r} style={{ flexDirection: 'row', gap: t.space.sm }}>
              <Ionicons name="checkmark" size={18} color={c.success} />
              <Text style={[t.type.body, { color: c.text, flex: 1 }]}>{r}</Text>
            </View>
          ))}
        </View>
        {best ? (
          <View style={{ marginHorizontal: t.layout.screenPadding, marginTop: t.space.lg, padding: t.space.lg, borderRadius: t.radius.lg, backgroundColor: c.bgRaised, borderWidth: t.hairline, borderColor: c.border, gap: 4 }}>
            <Text style={[t.type.label, { color: c.textMuted }]}>Your best</Text>
            <Text style={[t.type.sectionTitle, { color: c.text }]}>{`${best.right} of ${best.rounds} right: ${verdictOf(best).title}`}</Text>
            <Text style={[t.type.caption, { color: c.textMuted }]}>{`${best.misses} miss${best.misses === 1 ? '' : 'es'} tying · ${clock(best.ms)} · ${book.value.mystery.runs} session${book.value.mystery.runs === 1 ? '' : 's'}`}</Text>
          </View>
        ) : null}
        <ControlRow>
          <AccentButton label="Give me a job" icon="play" style={{ flex: 1 }} onPress={start} />
        </ControlRow>
      </Screen>
    );
  }

  if (phase === 'done') {
    const totals = mysteryTotals(results);
    const v = verdictOf(totals);
    return (
      <Screen>
        <View style={{ marginHorizontal: t.layout.screenPadding, marginTop: t.space.lg, padding: t.space.lg, borderRadius: t.radius.lg, backgroundColor: c.bgRaised, borderWidth: 1.5, borderColor: totals.right === totals.rounds ? c.success : c.glow, gap: t.space.sm, alignItems: 'center' }}>
          <Ionicons name={totals.right === totals.rounds ? 'ribbon' : 'help-buoy-outline'} size={44} color={totals.right === totals.rounds ? c.success : c.glow} />
          <Text style={[t.type.sectionTitle, { color: c.text, fontSize: 26, textAlign: 'center' }]}>{v.title}</Text>
          <Text style={[t.type.body, { color: c.textMuted, textAlign: 'center' }]}>{v.line}</Text>
          <Text style={[t.type.bodyStrong, { color: c.text }]}>{`${totals.right} of ${totals.rounds} right · ${totals.misses} miss${totals.misses === 1 ? '' : 'es'} tying · ${clock(totals.ms)}`}</Text>
        </View>
        <ControlRow>
          <AccentButton label="New jobs" icon="refresh" style={{ flex: 1 }} onPress={start} />
          <GhostButton label="Back to knots" icon="arrow-back" style={{ flex: 1 }} onPress={() => navigation.goBack()} />
        </ControlRow>
        <SectionHeader title="Job by job" />
        {results.map((r, i) => {
          const k = knotById(r.knot)!;
          const right = r.picked === r.knot;
          return (
            <ListRow
              key={i}
              voice={`Job ${i + 1}`}
              title={rounds[i]!.job}
              sub={`${right ? `Right: ${k.name}` : `Picked ${knotById(r.picked)!.name}; wanted ${k.name}`}${r.skipped ? ' · tie skipped' : ` · ${r.slips + 2 * r.wrong} miss${r.slips + 2 * r.wrong === 1 ? '' : 'es'} tying`}`}
              onPress={() => navigation.navigate('Knot', { id: k.id, mode: right ? 'memory' : 'learn' })}
              right={<Ionicons name={right ? 'checkmark-circle' : 'close-circle'} size={22} color={right ? c.success : c.danger} />}
            />
          );
        })}
      </Screen>
    );
  }

  const round = rounds[at]!;
  const knot = knotById(round.knot)!;
  const right = picked === round.knot;
  return (
    <Screen>
      <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md, gap: t.space.sm }}>
        {bar}
        <Text style={[t.type.label, { color: c.textMuted }]}>{`Job ${at + 1} of ${rounds.length}`}</Text>
      </View>
      <View
        accessible
        accessibilityLabel={`The job: ${round.job}`}
        style={{ marginHorizontal: t.layout.screenPadding, marginTop: t.space.sm, padding: t.space.lg, borderRadius: t.radius.lg, backgroundColor: c.bgRaised, borderLeftWidth: 4, borderLeftColor: c.glow, gap: 4 }}
      >
        <Text style={[t.type.label, { color: c.textMuted }]}>The job</Text>
        <Text style={[t.type.sectionTitle, { color: c.text, fontSize: 22 }]}>{round.job}</Text>
      </View>

      {phase === 'pick' ? (
        <>
          <SectionHeader title={picked ? (right ? 'Right knot' : 'Not that one') : 'Which knot?'} />
          <View style={{ paddingHorizontal: t.layout.screenPadding, flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm }}>
            {KNOTS.map((k) => {
              const isRight = k.id === round.knot;
              const mine = picked === k.id;
              const ink = !picked ? c.border : isRight ? c.success : mine ? c.danger : c.border;
              return (
                <VoicePressable
                  key={k.id}
                  voiceLabel={k.name}
                  onPress={() => pick(k.id)}
                  accessibilityRole="button"
                  accessibilityLabel={k.name}
                  accessibilityState={{ selected: mine, disabled: !!picked }}
                  style={({ pressed }) => ({
                    width: (size - t.space.sm) / 2,
                    minHeight: 54,
                    paddingHorizontal: t.space.md,
                    paddingVertical: t.space.sm,
                    borderRadius: t.radius.md,
                    borderWidth: picked && (isRight || mine) ? 2 : 1,
                    borderColor: ink,
                    backgroundColor: pressed && !picked ? c.bgSubtle : c.bgRaised,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    opacity: picked && !isRight && !mine ? 0.55 : 1,
                  })}
                >
                  <Text style={[t.type.bodyStrong, { color: c.text, flex: 1 }]}>{k.name}</Text>
                  {picked && isRight ? <Ionicons name="checkmark-circle" size={20} color={c.success} /> : null}
                  {picked && mine && !isRight ? <Ionicons name="close-circle" size={20} color={c.danger} /> : null}
                </VoicePressable>
              );
            })}
          </View>
          {picked ? (
            <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md, gap: t.space.xs }}>
              <Text style={[t.type.bodyStrong, { color: right ? c.success : c.danger }]}>{right ? `Right: a ${knot.name.toLowerCase()}.` : `Not a ${knotById(picked)!.name.toLowerCase()}.`}</Text>
              <Text style={[t.type.body, { color: c.text }]}>{right ? knot.use : whyNot(picked, round.knot)}</Text>
            </View>
          ) : null}
          {picked ? (
            <ControlRow>
              <AccentButton label={`Tie the ${knot.name.toLowerCase()} from memory`} icon="hand-left-outline" style={{ flex: 1 }} onPress={() => setPhase('tie')} />
            </ControlRow>
          ) : null}
        </>
      ) : (
        <>
          <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }}>
            <Text style={[t.type.sectionTitle, { color: c.text }]}>{`Tie the ${knot.name.toLowerCase()}`}</Text>
          </View>
          <View style={{ paddingTop: t.space.sm }}>
            <TieGame key={`${session}-${at}`} knot={knot} laid={laidOf(knot)} size={size} blind cert onDone={setTied} />
          </View>
          <ControlRow>
            {tied ? (
              <AccentButton
                label={at < rounds.length - 1 ? 'Next job' : 'See how you did'}
                icon={at < rounds.length - 1 ? 'arrow-forward' : 'ribbon-outline'}
                style={{ flex: 1 }}
                onPress={() => next({ knot: round.knot, picked: picked!, ...tied })}
              />
            ) : (
              <GhostButton label="Skip the tie" icon="play-skip-forward-outline" style={{ flex: 1 }} onPress={() => next({ knot: round.knot, picked: picked!, ms: 0, slips: 0, wrong: 0, skipped: true })} />
            )}
          </ControlRow>
        </>
      )}
      <View style={{ paddingTop: t.space.lg }}>
        <Banner tone="warn" icon="warning-outline" text="Knots are for tag lines, hand lines and light material on a hand line. Never knot a sling or a wire rope, and never use one for fall protection." />
      </View>
    </Screen>
  );
}
