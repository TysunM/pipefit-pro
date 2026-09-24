import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Plate } from './metal';

export type ChipOption<T> = { value: T; label: string };

export function ChipRow<T extends string | number>({
  label,
  options,
  selected,
  onSelect,
}: {
  label?: string;
  options: ChipOption<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: t.space.lg }}>
      {label ? (
        <Text
          style={[
            t.type.label,
            { color: t.colors.textMuted, paddingLeft: t.layout.screenPadding, paddingRight: t.space.md },
          ]}
        >
          {label}
        </Text>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: t.space.sm,
          paddingRight: t.layout.screenPadding,
          paddingLeft: label ? 0 : t.layout.screenPadding,
        }}
      >
        {options.map((opt) => {
          const active = opt.value === selected;
          return (
            <Pressable
              key={String(opt.value)}
              onPress={() => onSelect(opt.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              {({ pressed }) => {
                const face = {
                  height: t.layout.chipHeight,
                  minWidth: 74,
                  paddingHorizontal: t.space.lg,
                  alignItems: 'center' as const,
                  justifyContent: 'center' as const,
                };
                const label = (
                  <Text
                    style={[
                      t.type.button,
                      { color: active ? t.colors.onPrimary : t.colors.text },
                    ]}
                  >
                    {opt.label}
                  </Text>
                );
                // The chosen one is lit blue, flat — it is a state, not a
                // plate — so it can never be mistaken for one more button.
                return active ? (
                  <View
                    style={[
                      face,
                      {
                        borderRadius: t.radius.md,
                        backgroundColor: pressed ? t.colors.primaryPressed : t.colors.primary,
                        borderWidth: 1,
                        borderColor: t.colors.data,
                      },
                    ]}
                  >
                    {label}
                  </View>
                ) : (
                  <Plate sunk={pressed} radius={t.radius.md} style={face}>
                    {label}
                  </Plate>
                );
              }}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
