import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { TileArt, hasTileArt } from './TileArt';
import { GlowBar, Plate, Well } from './metal';

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
 *
 * The card is a bronze plate with the drawing let into it, and a lit strip
 * under the drawing. Pressed, the plate sinks.
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
      accessibilityLabel={`${title}. ${subtitle}`}
      style={{ paddingHorizontal: t.space.sm, paddingVertical: 5 }}
    >
      {({ pressed }) => (
        <Plate sunk={pressed} style={{ flexDirection: 'row', alignItems: 'stretch', minHeight: 96 }}>
          <View style={{ padding: t.space.sm, paddingRight: 0, justifyContent: 'center' }}>
            <Well style={{ width: 100, flex: 1, minHeight: 76, alignItems: 'center', justifyContent: 'center' }}>
              {drawn ? <TileArt route={route} /> : <Ionicons name={icon} size={28} color={t.colors.text} />}
            </Well>
            <GlowBar width={52} style={{ position: 'absolute', bottom: -4, left: t.space.sm + 24 }} />
          </View>

          <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: t.space.md, justifyContent: 'center' }}>
            <Text
              style={[t.type.sectionTitle, { color: t.colors.text, fontFamily: t.font.serif, fontSize: 19 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {title}
            </Text>
            <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: 3, fontSize: 14 }]} numberOfLines={2}>
              {subtitle}
            </Text>
          </View>

          {/* The chevron sits in its own channel, cut off from the words by a
              groove — a dark line with a lit one beside it. */}
          <View
            style={{
              width: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderLeftWidth: 1,
              borderLeftColor: t.colors.edgeLo,
              backgroundColor: t.mode === 'dark' ? 'rgba(0,0,0,0.22)' : 'rgba(90,70,48,0.06)',
            }}
          >
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 1, backgroundColor: t.colors.edgeHi, opacity: 0.35 }} />
            <Ionicons name="chevron-forward" size={22} color={t.colors.textMuted} />
          </View>
        </Plate>
      )}
    </Pressable>
  );
}
