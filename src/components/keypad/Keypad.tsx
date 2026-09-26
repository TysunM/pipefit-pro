import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeProvider';
import { KEYPAD, type Key, type KeyAction } from '../../calc/keys';
import { Plate } from '../metal';

// Three tiers of key, the way a trade calculator has always been laid out:
// copper for the pipe keys a fitter bought it for, slate for the maths, and
// bronze for the digits and the units. Clear stays red and Conv stays blue,
// because those two are meanings rather than tiers.
type Skin = { plate: 'copper' | 'slate' | 'metal' } | { flat: string; fg: string };

function skinFor(t: ReturnType<typeof useTheme>, tone: Key['tone'], armed: boolean): Skin {
  const c = t.colors;
  if (armed) return { flat: c.accent, fg: c.onAccent };
  switch (tone) {
    case 'trade':
      return { plate: 'copper' };
    case 'function':
      return { plate: 'slate' };
    case 'clear':
      return { flat: c.danger, fg: c.onAccent };
    case 'conv':
      return { flat: c.data, fg: c.onData };
    default:
      return { plate: 'metal' };
  }
}

function inkFor(t: ReturnType<typeof useTheme>, skin: Skin): string {
  if ('flat' in skin) return skin.fg;
  return skin.plate === 'copper' ? t.colors.onCopper : skin.plate === 'slate' ? t.colors.onSlate : t.colors.text;
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
            const skin = skinFor(t, key.tone, armed);
            const ink = inkFor(t, skin);
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
                  style={{ opacity: dimmed ? 0.4 : 1 }}
                >
                  {({ pressed }) => {
                    const face = (
                      <Text
                        numberOfLines={2}
                        adjustsFontSizeToFit
                        style={[
                          styles.keyText,
                          {
                            fontFamily: t.font.sans,
                            ...t.weight('700'),
                            color: ink,
                            fontSize: label.length > 6 ? 13.5 : label.includes('\n') ? 13.5 : 18,
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    );
                    return 'plate' in skin ? (
                      <Plate tone={skin.plate} sunk={pressed} radius={t.radius.md} style={styles.key}>
                        {face}
                      </Plate>
                    ) : (
                      <View
                        style={[
                          styles.key,
                          {
                            backgroundColor: skin.flat,
                            borderRadius: t.radius.md,
                            borderWidth: 1,
                            borderColor: t.colors.edgeLo,
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                      >
                        {face}
                      </View>
                    );
                  }}
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
    paddingHorizontal: 2,
  },
  keyText: { textAlign: 'center' },
});
