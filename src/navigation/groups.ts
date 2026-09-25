import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from './types';

// What is on the home screen, and what is inside each card
// -------------------------------------------------------
// Fifteen cards is a list you scroll rather than read, and the trade words on
// them mean nearly the same thing until you already know the difference. So
// the ones that answer the same question sit behind one card.
//
// The grouping follows the work, not the maths: everything that gets a pipe
// round an obstruction is one card, and anything that records what was done
// sits with the tool that did it. A saved thing is no use away from the thing
// that saved it — the heat book counts traceability against the joint
// register, so it belongs with the bolt-up; the order sheet is built from
// saved spools, so it belongs with the spool.
//
// This file is the only place that says so. The home screen reads it, the
// group screen reads it, and the last-used strip takes its list of recordable
// routes from it, so the three can never disagree. groups.test.ts holds that
// every tool is reachable, exactly once, and that nothing is orphaned.

/** A screen a fitter opens to do a job. Not Settings, not a group, not Home. */
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

export type GroupId = 'offsets' | 'flanges' | 'spool';

export type Tool = {
  route: ToolRoute;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export type HomeEntry =
  | { kind: 'tool'; tool: Tool }
  | {
      kind: 'group';
      id: GroupId;
      title: string;
      subtitle: string;
      icon: keyof typeof Ionicons.glyphMap;
      /** Whose drawing the card wears — the tool inside it a man opens first. */
      art: ToolRoute;
      tools: Tool[];
    };

const OFFSETS: Tool[] = [
  { route: 'SimpleOffset', title: 'Simple offset', subtitle: 'Travel, run and shrink in one plane', icon: 'git-branch-outline' },
  { route: 'RollingOffset', title: 'Rolling offset', subtitle: 'True offset and roll angle in two planes', icon: 'sync-outline' },
  { route: 'CutLength', title: 'Cut length', subtitle: 'Centre-to-centre minus fitting takeouts', icon: 'cut-outline' },
  { route: 'SaddleBend', title: 'Saddle bend', subtitle: 'Three and four point saddles over an obstruction', icon: 'trending-up-outline' },
  { route: 'MiterBend', title: 'Miter bend', subtitle: 'Segmented elbow cuts, code checked', icon: 'triangle-outline' },
  { route: 'HandBender', title: 'Pipe bend', subtitle: 'Setback, arc length and gain', icon: 'analytics-outline' },
];

const FLANGES: Tool[] = [
  { route: 'FlangeBoltUp', title: 'Flange bolt-up', subtitle: 'Tap each bolt through the cross pattern', icon: 'sync-circle-outline' },
  { route: 'Joints', title: 'Joint register', subtitle: 'Every bolt-up saved, bolt by bolt', icon: 'pricetags-outline' },
  { route: 'Heats', title: 'Heat book', subtitle: 'Heat numbers, certs, and what the job can prove', icon: 'shield-checkmark-outline' },
];

const SPOOL: Tool[] = [
  // Named for what it does rather than for the card it sits under, so the row
  // is not a repeat of the heading above it.
  { route: 'SpoolBuilder', title: 'Build a spool', subtitle: 'Say where each leg runs and spin it in 3D', icon: 'cube-outline' },
  { route: 'OrderSheet', title: 'Order sheet', subtitle: 'One order across every saved spool', icon: 'receipt-outline' },
  { route: 'IsoSketch', title: 'Iso sketch', subtitle: 'Draw the run on iso paper; the lines snap to the axes', icon: 'pencil-outline' },
];

/** The home screen, in order. Kept close to the old order so nothing moves far. */
export const HOME: HomeEntry[] = [
  {
    kind: 'tool',
    tool: { route: 'Calculator', title: 'Calculator', subtitle: 'Feet, inches and fractions with pipe keys', icon: 'calculator-outline' },
  },
  {
    kind: 'tool',
    tool: { route: 'Level', title: 'Level', subtitle: 'Lay the phone on the pipe and read the fall', icon: 'git-commit-outline' },
  },
  {
    kind: 'tool',
    tool: { route: 'Reference', title: 'Handbook', subtitle: 'Every table, searchable, with its page', icon: 'book-outline' },
  },
  {
    kind: 'group',
    id: 'spool',
    title: '3D spool',
    subtitle: 'Build a run, sketch an iso, order the steel',
    icon: 'cube-outline',
    art: 'SpoolBuilder',
    tools: SPOOL,
  },
  {
    kind: 'group',
    id: 'flanges',
    title: 'Flanges',
    subtitle: 'Bolt-up, the joints you worked, and their heats',
    icon: 'sync-circle-outline',
    art: 'FlangeBoltUp',
    tools: FLANGES,
  },
  {
    kind: 'group',
    id: 'offsets',
    title: 'Offsets / Bending',
    subtitle: 'Offsets, saddles, miters, bends and cut length',
    icon: 'git-branch-outline',
    art: 'SimpleOffset',
    tools: OFFSETS,
  },
];

export function group(id: GroupId): Extract<HomeEntry, { kind: 'group' }> | undefined {
  for (const e of HOME) if (e.kind === 'group' && e.id === id) return e;
  return undefined;
}

/** Every tool, wherever it sits. */
export const TOOLS: Tool[] = HOME.flatMap((e) => (e.kind === 'tool' ? [e.tool] : e.tools));

export function tool(route: string): Tool | undefined {
  return TOOLS.find((t) => t.route === route);
}

/**
 * The routes the last-used strip records.
 *
 * A Set of the tools above, so a screen that is not a tool — Settings, a
 * group, a handbook table — never takes a slot from one that is.
 */
export const RECORDABLE: ReadonlySet<string> = new Set(TOOLS.map((t) => t.route));
