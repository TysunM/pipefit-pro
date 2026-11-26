import React from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { Banner } from '../components/FormFields';
import { AccentButton, ControlRow } from '../components/Buttons';
import { KnotView } from '../components/knots/KnotView';
import { Stars, seconds } from '../components/knots/TieGame';
import { laidOf } from '../components/knots/laid';
import { lengthsAt } from '../components/knots/useStepPlayer';
import { useTheme } from '../theme/ThemeProvider';
import { useKnotBook } from '../state/knots';
import { KNOTS, reachAfter, type Knot } from '../calc/knots/knots';
import { ListRow, Pill } from './OrbitalScreen';

// The knots a fitter uses on tag lines and hand lines: watch each tied, tie it
// with a finger, then take the test.

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

  return (
    <Screen>
      <View style={{ paddingTop: t.space.md }}>
        <Banner tone="warn" icon="warning-outline" text="Knots are for tag lines, hand lines and light material on a hand line. Never knot a sling or a wire rope, and never use one for fall protection: a lift is rigged to its plan with rated gear." />
      </View>
      <View style={{ marginHorizontal: t.layout.screenPadding, marginTop: t.space.md, padding: t.space.lg, borderRadius: t.radius.lg, backgroundColor: c.bgRaised, borderWidth: t.hairline, borderColor: c.border, gap: t.space.xs }}>
        <Text style={[t.type.sectionTitle, { color: c.text }]}>{`Tied by hand: ${tied} of ${KNOTS.length}`}</Text>
        <Text style={[t.type.caption, { color: c.textMuted }]}>
          {book.test.taken ? `Knot test: best ${book.test.best} of ${book.test.of}, last ${book.test.last} of ${book.test.of}` : 'Watch each one tied, tie it on screen with a finger, then take the test.'}
        </Text>
      </View>
      <ControlRow>
        <AccentButton label="Take the knot test" icon="school-outline" style={{ flex: 1 }} onPress={() => navigation.navigate('KnotTest')} />
      </ControlRow>
      <SectionHeader title="Knots" meta={`${KNOTS.length}`} />
      {KNOTS.map((k) => {
        const mine = book.tied[k.id];
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
                {mine ? <Text style={[t.type.caption, { color: c.textFaint, fontSize: 11 }]}>{seconds(mine.bestMs)}</Text> : null}
              </View>
            }
          />
        );
      })}
    </Screen>
  );
}
