import React from 'react';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';

// What each tool looks like, before you open it
// ---------------------------------------------
// A list of thirteen tiles with an icon each is a list a man reads by title,
// and the titles are trade words that mean nearly the same thing until you
// already know the difference. Rolling offset and simple offset are the same
// two words in a different order.
//
// A drawing is not. A saddle over an obstruction and a segmented elbow cannot
// be confused at a glance, and the glance is all anybody gives a home screen.
// So every tile carries a schematic of the thing it solves, drawn from the
// same geometry the tool itself draws.
//
// They are line art on purpose — no fills, no shading, two weights and a
// dashed guide. At eighty pixels a rendered pipe is a grey smudge, and a
// drawing that has to be squinted at is worse than the icon it replaced.

const W = 88;
const H = 66;

/** The viewBox every tile is drawn in, so they sit at one visual weight. */
export const TILE_ART_BOX = { width: W, height: H };

type Ink = { line: string; guide: string; accent: string };

const art: Record<string, (k: Ink) => React.ReactNode> = {
  // A keypad, which is the only thing the calculator is.
  Calculator: (k) => (
    <G>
      <Rect x={22} y={8} width={44} height={14} rx={2} fill="none" stroke={k.line} strokeWidth={2} />
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <Rect
            key={`${r}${c}`}
            x={22 + c * 16}
            y={28 + r * 11}
            width={12}
            height={8}
            rx={1.5}
            fill="none"
            stroke={r === 2 && c === 2 ? k.accent : k.line}
            strokeWidth={r === 2 && c === 2 ? 2.2 : 1.4}
          />
        ))
      )}
    </G>
  ),

  // Rows of a table with its rule, which is what a handbook page is.
  Reference: (k) => (
    <G>
      <Rect x={18} y={10} width={52} height={46} rx={2.5} fill="none" stroke={k.line} strokeWidth={2} />
      <Line x1={18} y1={22} x2={70} y2={22} stroke={k.line} strokeWidth={2} />
      <Line x1={38} y1={10} x2={38} y2={56} stroke={k.guide} strokeWidth={1.2} />
      {[30, 38, 46].map((y) => (
        <Line key={y} x1={22} y1={y} x2={66} y2={y} stroke={k.guide} strokeWidth={1.2} />
      ))}
    </G>
  ),

  // The three leg spool everybody draws first, on the app's own isometric.
  SpoolBuilder: (k) => (
    <G>
      <Path d="M14 52 L38 44 L38 20 L64 12" fill="none" stroke={k.line} strokeWidth={3}
            strokeLinejoin="round" strokeLinecap="round" />
      <Path d="M14 52 L14 58 M64 12 L70 10" stroke={k.guide} strokeWidth={1.2} />
      <Circle cx={38} cy={44} r={2.4} fill={k.accent} />
      <Circle cx={38} cy={20} r={2.4} fill={k.accent} />
    </G>
  ),

  // Sticks on the rack, filled to different depths. The whole idea of the
  // order sheet is that some come back fuller than others.
  OrderSheet: (k) => (
    <G>
      {[
        [12, 62],
        [26, 48],
        [40, 58],
      ].map(([y, w], i) => (
        <G key={y}>
          <Rect x={13} y={y} width={62} height={9} rx={1.5} fill="none" stroke={k.line} strokeWidth={1.8} />
          <Rect x={13} y={y} width={w} height={9} rx={1.5} fill="none" stroke={i === 1 ? k.accent : k.guide} strokeWidth={1.6} />
        </G>
      ))}
    </G>
  ),

  // A flange face and its bolt circle, two holes straddling the centreline.
  FlangeBoltUp: (k) => (
    <G>
      <Circle cx={44} cy={33} r={24} fill="none" stroke={k.line} strokeWidth={2} />
      <Circle cx={44} cy={33} r={9} fill="none" stroke={k.line} strokeWidth={1.6} />
      <Circle cx={44} cy={33} r={17} fill="none" stroke={k.guide} strokeWidth={1} strokeDasharray="3 3" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => {
        const r = (d * Math.PI) / 180;
        return (
          <Circle key={d} cx={44 + 17 * Math.cos(r)} cy={33 + 17 * Math.sin(r)} r={2.6}
                  fill="none" stroke={d === 45 || d === 135 ? k.accent : k.line} strokeWidth={1.6} />
        );
      })}
      <Line x1={44} y1={5} x2={44} y2={61} stroke={k.guide} strokeWidth={1} strokeDasharray="3 3" />
    </G>
  ),

  // Joints ticked off, one still open.
  Joints: (k) => (
    <G>
      {[14, 28, 42].map((y, i) => (
        <G key={y}>
          <Rect x={16} y={y} width={13} height={13} rx={2} fill="none"
                stroke={i === 2 ? k.accent : k.line} strokeWidth={1.8} />
          {i < 2 ? <Path d={`M19 ${y + 7} L22 ${y + 10} L27 ${y + 4}`} fill="none" stroke={k.line} strokeWidth={1.8}
                         strokeLinecap="round" strokeLinejoin="round" /> : null}
          <Line x1={35} y1={y + 6.5} x2={72} y2={y + 6.5} stroke={k.guide} strokeWidth={1.6} />
        </G>
      ))}
    </G>
  ),

  // A cert behind a stencilled length of pipe: the number and the paper that
  // proves it, which is the whole job of the screen.
  Heats: (k) => (
    <G>
      <Path d="M40 8 L80 8 L80 44 L40 44 Z" fill="none" stroke={k.guide} strokeWidth={1.4} />
      <Path d="M46 17 L72 17 M46 25 L72 25 M46 33 L64 33" fill="none" stroke={k.guide} strokeWidth={1.2} />
      <Path d="M6 34 L58 34 M6 54 L58 54" fill="none" stroke={k.line} strokeWidth={2.4} strokeLinecap="round" />
      <Path d="M6 34 L6 54 M58 34 L58 54" fill="none" stroke={k.line} strokeWidth={1.4} />
      <Path d="M14 40 L14 48 M20 40 L20 48 M17 44 L23 44 M26 40 L26 48 L32 48" fill="none"
            stroke={k.accent} strokeWidth={1.8} strokeLinecap="round" />
    </G>
  ),

  // A phone laid on a falling run, and the angle it reads off it.
  Level: (k) => (
    <G>
      <Path d="M8 46 L80 32" fill="none" stroke={k.line} strokeWidth={3} strokeLinecap="round" />
      <Path d="M8 46 L80 46" fill="none" stroke={k.guide} strokeWidth={1.2} strokeDasharray="4 3" />
      <Path d="M24 26 L60 19 L62 29 L26 36 Z" fill="none" stroke={k.line} strokeWidth={2}
            strokeLinejoin="round" />
      <Circle cx={43} cy={27.5} r={3} fill={k.accent} />
      <Path d="M22 46 L22 41" fill="none" stroke={k.guide} strokeWidth={1.2} />
    </G>
  ),

  // The offset itself, with the right triangle it is solved from.
  SimpleOffset: (k) => (
    <G>
      <Path d="M10 52 L30 52 L58 18 L78 18" fill="none" stroke={k.line} strokeWidth={3}
            strokeLinejoin="round" strokeLinecap="round" />
      <Path d="M30 52 L58 52 L58 18" fill="none" stroke={k.guide} strokeWidth={1.2} strokeDasharray="4 3" />
      <Path d="M51 52 L51 45 L58 45" fill="none" stroke={k.guide} strokeWidth={1.2} />
      <Circle cx={30} cy={52} r={2.4} fill={k.accent} />
      <Circle cx={58} cy={18} r={2.4} fill={k.accent} />
    </G>
  ),

  // The same offset inside the box that makes it roll: two planes at once.
  RollingOffset: (k) => (
    <G>
      <Path d="M16 50 L40 42 L40 20 L64 12" fill="none" stroke={k.line} strokeWidth={3}
            strokeLinejoin="round" strokeLinecap="round" />
      <Path d="M16 50 L16 28 L40 20 M16 28 L40 20 M40 42 L64 34 L64 12 M40 20 L64 12"
            fill="none" stroke={k.guide} strokeWidth={1} strokeDasharray="3 3" />
      <Path d="M16 50 L40 42 M64 34 L64 12" fill="none" stroke={k.guide} strokeWidth={1} strokeDasharray="3 3" />
      <Circle cx={40} cy={42} r={2.4} fill={k.accent} />
    </G>
  ),

  // A cut between two fittings, with the takeouts that come off it.
  CutLength: (k) => (
    <G>
      <Rect x={10} y={26} width={14} height={16} rx={2} fill="none" stroke={k.line} strokeWidth={2} />
      <Rect x={64} y={26} width={14} height={16} rx={2} fill="none" stroke={k.line} strokeWidth={2} />
      <Line x1={24} y1={34} x2={64} y2={34} stroke={k.line} strokeWidth={3} strokeLinecap="butt" />
      <Line x1={17} y1={54} x2={71} y2={54} stroke={k.guide} strokeWidth={1.2} />
      <Path d="M17 51 L17 57 M71 51 L71 57" stroke={k.guide} strokeWidth={1.2} />
      <Line x1={24} y1={16} x2={64} y2={16} stroke={k.accent} strokeWidth={1.6} />
      <Path d="M24 13 L24 19 M64 13 L64 19" stroke={k.accent} strokeWidth={1.6} />
    </G>
  ),

  // A saddle going over the thing it has to clear.
  SaddleBend: (k) => (
    <G>
      <Rect x={34} y={30} width={20} height={22} fill="none" stroke={k.guide} strokeWidth={1.4} />
      <Path d="M8 52 L28 52 L38 26 L50 26 L60 52 L80 52" fill="none" stroke={k.line} strokeWidth={3}
            strokeLinejoin="round" strokeLinecap="round" />
      {[28, 38, 50, 60].map((x, i) => (
        <Circle key={x} cx={x} cy={i === 1 || i === 2 ? 26 : 52} r={2.2} fill={k.accent} />
      ))}
    </G>
  ),

  // A segmented elbow, drawn as the wedges that come out of it.
  MiterBend: (k) => (
    <G>
      <Path d="M24 54 A40 40 0 0 1 64 14" fill="none" stroke={k.guide} strokeWidth={10} opacity={0.2} />
      <Path d="M24 54 A40 40 0 0 1 64 14" fill="none" stroke={k.line} strokeWidth={3} strokeLinecap="round" />
      {/* The cuts, struck from the arc's own centre — which is the corner the
          two tangents meet at, not either end of the arc. */}
      {[18, 36, 54, 72].map((d) => {
        const r = (d * Math.PI) / 180;
        const cx = 24;
        const cy = 14;
        return (
          <Line key={d} x1={cx + 46 * Math.cos(r)} y1={cy + 46 * Math.sin(r)}
                x2={cx + 34 * Math.cos(r)} y2={cy + 34 * Math.sin(r)}
                stroke={k.accent} strokeWidth={1.8} strokeLinecap="round" />
        );
      })}
    </G>
  ),

  // A bend with its radius struck from the centre.
  HandBender: (k) => (
    <G>
      <Path d="M12 52 L34 52 A22 22 0 0 1 56 30 L56 10" fill="none" stroke={k.line} strokeWidth={3}
            strokeLinejoin="round" strokeLinecap="round" />
      <Path d="M34 52 L34 30 L56 30" fill="none" stroke={k.guide} strokeWidth={1.2} strokeDasharray="4 3" />
      <Circle cx={34} cy={30} r={2} fill={k.guide} />
      <Path d="M34 30 L50 44" stroke={k.accent} strokeWidth={1.4} />
    </G>
  ),
};

/**
 * The schematic for one tool, or nothing when it has none.
 *
 * Returning null rather than a placeholder is deliberate: a tile with a real
 * drawing beside a tile with a grey box reads as a broken tile, where a tile
 * with no drawing at all just reads as a tile.
 */
export function TileArt({ route, size = 1 }: { route: keyof RootStackParamList; size?: number }) {
  const t = useTheme();
  const draw = art[route as string];
  if (!draw) return null;

  const ink: Ink = { line: t.colors.text, guide: t.colors.textFaint, accent: t.colors.accent };
  return (
    <Svg width={W * size} height={H * size} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {draw(ink)}
    </Svg>
  );
}

/** Which routes have one, for a caller that needs to lay out around it. */
export const hasTileArt = (route: keyof RootStackParamList): boolean => Boolean(art[route as string]);
