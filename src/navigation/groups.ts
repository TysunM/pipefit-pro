import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from './types';

// What each tab holds
// -------------------
// Five tabs across the foot: Home, Projects, Tools, Logs and the Calculator.
//
//   Home       the job card and the tools this man used last.
//   Projects   everything saved: bolt-ups, isos, spools, level readings.
//   Tools      the instruments he works with, and every bend and offset.
//   Logs       the books he keeps and looks things up in.
//   Calculator the trade calculator, straight to the keys.
//
// This file is the only place that says which tool sits where. The tab
// screens, the home screen and groups.test.ts all read it, and the test holds
// that the tabs and the Projects page together reach every tool exactly once.

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
  { route: 'Joints', title: 'Joint log', subtitle: 'Every bolt-up on the job', icon: 'pricetags-outline' },
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

/** How a section draws its tiles: big pictures two to a row, one across the width, or small calc tiles. */
export type SectionSize = 'big' | 'wide' | 'small';
export type Section = { title: string; size: SectionSize; tools: Tool[] };

export type GroupId = 'tools' | 'logs';
export type Group = { id: GroupId; title: string; subtitle: string; sections: Section[] };

/** What the Tools and Logs tabs hold. */
export const GROUPS: Group[] = [
  {
    id: 'tools',
    title: 'Tools',
    subtitle: 'The iso paper, the spool, the bolt-up and the level, then every bend and offset.',
    sections: [
      { title: 'Layout & fit-up', size: 'big', tools: pick(['IsoSketch', 'SpoolBuilder', 'FlangeBoltUp', 'Level']) },
      {
        title: 'Bends & offsets',
        size: 'small',
        tools: pick(['SimpleOffset', 'RollingOffset', 'CutLength', 'SaddleBend', 'MiterBend', 'HandBender']),
      },
    ],
  },
  {
    id: 'logs',
    title: 'Logs',
    subtitle: 'The books the job keeps: every joint bolted up, the heats in them, and the handbook.',
    sections: [
      { title: 'Records', size: 'big', tools: pick(['Joints', 'Heats']) },
      { title: 'Look-up', size: 'wide', tools: pick(['Reference']) },
    ],
  },
];

export function group(id: GroupId): Group | undefined {
  return GROUPS.find((g) => g.id === id);
}

/** Every tool a tab lists, in reading order. */
export const groupTools = (g: Group): Tool[] => g.sections.flatMap((s) => s.tools);

/** Reached from the Projects page, not a tab: the order is worked out of the saved spools. */
export const PROJECT_TOOLS: Tool[] = pick(['OrderSheet']);

/** The one tool that is its own tab. */
export const TAB_TOOLS: Tool[] = pick(['Calculator']);

/**
 * What the home screen's "recently used" remembers. The calculator is left
 * out: it has its own tab, so a tile for it would be a second way to the
 * same place, taking the room of a tool that is not one tap away.
 */
export const RECORDABLE: ReadonlySet<string> = new Set(TOOLS.map((t) => t.route).filter((r) => r !== 'Calculator'));

/** What the home screen offers before anything has been used. */
export const START: Tool[] = pick(['IsoSketch', 'FlangeBoltUp', 'SpoolBuilder', 'Level']);
