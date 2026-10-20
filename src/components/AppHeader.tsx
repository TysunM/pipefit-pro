import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, G, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { useSvgIds } from './metal';

// The nameplate
// -------------
// A steel band across the top of every screen: three plates screwed down,
// the controls on the two end plates and the title lettered in chrome on
// the middle one. On the front page the title is the wordmark — the app's
// own P, the one off its icon, then "ipeFit" in chrome and "Pro" in the
// copper that is the rest of the app's one accent.
//
// The plates are drawn as one SVG at the window's width, which is known, so
// the Android trouble the flat plates were made to avoid (metal.tsx: a
// gradient sized by flex before the layout settled) does not arise. The
// wordmark's lettering is a picture, set in the app's serif and rendered
// once, because SVG text on Android does not find the fonts the app loads
// and fell back to a plain serif on the phone; a title is native text in
// the same face, lettered in chrome with a bevel under it. The controls are
// real Pressables over the drawing, with the forty-point hit box a gloved
// thumb needs.

const H = 64;
/** The end plates, with a control each. */
const PANEL = 72;
const RIVET = 4.2;
const INSET = 11;
/** The wordmark's P: the app icon, at a size the JS bundle can carry. */
const ICON_P = require('../../assets/wordmark-p.png');
/** "ipeFit Pro", lettered in chrome and copper for the dark plates and in dark steel for the light ones. */
const WORDMARK = { dark: require('../../assets/wordmark-dark.png'), light: require('../../assets/wordmark-light.png') };
/** The lettering's height on the band; its width follows the picture. */
const MARK_H = 44;
const P = 40;
/** Between the P's tile and the i: tight, so the two read as one word. */
const GAP = 2;

/** A picture's width at a height, from the asset's own size (a number on the phone, an object on the web). */
function widthAt(src: unknown, height: number): number {
  const a = typeof src === 'number' ? Image.resolveAssetSource(src) : (src as { width?: number; height?: number });
  return a?.width && a?.height ? (height * a.width) / a.height : height * 3.4;
}

type Plate = {
  top: string;
  mid: string;
  low: string;
  seamDark: string;
  seamLight: string;
  rivetHi: string;
  rivetLo: string;
  rivetRing: string;
  slot: string;
  bezel: string;
  bezelRing: string;
  glyph: string;
  /** The chrome lettering, top to bottom, and its outline. */
  chrome: readonly string[];
  chromeEdge: string;
  copper: readonly string[];
  copperEdge: string;
};

const DARK: Plate = {
  top: '#5f646c', mid: '#3e434a', low: '#2a2e34',
  seamDark: '#15181c', seamLight: '#767c85',
  rivetHi: '#c9ced5', rivetLo: '#767c84', rivetRing: '#181b1f', slot: '#2b2f35',
  bezel: '#2a2e34', bezelRing: '#9097a0', glyph: '#e2e6eb',
  chrome: ['#ffffff', '#e4e7eb', '#9ba1a9', '#d6dadf', '#f4f6f8'], chromeEdge: '#1b1f24',
  copper: ['#ffd38f', '#f5a034', '#d86f10', '#f2a84b'], copperEdge: '#3c2007',
};

const LIGHT: Plate = {
  top: '#e3e6eb', mid: '#c3c8cf', low: '#aab0b8',
  seamDark: '#7d838c', seamLight: '#f4f6f8',
  rivetHi: '#f6f7f9', rivetLo: '#aeb4bc', rivetRing: '#5f656d', slot: '#8b9199',
  bezel: '#eef0f3', bezelRing: '#8e949c', glyph: '#1f242a',
  chrome: ['#6b7178', '#3a3f46', '#1c2025', '#454a51', '#6f757d'], chromeEdge: '#f2f4f6',
  copper: ['#f6a64a', '#dd7a14', '#b85c0a', '#e58a2a'], copperEdge: '#fff1dd',
};

export function AppHeader({
  title,
  onBack,
  onSettings,
  onProfile,
}: {
  title: string;
  onBack?: () => void;
  onSettings?: () => void;
  /** The front page's left-hand control: the man's own records. */
  onProfile?: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width: w } = useWindowDimensions();
  const p = t.mode === 'dark' ? DARK : LIGHT;
  const gid = useSvgIds('head');
  const wordmark = title === 'PipeFit Pro';
  const mark = WORDMARK[t.mode === 'dark' ? 'dark' : 'light'];
  // The mark at its height, or smaller on a narrow screen, so it never runs under a control.
  const avail = w - 2 * PANEL - 12;
  const full = P + GAP + widthAt(mark, MARK_H);
  const fit = Math.min(1, avail / full);

  const rivets: [number, number][] = [];
  for (const [x0, x1] of [
    [0, PANEL],
    [PANEL, w - PANEL],
    [w - PANEL, w],
  ] as const)
    rivets.push([x0 + INSET, INSET], [x1 - INSET, INSET], [x0 + INSET, H - INSET], [x1 - INSET, H - INSET]);

  const left = onBack ? { icon: 'arrow-back' as const, label: 'Back', on: onBack } : onProfile ? { icon: 'person' as const, label: 'Your projects', on: onProfile } : null;
  const right = onSettings ? { icon: 'settings-sharp' as const, label: 'Settings', on: onSettings } : null;

  return (
    <View style={{ paddingTop: insets.top, backgroundColor: p.low }} accessibilityRole="header" accessibilityLabel={title}>
      <View style={{ height: H, overflow: 'hidden' }}>
        <Svg width={w} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id={gid('p')} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={p.top} />
              <Stop offset="0.55" stopColor={p.mid} />
              <Stop offset="1" stopColor={p.low} />
            </LinearGradient>
            <RadialGradient id={gid('r')} cx="38%" cy="35%" rx="65%" ry="65%">
              <Stop offset="0" stopColor={p.rivetHi} />
              <Stop offset="1" stopColor={p.rivetLo} />
            </RadialGradient>
          </Defs>

          {/* The band, with the lit top edge and the shadowed bottom one. */}
          <Rect x={0} y={0} width={w} height={H} fill={`url(#${gid('p')})`} />
          {[0.28, 0.5, 0.72].map((f) => (
            <Rect key={f} x={0} y={H * f} width={w} height={1} fill={t.mode === 'dark' ? '#ffffff' : '#000000'} opacity={0.045} />
          ))}
          <Rect x={0} y={0} width={w} height={1} fill={p.seamLight} opacity={0.8} />
          <Rect x={0} y={H - 1} width={w} height={1} fill={p.seamDark} />

          {/* The joints between the three plates. */}
          {[PANEL, w - PANEL].map((x) => (
            <G key={x}>
              <Rect x={x - 1} y={0} width={1.4} height={H} fill={p.seamDark} />
              <Rect x={x + 0.4} y={0} width={1} height={H} fill={p.seamLight} opacity={0.45} />
            </G>
          ))}

          {/* The screws. */}
          {rivets.map(([cx, cy]) => (
            <G key={`${cx}-${cy}`}>
              <Circle cx={cx} cy={cy} r={RIVET + 0.9} fill={p.rivetRing} />
              <Circle cx={cx} cy={cy} r={RIVET} fill={`url(#${gid('r')})`} />
              <Line x1={cx - 2.3} y1={cy} x2={cx + 2.3} y2={cy} stroke={p.slot} strokeWidth={1.1} />
              <Line x1={cx} y1={cy - 2.3} x2={cx} y2={cy + 2.3} stroke={p.slot} strokeWidth={1.1} />
            </G>
          ))}

          {/* The controls' bezels. */}
          {left ? <Circle cx={PANEL / 2} cy={H / 2} r={18} fill={p.bezel} stroke={p.bezelRing} strokeWidth={1.6} /> : null}
          {right ? <Circle cx={w - PANEL / 2} cy={H / 2} r={18} fill={p.bezel} stroke={p.bezelRing} strokeWidth={1.6} /> : null}

        </Svg>

        {/* The lettering, centred on the middle plate. */}
        <View pointerEvents="none" style={{ position: 'absolute', left: PANEL, right: PANEL, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
          {wordmark ? (
            <>
              <Image source={ICON_P} style={{ width: P * fit, height: P * fit, borderRadius: 9 * fit, marginRight: GAP * fit }} accessibilityIgnoresInvertColors />
              <Image source={mark} style={{ width: widthAt(mark, MARK_H) * fit, height: MARK_H * fit }} resizeMode="contain" accessibilityIgnoresInvertColors />
            </>
          ) : (
            <Text
              style={[
                t.type.screenTitle,
                {
                  color: p.chrome[1],
                  textShadowColor: p.chromeEdge,
                  textShadowOffset: { width: 0, height: 1.4 },
                  textShadowRadius: 0.5,
                  paddingHorizontal: 6,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {title}
            </Text>
          )}
        </View>

        {left ? <Control side="left" icon={left.icon} label={left.label} onPress={left.on} glyph={p.glyph} /> : null}
        {right ? <Control side="right" icon={right.icon} label={right.label} onPress={right.on} glyph={p.glyph} /> : null}
      </View>
    </View>
  );
}

/** A control over its bezel: the glyph in chrome, sunk a shade while pressed. */
function Control({ side, icon, label, onPress, glyph }: { side: 'left' | 'right'; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; glyph: string }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        position: 'absolute',
        top: H / 2 - 22,
        [side]: PANEL / 2 - 22,
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? 'rgba(0,0,0,0.25)' : 'transparent',
      })}
    >
      <Ionicons name={icon} size={icon === 'person' ? 22 : 24} color={glyph} />
    </Pressable>
  );
}
