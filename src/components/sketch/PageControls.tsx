import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Line, Polygon, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { Corner, Flip, NO_FLIP, Pt, flipPt, rotPt, toScreen, turnDegrees } from '../../calc/iso';
import { flipWords } from '../../state/sketchStore';

/**
 * The compass: north and east as they lie on the sheet, turned over and
 * turned round with it, so it reads the drawing the way the drawing is
 * showing. With `onSquare`, tapping it squares the sheet up again.
 */
export function Compass({
  corner,
  flip = NO_FLIP,
  rot = 0,
  size = 64,
  onSquare,
}: {
  corner: Corner;
  flip?: Flip;
  /** How far the sheet is turned on the desk, in radians. */
  rot?: number;
  size?: number;
  onSquare?: () => void;
}) {
  const t = useTheme();
  const c = size / 2;
  const r = size * 0.34;
  const n = rotPt(flipPt(toScreen([0, 1, 0], corner, 1), flip), rot);
  const e = rotPt(flipPt(toScreen([1, 0, 0], corner, 1), flip), rot);
  const tip = (d: Pt, k = 1): Pt => [c + d[0] * r * k, c + d[1] * r * k];
  const head = (d: Pt) => {
    const [x, y] = tip(d);
    const [bx, by] = tip(d, 0.72);
    const px = -d[1] * 3.2;
    const py = d[0] * 3.2;
    return `${x},${y} ${bx + px},${by + py} ${bx - px},${by - py}`;
  };
  const words = flipWords(flip);
  const turned = turnDegrees(rot) !== 0;
  const face = (
    <View
      pointerEvents="none"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.colors.bgRaised, borderWidth: 1, borderColor: turned ? t.colors.accent : t.colors.border, opacity: 0.94 }}
    >
      <Svg width={size} height={size}>
        <Line x1={c} y1={c} x2={tip(e)[0]} y2={tip(e)[1]} stroke={t.colors.textFaint} strokeWidth={1.5} />
        <SvgText x={tip(e, 1.42)[0]} y={tip(e, 1.42)[1] + 3.5} fontFamily={t.font.sans} fontSize={10} fontWeight={t.fontsLoaded ? undefined : '700'} fill={t.colors.textFaint} textAnchor="middle">
          E
        </SvgText>
        <Line x1={c} y1={c} x2={tip(n)[0]} y2={tip(n)[1]} stroke={t.colors.accent} strokeWidth={2} />
        <Polygon points={head(n)} fill={t.colors.accent} />
        <SvgText x={tip(n, 1.42)[0]} y={tip(n, 1.42)[1] + 3.5} fontFamily={t.font.sans} fontSize={11} fontWeight={t.fontsLoaded ? undefined : '700'} fill={t.colors.accent} textAnchor="middle">
          N
        </SvgText>
      </Svg>
    </View>
  );
  const label = `Compass${words ? `, sheet ${words.toLowerCase()}` : ''}${turned ? `, turned ${turnDegrees(rot)} degrees` : ''}.`;
  if (!onSquare) return <View accessibilityLabel={label}>{face}</View>;
  return (
    <Pressable
      onPress={onSquare}
      accessibilityRole="button"
      accessibilityLabel={`${label} Square the sheet up.`}
      hitSlop={6}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {face}
    </Pressable>
  );
}

/**
 * A key that sits on the paper, in a corner, over the drawing: round-cornered,
 * nearly opaque so a line under it does not read through as part of it.
 */
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
        opacity: 0.96,
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
