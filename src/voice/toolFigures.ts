// The figures each tool takes by voice
// ------------------------------------
// One table, read three ways: by the phone's matcher (voice/intent.ts) to pick
// "rise 12" out of what was said, by Claude's prompt (ai/voice.ts) so a
// figure it hears goes to a field that exists, and by the screens, which take
// what arrives through voice/figures.ts.
//
// The first figure of each tool is the one a bare number fills: "cut length,
// 4 foot 2" is the centre to centre, "miter 90" the turn.

export type FigureKind = 'length' | 'angle' | 'count';

export type FigureSpec = { label: string; kind: FigureKind; words: readonly string[] };

export const TOOL_FIGURES = {
  SimpleOffset: {
    offset: { label: 'Offset', kind: 'length', words: ['offset', 'set', 'rise', 'drop', 'jog'] },
    angle: { label: 'Fitting angle', kind: 'angle', words: ['angle', 'degree', 'degrees', 'fitting', 'elbow', 'ell'] },
    run: { label: 'Run', kind: 'length', words: ['run', 'advance'] },
    gap: { label: 'Gap', kind: 'length', words: ['gap', 'root gap', 'joint'] },
  },
  RollingOffset: {
    rise: { label: 'Rise', kind: 'length', words: ['rise', 'set', 'drop', 'height', 'vertical'] },
    roll: { label: 'Roll', kind: 'length', words: ['roll', 'spread', 'horizontal'] },
    run: { label: 'Run', kind: 'length', words: ['run', 'advance', 'travel'] },
    angle: { label: 'Elbow angle', kind: 'angle', words: ['angle', 'degree', 'degrees', 'fitting', 'elbow', 'ell'] },
    gap: { label: 'Gap', kind: 'length', words: ['gap', 'root gap', 'joint'] },
  },
  CutLength: {
    c2c: { label: 'C2C length', kind: 'length', words: ['center to center', 'centre to centre', 'c2c', 'center', 'centre', 'length'] },
    gap: { label: 'Gap', kind: 'length', words: ['gap', 'root gap', 'joint'] },
  },
  SaddleBend: {
    depth: { label: 'Depth', kind: 'length', words: ['depth', 'height', 'deep', 'tall'] },
    distance: { label: 'To obstruction', kind: 'length', words: ['to obstruction', 'distance', 'obstruction', 'mark'] },
    width: { label: 'Width', kind: 'length', words: ['width', 'wide'] },
    angle: { label: 'Angle', kind: 'angle', words: ['angle', 'degree', 'degrees', 'bend'] },
  },
  MiterBend: {
    angle: { label: 'Total turn', kind: 'angle', words: ['angle', 'degree', 'degrees', 'turn'] },
    segments: { label: 'Segments', kind: 'count', words: ['segments', 'segment', 'pieces', 'piece', 'sections', 'gores'] },
    radius: { label: 'Centreline radius', kind: 'length', words: ['radius', 'centerline radius', 'centreline radius'] },
  },
  HandBender: {
    angle: { label: 'Angle', kind: 'angle', words: ['angle', 'degree', 'degrees'] },
    legA: { label: 'Leg A', kind: 'length', words: ['leg a', 'first leg', 'leg one', 'leg'] },
    legB: { label: 'Leg B', kind: 'length', words: ['leg b', 'second leg', 'leg two', 'other leg'] },
    radius: { label: 'Radius', kind: 'length', words: ['radius'] },
    springback: { label: 'Springback', kind: 'angle', words: ['springback', 'spring back', 'spring'] },
    stock: { label: 'Stock', kind: 'length', words: ['stock', 'stick', 'stock length'] },
  },
} as const satisfies Record<string, Record<string, FigureSpec>>;

export type FigureRoute = keyof typeof TOOL_FIGURES;
export const FIGURE_ROUTES = Object.keys(TOOL_FIGURES) as FigureRoute[];

export const isFigureRoute = (r: string | null | undefined): r is FigureRoute => !!r && r in TOOL_FIGURES;

/**
 * A figure as it was said. `inches` is true when a unit was said with it
 * ("3 foot 6", "350 millimetres") and `n` is in inches; false when it was a
 * bare number, to go into the field in whatever units the field is in.
 */
export type Figure = { n: number; inches: boolean };
export type Figures = Record<string, Figure>;

/** The names of every figure of a tool, longest first, so "leg b" is tried before "leg". */
export function figureNames(route: FigureRoute): { key: string; words: string[] }[] {
  const specs = TOOL_FIGURES[route] as Record<string, FigureSpec>;
  return Object.entries(specs)
    .flatMap(([key, s]) => s.words.map((w) => ({ key, words: w.split(' ') })))
    .sort((a, b) => b.words.length - a.words.length);
}

/** The field a bare number fills. */
export const primaryFigure = (route: FigureRoute): string => Object.keys(TOOL_FIGURES[route])[0]!;

/** Whether a value is one a field of that kind can hold. */
export function plausible(kind: FigureKind, f: Figure): boolean {
  if (!Number.isFinite(f.n) || f.n <= 0) return false;
  if (kind === 'angle') return f.n <= 180;
  if (kind === 'count') return Number.isInteger(f.n) && f.n <= 20;
  return f.n < 100_000;
}
