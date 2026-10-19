import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, ClipPath, Defs, G, Image as SvgImage, Line, LinearGradient, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
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
// It is drawn as one SVG at the window's width, which is known, so the
// Android trouble the flat plates were made to avoid (metal.tsx: a gradient
// sized by flex before the layout settled) does not arise: nothing here is
// sized by flex. The lettering is SVG text, because that is the only text
// the app can fill with a gradient on every platform; its width is taken
// off a hidden native Text set in the same face, so the mark sits centred.
// The controls are real Pressables over the drawing, with the forty-point
// hit box a gloved thumb needs.

const H = 64;
/** The end plates, with a control each. */
const PANEL = 72;
const RIVET = 4.2;
const INSET = 11;
/** The wordmark's P: the app icon, at a size the JS bundle can carry. */
const ICON_P = require('../../assets/wordmark-p.png');

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
  const face = t.type.screenTitle.fontFamily as string;
  const weight = (t.type.screenTitle.fontWeight ?? '700') as '700';

  const wordmark = title === 'PipeFit Pro';
  // The lettering's widths, measured off hidden native text in the same face.
  const [ipefit, setIpefit] = useState<number | null>(null);
  const [pro, setPro] = useState<number | null>(null);
  const [plain, setPlain] = useState<number | null>(null);

  const avail = w - 2 * PANEL - 16;
  const F = wordmark ? 31 : 22;
  const S = 40;
  const measured = wordmark ? (ipefit !== null && pro !== null ? S + 4 + ipefit + 9 + pro : null) : plain;
  const scale = measured !== null && measured > avail ? avail / measured : 1;
  const mid = w / 2;
  const base = H / 2 + 0.36 * F * scale;

  const rivets: [number, number][] = [];
  for (const [x0, x1] of [
    [0, PANEL],
    [PANEL, w - PANEL],
    [w - PANEL, w],
  ] as const)
    rivets.push([x0 + INSET, INSET], [x1 - INSET, INSET], [x0 + INSET, H - INSET], [x1 - INSET, H - INSET]);

  const left = onBack ? { icon: 'arrow-back' as const, label: 'Back', on: onBack } : onProfile ? { icon: 'person' as const, label: 'Your projects', on: onProfile } : null;
  const right = onSettings ? { icon: 'settings-sharp' as const, label: 'Settings', on: onSettings } : null;

  const measure = (set: (n: number) => void, text: string, size: number) => (
    <Text
      style={{ position: 'absolute', top: -200, left: 0, opacity: 0, fontFamily: face, fontWeight: weight, fontSize: size, letterSpacing: wordmark ? -0.6 : -0.2 }}
      onLayout={(e) => set(e.nativeEvent.layout.width)}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no"
    >
      {text}
    </Text>
  );

  return (
    <View style={{ paddingTop: insets.top, backgroundColor: p.low }} accessibilityRole="header" accessibilityLabel={title}>
      <View style={{ height: H, overflow: 'hidden' }}>
        {wordmark ? measure(setIpefit, 'ipeFit', F) : null}
        {wordmark ? measure(setPro, 'Pro', F) : null}
        {!wordmark ? measure(setPlain, title, F) : null}
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
            <LinearGradient id={gid('c')} x1="0" y1="0" x2="0" y2="1">
              {p.chrome.map((c, i) => (
                <Stop key={c + i} offset={[0, 0.44, 0.5, 0.58, 1][i]} stopColor={c} />
              ))}
            </LinearGradient>
            <LinearGradient id={gid('o')} x1="0" y1="0" x2="0" y2="1">
              {p.copper.map((c, i) => (
                <Stop key={c + i} offset={[0, 0.46, 0.56, 1][i]} stopColor={c} />
              ))}
            </LinearGradient>
            <ClipPath id={gid('k')}>
              <Rect x={mid - (measured ?? 0) * scale / 2} y={H / 2 - (S * scale) / 2} width={S * scale} height={S * scale} rx={9 * scale} />
            </ClipPath>
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

          {/* The lettering: a dark copy a hair below for the bevel, the chrome on top. */}
          {wordmark && measured !== null ? (
            <G>
              <SvgImage
                href={ICON_P}
                x={mid - (measured * scale) / 2}
                y={H / 2 - (S * scale) / 2}
                width={S * scale}
                height={S * scale}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${gid('k')})`}
              />
              {lettered(mid - (measured * scale) / 2 + (S + 4) * scale, base, 'ipeFit', F * scale, -0.6 * scale, `url(#${gid('c')})`, p.chromeEdge, face, weight)}
              {lettered(mid - (measured * scale) / 2 + (S + 4 + ipefit! + 9) * scale, base, 'Pro', F * scale, -0.6 * scale, `url(#${gid('o')})`, p.copperEdge, face, weight)}
            </G>
          ) : !wordmark ? (
            lettered(mid, base, title, F * scale, -0.2 * scale, `url(#${gid('c')})`, p.chromeEdge, face, weight, 'middle')
          ) : null}
        </Svg>

        {left ? <Control side="left" icon={left.icon} label={left.label} onPress={left.on} glyph={p.glyph} /> : null}
        {right ? <Control side="right" icon={right.icon} label={right.label} onPress={right.on} glyph={p.glyph} /> : null}
      </View>
    </View>
  );
}

/** Lettering with a bevel: the same text in the edge colour a little lower, then the metal over it. */
function lettered(x: number, y: number, text: string, size: number, spacing: number, fill: string, edge: string, face: string, weight: '700', anchor: 'start' | 'middle' = 'start') {
  const common = { x, textAnchor: anchor, fontFamily: face, fontWeight: weight, fontSize: size, letterSpacing: spacing } as const;
  return (
    <G>
      <SvgText {...common} y={y + 1.4} fill={edge} opacity={0.9}>
        {text}
      </SvgText>
      <SvgText {...common} y={y} fill={fill}>
        {text}
      </SvgText>
    </G>
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
