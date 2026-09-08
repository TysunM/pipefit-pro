import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

export function CalculatorCard({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        width: '50%',
        padding: t.space.sm,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View
        style={{
          borderRadius: t.radius.lg,
          borderWidth: 1,
          borderColor: t.colors.border,
          backgroundColor: t.colors.bgRaised,
          padding: t.space.lg,
          minHeight: 138,
          justifyContent: 'space-between',
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: t.radius.md,
            backgroundColor: t.colors.bgSubtle,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={21} color={t.colors.primary} />
        </View>
        <View>
          <Text
            style={[t.type.bodyStrong, { color: t.colors.text, fontFamily: t.font.serif, fontSize: 16.5 }]}
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: 4 }]} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
