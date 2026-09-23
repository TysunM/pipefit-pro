import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Plate } from '../components/metal';
import { SectionHeader } from '../components/SectionHeader';
import { useTheme } from '../theme/ThemeProvider';
import { REFERENCE_TABLES, ReferenceGroup, searchReference } from '../calc/reference';

type Props = NativeStackScreenProps<RootStackParamList, 'Reference'>;

const GROUP_ICON: Record<ReferenceGroup, keyof typeof Ionicons.glyphMap> = {
  'Screwed fittings': 'build-outline',
  'Flanged fittings': 'ellipse-outline',
  'Welded fittings': 'flash-outline',
  Valves: 'toggle-outline',
  'Pipe and tube': 'reorder-four-outline',
  'Hanging and bending': 'git-commit-outline',
};

export function ReferenceScreen({ navigation }: Props) {
  const t = useTheme();
  const [query, setQuery] = useState('');

  const found = useMemo(() => searchReference(query), [query]);
  const groups = useMemo(() => [...new Set(found.map((x) => x.group))], [found]);

  return (
    <Screen>
      <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.sm }}>
        <Text style={[t.type.body, { color: t.colors.textMuted }]}>
          Every table in the handbook, with what was printed alongside it. Rules found behind the
          tables are used, so several of these answer sizes the pages stop short of.
        </Text>
        <View
          style={{
            marginTop: t.space.lg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.space.md,
            paddingHorizontal: t.space.lg,
            height: 46,
            borderRadius: t.radius.lg,
            backgroundColor: t.colors.bgSubtle,
          }}
        >
          <Ionicons name="search-outline" size={18} color={t.colors.textFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search tables, or a page number"
            placeholderTextColor={t.colors.textFaint}
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel="Search the handbook"
            style={[t.type.body, { flex: 1, color: t.colors.text, paddingVertical: 0 }]}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={12} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={t.colors.textFaint} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {found.length === 0 ? (
        <View style={{ padding: t.layout.screenPadding, paddingTop: t.space.xxxl }}>
          <Text style={[t.type.body, { color: t.colors.textMuted }]}>
            Nothing under that. Try a fitting, a material, or a handbook page like 4-51.
          </Text>
        </View>
      ) : null}

      {groups.map((g) => {
        const tables = found.filter((x) => x.group === g);
        return (
          <View key={g}>
            <SectionHeader title={g} meta={`${tables.length} ${tables.length === 1 ? 'table' : 'tables'}`} />
            {tables.map((x) => (
              <Pressable
                key={x.id}
                onPress={() => navigation.navigate('ReferenceTable', { id: x.id })}
                accessibilityRole="button"
                accessibilityLabel={`${x.title}, handbook page ${x.page}`}
                style={{ marginHorizontal: t.layout.screenPadding, marginBottom: t.space.sm }}
              >
                {({ pressed }) => (
                  <Plate
                    sunk={pressed}
                    style={{ padding: t.space.lg, flexDirection: 'row', alignItems: 'center', gap: t.space.md }}
                  >
                    <Ionicons name={GROUP_ICON[x.group]} size={19} color={t.colors.textMuted} />
                    <View style={{ flex: 1 }}>
                      <Text style={[t.type.bodyStrong, { color: t.colors.text }]}>{x.title}</Text>
                      <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: 2 }]}>
                        {`Page ${x.page} · ${x.rows().length} rows`}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={t.colors.textMuted} />
                  </Plate>
                )}
              </Pressable>
            ))}
          </View>
        );
      })}

      <View style={{ padding: t.layout.screenPadding, paddingTop: t.space.xl }}>
        <Text style={[t.type.caption, { color: t.colors.textFaint }]}>
          {`${REFERENCE_TABLES.length} tables. Where the print disagrees with itself the figure is held as printed and flagged, or corrected and noted, never quietly changed.`}
        </Text>
      </View>
    </Screen>
  );
}
