// The coaching card
// -----------------
// On the screen where the work is done: the steps, the next one lit, the
// reason under each. Reads the skills passport to know when to fade. The
// reasoning is in state/coach.ts.
import React, { createContext, useContext, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { Plate } from './metal';
import { useSettings } from '../state/settings';
import { usePassport } from '../state/passports';
import { useJoints } from '../state/joints';
import { usePressureTests } from '../state/pressureTests';
import { useCuts } from '../state/cuts';
import { listed } from '../state/register';
import { evidence, skill, standingOf } from '../state/passport';
import { COACH, CoachHidden, CoachScreen, coachShows, emptyHidden, hide, nextStep, parseHidden, serialiseHidden } from '../state/coach';
import { createPersistedStore } from '../state/persisted';

const store = createPersistedStore<CoachHidden>({ key: 'pipefit.coach.v1', name: 'useCoachHidden', empty: emptyHidden, parse: parseHidden, serialise: serialiseHidden });
export const CoachProvider = store.Provider;

const Fallback = createContext<null>(null);
void Fallback;

/** Whether this screen's coach shows, and how far along the skill is. */
export function useCoach(screen: CoachScreen) {
  const { settings } = useSettings();
  const { passport } = usePassport();
  const { register } = useJoints();
  const { log: tests } = usePressureTests();
  const { log: cuts } = useCuts();
  const { value: hidden, apply } = store.use();
  const plan = COACH[screen];
  const s = skill(plan.skill)!;
  const count = useMemo(() => evidence({ joints: listed(register), tests: tests.tests, cuts: cuts.cuts }).filter((e) => e.skill === plan.skill).length, [register, tests.tests, cuts.cuts, plan.skill]);
  const signed = passport.attestations.filter((a) => a.skill === plan.skill);
  const standing = standingOf(s, Array.from({ length: count }, () => ({ skill: plan.skill, at: 1, what: '', project: '' })), signed);
  return {
    show: coachShows({ coach: settings.coach, standing, hidden: hidden.hidden, screen }),
    plan,
    count,
    needs: s.needs,
    dismiss: () => apply((h) => hide(h, screen)),
  };
}

export function Coach({ screen, done }: { screen: CoachScreen; done: readonly boolean[] }) {
  const t = useTheme();
  const c = useCoach(screen);
  const ctx = useContext(Fallback);
  void ctx;
  if (!c.show) return null;
  const next = nextStep(done);
  return (
    <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }}>
      <Plate tone="slate" radius={t.radius.lg} style={{ padding: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="school-outline" size={22} color={t.colors.onSlate} />
          <Text style={[t.type.tileTitle, { color: t.colors.onSlate, flex: 1 }]} accessibilityRole="header">
            {c.plan.title}
          </Text>
          <Text style={[t.type.caption, { color: t.colors.onSlate, opacity: 0.8 }]}>{`${c.count} of ${c.needs} on record`}</Text>
        </View>
        {c.plan.steps.map((step, i) => {
          const isDone = done[i] === true;
          const isNext = i === next;
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 10, opacity: isDone ? 0.6 : 1 }}>
              <Ionicons name={isDone ? 'checkmark-circle' : isNext ? 'arrow-forward-circle' : 'ellipse-outline'} size={20} color={isDone ? t.colors.success : isNext ? t.colors.accent : t.colors.onSlate} style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={[isNext ? t.type.bodyStrong : t.type.body, { color: t.colors.onSlate }]}>{`${i + 1}. ${step.text}`}</Text>
                {isNext ? <Text style={[t.type.caption, { color: t.colors.onSlate, opacity: 0.85 }]}>{step.why}</Text> : null}
              </View>
            </View>
          );
        })}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Text style={[t.type.caption, { color: t.colors.onSlate, opacity: 0.7, flex: 1 }]}>{`Fades at ${c.needs} on record or a foreman's sign-off.`}</Text>
          <Pressable onPress={c.dismiss} hitSlop={8} accessibilityRole="button" accessibilityLabel="Hide the coaching on this screen">
            <Text style={[t.type.captionStrong, { color: t.colors.onSlate }]}>Hide</Text>
          </Pressable>
        </View>
      </Plate>
    </View>
  );
}
