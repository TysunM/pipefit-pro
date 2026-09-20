import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { TileArt, hasTileArt } from './TileArt';

/**
 * One tool on the home screen.
 *
 * Full width with the drawing beside the words, rather than two to a row with
 * an icon above them. Thirteen tools whose names are trade words that mean
 * nearly the same thing — rolling offset, simple offset, pipe bend, miter bend
 * — are not told apart by reading, and a home screen gets a glance rather than
 * a read. A saddle over an obstruction and a segmented elbow cannot be
 * confused by anybody, at any speed.
 *
 * Tools with no schematic keep their icon, in the same panel, at the same
 * size, so the column still reads as one column.
 */
export function CalculatorCard({
  route,
  title,
  subtitle,
  icon,
  onPress,
}: {
  route: keyof RootStackParamList;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const t = useTheme();
  const drawn = hasTileArt(route);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        paddingHorizontal: t.space.sm,
        paddingVertical: t.space.xs,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'stretch',
          borderRadius: t.radius.lg,
          borderWidth: 1,
          borderColor: t.colors.border,
          backgroundColor: t.colors.bgRaised,
          overflow: 'hidden',
        }}
      >
        {/* The drawing sits on its own ground, the way it does on the screen
            it belongs to, so the card reads as a window onto that tool. */}
        <View
          style={{
            width: 108,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: t.mode === 'dark' ? t.colors.bgSunken : t.colors.bgSubtle,
            borderRightWidth: t.hairline,
            borderRightColor: t.colors.border,
            paddingVertical: t.space.lg,
          }}
        >
          {drawn ? <TileArt route={route} /> : <Ionicons name={icon} size={26} color={t.colors.primary} />}
        </View>

        <View style={{ flex: 1, padding: t.space.lg, justifyContent: 'center' }}>
          <Text
            style={[t.type.bodyStrong, { color: t.colors.text, fontFamily: t.font.serif, fontSize: 17 }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: 3 }]} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>

        <View style={{ justifyContent: 'center', paddingRight: t.space.lg }}>
          <Ionicons name="chevron-forward" size={18} color={t.colors.textFaint} />
        </View>
      </View>
    </Pressable>
  );
}
