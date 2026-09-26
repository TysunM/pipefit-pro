import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import type { ToolRoute } from '../navigation/groups';
import { TileArt, TILE_ART_BOX } from './TileArt';
import { useSvgIds } from './metal';
import { clip } from '../calc/iso';

// The front-page drawings
// -----------------------
// The big tiles carry an illustration of the thing itself — the calculator,
// the handbook, the level lying on a pipe, the flange with its bolts numbered
// — in white line with one colour picked out in the action orange. They are
// drawn rather than taken from an icon font so every one sits at the same
// weight, in the same box, and turns with the theme.
//
// The calculations keep the schematics in TileArt: a small tile is read by
// the shape of the geometry it solves, and those drawings are that geometry.

const W = 80;
const H = 64;

type Ink = { line: string; soft: string; accent: string; onAccent: string; plate: string; font: string };


const art: Partial<Record<ToolRoute, (k: Ink) => React.ReactNode>> = {
  Calculator: (k) => (
    <G fill="none" strokeLinecap="round" strokeLinejoin="round">
      <Rect x={20} y={4} width={40} height={56} rx={5} stroke={k.line} strokeWidth={2.4} />
      <Rect x={26} y={10} width={28} height={9} rx={2} stroke={k.line} strokeWidth={1.8} />
      <Line x1={40} y1={24} x2={40} y2={56} stroke={k.line} strokeWidth={1.6} />
      <Line x1={24} y1={39.5} x2={56} y2={39.5} stroke={k.line} strokeWidth={1.6} />
      <Path d="M26.5 28.5 L33.5 35.5 M33.5 28.5 L26.5 35.5" stroke={k.accent} strokeWidth={2.2} />
      <Line x1={45.5} y1={32} x2={54.5} y2={32} stroke={k.line} strokeWidth={2.2} />
      <Circle cx={27} cy={44.5} r={1.7} stroke={k.accent} strokeWidth={1.6} />
      <Circle cx={33} cy={51.5} r={1.7} stroke={k.accent} strokeWidth={1.6} />
      <Line x1={33.5} y1={43.5} x2={26.5} y2={52.5} stroke={k.accent} strokeWidth={1.8} />
      <Rect x={43} y={42.5} width={14} height={13} rx={2.5} fill={k.accent} />
      <Path d="M46.5 47 H53.5 M46.5 51 H53.5" stroke={k.onAccent} strokeWidth={1.9} />
    </G>
  ),

  Reference: (k) => (
    <G fill="none" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 8 L18 12 V60 H52 L56 56" stroke={k.line} strokeWidth={2.2} />
      <Rect x={22} y={4} width={36} height={52} rx={2.5} stroke={k.line} strokeWidth={2.4} />
      <Line x1={28} y1={4} x2={28} y2={56} stroke={k.line} strokeWidth={1.6} />
      <Path d="M33 15 H42 A10 10 0 0 1 52 25 V42" stroke={k.line} strokeWidth={1.8} />
      <Path d="M33 22 H42 A3 3 0 0 1 45 25 V42" stroke={k.line} strokeWidth={1.8} />
      <Path d="M33 15 V22 M45 42 H52" stroke={k.line} strokeWidth={1.8} />
      <Path d="M36 47 H50" stroke={k.soft} strokeWidth={1.4} strokeDasharray="2.5 2.5" />
      {[12, 21, 30].map((y) => (
        <Rect key={y} x={58.5} y={y} width={4} height={6} rx={1.2} fill={k.accent} />
      ))}
    </G>
  ),

  Level: (k) => (
    <G fill="none" strokeLinecap="round" strokeLinejoin="round">
      <Line x1={6} y1={58} x2={74} y2={58} stroke={k.soft} strokeWidth={1.4} strokeDasharray="4 3" />
      <Line x1={6} y1={52} x2={74} y2={40} stroke={k.line} strokeWidth={3.2} />
      <G transform="rotate(-10 40 46)">
        <Rect x={14} y={31.5} width={52} height={13} rx={3} stroke={k.line} strokeWidth={2.4} />
        <Rect x={33.5} y={34.5} width={15} height={7} rx={3.5} stroke={k.accent} strokeWidth={1.8} />
        <Circle cx={43} cy={38} r={2} fill={k.accent} />
        <Line x1={23} y1={35} x2={23} y2={41} stroke={k.line} strokeWidth={1.4} />
        <Line x1={57} y1={35} x2={57} y2={41} stroke={k.line} strokeWidth={1.4} />
      </G>
    </G>
  ),

  OrderSheet: (k) => (
    <G fill="none" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M31 8 H22 A4 4 0 0 0 18 12 V56 A4 4 0 0 0 22 60 H48 L60 48 V12 A4 4 0 0 0 56 8 H47" stroke={k.line} strokeWidth={2.4} />
      <Rect x={31} y={4} width={16} height={8} rx={2} stroke={k.line} strokeWidth={2.2} />
      <Path d="M48 60 V51 A3 3 0 0 1 51 48 H60 Z" fill={k.accent} stroke={k.accent} strokeWidth={1.4} />
      {[22, 29, 36].map((y) => (
        <Line key={y} x1={26} y1={y} x2={52} y2={y} stroke={k.accent} strokeWidth={2.2} />
      ))}
      <Line x1={26} y1={43} x2={40} y2={43} stroke={k.accent} strokeWidth={2.2} />
    </G>
  ),

  SpoolBuilder: (k) => {
    const bolts = [0, 60, 120, 180, 240, 300].map((a) => {
      const r = (a * Math.PI) / 180;
      return [58 + 3.6 * Math.cos(r), 28 + 13 * Math.sin(r)];
    });
    return (
      <G fill="none" strokeLinecap="round" strokeLinejoin="round">
        <Ellipse cx={22} cy={28} rx={6} ry={17} stroke={k.line} strokeWidth={2.2} />
        <Path d="M22 19 H58 M22 37 H58" stroke={k.line} strokeWidth={2.2} />
        <Ellipse cx={58} cy={28} rx={6.5} ry={18} stroke={k.line} strokeWidth={2.4} />
        <Path d="M58 10 A6.5 18 0 0 1 58 46" stroke={k.line} strokeWidth={1.2} transform="translate(3.5 0)" />
        <Ellipse cx={58} cy={28} rx={2.6} ry={8} stroke={k.line} strokeWidth={1.6} />
        {bolts.map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r={1.3} fill={k.accent} />
        ))}
        <Path d="M16 52 Q40 63 64 52" stroke={k.line} strokeWidth={2} />
        <Path d="M59.5 49.5 L64 52 L60 56" stroke={k.line} strokeWidth={2} />
        <Path d="M20.5 49.5 L16 52 L20 56" stroke={k.line} strokeWidth={2} />
      </G>
    );
  },

  Joints: (k) => (
    <G fill="none" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 4 H45 L55 14 V60 H20 Z" stroke={k.line} strokeWidth={2.4} />
      <Path d="M45 4 V14 H55" stroke={k.line} strokeWidth={2} />
      {[17, 27, 37].map((y, i) => (
        <G key={y}>
          <Rect x={25} y={y - 3.5} width={7} height={7} rx={1.5} stroke={k.line} strokeWidth={1.6} />
          <Line x1={36} y1={y} x2={i === 2 ? 42 : 48} y2={y} stroke={k.line} strokeWidth={1.8} />
          {i < 2 ? <Path d={`M26.6 ${y} L28.3 ${y + 1.8} L31 ${y - 1.9}`} stroke={k.accent} strokeWidth={1.6} /> : null}
        </G>
      ))}
      <Circle cx={53} cy={48} r={11} fill={k.plate} stroke={k.accent} strokeWidth={2.4} />
      <Path d="M48 48 L51.5 51.5 L58 44.5" stroke={k.accent} strokeWidth={2.4} />
    </G>
  ),

  FlangeBoltUp: (k) => {
    // The first four of a cross pattern: top, bottom, then across.
    const seq: Record<number, string> = { 0: '1', 4: '2', 2: '3', 6: '4' };
    const holes = Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      return { i, x: 38 + 14 * Math.cos(a), y: 32 + 14 * Math.sin(a), lx: 38 + 25.5 * Math.cos(a), ly: 32 + 25.5 * Math.sin(a) };
    });
    return (
      <G fill="none" strokeLinecap="round" strokeLinejoin="round">
        <Circle cx={38} cy={32} r={20} stroke={k.line} strokeWidth={2.4} />
        <Circle cx={38} cy={32} r={7.5} stroke={k.line} strokeWidth={2.2} />
        {holes.map((h) => (
          <Circle key={h.i} cx={h.x} cy={h.y} r={2.8} stroke={seq[h.i] ? k.accent : k.line} strokeWidth={1.9} />
        ))}
        {holes
          .filter((h) => seq[h.i])
          .map((h) => (
            <SvgText
              key={`n${h.i}`}
              x={h.lx}
              y={h.ly + 3}
              fill={k.accent}
              stroke="none"
              fontSize={8.5}
              fontWeight="700"
              fontFamily={k.font}
              textAnchor="middle"
            >
              {seq[h.i]}
            </SvgText>
          ))}
      </G>
    );
  },

  Heats: (k) => (
    <G fill="none" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 4 H45 L55 14 V60 H20 Z" stroke={k.line} strokeWidth={2.4} />
      <Path d="M45 4 V14 H55" stroke={k.line} strokeWidth={2} />
      <SvgText x={24} y={16} fill={k.line} stroke="none" fontSize={7.5} fontWeight="700" fontFamily={k.font}>
        HEAT
      </SvgText>
      <Line x1={24} y1={22} x2={43} y2={22} stroke={k.soft} strokeWidth={1.6} />
      <Line x1={24} y1={27} x2={39} y2={27} stroke={k.soft} strokeWidth={1.6} />
      <Rect x={24} y={33} width={18} height={11} rx={1.5} stroke={k.line} strokeWidth={1.8} />
      <SvgText x={33} y={41.3} fill={k.line} stroke="none" fontSize={7} fontWeight="700" fontFamily={k.font} textAnchor="middle">
        MTR
      </SvgText>
      <Circle cx={53} cy={48} r={11} fill={k.plate} stroke={k.accent} strokeWidth={2.4} />
      <Circle cx={53} cy={45} r={3.2} stroke={k.accent} strokeWidth={2} />
      <Path d="M47.5 54.5 Q53 48.5 58.5 54.5" stroke={k.accent} strokeWidth={2} />
    </G>
  ),

  IsoSketch: (k) => {
    // Iso paper: two families of lines at thirty degrees, cut to the sheet.
    const t30 = Math.tan(Math.PI / 6);
    const sheet = { x0: 8, y0: 6, x1: 72, y1: 58 };
    const grid: string[] = [];
    for (let c = -60; c <= 110; c += 9) {
      for (const slope of [t30, -t30]) {
        const seg = clip(0, c, 80, c + 80 * slope, sheet);
        if (seg) grid.push(`M${seg[0].toFixed(2)} ${seg[1].toFixed(2)} L${seg[2].toFixed(2)} ${seg[3].toFixed(2)}`);
      }
    }
    return (
      <G fill="none" strokeLinecap="round" strokeLinejoin="round">
        <Path d={grid.join(' ')} stroke={k.soft} strokeWidth={0.8} opacity={0.55} />
        <Rect x={8} y={6} width={64} height={52} rx={3} stroke={k.line} strokeWidth={2.2} />
        <Path d="M18 46 L33 37.3 V23 L51 33.4 L63 26.5" stroke={k.line} strokeWidth={2.8} />
        {[
          [18, 46],
          [33, 37.3],
          [33, 23],
          [51, 33.4],
          [63, 26.5],
        ].map(([x, y]) => (
          <Circle key={`${x}-${y}`} cx={x} cy={y} r={2.3} fill={k.accent} />
        ))}
      </G>
    );
  },
};

/**
 * One tool's front-page drawing, `height` points tall. A tool with no
 * illustration falls back to its schematic, so every tile has a picture.
 */
export function ToolArt({ route, height = 76 }: { route: ToolRoute; height?: number }) {
  const t = useTheme();
  const draw = art[route];
  if (!draw) {
    const s = height / TILE_ART_BOX.height;
    return <TileArt route={route} size={s} />;
  }
  const ink: Ink = {
    line: t.colors.text,
    soft: t.colors.textFaint,
    accent: t.colors.copper,
    onAccent: t.colors.onCopper,
    plate: t.colors.metalLo,
    font: t.font.sans,
  };
  return (
    <Svg width={(W * height) / H} height={height} viewBox={`0 0 ${W} ${H}`}>
      {draw(ink)}
    </Svg>
  );
}

/**
 * The spool in the project card: a flanged length of pipe, shaded, seen from
 * the end — the thing every figure on the page is worked for.
 */
export function SpoolThumb({ size = 72 }: { size?: number }) {
  const id = useSvgIds('spool');
  const holes = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    return [28 + 10.5 * Math.cos(a), 44 + 19.5 * Math.sin(a)];
  });
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Defs>
        <LinearGradient id={id('a')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8E97A2" />
          <Stop offset="0.32" stopColor="#E3E8EE" />
          <Stop offset="0.62" stopColor="#7A838E" />
          <Stop offset="1" stopColor="#3A4048" />
        </LinearGradient>
        <RadialGradient id={id('b')} cx="42%" cy="38%" rx="62%" ry="62%">
          <Stop offset="0" stopColor="#56606B" />
          <Stop offset="1" stopColor="#1B2026" />
        </RadialGradient>
        <LinearGradient id={id('c')} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#D6DCE3" />
          <Stop offset="0.5" stopColor="#7C8591" />
          <Stop offset="1" stopColor="#3C434C" />
        </LinearGradient>
      </Defs>
      <Ellipse cx={54} cy={33} rx={10} ry={21} fill={`url(#${id('b')})`} stroke="#6D7580" strokeWidth={1.2} />
      <Path d="M28 33 L54 23 V43 L28 55 Z" fill={`url(#${id('a')})`} />
      <Ellipse cx={28} cy={44} rx={14} ry={26} fill={`url(#${id('b')})`} stroke={`url(#${id('c')})`} strokeWidth={2.4} />
      <Ellipse cx={28} cy={44} rx={7.5} ry={14} fill="#2A3037" stroke="#7B838E" strokeWidth={1.1} />
      <Ellipse cx={28} cy={44} rx={4.4} ry={8.4} fill="#07090C" />
      {holes.map(([x, y], i) => (
        <Ellipse key={i} cx={x} cy={y} rx={1.3} ry={2.1} fill="#0B0E12" stroke="#6B737D" strokeWidth={0.6} />
      ))}
    </Svg>
  );
}
