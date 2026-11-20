// What the calculator tab remembers
// ---------------------------------
// Which calculator was last open, the trade one or the phone one, and how the
// phone one was left: scientific keys out or not, degrees or radians, the
// converter's category and units, and the history of sums. None of it is
// work, so it is kept the plain way the last-used strip is (recents.tsx):
// a damaged or older value reads as the defaults, never as an error.

import { MAX_HISTORY, type AngleMode, type HistoryEntry } from '../calc/basic';
import { CATEGORIES, categoryById } from '../calc/convert';

export const CALC_PREFS_KEY = 'pipefit.calcprefs.v1';
export const CALC_PREFS_VERSION = 1;

export type CalcMode = 'trade' | 'standard';
/** What fills the phone calculator's lower half. */
export type StandardPanel = 'keys' | 'history' | 'convert';

export type CalcPrefs = {
  mode: CalcMode;
  panel: StandardPanel;
  scientific: boolean;
  angle: AngleMode;
  history: HistoryEntry[];
  category: string;
  /** The unit the figure is typed in, by category. */
  from: Record<string, string>;
};

export const defaultCalcPrefs = (): CalcPrefs => ({
  mode: 'trade',
  panel: 'keys',
  scientific: false,
  angle: 'deg',
  history: [],
  category: CATEGORIES[0]!.id,
  from: {},
});

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const validEntry = (v: unknown): HistoryEntry | null =>
  isRec(v) && typeof v.expr === 'string' && typeof v.result === 'string' && typeof v.value === 'number' && Number.isFinite(v.value) && v.expr.length <= 500
    ? { expr: v.expr, result: v.result, value: v.value }
    : null;

export function parseCalcPrefs(raw: string | null | undefined): CalcPrefs {
  const d = defaultCalcPrefs();
  if (!raw) return d;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return d;
  }
  if (!isRec(v) || v.v !== CALC_PREFS_VERSION) return d;
  const from: Record<string, string> = {};
  if (isRec(v.from))
    for (const [cat, unit] of Object.entries(v.from)) {
      const c = CATEGORIES.find((x) => x.id === cat);
      if (c && typeof unit === 'string' && c.units.some((x) => x.id === unit)) from[cat] = unit;
    }
  return {
    mode: v.mode === 'standard' ? 'standard' : 'trade',
    panel: v.panel === 'history' || v.panel === 'convert' ? v.panel : 'keys',
    scientific: v.scientific === true,
    angle: v.angle === 'rad' ? 'rad' : 'deg',
    history: Array.isArray(v.history) ? v.history.map(validEntry).filter((x): x is HistoryEntry => x !== null).slice(0, MAX_HISTORY) : [],
    category: typeof v.category === 'string' && CATEGORIES.some((c) => c.id === v.category) ? v.category : d.category,
    from,
  };
}

export const serialiseCalcPrefs = (p: CalcPrefs): string => JSON.stringify({ v: CALC_PREFS_VERSION, ...p });

/** The unit a category's figure is typed in: as left, else the category's own first. */
export const fromUnitOf = (p: CalcPrefs, category: string): string => p.from[category] ?? categoryById(category).first[0];
