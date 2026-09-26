import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import type { Tool } from '../navigation/groups';
import { TileArt, TILE_ART_BOX } from './TileArt';
import { ToolArt } from './ToolArt';
import { useSvgIds } from './metal';

// The tiles
// ---------
// Three sizes, one surface. A big tile is a tool a man opens by the picture:
// the drawing, the name set in the serif, and one line of what it does. A wide
// tile is the one tool that wants the width. A small tile is an everyday
// calculation, read by the shape of the geometry and its name alone.
//
// The surface is a slate plate lit from above, with a hairline edge and a soft
// drop, so the tiles sit on the page rather than being painted on it. Pressed,
// the light turns over. The featured tile is the same plate in teal.
//
// Every drawing on a tile sits inside a View. On the web the plate's gradient
// is absolutely positioned, and an absolutely positioned layer paints over a
// bare <svg> sibling however late the sibling comes; a View is positioned, so
// it paints in order like everything else.

function Surface({
  children,
  style,
  pressed = false,
  featured = false,
}: {
  children?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  pressed?: boolean;
  featured?: boolean;
}) {
  const t = useTheme();
  const c = t.colors;
  const gid = useSvgIds('tile');
  const [hi, lo] = featured ? [c.featureHi, c.featureLo] : [c.metalHi, c.metalLo];
  return (
    <View
      style={[
        {
          borderRadius: t.radius.xl,
          borderWidth: 1,
          borderColor: featured ? c.featureEdge : c.border,
          backgroundColor: lo,
          overflow: 'hidden',
        },
        t.mode === 'dark' ? styles.dropDark : styles.dropLight,
        style,
      ]}
    >
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id={gid('a')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={pressed ? lo : hi} />
            <Stop offset="1" stopColor={pressed ? hi : lo} />
          </LinearGradient>
          <LinearGradient id={gid('b')} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={c.edgeHi} stopOpacity={0} />
            <Stop offset="0.5" stopColor={featured ? c.feature : c.edgeHi} stopOpacity={featured ? 0.5 : 0.95} />
            <Stop offset="1" stopColor={c.edgeHi} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gid('a')})`} />
        {pressed ? null : <Rect x="0" y="0" width="100%" height="1.5" fill={`url(#${gid('b')})`} />}
      </Svg>
      {children}
    </View>
  );
}

/**
 * A tool on the front page or a tab: its drawing, its name and what it does.
 * `badge` sits in the top corner and `corner` in the bottom one — a count, a
 * tag, a hint at what is behind the tile.
 */
export function ToolTile({
  tool,
  onPress,
  featured = false,
  badge,
  corner,
}: {
  tool: Tool;
  onPress: () => void;
  featured?: boolean;
  badge?: React.ReactNode;
  corner?: React.ReactNode;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${tool.title}. ${tool.subtitle}`}
      style={{ flex: 1 }}
    >
      {({ pressed }) => (
        <Surface pressed={pressed} featured={featured} style={{ flex: 1, minHeight: 204, padding: 14, paddingTop: 14 }}>
          <View style={{ height: 86, alignItems: 'center', justifyContent: 'center' }}>
            <ToolArt route={tool.route} height={78} />
          </View>
          <Text
            style={[t.type.tileTitle, { color: t.colors.text, marginTop: 12 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {tool.title}
          </Text>
          <Text
            style={[t.type.caption, { color: t.colors.textMuted, marginTop: 4, fontSize: 14, lineHeight: 18.5, paddingRight: corner ? 24 : 0 }]}
            numberOfLines={2}
          >
            {tool.subtitle}
          </Text>
          {badge ? <View style={{ position: 'absolute', top: 11, right: 12 }}>{badge}</View> : null}
          {corner ? <View style={{ position: 'absolute', bottom: 12, right: 12 }}>{corner}</View> : null}
        </Surface>
      )}
    </Pressable>
  );
}

/** A tool that wants the whole width: the drawing on the left, the words beside it. */
export function WideTile({ tool, onPress }: { tool: Tool; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${tool.title}. ${tool.subtitle}`}>
      {({ pressed }) => (
        <Surface pressed={pressed} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14, minHeight: 104 }}>
          <View>
            <ToolArt route={tool.route} height={72} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[t.type.tileTitle, { color: t.colors.text }]} numberOfLines={1}>
              {tool.title}
            </Text>
            <Text style={[t.type.caption, { color: t.colors.textMuted, marginTop: 4, fontSize: 14, lineHeight: 18.5 }]} numberOfLines={2}>
              {tool.subtitle}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={t.colors.textFaint} />
        </Surface>
      )}
    </Pressable>
  );
}

/** An everyday calculation: its schematic over its name. */
export function CalcTile({ tool, onPress }: { tool: Tool; onPress: () => void }) {
  const t = useTheme();
  const artH = 40;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${tool.title}. ${tool.subtitle}`} style={{ flex: 1 }}>
      {({ pressed }) => (
        <Surface pressed={pressed} style={{ flex: 1, height: 100, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, gap: 6 }}>
          <View>
            <TileArt route={tool.route} size={artH / TILE_ART_BOX.height} />
          </View>
          <Text
            style={[t.type.tileTitle, { color: t.colors.text, fontSize: 18.5, textAlign: 'center' }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {tool.title}
          </Text>
        </Surface>
      )}
    </Pressable>
  );
}

/** Tiles two to a row, every row's tiles the same height. */
export function ToolGrid({ children, gap }: { children: React.ReactNode[]; gap?: number }) {
  const t = useTheme();
  const g = gap ?? 14;
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < children.length; i += 2) rows.push(children.slice(i, i + 2));
  return (
    <View style={{ paddingHorizontal: t.layout.screenPadding, gap: g }}>
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: g, alignItems: 'stretch' }}>
          {row}
          {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

/**
 * The heading over a grid. Given two, they sit one over each column, which is
 * how the front page names its left and right halves.
 */
export function GridLabel({ text, right, meta }: { text: string; right?: string; meta?: string }) {
  const t = useTheme();
  const style = [t.type.label, { color: t.colors.textMuted, fontFamily: t.font.sans, fontSize: 15, letterSpacing: 0.6 }];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 14,
        paddingHorizontal: t.layout.screenPadding,
        paddingTop: t.space.xxl,
        paddingBottom: t.space.md,
      }}
    >
      <Text style={[style, { flex: 1 }]} accessibilityRole="header" numberOfLines={1}>
        {text}
      </Text>
      {right ? (
        <Text style={[style, { flex: 1 }]} accessibilityRole="header" numberOfLines={1}>
          {right}
        </Text>
      ) : null}
      {meta ? <Text style={[t.type.labelSmall, { color: t.colors.textFaint }]}>{meta}</Text> : null}
    </View>
  );
}

/** How many records a tile holds, in a small round well. */
export function CountBadge({ n }: { n: number }) {
  const t = useTheme();
  return (
    <View
      style={{
        minWidth: 26,
        height: 26,
        paddingHorizontal: 7,
        borderRadius: 13,
        backgroundColor: t.colors.well,
        borderWidth: 1,
        borderColor: t.colors.wellEdge,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityLabel={`${n} saved`}
    >
      <Text style={[t.type.captionStrong, { color: t.colors.textMuted, fontSize: 13 }]}>{n}</Text>
    </View>
  );
}

/** The word on a featured tile. */
export function FeatureTag({ text }: { text: string }) {
  const t = useTheme();
  return <Text style={[t.type.labelSmall, { color: t.colors.feature, fontFamily: t.font.sans, fontSize: 12.5 }]}>{text}</Text>;
}

/** The round arrow in a featured tile's corner. */
export function FeatureArrow() {
  const t = useTheme();
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: t.colors.featureEdge,
        backgroundColor: t.colors.featureLo,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="chevron-forward" size={15} color={t.colors.text} />
    </View>
  );
}

const styles = StyleSheet.create({
  dropDark: { shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  dropLight: { shadowColor: '#2A3A4F', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
});
