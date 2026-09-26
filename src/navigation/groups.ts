import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from './types';

// What is on the home screen, and what each tab holds
// ---------------------------------------------------
// Every tool is on the front page, one tap away, laid out in three sections:
// the tools a man works with, the records he keeps and looks things up in,
// and the calculations he runs most. The tab bar across the bottom cuts the
// same fifteen tools a second way — projects, tools, calculations — so a tab
// is a short list of like things rather than the whole shop again.
//
// This file is the only place that says which tool sits where. The home
// screen, the tab screens and groups.test.ts all read it, and the test holds
// that each of the two cuts reaches every tool exactly once.

/** A screen a fitter opens to do a job. Not Settings, not a tab, not Home. */
export type ToolRoute =
  | 'Calculator'
  | 'Level'
  | 'Reference'
  | 'SimpleOffset'
  | 'RollingOffset'
  | 'CutLength'
  | 'SaddleBend'
  | 'MiterBend'
  | 'HandBender'
  | 'FlangeBoltUp'
  | 'Joints'
  | 'Heats'
  | 'SpoolBuilder'
  | 'OrderSheet'
  | 'IsoSketch';

// Every tool route is a real route. If one is renamed this stops compiling.
const _routesExist: readonly (keyof RootStackParamList)[] = [] as readonly ToolRoute[];
void _routesExist;

export type Tool = {
  route: ToolRoute;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
};

/** Every tool, once. The subtitles are short enough to sit on two lines of a tile. */
export const TOOLS: Tool[] = [
  { route: 'Calculator', title: 'Calculator', subtitle: 'Feet, inches and fractions', icon: 'calculator-outline' },
  { route: 'Reference', title: 'Handbook', subtitle: 'Material specs and tables', icon: 'book-outline' },
  { route: 'Level', title: 'Level', subtitle: 'Lay phone on pipe to read angle', icon: 'git-commit-outline' },
  { route: 'OrderSheet', title: 'Order sheet', subtitle: 'Combine spools into one order', icon: 'receipt-outline' },
  { route: 'SpoolBuilder', title: '3D spool', subtitle: 'Build a run and spin it in 3D', icon: 'cube-outline' },
  { route: 'Joints', title: 'Joint register', subtitle: 'Project-level bolt-up records', icon: 'pricetags-outline' },
  { route: 'FlangeBoltUp', title: 'Flange bolt-up', subtitle: 'Interactive cross-pattern check', icon: 'sync-circle-outline' },
  { route: 'Heats', title: 'Heat book', subtitle: 'MTR traceability by heat #', icon: 'shield-checkmark-outline' },
  { route: 'IsoSketch', title: 'Iso sketch', subtitle: 'Iso paper; the lines snap to the axes', icon: 'pencil-outline' },
  { route: 'SimpleOffset', title: 'Simple offset', subtitle: 'Travel, run and shrink in one plane', icon: 'git-branch-outline' },
  { route: 'RollingOffset', title: 'Rolling offset', subtitle: 'True offset and roll in two planes', icon: 'sync-outline' },
  { route: 'CutLength', title: 'Cut length', subtitle: 'Centre-to-centre minus takeouts', icon: 'cut-outline' },
  { route: 'SaddleBend', title: 'Saddle bend', subtitle: 'Three and four point saddles', icon: 'trending-up-outline' },
  { route: 'MiterBend', title: 'Miter bend', subtitle: 'Segmented elbow cuts, code checked', icon: 'triangle-outline' },
  { route: 'HandBender', title: 'Pipe bend', subtitle: 'Setback, arc length and gain', icon: 'analytics-outline' },
];

export function tool(route: string): Tool | undefined {
  return TOOLS.find((t) => t.route === route);
}

const pick = (routes: ToolRoute[]): Tool[] => routes.map((r) => tool(r) as Tool);

/**
 * The home screen. Work tools down the left, records and look-ups down the
 * right, row for row; the sketch pad full width under them; the everyday
 * calculations in small tiles at the foot.
 */
export const HOME = {
  work: pick(['Calculator', 'Level', 'SpoolBuilder', 'FlangeBoltUp']),
  records: pick(['Reference', 'OrderSheet', 'Joints', 'Heats']),
  wide: tool('IsoSketch') as Tool,
  calcs: pick(['SimpleOffset', 'RollingOffset', 'CutLength', 'SaddleBend', 'MiterBend', 'HandBender']),
};

/** The big tiles in reading order: across each row, left then right. */
export const HOME_PAIRS: Tool[] = HOME.work.flatMap((w, i) => {
  const r = HOME.records[i];
  return r ? [w, r] : [w];
});

/** Every tool the home screen shows, in reading order. */
export const HOME_TOOLS: Tool[] = [...HOME_PAIRS, HOME.wide, ...HOME.calcs];

export type GroupId = 'projects' | 'tools' | 'calcs';

export type Group = { id: GroupId; title: string; subtitle: string; tools: Tool[] };

/** What each tab holds. */
export const GROUPS: Group[] = [
  {
    id: 'projects',
    title: 'Projects',
    subtitle: 'What the job has on record: the order, every joint bolted up, the heats in them, and the isos.',
    tools: pick(['OrderSheet', 'Joints', 'Heats', 'IsoSketch']),
  },
  {
    id: 'tools',
    title: 'Tools',
    subtitle: 'The instruments: the calculator, the level, the handbook, the spool and the bolt-up.',
    tools: pick(['Calculator', 'Level', 'Reference', 'SpoolBuilder', 'FlangeBoltUp']),
  },
  {
    id: 'calcs',
    title: 'Calculations',
    subtitle: 'Offsets, saddles, miters, bends and cut length, all worked from the active pipe spec.',
    tools: pick(['SimpleOffset', 'RollingOffset', 'CutLength', 'SaddleBend', 'MiterBend', 'HandBender']),
  },
];

export function group(id: GroupId): Group | undefined {
  return GROUPS.find((g) => g.id === id);
}
