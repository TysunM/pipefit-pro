import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeProvider';
import { KEYPAD, type Key, type KeyAction } from '../../calc/keys';

function toneColours(t: ReturnType<typeof useTheme>, tone: Key['tone'], armed: boolean) {
  const c = t.colors;
  if (armed) return { bg: c.accent, fg: c.onAccent, border: c.accent };
  switch (tone) {
    case 'trade':
      return { bg: c.primary, fg: c.onPrimary, border: c.primary };
    case 'function':
      return { bg: c.bgSubtle, fg: c.text, border: c.border };
    case 'unit':
      return { bg: c.bgSubtle, fg: c.text, border: c.borderStrong };
    case 'digit':
      return { bg: c.bgRaised, fg: c.text, border: c.borderStrong };
    case 'operator':
      return { bg: c.bgSunken, fg: c.text, border: c.borderStrong };
    case 'clear':
      return { bg: c.danger, fg: '#FFFFFF', border: c.danger };
    case 'conv':
      return { bg: c.data, fg: '#FFFFFF', border: c.data };
  }
}

export function Keypad({
  onPress,
  shift,
}: {
  onPress: (action: KeyAction, arg?: string) => void;
  shift: boolean;
}) {
  const t = useTheme();

  return (
    <View style={styles.pad}>
      {KEYPAD.map((row, r) => (
        <View key={r} style={[styles.row, { gap: t.space.xs }]}>
          {row.map((key, c) => {
            const usesShift = shift && key.shiftAction !== undefined;
            const action = usesShift ? key.shiftAction! : key.action;
            const label = usesShift ? key.shiftLabel! : key.label;
            const armed = key.action === 'conv' && shift;
            const skin = toneColours(t, key.tone, armed);
            const dimmed = shift && key.shiftAction === undefined && key.action !== 'conv';

            return (
              <View key={c} style={styles.cell}>
                <Text
                  numberOfLines={1}
                  style={[
                    t.type.labelSmall,
                    styles.hint,
                    { color: usesShift ? t.colors.accent : t.colors.textFaint },
                  ]}
                >
                  {key.shiftLabel ?? ' '}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={label.replace('\n', ' ')}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    onPress(action, key.arg);
                  }}
                  style={({ pressed }) => [
                    styles.key,
                    {
                      backgroundColor: skin.bg,
                      borderColor: skin.border,
                      borderRadius: t.radius.md,
                      opacity: dimmed ? 0.4 : pressed ? 0.72 : 1,
                    },
                  ]}
                >
                  <Text
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    style={[
                      styles.keyText,
                      {
                        color: skin.fg,
                        fontSize: label.length > 6 ? 13 : label.includes('\n') ? 13 : 17,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { gap: 6 },
  row: { flexDirection: 'row' },
  cell: { flex: 1 },
  hint: { textAlign: 'center', fontSize: 9.5, letterSpacing: 0.2, marginBottom: 1, height: 12 },
  key: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 2,
  },
  keyText: { fontWeight: '700', textAlign: 'center' },
});
