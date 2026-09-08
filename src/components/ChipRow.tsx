import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

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
              style={({ pressed }) => ({
                height: t.layout.chipHeight,
                minWidth: 74,
                paddingHorizontal: t.space.lg,
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: active ? t.colors.primary : t.colors.border,
                backgroundColor: active ? t.colors.primary : pressed ? t.colors.bgSubtle : t.colors.bgRaised,
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <Text
                style={[
                  t.type.bodyStrong,
                  { color: active ? t.colors.onPrimary : t.colors.text, fontWeight: active ? '700' : '600' },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
