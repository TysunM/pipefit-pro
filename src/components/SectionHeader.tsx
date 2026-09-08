import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function SectionHeader({ title, meta }: { title: string; meta?: string }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        paddingHorizontal: t.layout.screenPadding,
        paddingTop: t.space.xl,
        paddingBottom: t.space.lg,
        gap: t.space.md,
      }}
    >
      <Text style={[t.type.sectionTitle, { color: t.colors.text, fontFamily: t.font.serif }]}>{title}</Text>
      {meta ? (
        <Text style={[t.type.labelSmall, { color: t.colors.textMuted, flexShrink: 1, textAlign: 'right' }]} numberOfLines={1}>
          {meta}
        </Text>
      ) : null}
    </View>
  );
}
