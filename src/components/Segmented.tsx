import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Well } from './metal';

/**
 * A few choices in one pill, the chosen one lit blue.
 *
 * For a setting with two or three values that are all always visible —
 * flange class, a units toggle. The chosen segment is a flat blue fill, the
 * same as a chosen chip, so a state is never mistaken for a button.
 */
export function Segmented<T extends string | number>({
  label,
  options,
  selected,
  onSelect,
}: {
  label?: string;
  options: { value: T; label: string }[];
  selected: T | null;
  onSelect: (value: T) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.layout.screenPadding, marginBottom: t.space.lg, gap: t.space.md }}>
      {label ? <Text style={[t.type.label, { color: t.colors.textMuted, width: 64 }]}>{label}</Text> : null}
      <Well radius={t.radius.pill} style={{ flex: 1, flexDirection: 'row', padding: 4, height: 48 }}>
        {options.map((o) => {
          const on = o.value === selected;
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => onSelect(o.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => ({
                flex: 1,
                borderRadius: t.radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? (pressed ? t.colors.primaryPressed : t.colors.primary) : pressed ? t.colors.bgSubtle : 'transparent',
              })}
            >
              <Text style={[t.type.button, { color: on ? t.colors.onPrimary : t.colors.text }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </Well>
    </View>
  );
}
