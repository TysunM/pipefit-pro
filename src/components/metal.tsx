import React, { useId } from 'react';
import { Image, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { svgId, type SvgPrefix } from './svgId';

// The metal
// ---------
// Every surface that is chrome rather than content is built from these five:
// a plate, a recess, a bezel, a lit strip and the grain. They are drawn with
// the SVG the app already ships, not with a gradient module, because a new
// native module would mean a new APK and these ride over the air.
//
// The rule they keep is the one in tokens.ts: the metal is all in the chrome.
// A figure never sits on a sheen — it sits down in a recess, flat and dark,
// where the contrast test measured it.

const GRAIN = require('../../assets/finish/brushed.png');

/** Mints this drawing's gradient ids. `role` is one character. */
export function useSvgIds(prefix: SvgPrefix): (role: string) => string {
  const uid = useId().replace(/[^A-Za-z0-9]/g, '');
  return (role) => svgId(prefix, uid, role);
}

/** The brushed grain, tiled behind whatever it is put in. */
export function Grain({ strength = 1 }: { strength?: number }) {
  const t = useTheme();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: t.finish.grainOpacity * strength }]}>
      <Image
        source={GRAIN}
        resizeMode="repeat"
        tintColor={t.finish.grain}
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
}

type Tone = 'metal' | 'copper' | 'slate';

/** The sheen and the lit edge, laid behind a plate's content. */
function Sheen({ tone, sunk }: { tone: Tone; sunk: boolean }) {
  const t = useTheme();
  const c = t.colors;
  const gid = useSvgIds('sheen');
  const [hi, lo] =
    tone === 'copper' ? [c.copperFillHi, c.copperFillLo] : tone === 'slate' ? [c.slateHi, c.slateLo] : [c.metalHi, c.metalLo];
  const edge = tone === 'copper' ? c.copperHi : tone === 'slate' ? c.onSlate : c.edgeHi;
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id={gid('a')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={sunk ? lo : hi} />
          <Stop offset="1" stopColor={sunk ? hi : lo} />
        </LinearGradient>
        <LinearGradient id={gid('b')} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={edge} stopOpacity={0} />
          <Stop offset="0.5" stopColor={edge} stopOpacity={tone === 'metal' ? 0.9 : 0.7} />
          <Stop offset="1" stopColor={edge} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gid('a')})`} />
      {sunk ? null : <Rect x="0" y="0" width="100%" height="1" fill={`url(#${gid('b')})`} />}
    </Svg>
  );
}

/**
 * A raised plate — a card, a button, a strip. Pressed, it sinks: the sheen
 * turns over, which is what a pushed plate looks like under a work light.
 */
export function Plate({
  children,
  style,
  tone = 'metal',
  sunk = false,
  radius,
}: {
  children?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  tone?: Tone;
  sunk?: boolean;
  radius?: number;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: radius ?? t.radius.lg,
          borderWidth: 1,
          borderColor: tone === 'copper' ? t.colors.copperLo : t.colors.edgeLo,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Sheen tone={tone} sunk={sunk} />
      {children}
    </View>
  );
}

/**
 * A recess — the panel a figure or a drawing sits down inside. Flat, dark and
 * shaded at the top edge, the way a hole in a plate is.
 */
export function Well({
  children,
  style,
  radius,
  trim = false,
}: {
  children?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  radius?: number;
  /** A copper frame round it — for the one display on a screen that matters. */
  trim?: boolean;
}) {
  const t = useTheme();
  const gid = useSvgIds('well');
  const shade = t.mode === 'dark' ? '#000000' : '#5A4630';
  return (
    <View
      style={[
        {
          backgroundColor: t.colors.well,
          borderRadius: radius ?? t.radius.md,
          borderWidth: trim ? 1.5 : 1,
          borderColor: trim ? t.colors.copper : t.colors.wellEdge,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id={gid('a')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={shade} stopOpacity={t.mode === 'dark' ? 0.55 : 0.14} />
            <Stop offset="1" stopColor={shade} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="10" fill={`url(#${gid('a')})`} />
      </Svg>
      {children}
    </View>
  );
}

/**
 * The lit strip. Decoration only: it marks where the eye should land and never
 * carries a meaning a colour-blind fitter would miss.
 */
export function GlowBar({ width = 56, style }: { width?: number; style?: ViewStyle }) {
  const t = useTheme();
  const gid = useSvgIds('glow');
  const h = 12;
  return (
    <View pointerEvents="none" style={[{ width, height: h, alignSelf: 'center' }, style]}>
      <Svg width={width} height={h}>
        <Defs>
          <RadialGradient id={gid('a')} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={t.colors.glow} stopOpacity={t.mode === 'dark' ? 0.55 : 0.35} />
            <Stop offset="1" stopColor={t.colors.glow} stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id={gid('b')} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={t.colors.glow} stopOpacity={0.2} />
            <Stop offset="0.5" stopColor={t.colors.glow} stopOpacity={1} />
            <Stop offset="1" stopColor={t.colors.glow} stopOpacity={0.2} />
          </LinearGradient>
        </Defs>
        <Ellipse cx={width / 2} cy={h / 2} rx={width / 2} ry={h / 2} fill={`url(#${gid('a')})`} />
        <Rect x={width * 0.12} y={h / 2 - 1.25} width={width * 0.76} height={2.5} rx={1.25} fill={`url(#${gid('b')})`} />
      </Svg>
    </View>
  );
}

/**
 * A header control: a plain icon in a forty-point hit box. The ring it used to
 * sit in is gone — the reference draws them bare — but the box stays, because
 * a gloved thumb finds forty points where it never found a twenty-two point
 * glyph.
 */
export function Bezel({
  icon,
  onPress,
  label,
  size = 40,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
  size?: number;
}) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label}>
      {({ pressed }) => (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? t.colors.bgSubtle : 'transparent',
          }}
        >
          <Ionicons name={icon} size={24} color={t.colors.chrome} />
        </View>
      )}
    </Pressable>
  );
}
