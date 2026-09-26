import React, { useId } from 'react';
import { Pressable, View, ViewStyle } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { svgId, type SvgPrefix } from './svgId';

// The surfaces
// ------------
// Every surface that is chrome rather than content is one of these: a plate,
// a recess, a bezel and a lit strip.
//
// They are flat. Each is one solid colour with a hairline edge, and a plate
// has its top edge a shade lighter so it reads as raised. They used to carry
// an SVG gradient laid over them at 100% width; on Android that layer was
// sized once, before the flex layout settled, so it stopped short and left a
// dark band down the right of every button and tile. A solid fill cannot come
// out short, and it reads more cleanly in the sun than a sheen did.

/** Mints this drawing's gradient ids. `role` is one character. */
export function useSvgIds(prefix: SvgPrefix): (role: string) => string {
  const uid = useId().replace(/[^A-Za-z0-9]/g, '');
  return (role) => svgId(prefix, uid, role);
}

type Tone = 'metal' | 'copper' | 'slate';

/**
 * A raised plate — a card, a button, a strip. One flat colour, its top edge a
 * shade lighter. Pressed, it drops to the darker shade of the same colour.
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
  const c = t.colors;
  const face =
    tone === 'copper'
      ? { up: c.copperFill, down: c.copperFillLo, edge: c.copperFill, lit: c.copperFill }
      : tone === 'slate'
        ? { up: c.slateHi, down: c.slateLo, edge: c.slateLo, lit: c.slateHi }
        : { up: c.metalHi, down: c.metalLo, edge: c.edgeLo, lit: c.edgeHi };
  return (
    <View
      style={[
        {
          backgroundColor: sunk ? face.down : face.up,
          borderRadius: radius ?? t.radius.lg,
          borderWidth: 1,
          borderColor: face.edge,
          borderTopColor: sunk ? face.edge : face.lit,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * A recess — the panel a figure or a drawing sits down inside. Flat and dark,
 * its top edge the shadowed one, the way a hole in a plate is.
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
  return (
    <View
      style={[
        {
          backgroundColor: t.colors.well,
          borderRadius: radius ?? t.radius.md,
          borderWidth: trim ? 1.5 : 1,
          borderColor: trim ? t.colors.copper : t.colors.wellEdge,
          // A recess is lit from above like a plate, so its shadowed edge is the top one.
          borderTopColor: trim ? t.colors.copper : t.colors.edgeLo,
          overflow: 'hidden',
        },
        style,
      ]}
    >
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
