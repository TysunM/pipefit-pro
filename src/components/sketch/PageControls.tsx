import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Line, Polygon, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { CORNER_TITLE, Corner, toScreen } from '../../calc/iso';

/**
 * The compass: north and east as they lie on the page from this corner, so
 * a man knows which way he is looking before he reads a single line.
 */
export function Compass({ corner, size = 64 }: { corner: Corner; size?: number }) {
  const t = useTheme();
  const c = size / 2;
  const r = size * 0.34;
  const n = toScreen([0, 1, 0], corner, 1);
  const e = toScreen([1, 0, 0], corner, 1);
  const tip = (d: [number, number], k = 1): [number, number] => [c + d[0] * r * k, c + d[1] * r * k];
  const head = (d: [number, number]) => {
    const [x, y] = tip(d);
    const [bx, by] = tip(d, 0.72);
    const px = -d[1] * 3.2;
    const py = d[0] * 3.2;
    return `${x},${y} ${bx + px},${by + py} ${bx - px},${by - py}`;
  };
  return (
    <View
      pointerEvents="none"
      accessibilityLabel={`Compass. ${CORNER_TITLE[corner]}.`}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.colors.bgRaised, borderWidth: 1, borderColor: t.colors.border, opacity: 0.94 }}
    >
      <Svg width={size} height={size}>
        <Line x1={c} y1={c} x2={tip(e)[0]} y2={tip(e)[1]} stroke={t.colors.textFaint} strokeWidth={1.5} />
        <SvgText x={tip(e, 1.42)[0]} y={tip(e, 1.42)[1] + 3.5} fontFamily={t.font.sans} fontSize={10} fontWeight="700" fill={t.colors.textFaint} textAnchor="middle">
          E
        </SvgText>
        <Line x1={c} y1={c} x2={tip(n)[0]} y2={tip(n)[1]} stroke={t.colors.accent} strokeWidth={2} />
        <Polygon points={head(n)} fill={t.colors.accent} />
        <SvgText x={tip(n, 1.42)[0]} y={tip(n, 1.42)[1] + 3.5} fontFamily={t.font.sans} fontSize={11} fontWeight="700" fill={t.colors.accent} textAnchor="middle">
          N
        </SvgText>
      </Svg>
    </View>
  );
}

/**
 * The pad. Left and right turn the page a quarter to the next corner, up
 * and down zoom, the middle fits the whole drawing on the screen.
 */
export function PagePad({
  onTurn,
  onZoom,
  onFit,
}: {
  onTurn: (by: 1 | -1) => void;
  onZoom: (factor: number) => void;
  onFit: () => void;
}) {
  const t = useTheme();
  const b = 40;
  const Key = ({ icon, label, onPress, x, y }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; x: number; y: number }) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={2}
      style={({ pressed }) => ({
        position: 'absolute',
        left: x * b,
        top: y * b,
        width: b,
        height: b,
        borderRadius: b / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? t.colors.primary : t.colors.bgRaised,
        borderWidth: 1,
        borderColor: t.colors.border,
      })}
    >
      {({ pressed }) => <Ionicons name={icon} size={20} color={pressed ? t.colors.onPrimary : t.colors.text} />}
    </Pressable>
  );
  return (
    <View style={{ width: b * 3, height: b * 3 }} accessibilityLabel="Page controls">
      <Key icon="chevron-up" label="Zoom in" onPress={() => onZoom(1.25)} x={1} y={0} />
      <Key icon="chevron-back" label="Turn the page left" onPress={() => onTurn(-1)} x={0} y={1} />
      <Key icon="scan-outline" label="Fit the drawing to the screen" onPress={onFit} x={1} y={1} />
      <Key icon="chevron-forward" label="Turn the page right" onPress={() => onTurn(1)} x={2} y={1} />
      <Key icon="chevron-down" label="Zoom out" onPress={() => onZoom(1 / 1.25)} x={1} y={2} />
    </View>
  );
}

export function CornerLabel({ corner }: { corner: Corner }) {
  const t = useTheme();
  return <Text style={[t.type.labelSmall, { color: t.colors.textMuted }]}>{CORNER_TITLE[corner]}</Text>;
}
