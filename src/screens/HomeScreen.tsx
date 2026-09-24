import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { HOME } from '../navigation/groups';
import { Screen } from '../components/Screen';
import { CalculatorCard } from '../components/CalculatorCard';
import { RecentRow } from '../components/RecentRow';
import { Plate, Well } from '../components/metal';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { findSize } from '../calc/pipe';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

/**
 * The front page.
 *
 * What is on it, and in what order, is in navigation/groups.ts — this screen
 * only draws it. A card is either a tool or a group of them, and both look the
 * same on purpose: a man taps the picture of the thing he wants and gets
 * either the tool or the short list of the ones that answer the same question.
 */
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

      <RecentRow onOpen={(route) => navigation.navigate(route as never)} />

      <View style={{ paddingHorizontal: t.space.md }}>
        {HOME.map((entry) =>
          entry.kind === 'tool' ? (
            <CalculatorCard
              key={entry.tool.route}
              art={entry.tool.route}
              title={entry.tool.title}
              subtitle={entry.tool.subtitle}
              icon={entry.tool.icon}
              onPress={() => navigation.navigate(entry.tool.route as never)}
            />
          ) : (
            <CalculatorCard
              key={entry.id}
              art={entry.art}
              title={entry.title}
              subtitle={entry.subtitle}
              icon={entry.icon}
              onPress={() => navigation.navigate('Group', { id: entry.id })}
            />
          )
        )}
      </View>
    </Screen>
  );
}
