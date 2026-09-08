import React from 'react';
import { Pressable, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

export function GhostButton({
  label,
  onPress,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          height: t.layout.controlHeight,
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor: t.colors.border,
          backgroundColor: pressed ? t.colors.bgSubtle : t.colors.bgRaised,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: t.space.sm,
          paddingHorizontal: t.space.lg,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={t.colors.textMuted} /> : null}
      <Text style={[t.type.button, { color: t.colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function AccentButton({
  label,
  onPress,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          height: t.layout.controlHeight,
          borderRadius: t.radius.md,
          borderWidth: 1.5,
          borderColor: t.colors.accent,
          backgroundColor: pressed ? t.colors.accentSoft : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: t.space.sm,
          paddingHorizontal: t.space.lg,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={t.colors.accent} /> : null}
      <Text style={[t.type.button, { color: t.colors.accent }]}>{label}</Text>
    </Pressable>
  );
}

export function SelectorButton({
  primary,
  badge,
  onPress,
  icon = 'build-outline',
  style,
}: {
  primary: string;
  badge?: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          height: t.layout.controlHeight,
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor: t.colors.border,
          backgroundColor: pressed ? t.colors.bgSubtle : t.colors.bgRaised,
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space.sm,
          paddingHorizontal: t.space.lg,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={18} color={t.colors.textMuted} />
      <Text style={[t.type.sectionTitle, { color: t.colors.text }]}>{primary}</Text>
      {badge ? (
        <View
          style={{
            backgroundColor: t.colors.bgSubtle,
            borderRadius: t.radius.sm,
            paddingHorizontal: t.space.sm,
            paddingVertical: 3,
          }}
        >
          <Text style={[t.type.captionStrong, { color: t.colors.textMuted }]}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-down" size={14} color={t.colors.textFaint} style={{ marginLeft: 'auto' }} />
    </Pressable>
  );
}

export function ControlRow({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: t.space.md,
        paddingHorizontal: t.layout.screenPadding,
        marginBottom: t.space.xl,
      }}
    >
      {children}
    </View>
  );
}
