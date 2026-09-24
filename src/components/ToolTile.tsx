import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { TileArt, hasTileArt } from './TileArt';
import { Plate } from './metal';

/**
 * One tool on the home screen, or one inside a group.
 *
 * A tall tile with the drawing on top and the words under it, two to a row.
 * Fourteen tools whose names are trade words that mean nearly the same thing
 * — rolling offset, simple offset, pipe bend, miter bend — are not told apart
 * by reading, and a home screen gets a glance rather than a read. A saddle
 * over an obstruction and a segmented elbow cannot be confused by anybody.
 *
 * A tile that stands for a group of tools wears the drawing of the one inside
 * it a man opens first, which is what `art` is — the tile's own route is not
 * always a screen.
 */
export function ToolTile({
  art,
  title,
  subtitle,
  icon,
  onPress,
}: {
  art: keyof RootStackParamList;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const t = useTheme();
  const drawn = hasTileArt(art);

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${subtitle}`} style={{ flex: 1 }}>
      {({ pressed }) => (
        <Plate sunk={pressed} radius={t.radius.xl} style={{ flex: 1, padding: 14, paddingBottom: 16, minHeight: 184 }}>
          <View style={{ height: 88, justifyContent: 'center' }}>
            {drawn ? <TileArt route={art} size={1.3} /> : <Ionicons name={icon} size={54} color={t.colors.text} />}
          </View>
          <Text
            style={[t.type.sectionTitle, { color: t.colors.text, marginTop: 10 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
          >
            {title}
          </Text>
          <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: 3, fontSize: 13.5 }]} numberOfLines={3}>
            {subtitle}
          </Text>
        </Plate>
      )}
    </Pressable>
  );
}

/** Tiles two to a row, every row's tiles the same height. */
export function ToolGrid({ children }: { children: React.ReactNode[] }) {
  const t = useTheme();
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < children.length; i += 2) rows.push(children.slice(i, i + 2));
  return (
    <View style={{ paddingHorizontal: t.layout.screenPadding, gap: t.space.md }}>
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: t.space.md, alignItems: 'stretch' }}>
          {row}
          {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

/** The small uppercase heading over a grid or a strip. */
export function GridLabel({ text, meta }: { text: string; meta?: string }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingHorizontal: t.layout.screenPadding,
        paddingTop: t.space.xl,
        paddingBottom: t.space.md,
      }}
    >
      <Text style={[t.type.label, { color: t.colors.textMuted, fontSize: 13.5 }]}>{text}</Text>
      {meta ? <Text style={[t.type.labelSmall, { color: t.colors.textFaint }]}>{meta}</Text> : null}
    </View>
  );
}
