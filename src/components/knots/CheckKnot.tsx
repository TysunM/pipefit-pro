import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeProvider';
import { useKnotBook } from '../../state/knots';
import { recordCheck } from '../../state/knotProgress';
import type { Knot } from '../../calc/knots/knots';
import { faultRound, seeded } from '../../calc/knots/quiz';
import { AccentButton, ControlRow, GhostButton } from '../Buttons';
import { VoicePressable } from '../../voice/VoicePressable';
import { KnotView } from './KnotView';
import { laidFault, laidSet, marksOf, pairFrame } from './laid';

// Dress and check: the knot tied right and set, the places to look at
// numbered on it, then spot the fault: each fault a hand ties, drawn beside the
// knot tied right, and which one is ready to take a load.

export function CheckKnot({ knot, size, onTest }: { knot: Knot; size: number; onTest: () => void }) {
  const t = useTheme();
  const c = t.colors;
  const book = useKnotBook();
  const set = laidSet(knot);
  const [seed, setSeed] = useState(() => Date.now() % 1_000_000_007);
  const round = useMemo(() => faultRound(knot, seeded(seed)), [knot, seed]);
  const [picks, setPicks] = useState<(0 | 1)[]>([]);
  const [at, setAt] = useState(0);
  const [finished, setFinished] = useState(false);
  const q = round[at]!;
  const picked = picks[at] ?? null;
  const score = picks.filter((p, i) => p === round[i]!.good).length;
  const half = Math.floor((size - t.space.sm) / 2);
  const had = book.value.checked[knot.id];

  const pick = (side: 0 | 1) => {
    if (picked !== null) return;
    void Haptics.notificationAsync(side === q.good ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    setPicks((p) => {
      const n = [...p];
      n[at] = side;
      return n;
    });
  };
  const next = () => {
    if (picked === null) return;
    if (at < round.length - 1) return setAt(at + 1);
    book.apply((b) => recordCheck(b, knot.id, score, round.length, Date.now()));
    setFinished(true);
  };
  const again = () => {
    setSeed((s) => (s * 48271 + 11) % 1_000_000_007);
    setPicks([]);
    setAt(0);
    setFinished(false);
  };

  const side = (s: 0 | 1) => {
    const good = s === q.good;
    const d = good ? set : laidFault(knot, q.fault);
    const name = s === 0 ? 'Left' : 'Right';
    const ink = picked === null ? c.border : good ? c.success : c.danger;
    return (
      <View style={{ width: half, gap: t.space.xs, alignItems: 'center' }}>
        <VoicePressable
          voiceLabel={`${name} one`}
          onPress={() => pick(s)}
          accessibilityRole="button"
          accessibilityLabel={`The ${name.toLowerCase()} ${knot.name.toLowerCase()}`}
          accessibilityState={{ selected: picked === s, disabled: picked !== null }}
          style={({ pressed }) => ({ borderRadius: t.radius.lg + 3, borderWidth: picked !== null ? 3 : 1.5, borderColor: ink, opacity: pressed && picked === null ? 0.8 : 1 })}
        >
          <KnotView knot={knot} laid={d.laid} shown={d.shown} size={half - 6} frame={pairFrame(knot, q.fault)} label={`${knot.name}, ${name.toLowerCase()}`} />
        </VoicePressable>
        {picked !== null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name={good ? 'checkmark-circle' : 'close-circle'} size={18} color={good ? c.success : c.danger} />
            <Text style={[t.type.bodyStrong, { color: good ? c.success : c.danger, flexShrink: 1 }]}>{good ? 'Ready' : q.fault.name}</Text>
          </View>
        ) : (
          <Text style={[t.type.caption, { color: c.textMuted }]}>{name}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={{ gap: t.space.md }}>
      <View style={{ paddingHorizontal: t.layout.screenPadding }}>
        <Text style={[t.type.label, { color: c.textMuted }]}>Before it takes a load</Text>
      </View>
      <View style={{ alignItems: 'center' }}>
        <KnotView knot={knot} laid={set.laid} shown={set.shown} size={size} marks={marksOf(knot)} label={`${knot.name}, tied right and set, with the places to check numbered`} />
      </View>
      <View style={{ paddingHorizontal: t.layout.screenPadding, gap: t.space.sm }}>
        {knot.checks.map((ch, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: t.space.sm, alignItems: 'flex-start' }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: ch.at?.length ? c.glow : c.bgSubtle, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
              <Text style={{ color: ch.at?.length ? '#1a1208' : c.textMuted, fontWeight: '800', fontSize: 13 }}>{i + 1}</Text>
            </View>
            <Text style={[t.type.body, { color: c.text, flex: 1 }]}>{ch.text}</Text>
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md, gap: t.space.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[t.type.label, { color: c.textMuted, flex: 1 }]}>Spot the fault</Text>
          <Text style={[t.type.label, { color: c.textMuted }]}>{finished ? (had ? `Best ${had.best} of ${had.of}` : '') : `${at + 1} of ${round.length}`}</Text>
        </View>
        {finished ? null : <Text style={[t.type.sectionTitle, { color: c.text }]}>Which one is ready to take a load?</Text>}
      </View>

      {finished ? (
        <View style={{ marginHorizontal: t.layout.screenPadding, padding: t.space.lg, borderRadius: t.radius.lg, backgroundColor: c.bgRaised, borderWidth: t.hairline, borderColor: c.border, gap: t.space.sm, alignItems: 'center' }}>
          <Ionicons name={score === round.length ? 'shield-checkmark' : 'search-outline'} size={40} color={score === round.length ? c.success : c.textMuted} />
          <Text style={[t.type.sectionTitle, { color: c.text }]}>{`${score} of ${round.length} spotted`}</Text>
          <Text style={[t.type.caption, { color: c.textMuted, textAlign: 'center' }]}>
            {score === round.length ? 'Check every knot like that before it takes a load, every time.' : 'Go over the checks above, then spot them again.'}
          </Text>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding }}>
            {side(0)}
            {side(1)}
          </View>
          {picked !== null ? (
            <View style={{ paddingHorizontal: t.layout.screenPadding, gap: t.space.xs }}>
              <Text style={[t.type.bodyStrong, { color: picked === q.good ? c.success : c.danger }]}>{picked === q.good ? 'Right: that one is ready.' : `Not that one: ${q.fault.name.toLowerCase()}.`}</Text>
              <Text style={[t.type.body, { color: c.text }]}>{q.fault.why}</Text>
            </View>
          ) : null}
        </>
      )}

      <ControlRow>
        {finished ? (
          <>
            <AccentButton label="Spot them again" icon="refresh" style={{ flex: 1 }} onPress={again} />
            <GhostButton label="Knot test" icon="school-outline" style={{ flex: 1 }} onPress={onTest} />
          </>
        ) : picked !== null ? (
          <AccentButton label={at < round.length - 1 ? 'Next' : 'See how you did'} icon={at < round.length - 1 ? 'arrow-forward' : 'ribbon-outline'} style={{ flex: 1 }} onPress={next} />
        ) : null}
      </ControlRow>
    </View>
  );
}
