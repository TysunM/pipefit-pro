import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Line, Polygon, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { Corner, Flip, NO_FLIP, flipPt, toScreen } from '../../calc/iso';
import { flipWords } from '../../state/sketchStore';

/**
 * The compass: north and east as they lie on the sheet, turned over with it,
 * so it reads the drawing the way the drawing is showing.
 */
export function Compass({ corner, flip = NO_FLIP, size = 64 }: { corner: Corner; flip?: Flip; size?: number }) {
  const t = useTheme();
  const c = size / 2;
  const r = size * 0.34;
  const n = flipPt(toScreen([0, 1, 0], corner, 1), flip);
  const e = flipPt(toScreen([1, 0, 0], corner, 1), flip);
  const tip = (d: [number, number], k = 1): [number, number] => [c + d[0] * r * k, c + d[1] * r * k];
  const head = (d: [number, number]) => {
    const [x, y] = tip(d);
    const [bx, by] = tip(d, 0.72);
    const px = -d[1] * 3.2;
    const py = d[0] * 3.2;
    return `${x},${y} ${bx + px},${by + py} ${bx - px},${by - py}`;
  };
  const words = flipWords(flip);
  return (
    <View
      pointerEvents="none"
      accessibilityLabel={`Compass${words ? `, sheet ${words.toLowerCase()}` : ''}.`}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.colors.bgRaised, borderWidth: 1, borderColor: t.colors.border, opacity: 0.94 }}
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
}

/**
 * The bar under the paper. Up and down turn the sheet over top to bottom, left
 * and right turn it over side to side; a second press turns it back. Minus,
 * fit and plus zoom. Nothing here changes what was drawn, only how it lies,
 * and none of it sits on the paper where it would cover a line.
 */
export function PageBar({
  flip,
  onFlipUp,
  onMirror,
  onZoom,
  onFit,
}: {
  flip: Flip;
  onFlipUp: () => void;
  onMirror: () => void;
  onZoom: (factor: number) => void;
  onFit: () => void;
}) {
  const t = useTheme();
  const Key = ({ icon, label, onPress, on = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; on?: boolean }) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      hitSlop={3}
      style={({ pressed }) => ({
        flex: 1,
        maxWidth: 52,
        height: 44,
        borderRadius: t.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? t.colors.primary : on ? t.colors.accentSoft : t.colors.bgRaised,
        borderWidth: 1,
        borderColor: on ? t.colors.accent : t.colors.border,
      })}
    >
      {({ pressed }) => <Ionicons name={icon} size={21} color={pressed ? t.colors.onPrimary : on ? t.colors.accent : t.colors.text} />}
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityLabel="Sheet controls">
      <Key icon="chevron-up" label={flip.upside ? 'Turn the sheet right side up' : 'Turn the sheet upside down'} onPress={onFlipUp} on={flip.upside} />
      <Key icon="chevron-down" label={flip.upside ? 'Turn the sheet right side up' : 'Turn the sheet upside down'} onPress={onFlipUp} on={flip.upside} />
      <Key icon="chevron-back" label={flip.mirror ? 'Turn the sheet back, unmirrored' : 'Mirror the sheet left for right'} onPress={onMirror} on={flip.mirror} />
      <Key icon="chevron-forward" label={flip.mirror ? 'Turn the sheet back, unmirrored' : 'Mirror the sheet left for right'} onPress={onMirror} on={flip.mirror} />
      <View style={{ width: 6 }} />
      <Key icon="remove" label="Zoom out" onPress={() => onZoom(1 / 1.25)} />
      <Key icon="scan-outline" label="Fit the drawing to the screen" onPress={onFit} />
      <Key icon="add" label="Zoom in" onPress={() => onZoom(1.25)} />
    </View>
  );
}

/** How the sheet lies, in words, under the drawing. */
export function FlipLabel({ flip }: { flip: Flip }) {
  const t = useTheme();
  const words = flipWords(flip);
  return <Text style={[t.type.labelSmall, { color: words ? t.colors.accent : t.colors.textMuted }]}>{words || 'As drawn'}</Text>;
}
