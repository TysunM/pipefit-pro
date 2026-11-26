import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { Banner } from '../components/FormFields';
import { AccentButton, ControlRow, GhostButton } from '../components/Buttons';
import { KnotView } from '../components/knots/KnotView';
import { Stars, seconds } from '../components/knots/TieGame';
import { laidOf } from '../components/knots/laid';
import { lengthsAt } from '../components/knots/useStepPlayer';
import { useTheme } from '../theme/ThemeProvider';
import { useKnotBook } from '../state/knots';
import { KNOTS, reachAfter, type Knot } from '../calc/knots/knots';
import { TIERS, clock, tierOf } from '../calc/knots/cert';
import { ListRow, Pill } from './OrbitalScreen';

// The knots a fitter uses on tag lines and hand lines: watch each tied, tie it
// with a finger, check it, then take the test.

type Props = NativeStackScreenProps<RootStackParamList, 'Knots'>;

export function Thumb({ knot, size }: { knot: Knot; size: number }) {
  const laid = laidOf(knot);
  return <KnotView knot={knot} laid={laid} shown={lengthsAt(laid, reachAfter(knot, knot.steps.length - 1))} size={size} label={knot.name} />;
}

export function KnotsScreen({ navigation }: Props) {
  const t = useTheme();
  const c = t.colors;
  const book = useKnotBook().value;
  const tied = KNOTS.filter((k) => book.tied[k.id]).length;
  const checked = KNOTS.filter((k) => book.checked[k.id]?.best === k.faults.length).length;
  const remembered = KNOTS.filter((k) => book.memory[k.id]).length;
  const cert = book.cert.best;

  return (
    <Screen>
      <View style={{ paddingTop: t.space.md }}>
        <Banner tone="warn" icon="warning-outline" text="Knots are for tag lines, hand lines and light material on a hand line. Never knot a sling or a wire rope, and never use one for fall protection: a lift is rigged to its plan with rated gear." />
      </View>
      <View style={{ marginHorizontal: t.layout.screenPadding, marginTop: t.space.md, padding: t.space.lg, borderRadius: t.radius.lg, backgroundColor: c.bgRaised, borderWidth: t.hairline, borderColor: c.border, gap: t.space.xs }}>
        <Text style={[t.type.sectionTitle, { color: c.text }]}>{`Tied by hand: ${tied} of ${KNOTS.length}`}</Text>
        <Text style={[t.type.body, { color: c.text }]}>{`Tied from memory: ${remembered} of ${KNOTS.length}`}</Text>
        <Text style={[t.type.body, { color: c.text }]}>{`Every fault spotted: ${checked} of ${KNOTS.length}`}</Text>
        <Text style={[t.type.body, { color: c.text }]}>{cert ? `Knot Certified: ${TIERS[tierOf(cert)].title}, ${clock(cert.ms)}` : 'Knot Certified: not yet run'}</Text>
        <Text style={[t.type.caption, { color: c.textMuted }]}>
          {book.test.taken ? `Knot test: best ${book.test.best} of ${book.test.of}, last ${book.test.last} of ${book.test.of}` : 'Watch each one tied, tie it on screen with a finger, tie it again from memory, check it, then take the test.'}
        </Text>
      </View>
      <ControlRow>
        <AccentButton label="Take the knot test" icon="school-outline" style={{ flex: 1 }} onPress={() => navigation.navigate('KnotTest')} />
      </ControlRow>
      <ControlRow>
        <GhostButton label="Get Knot Certified" icon="ribbon-outline" style={{ flex: 1 }} onPress={() => navigation.navigate('KnotCert')} />
      </ControlRow>
      <SectionHeader title="Knots" meta={`${KNOTS.length}`} />
      {KNOTS.map((k) => {
        const mine = book.tied[k.id];
        const spotted = book.checked[k.id]?.best === k.faults.length;
        const recall = book.memory[k.id];
        return (
          <ListRow
            key={k.id}
            voice={k.name}
            title={k.name}
            sub={k.use}
            onPress={() => navigation.navigate('Knot', { id: k.id })}
            left={<Thumb knot={k} size={64} />}
            right={
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Pill text={k.kind} tone="plain" />
                {mine ? <Stars n={mine.bestStars} size={13} /> : null}
                {recall ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }} accessible accessibilityLabel={`Tied from memory, ${recall.bestStars} of 3 stars`}>
                    <Ionicons name="bulb" size={13} color={c.glow} />
                    <Text style={[t.type.caption, { color: c.glow, fontSize: 11 }]}>{`Memory ${'★'.repeat(recall.bestStars)}`}</Text>
                  </View>
                ) : null}
                {spotted ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }} accessible accessibilityLabel="Every fault spotted">
                    <Ionicons name="shield-checkmark" size={13} color={c.success} />
                    <Text style={[t.type.caption, { color: c.success, fontSize: 11 }]}>Checked</Text>
                  </View>
                ) : null}
                {mine ? <Text style={[t.type.caption, { color: c.textFaint, fontSize: 11 }]}>{seconds(mine.bestMs)}</Text> : null}
              </View>
            }
          />
        );
      })}
    </Screen>
  );
}
