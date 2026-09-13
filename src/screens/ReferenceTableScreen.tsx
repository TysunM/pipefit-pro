import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { useTheme } from '../theme/ThemeProvider';
import { referenceTable } from '../calc/reference';

type Props = NativeStackScreenProps<RootStackParamList, 'ReferenceTable'>;

const COL_WIDTH = 92;
const WIDE_COL_WIDTH = 150;

export function ReferenceTableScreen({ route }: Props) {
  const t = useTheme();
  const table = referenceTable(route.params.id);
  const [filter, setFilter] = useState('');

  const rows = useMemo(() => {
    if (!table) return [];
    const all = table.rows();
    const q = filter.trim().toLowerCase();
    if (!q) return all;
    return all.filter((r) => Object.values(r).some((v) => v.toLowerCase().includes(q)));
  }, [table, filter]);

  if (!table) {
    return (
      <Screen>
        <View style={{ padding: t.layout.screenPadding }}>
          <Text style={[t.type.body, { color: t.colors.textMuted }]}>That table is not in the book.</Text>
        </View>
      </Screen>
    );
  }

  const width = (wide?: boolean) => (wide ? WIDE_COL_WIDTH : COL_WIDTH);

  return (
    <Screen scroll={false}>
      <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }}>
        <Text style={[t.type.labelSmall, { color: t.colors.textFaint }]}>
          {`${table.group} · page ${table.page}`}
        </Text>
        {table.note ? (
          <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: t.space.sm }]}>
            {table.note}
          </Text>
        ) : null}
        <View
          style={{
            marginTop: t.space.md,
            marginBottom: t.space.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.space.md,
            paddingHorizontal: t.space.lg,
            height: 42,
            borderRadius: t.radius.lg,
            backgroundColor: t.colors.bgSubtle,
          }}
        >
          <Ionicons name="search-outline" size={16} color={t.colors.textFaint} />
          <TextInput
            value={filter}
            onChangeText={setFilter}
            placeholder="Jump to a size"
            placeholderTextColor={t.colors.textFaint}
            autoCorrect={false}
            accessibilityLabel="Filter rows"
            style={[t.type.body, { flex: 1, color: t.colors.text, paddingVertical: 0 }]}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View
            style={{
              flexDirection: 'row',
              paddingHorizontal: t.layout.screenPadding,
              paddingBottom: t.space.sm,
              borderBottomWidth: 1,
              borderBottomColor: t.colors.border,
            }}
          >
            {table.columns.map((c) => (
              <Text
                key={c.key}
                numberOfLines={2}
                style={[
                  t.type.labelSmall,
                  { color: t.colors.textMuted, width: width(c.wide), paddingRight: t.space.sm },
                ]}
              >
                {c.label}
              </Text>
            ))}
          </View>

          <ScrollView>
            {rows.map((r, i) => (
              <View
                key={`${r.size}-${i}`}
                style={{
                  flexDirection: 'row',
                  paddingHorizontal: t.layout.screenPadding,
                  paddingVertical: t.space.md,
                  backgroundColor: i % 2 ? t.colors.bgSunken : t.colors.bg,
                }}
              >
                {table.columns.map((c, j) => (
                  <Text
                    key={c.key}
                    numberOfLines={1}
                    style={[
                      j === 0 ? t.type.bodyStrong : t.type.body,
                      {
                        color: j === 0 ? t.colors.text : t.colors.textMuted,
                        width: width(c.wide),
                        paddingRight: t.space.sm,
                        fontVariant: ['tabular-nums'],
                      },
                    ]}
                  >
                    {r[c.key] ?? '—'}
                  </Text>
                ))}
              </View>
            ))}
            {rows.length === 0 ? (
              <View style={{ padding: t.layout.screenPadding }}>
                <Text style={[t.type.body, { color: t.colors.textMuted }]}>No row matches that.</Text>
              </View>
            ) : null}
            <View style={{ height: t.space.xxxl }} />
          </ScrollView>
        </View>
      </ScrollView>
    </Screen>
  );
}
