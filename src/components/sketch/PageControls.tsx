import React from 'react';
import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { Flip } from '../../calc/iso';
import { flipWords } from '../../state/sketchStore';

/** A key in the paper's own strip, beside the drawing and never over it. */
export function PaperKey({
  icon,
  label,
  onPress,
  on = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  on?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 42,
        height: 42,
        borderRadius: t.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? t.colors.primary : on ? t.colors.accentSoft : t.colors.bgRaised,
        borderWidth: 1,
        borderColor: on ? t.colors.accent : t.colors.border,
      })}
    >
      {({ pressed }) => <Ionicons name={icon} size={20} color={pressed ? t.colors.onPrimary : on ? t.colors.accent : t.colors.text} />}
    </Pressable>
  );
}

/** How the sheet lies, in words, under the drawing. */
export function FlipLabel({ flip }: { flip: Flip }) {
  const t = useTheme();
  const words = flipWords(flip);
  return <Text style={[t.type.labelSmall, { color: words ? t.colors.accent : t.colors.textMuted }]}>{words || 'As drawn'}</Text>;
}
