import React from 'react';
import { Pressable, Text, View, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { Plate } from './metal';

// One key of the phone calculator and the converter, in the trade pad's
// tiers (Keypad.tsx): bronze for the digits, slate for the operators and the
// scientific keys, copper for =, red for clear, and the action colour for a
// key that is switched on, so a state is never mistaken for a tier.

export type KeyTone = 'digit' | 'op' | 'eq' | 'clear' | 'on';

export function CalcKey({
  label,
  icon,
  tone = 'digit',
  onPress,
  height,
  a11y,
  flex = 1,
  small = false,
}: {
  label?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  tone?: KeyTone;
  onPress: () => void;
  height: number;
  /** What a screen reader says, when the face is a symbol. */
  a11y?: string;
  flex?: number;
  /** The scientific keys: more of them to a row, so a smaller face. */
  small?: boolean;
}) {
  const t = useTheme();
  const c = t.colors;
  const flat = tone === 'clear' ? { bg: c.danger, fg: c.onAccent } : tone === 'on' ? { bg: c.accent, fg: c.onAccent } : null;
  const plate = tone === 'eq' ? 'copper' : tone === 'op' ? 'slate' : 'metal';
  const ink = flat ? flat.fg : tone === 'eq' ? c.onCopper : tone === 'op' ? c.onSlate : c.text;
  const box: ViewStyle = { height, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 };
  const size = small ? Math.min(17, Math.max(13, height * 0.36)) : Math.min(26, Math.max(17, height * 0.42));

  const face = icon ? (
    <Ionicons name={icon} size={size + 2} color={ink} />
  ) : (
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ color: ink, fontFamily: t.font.sans, ...t.weight(small ? '600' : '700'), fontSize: size, textAlign: 'center' }}>
      {label}
    </Text>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={{ flex }}
    >
      {({ pressed }) =>
        flat ? (
          <View style={[box, { backgroundColor: flat.bg, borderRadius: t.radius.md, borderWidth: 1, borderColor: c.edgeLo, opacity: pressed ? 0.8 : 1 }]}>{face}</View>
        ) : (
          <Plate tone={plate} sunk={pressed} radius={t.radius.md} style={box}>
            {face}
          </Plate>
        )
      }
    </Pressable>
  );
}
