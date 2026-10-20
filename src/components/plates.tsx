import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useSvgIds } from './metal';

// The screwed-down plates
// -----------------------
// The front page is drawn as a machine's nameplates: brushed steel plates
// screwed to the wall, a dark plate in a steel bezel for the job, a copper
// plate for the one button. These are those surfaces. Each is drawn as an
// SVG at the size its box measures, the way the shop wall is (Workshop.tsx),
// because Android sizes a percentage SVG once, before the layout settles,
// and leaves it short; a measured size cannot come out short.
//
// The content sits over the drawing, inside the margin the screws take.

type Box = { w: number; h: number };

/** A plate's colours: the band, its seams, the screws and the lettering on it. The header's and the tab bar's. */
export type Plate = {
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

/** The plates by theme: brushed dark steel for the slate theme, light steel for daylight. */
export const PLATE = { dark: DARK, light: LIGHT } as const;


/** The size a view measures, for drawing to. */
export function useBox(): [Box | null, (e: LayoutChangeEvent) => void] {
  const [box, setBox] = useState<Box | null>(null);
  return [
    box,
    (e) => {
      const { width, height } = e.nativeEvent.layout;
      // A box can measure empty before its content has: nothing is drawn at that size.
      if (width < 4 || height < 4) return;
      if (!box || box.w !== width || box.h !== height) setBox({ w: width, h: height });
    },
  ];
}

/** A Phillips screw head. */
export function Screw({ cx, cy, face, ring, slot, r = 4.2 }: { cx: number; cy: number; face: string; ring: string; slot: string; r?: number }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r + 0.9} fill={ring} />
      <Circle cx={cx} cy={cy} r={r} fill={face} />
      <Line x1={cx - r * 0.55} y1={cy} x2={cx + r * 0.55} y2={cy} stroke={slot} strokeWidth={1.1} />
      <Line x1={cx} y1={cy - r * 0.55} x2={cx} y2={cy + r * 0.55} stroke={slot} strokeWidth={1.1} />
    </G>
  );
}

export const corners = (w: number, h: number, inset: number): [number, number][] => [
  [inset, inset],
  [w - inset, inset],
  [inset, h - inset],
  [w - inset, h - inset],
];

/** Brushed steel, screwed at the corners: a stat plate. */
export function SteelPlate({ children, style, radius = 10, inset = 9 }: { children?: React.ReactNode; style?: ViewStyle; radius?: number; inset?: number }) {
  const [box, onLayout] = useBox();
  const gid = useSvgIds('steel');
  return (
    <View style={[{ overflow: 'hidden' }, style]} onLayout={onLayout}>
      {box ? (
        <Svg width={box.w} height={box.h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id={gid('a')} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#eef0f3" />
              <Stop offset="0.5" stopColor="#b9bfc7" />
              <Stop offset="1" stopColor="#d3d8de" />
            </LinearGradient>
            <RadialGradient id={gid('b')} cx="38%" cy="35%" rx="65%" ry="65%">
              <Stop offset="0" stopColor="#f6f7f9" />
              <Stop offset="1" stopColor="#9aa0a8" />
            </RadialGradient>
          </Defs>
          <Rect x={0.5} y={0.5} width={box.w - 1} height={box.h - 1} rx={radius} fill={`url(#${gid('a')})`} stroke="#5c626a" strokeWidth={1} />
          <Rect x={1.5} y={1.5} width={box.w - 3} height={box.h - 3} rx={radius - 1} fill="none" stroke="#ffffff" strokeOpacity={0.55} strokeWidth={1} />
          {[0.3, 0.55, 0.8].map((f) => (
            <Rect key={f} x={2} y={box.h * f} width={box.w - 4} height={1} fill="#000000" opacity={0.05} />
          ))}
          {corners(box.w, box.h, inset).map(([cx, cy]) => (
            <Screw key={`${cx}-${cy}`} cx={cx} cy={cy} face={`url(#${gid('b')})`} ring="#4a5058" slot="#6b7179" r={3.1} />
          ))}
        </Svg>
      ) : null}
      {children}
    </View>
  );
}

/** A dark plate in a steel bezel, screwed at the corners: the job's card. */
export function DarkPlate({ children, style, radius = 16 }: { children?: React.ReactNode; style?: ViewStyle; radius?: number }) {
  const [box, onLayout] = useBox();
  const gid = useSvgIds('dark');
  const rim = 6;
  return (
    <View style={[{ overflow: 'hidden' }, style]} onLayout={onLayout}>
      {box ? (
        <Svg width={box.w} height={box.h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id={gid('a')} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#e9ecf0" />
              <Stop offset="0.5" stopColor="#aab0b8" />
              <Stop offset="1" stopColor="#cfd4da" />
            </LinearGradient>
            <LinearGradient id={gid('c')} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#262b31" />
              <Stop offset="1" stopColor="#15181d" />
            </LinearGradient>
            <RadialGradient id={gid('b')} cx="38%" cy="35%" rx="65%" ry="65%">
              <Stop offset="0" stopColor="#f6f7f9" />
              <Stop offset="1" stopColor="#9aa0a8" />
            </RadialGradient>
          </Defs>
          <Rect x={0.5} y={0.5} width={box.w - 1} height={box.h - 1} rx={radius} fill={`url(#${gid('a')})`} stroke="#4f555d" strokeWidth={1} />
          <Rect x={rim} y={rim} width={box.w - 2 * rim} height={box.h - 2 * rim} rx={radius - 5} fill={`url(#${gid('c')})`} stroke="#0b0d10" strokeWidth={1} />
          <Rect x={rim + 1} y={rim + 1} width={box.w - 2 * rim - 2} height={box.h - 2 * rim - 2} rx={radius - 6} fill="none" stroke="#ffffff" strokeOpacity={0.08} strokeWidth={1} />
          {corners(box.w, box.h, rim + 10).map(([cx, cy]) => (
            <Screw key={`${cx}-${cy}`} cx={cx} cy={cy} face={`url(#${gid('b')})`} ring="#0c0e11" slot="#4b5158" r={4.4} />
          ))}
        </Svg>
      ) : null}
      {children}
    </View>
  );
}

/** A copper plate screwed into a steel one: the one button on the front page. */
export function CopperPlate({ children, style, sunk = false, radius = 12 }: { children?: React.ReactNode; style?: ViewStyle; sunk?: boolean; radius?: number }) {
  const [box, onLayout] = useBox();
  const gid = useSvgIds('plate');
  const rim = 5;
  return (
    <View style={[{ overflow: 'hidden' }, style]} onLayout={onLayout}>
      {box ? (
        <Svg width={box.w} height={box.h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id={gid('a')} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#e6e9ed" />
              <Stop offset="0.5" stopColor="#a6acb4" />
              <Stop offset="1" stopColor="#c9ced4" />
            </LinearGradient>
            <LinearGradient id={gid('c')} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={sunk ? '#d9821f' : '#f9ab42'} />
              <Stop offset="0.55" stopColor={sunk ? '#bf6512' : '#e4801c'} />
              <Stop offset="1" stopColor={sunk ? '#a85608' : '#cc6a10'} />
            </LinearGradient>
            <RadialGradient id={gid('b')} cx="38%" cy="35%" rx="65%" ry="65%">
              <Stop offset="0" stopColor="#f6f7f9" />
              <Stop offset="1" stopColor="#9aa0a8" />
            </RadialGradient>
          </Defs>
          <Rect x={0.5} y={0.5} width={box.w - 1} height={box.h - 1} rx={radius} fill={`url(#${gid('a')})`} stroke="#4f555d" strokeWidth={1} />
          <Rect x={rim} y={rim} width={box.w - 2 * rim} height={box.h - 2 * rim} rx={radius - 4} fill={`url(#${gid('c')})`} stroke="#5a2e08" strokeWidth={1} />
          <Rect x={rim + 1} y={rim + 1} width={box.w - 2 * rim - 2} height={box.h - 2 * rim - 2} rx={radius - 5} fill="none" stroke="#ffe2b5" strokeOpacity={sunk ? 0.15 : 0.45} strokeWidth={1} />
          {corners(box.w, box.h, rim + 6).map(([cx, cy]) => (
            <Screw key={`${cx}-${cy}`} cx={cx} cy={cy} face={`url(#${gid('b')})`} ring="#3d2208" slot="#6b7179" r={3} />
          ))}
        </Svg>
      ) : null}
      {children}
    </View>
  );
}
