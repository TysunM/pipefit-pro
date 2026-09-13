// Spacing of pipe supports, standard weight pipe. Pages 2-67 and 2-68.
//
// The book prints two tables, one for water and one for gas or steam, each
// with three horizontal-run columns by temperature and two sloping-run columns
// by grade. Two things printed with them are part of the answer, not footnotes:
//
//   - A sloping run's spacing must not exceed the figure for its temperature.
//     `supportSpacing` applies that, so a grade never buys a longer span than
//     the steel will carry.
//   - The figures allow for insulation but not for flanges, fittings or
//     valves. Heavy fittings belong close to a support.

export type PipeService = 'water' | 'gasOrSteam';
export type SupportGrade = 'oneInTen' | 'oneInTwenty';

export type SupportRow = {
  nps: number;
  /** Horizontal run at atmospheric temperature. */
  atmospheric: number;
  /** Horizontal run at 200 degrees. */
  at200: number;
  /** Horizontal run at the table's top temperature: 400 for water, 800 for gas or steam. */
  atTop: number;
  /** Sloping run graded one inch in ten feet. */
  oneInTen: number;
  /** Sloping run graded one inch in twenty feet. */
  oneInTwenty: number;
};

const N = NaN;

/** Top temperature each table carries, in degrees Fahrenheit. */
export const TOP_TEMPERATURE: Record<PipeService, number> = { water: 400, gasOrSteam: 800 };

export const SUPPORT_WATER: SupportRow[] = [
  { nps: 1, atmospheric: 16, at200: 11, atTop: N, oneInTen: 11, oneInTwenty: N },
  { nps: 1.25, atmospheric: 18, at200: 12, atTop: 11, oneInTen: 13, oneInTwenty: 11 },
  { nps: 1.5, atmospheric: 19, at200: 13, atTop: 12, oneInTen: 15, oneInTwenty: 12 },
  { nps: 2, atmospheric: 22, at200: 15, atTop: 13, oneInTen: 18, oneInTwenty: 14 },
  { nps: 2.5, atmospheric: 24, at200: 16, atTop: 15, oneInTen: 21, oneInTwenty: 16 },
  { nps: 3, atmospheric: 27, at200: 18, atTop: 16, oneInTen: 24, oneInTwenty: 19 },
  { nps: 3.5, atmospheric: 28, at200: 20, atTop: 18, oneInTen: 27, oneInTwenty: 21 },
  { nps: 4, atmospheric: 30, at200: 21, atTop: 18, oneInTen: 30, oneInTwenty: 23 },
  { nps: 5, atmospheric: 33, at200: 23, atTop: 20, oneInTen: 35, oneInTwenty: 27 },
  { nps: 6, atmospheric: 36, at200: 25, atTop: 22, oneInTen: 39, oneInTwenty: 31 },
  { nps: 8, atmospheric: 40, at200: 27, atTop: 25, oneInTen: 48, oneInTwenty: 37 },
  { nps: 10, atmospheric: 43, at200: 30, atTop: 27, oneInTen: 50, oneInTwenty: 43 },
  { nps: 12, atmospheric: 46, at200: 31, atTop: 29, oneInTen: 50, oneInTwenty: 49 },
  { nps: 14, atmospheric: 48, at200: 32, atTop: 30, oneInTen: 50, oneInTwenty: 50 },
  { nps: 16, atmospheric: 50, at200: 33, atTop: 31, oneInTen: 50, oneInTwenty: 50 },
  { nps: 18, atmospheric: 50, at200: 34, atTop: 32, oneInTen: 50, oneInTwenty: 50 },
  { nps: 20, atmospheric: 50, at200: 35, atTop: 33, oneInTen: 50, oneInTwenty: 50 },
  { nps: 24, atmospheric: 50, at200: 36, atTop: 34, oneInTen: 50, oneInTwenty: 50 },
];

export const SUPPORT_GAS_OR_STEAM: SupportRow[] = [
  { nps: 1, atmospheric: 15, at200: 12, atTop: N, oneInTen: 11, oneInTwenty: N },
  { nps: 1.25, atmospheric: 18, at200: 14, atTop: N, oneInTen: 13, oneInTwenty: 11 },
  { nps: 1.5, atmospheric: 20, at200: 15, atTop: N, oneInTen: 15, oneInTwenty: 12 },
  { nps: 2, atmospheric: 22, at200: 17, atTop: 11, oneInTen: 18, oneInTwenty: 14 },
  { nps: 2.5, atmospheric: 25, at200: 19, atTop: 12, oneInTen: 20, oneInTwenty: 15 },
  { nps: 3, atmospheric: 28, at200: 21, atTop: 14, oneInTen: 24, oneInTwenty: 19 },
  { nps: 3.5, atmospheric: 31, at200: 23, atTop: 15, oneInTen: 26, oneInTwenty: 21 },
  { nps: 4, atmospheric: 33, at200: 24, atTop: 16, oneInTen: 29, oneInTwenty: 23 },
  { nps: 5, atmospheric: 37, at200: 27, atTop: 18, oneInTen: 34, oneInTwenty: 27 },
  { nps: 6, atmospheric: 40, at200: 30, atTop: 20, oneInTen: 38, oneInTwenty: 31 },
  { nps: 8, atmospheric: 46, at200: 34, atTop: 24, oneInTen: 47, oneInTwenty: 37 },
  { nps: 10, atmospheric: 50, at200: 38, atTop: 27, oneInTen: 50, oneInTwenty: 43 },
  { nps: 12, atmospheric: 50, at200: 42, atTop: 30, oneInTen: 50, oneInTwenty: 49 },
  { nps: 14, atmospheric: 50, at200: 44, atTop: 31, oneInTen: 50, oneInTwenty: 50 },
  { nps: 16, atmospheric: 50, at200: 47, atTop: 34, oneInTen: 50, oneInTwenty: 50 },
  { nps: 18, atmospheric: 50, at200: 50, atTop: 36, oneInTen: 50, oneInTwenty: 50 },
  { nps: 20, atmospheric: 50, at200: 50, atTop: 38, oneInTen: 50, oneInTwenty: 50 },
  { nps: 24, atmospheric: 50, at200: 50, atTop: 41, oneInTen: 50, oneInTwenty: 50 },
];

const TABLES: Record<PipeService, SupportRow[]> = {
  water: SUPPORT_WATER,
  gasOrSteam: SUPPORT_GAS_OR_STEAM,
};

/** Longest span the tables carry, in feet. */
export const LONGEST_SPAN = 50;

export const supportRow = (nps: number, service: PipeService = 'water'): SupportRow | undefined =>
  TABLES[service].find((r) => r.nps === nps);

/** The horizontal run figure for a temperature, taking the nearest column below. */
export function horizontalSpacing(
  nps: number,
  service: PipeService = 'water',
  temperatureF = 70
): number {
  const row = supportRow(nps, service);
  if (!row || !Number.isFinite(temperatureF)) return NaN;
  if (temperatureF > TOP_TEMPERATURE[service]) return NaN;
  if (temperatureF > 200) return row.atTop;
  if (temperatureF > 70) return row.at200;
  return row.atmospheric;
}

/**
 * Spacing for a run, in feet.
 *
 * A sloping run is held to the shorter of its grade figure and the figure for
 * its temperature, which is the rule printed under both tables. Without that a
 * graded run would be given a longer span than the pipe will carry.
 */
export function supportSpacing(
  nps: number,
  service: PipeService = 'water',
  temperatureF = 70,
  grade?: SupportGrade
): number {
  const horizontal = horizontalSpacing(nps, service, temperatureF);
  if (!grade) return horizontal;
  const row = supportRow(nps, service);
  if (!row) return NaN;
  const sloping = grade === 'oneInTen' ? row.oneInTen : row.oneInTwenty;
  if (!Number.isFinite(sloping) || !Number.isFinite(horizontal)) return NaN;
  return Math.min(sloping, horizontal);
}

/** Whether the grade figure is the one that governs, or the temperature is. */
export const gradeGoverns = (
  nps: number,
  service: PipeService = 'water',
  temperatureF = 70,
  grade: SupportGrade = 'oneInTen'
): boolean => {
  const row = supportRow(nps, service);
  const horizontal = horizontalSpacing(nps, service, temperatureF);
  if (!row || !Number.isFinite(horizontal)) return false;
  const sloping = grade === 'oneInTen' ? row.oneInTen : row.oneInTwenty;
  return Number.isFinite(sloping) && sloping < horizontal;
};

/** How many supports a run of a given length needs. */
export function supportCount(
  runFeet: number,
  nps: number,
  service: PipeService = 'water',
  temperatureF = 70,
  grade?: SupportGrade
): number {
  const span = supportSpacing(nps, service, temperatureF, grade);
  if (!Number.isFinite(span) || !Number.isFinite(runFeet) || runFeet <= 0) return NaN;
  return Math.ceil(runFeet / span) + 1;
}

/**
 * What the tables do not cover. Printed with both of them and worth carrying
 * alongside the numbers.
 */
export const SUPPORT_CAVEAT =
  'These spans allow for insulation but not for flanges, fittings or valves. ' +
  'Put a support close to any heavy fitting. Wider spans are for calculation, ' +
  'not for this table.';

export const supportSizes = (service: PipeService = 'water'): number[] =>
  TABLES[service].map((r) => r.nps);
