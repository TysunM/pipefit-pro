import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { CalculatorCard } from '../components/CalculatorCard';
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
  { route: 'SimpleOffset', title: 'Simple offset', subtitle: 'Travel, run and shrink in one plane', icon: 'git-branch-outline' },
  { route: 'RollingOffset', title: 'Rolling offset', subtitle: 'True offset and roll angle in two planes', icon: 'sync-outline' },
  { route: 'CutLength', title: 'Cut length', subtitle: 'Centre-to-centre minus fitting takeouts', icon: 'cut-outline' },
  { route: 'SaddleBend', title: 'Saddle bend', subtitle: 'Three and four point conduit saddles', icon: 'trending-up-outline' },
  { route: 'MiterBend', title: 'Miter bend', subtitle: 'Segmented elbow cuts, code checked', icon: 'triangle-outline' },
  { route: 'ThreadEngagement', title: 'Thread engagement', subtitle: 'NPT makeup, takeout and tap drill', icon: 'options-outline' },
  { route: 'HandBender', title: 'Hand bender', subtitle: 'Setback, arc length and gain', icon: 'analytics-outline' },
];

export function HomeScreen({ navigation }: Props) {
  const t = useTheme();
  const { settings } = useSettings();
  const size = findSize(settings.defaultNps);

  return (
    <Screen>
      <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.sm, paddingBottom: t.space.xl }}>
        <Text style={[t.type.body, { color: t.colors.textMuted }]}>
          Field calculations for pipe, tube and conduit. Every result is centre-to-centre with fitting takeouts deducted.
        </Text>
      </View>

      <View
        style={{
          marginHorizontal: t.layout.screenPadding,
          marginBottom: t.space.lg,
          padding: t.space.lg,
          borderRadius: t.radius.lg,
          backgroundColor: t.colors.bgSubtle,
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space.md,
        }}
      >
        <Ionicons name="construct-outline" size={19} color={t.colors.textMuted} />
        <Text style={[t.type.captionStrong, { color: t.colors.textMuted, flex: 1 }]} numberOfLines={1}>
          {`${size.label} ${settings.defaultKind} · SCH ${settings.defaultSchedule} · ${
            settings.unitSystem === 'metric' ? 'Metric' : 'Imperial'
          }`}
        </Text>
        <Pressable
          onPress={() => navigation.navigate('Settings')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Change pipe defaults"
        >
          <Text style={[t.type.labelSmall, { color: t.colors.data }]}>Change</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: t.space.md }}>
        {CALCULATORS.map((c) => (
          <CalculatorCard
            key={c.route}
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
