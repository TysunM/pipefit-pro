import React, { useEffect, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Segmented } from '../components/Segmented';
import { SectionHeader } from '../components/SectionHeader';
import { Banner } from '../components/FormFields';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { KnotView } from '../components/knots/KnotView';
import { TieGame } from '../components/knots/TieGame';
import { CheckKnot } from '../components/knots/CheckKnot';
import { laidAt, laidOf, pullsAt } from '../components/knots/laid';
import { useStepPlayer } from '../components/knots/useStepPlayer';
import { VoicePressable } from '../voice/VoicePressable';
import { useTheme } from '../theme/ThemeProvider';
import { KNOTS, knotById, stepsOf, type Knot } from '../calc/knots/knots';
import { Pill } from './OrbitalScreen';

// One knot: watch it tied a step at a time, tie it with a finger, tie it again
// from memory (the line hidden, a buzz when off it), then check it: what right
// looks like, and spot the faults hands tie.

type Props = NativeStackScreenProps<RootStackParamList, 'Knot'>;
type Mode = 'learn' | 'tie' | 'memory' | 'check';
const MODES: { value: Mode; label: string }[] = [
  { value: 'learn', label: 'Learn' },
  { value: 'tie', label: 'Tie it' },
  { value: 'memory', label: 'Memory' },
  { value: 'check', label: 'Check' },
];

export function KnotScreen({ route, navigation }: Props) {
  const knot = knotById(route.params.id);
  useEffect(() => {
    navigation.setOptions({ title: knot?.name ?? 'Knot' });
  }, [navigation, knot?.name]);
  if (!knot) {
    return (
      <Screen>
        <Text style={{ padding: 24 }}>That knot is not in the app any more.</Text>
      </Screen>
    );
  }
  return <KnotBody key={knot.id} knot={knot} start={route.params.mode ?? 'learn'} navigation={navigation} />;
}

function KnotBody({ knot, start, navigation }: { knot: Knot; start: Mode; navigation: Props['navigation'] }) {
  const t = useTheme();
  const c = t.colors;
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<Mode>(start);
  const laid = laidOf(knot);
  const size = Math.min(width - 2 * t.layout.screenPadding, 440);
  const i = KNOTS.findIndex((k) => k.id === knot.id);
  const next = KNOTS[(i + 1) % KNOTS.length]!;

  return (
    <Screen>
      <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md, gap: t.space.xs }}>
        <View style={{ flexDirection: 'row', gap: t.space.sm, alignItems: 'center', flexWrap: 'wrap' }}>
          <Pill text={knot.kind} tone="plain" />
          {knot.aka ? <Text style={[t.type.caption, { color: c.textMuted }]}>{`Also: ${knot.aka}`}</Text> : null}
        </View>
        <Text style={[t.type.body, { color: c.text }]}>{knot.use}</Text>
      </View>
      <View style={{ paddingTop: t.space.md }}>
        <Segmented options={MODES} selected={mode} onSelect={setMode} />
      </View>
      {mode === 'learn' ? (
        <Learn knot={knot} size={size} onTie={() => setMode('tie')} />
      ) : mode === 'tie' || mode === 'memory' ? (
        <TieGame
          key={`${knot.id}-${mode}`}
          knot={knot}
          laid={laid}
          size={size}
          blind={mode === 'memory'}
          onNext={() => navigation.replace('Knot', { id: next.id, mode })}
          onCheck={() => setMode('check')}
          onTest={() => navigation.navigate('KnotTest')}
        />
      ) : (
        <CheckKnot key={knot.id} knot={knot} size={size} onTest={() => navigation.navigate('KnotTest')} />
      )}
      <SectionHeader title="On the job" />
      <View style={{ paddingHorizontal: t.layout.screenPadding, gap: t.space.xs }}>
        {knot.jobs.map((j) => (
          <View key={j} style={{ flexDirection: 'row', gap: t.space.sm }}>
            <Ionicons name="checkmark" size={18} color={c.success} />
            <Text style={[t.type.body, { color: c.text, flex: 1 }]}>{j}</Text>
          </View>
        ))}
      </View>
      <View style={{ paddingTop: t.space.lg }}>
        <Banner tone="warn" icon="warning-outline" text={knot.watch} />
      </View>
    </Screen>
  );
}

function Learn({ knot, size, onTie }: { knot: Knot; size: number; onTie: () => void }) {
  const t = useTheme();
  const c = t.colors;
  const base = laidOf(knot);
  const steps = stepsOf(knot);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const { shown, moving, going, morph, tighten } = useStepPlayer(knot, base, step, playing);
  // Pulling it tight: the knot drawn as far drawn up as it is, with arrows on the parts to pull.
  const laid = tighten ? laidAt(knot, morph) : base;
  const last = steps.length - 1;
  const go = (n: number) => {
    setStep(Math.max(0, Math.min(last, n)));
    setPlaying(true);
  };

  return (
    <View style={{ gap: t.space.md }}>
      <View style={{ alignItems: 'center' }}>
        <KnotView
          knot={knot}
          laid={laid}
          shown={shown}
          size={size}
          tip={tighten ? null : { rope: moving, arrow: going }}
          pulls={tighten ? pullsAt(knot, morph) : null}
          shift={morph * 10}
          label={`${knot.name}, step ${step + 1} of ${last + 1}: ${steps[step]!.text}`}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: t.space.sm }}>
        {steps.map((_, n) => (
          <VoicePressable key={n} voiceLabel={`Step ${n + 1}`} onPress={() => go(n)} accessibilityRole="button" accessibilityLabel={`Step ${n + 1}`} hitSlop={8}>
            <View style={{ width: n === step ? 26 : 10, height: 10, borderRadius: 5, backgroundColor: n <= step ? c.glow : c.border }} />
          </VoicePressable>
        ))}
      </View>
      <View style={{ paddingHorizontal: t.layout.screenPadding, gap: t.space.xs, minHeight: 84 }}>
        <Text style={[t.type.label, { color: c.textMuted }]}>{`Step ${step + 1} of ${last + 1}`}</Text>
        <Text style={[t.type.sectionTitle, { color: c.text }]}>{steps[step]!.text}</Text>
      </View>
      <ControlRow>
        <GhostButton label="Back" icon="chevron-back" style={{ flex: 1 }} onPress={() => go(step - 1)} />
        <GhostButton label={playing ? 'Pause' : 'Play'} icon={playing ? 'pause' : 'play'} style={{ flex: 1 }} onPress={() => setPlaying((p) => !p)} />
        {step < last ? (
          <AccentButton label="Next" icon="chevron-forward" style={{ flex: 1 }} onPress={() => go(step + 1)} />
        ) : (
          <AccentButton label="Tie it" icon="hand-left-outline" style={{ flex: 1 }} onPress={onTie} />
        )}
      </ControlRow>
    </View>
  );
}
