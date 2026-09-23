import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { CalculatorCard } from '../components/CalculatorCard';
import { Plate, Well } from '../components/metal';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { findSize } from '../calc/pipe';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const CALCULATORS: {
  route: keyof RootStackParamList;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { route: 'Calculator', title: 'Calculator', subtitle: 'Feet, inches and fractions with pipe keys', icon: 'calculator-outline' },
  { route: 'Level', title: 'Level', subtitle: 'Lay the phone on the pipe and read the fall', icon: 'git-commit-outline' },
  { route: 'Reference', title: 'Handbook', subtitle: 'Every table, searchable, with its page', icon: 'book-outline' },
  { route: 'SpoolBuilder', title: '3D spool', subtitle: 'Build a run and spin it in 3D', icon: 'cube-outline' },
  { route: 'OrderSheet', title: 'Order sheet', subtitle: 'One order across every saved spool', icon: 'receipt-outline' },
  { route: 'FlangeBoltUp', title: 'Flange bolt-up', subtitle: 'Tap each bolt through the cross pattern', icon: 'sync-circle-outline' },
  { route: 'Joints', title: 'Joint register', subtitle: 'Every bolt-up saved, bolt by bolt', icon: 'pricetags-outline' },
  { route: 'Heats', title: 'Heat book', subtitle: 'Heat numbers, certs, and what the job can prove', icon: 'shield-checkmark-outline' },
  { route: 'SimpleOffset', title: 'Simple offset', subtitle: 'Travel, run and shrink in one plane', icon: 'git-branch-outline' },
  { route: 'RollingOffset', title: 'Rolling offset', subtitle: 'True offset and roll angle in two planes', icon: 'sync-outline' },
  { route: 'CutLength', title: 'Cut length', subtitle: 'Centre-to-centre minus fitting takeouts', icon: 'cut-outline' },
  { route: 'SaddleBend', title: 'Saddle bend', subtitle: 'Three and four point saddles over an obstruction', icon: 'trending-up-outline' },
  { route: 'MiterBend', title: 'Miter bend', subtitle: 'Segmented elbow cuts, code checked', icon: 'triangle-outline' },
  { route: 'ThreadEngagement', title: 'Thread engagement', subtitle: 'NPT makeup, takeout and tap drill', icon: 'options-outline' },
  { route: 'HandBender', title: 'Pipe bend', subtitle: 'Setback, arc length and gain', icon: 'analytics-outline' },
];

export function HomeScreen({ navigation }: Props) {
  const t = useTheme();
  const { settings } = useSettings();
  const size = findSize(settings.defaultNps);

  return (
    <Screen>
      <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.lg, paddingBottom: t.space.lg }}>
        <Text style={[t.type.body, { color: t.colors.textMuted }]}>
          Field calculations for pipe and tube. Every result is centre-to-centre with fitting takeouts deducted.
        </Text>
      </View>

      {/* The pipe every tool starts from, on a copper plate across the top so
          it is the first thing read — it changes every answer below it. */}
      <Plate
        tone="copper"
        radius={t.radius.pill}
        style={{
          marginHorizontal: t.layout.screenPadding,
          marginBottom: t.space.lg,
          paddingLeft: t.space.lg,
          paddingRight: 6,
          height: 50,
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space.md,
        }}
      >
        <Ionicons name="construct" size={18} color={t.colors.onCopper} />
        <Text
          style={[t.type.bodyStrong, { color: t.colors.onCopper, flex: 1, fontFamily: t.font.serifMedium }]}
          numberOfLines={1}
        >
          {`${size.label} ${settings.defaultKind} · SCH ${settings.defaultSchedule} · ${
            settings.unitSystem === 'metric' ? 'Metric' : 'Imperial'
          }`}
        </Text>
        <Pressable
          onPress={() => navigation.navigate('Settings')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Change pipe defaults"
        >
          {({ pressed }) => (
            <Well
              radius={t.radius.pill}
              style={{ height: 38, paddingHorizontal: t.space.lg, justifyContent: 'center', opacity: pressed ? 0.8 : 1 }}
            >
              <Text style={[t.type.labelSmall, { color: t.colors.text }]}>Change</Text>
            </Well>
          )}
        </Pressable>
      </Plate>

      <View style={{ paddingHorizontal: t.space.md }}>
        {CALCULATORS.map((c) => (
          <CalculatorCard
            key={c.route}
            route={c.route}
            title={c.title}
            subtitle={c.subtitle}
            icon={c.icon}
            onPress={() => navigation.navigate(c.route as never)}
          />
        ))}
      </View>
    </Screen>
  );
}
