import { findRow } from './pipeData';

// Plastic pipe dimensions and pressure limits, pages 3-26 to 3-30.
//
// PVC outside diameters conform to iron pipe sizes, so only the bore is held
// here and the outside comes from the steel table. The pressures are for
// plain end pipe: threading takes about 45 per cent off, which the page states
// and `threadedPressure` applies.
//
// Polyethylene comes in its own outside diameters as well as schedule 40, so
// those are held in full.

export type PvcSchedule = 'A' | '40' | '80' | '120';
export type PvcType = 'I' | 'II';

export type PvcRow = {
  nps: number;
  /** Bore. The outside diameter is the iron pipe size. */
  id: number;
  /** Type I at 75 and at 150 degrees; type II at 75 and at 130. */
  typeI75: number;
  typeI150: number;
  typeII75: number;
  typeII130: number;
};

export const PVC_A: PvcRow[] = [
  { nps: 0.5, id: 0.75, typeI75: 165, typeI150: 90, typeII75: 145, typeII130: 40 },
  { nps: 0.75, id: 0.94, typeI75: 145, typeI150: 80, typeII75: 125, typeII130: 35 },
  { nps: 1, id: 1.195, typeI75: 130, typeI150: 73, typeII75: 110, typeII130: 30 },
  { nps: 1.25, id: 1.52, typeI75: 115, typeI150: 65, typeII75: 100, typeII130: 25 },
  { nps: 1.5, id: 1.74, typeI75: 115, typeI150: 65, typeII75: 100, typeII130: 25 },
  { nps: 2, id: 2.175, typeI75: 115, typeI150: 65, typeII75: 100, typeII130: 25 },
  { nps: 2.5, id: 2.635, typeI75: 115, typeI150: 65, typeII75: 100, typeII130: 25 },
  { nps: 3, id: 3.22, typeI75: 115, typeI150: 65, typeII75: 100, typeII130: 25 },
  { nps: 4, id: 4.1, typeI75: 115, typeI150: 65, typeII75: 100, typeII130: 25 },
];

export const PVC_SCH40: PvcRow[] = [
  { nps: 0.5, id: 0.622, typeI75: 410, typeI150: 220, typeII75: 335, typeII130: 90 },
  { nps: 0.75, id: 0.824, typeI75: 335, typeI150: 180, typeII75: 275, typeII130: 70 },
  { nps: 1, id: 1.049, typeI75: 310, typeI150: 170, typeII75: 255, typeII130: 70 },
  { nps: 1.25, id: 1.38, typeI75: 255, typeI150: 140, typeII75: 210, typeII130: 50 },
  { nps: 1.5, id: 1.61, typeI75: 230, typeI150: 125, typeII75: 190, typeII130: 45 },
  { nps: 2, id: 2.067, typeI75: 195, typeI150: 110, typeII75: 160, typeII130: 45 },
  { nps: 2.5, id: 2.469, typeI75: 200, typeI150: 110, typeII75: 165, typeII130: 50 },
  { nps: 3, id: 3.068, typeI75: 185, typeI150: 100, typeII75: 150, typeII130: 40 },
  { nps: 4, id: 4.026, typeI75: 155, typeI150: 85, typeII75: 130, typeII130: 30 },
  { nps: 6, id: 6.065, typeI75: 125, typeI150: 65, typeII75: 105, typeII130: 30 },
];

export const PVC_SCH80: PvcRow[] = [
  { nps: 0.5, id: 0.546, typeI75: 575, typeI150: 310, typeII75: 470, typeII130: 120 },
  { nps: 0.75, id: 0.742, typeI75: 470, typeI150: 250, typeII75: 385, typeII130: 100 },
  { nps: 1, id: 0.957, typeI75: 435, typeI150: 235, typeII75: 355, typeII130: 95 },
  { nps: 1.25, id: 1.278, typeI75: 360, typeI150: 195, typeII75: 295, typeII130: 80 },
  { nps: 1.5, id: 1.5, typeI75: 325, typeI150: 175, typeII75: 265, typeII130: 70 },
  { nps: 2, id: 1.939, typeI75: 280, typeI150: 150, typeII75: 230, typeII130: 60 },
  { nps: 2.5, id: 2.323, typeI75: 270, typeI150: 140, typeII75: 225, typeII130: 60 },
  { nps: 3, id: 2.9, typeI75: 260, typeI150: 140, typeII75: 215, typeII130: 55 },
  { nps: 4, id: 3.826, typeI75: 225, typeI150: 120, typeII75: 185, typeII130: 50 },
  { nps: 6, id: 5.761, typeI75: 195, typeI150: 110, typeII75: 160, typeII130: 40 },
];

export const PVC_SCH120: PvcRow[] = [
  { nps: 0.5, id: 0.5, typeI75: 680, typeI150: 360, typeII75: 560, typeII130: 145 },
  { nps: 0.75, id: 0.71, typeI75: 520, typeI150: 275, typeII75: 430, typeII130: 110 },
  { nps: 1, id: 0.915, typeI75: 485, typeI150: 255, typeII75: 400, typeII130: 105 },
  { nps: 1.25, id: 1.23, typeI75: 405, typeI150: 215, typeII75: 335, typeII130: 85 },
  { nps: 1.5, id: 1.45, typeI75: 365, typeI150: 190, typeII75: 300, typeII130: 80 },
  { nps: 2, id: 1.875, typeI75: 320, typeI150: 170, typeII75: 265, typeII130: 70 },
  { nps: 2.5, id: 2.275, typeI75: 320, typeI150: 170, typeII75: 265, typeII130: 70 },
  { nps: 3, id: 2.8, typeI75: 305, typeI150: 160, typeII75: 250, typeII130: 65 },
  { nps: 4, id: 3.624, typeI75: 295, typeI150: 155, typeII75: 245, typeII130: 65 },
  { nps: 6, id: 5.501, typeI75: 255, typeI150: 145, typeII75: 210, typeII130: 55 },
];

const PVC_BY_SCHEDULE: Record<PvcSchedule, PvcRow[]> = {
  A: PVC_A,
  '40': PVC_SCH40,
  '80': PVC_SCH80,
  '120': PVC_SCH120,
};

/** Temperature each pressure column is figured at, by type. */
export const PVC_TEMPERATURES: Record<PvcType, [number, number]> = { I: [75, 150], II: [75, 130] };

/** How much of the plain end pressure a threaded joint is good for. */
export const THREADED_PRESSURE_FACTOR = 0.55;

export const pvcRow = (nps: number, schedule: PvcSchedule = '40'): PvcRow | undefined =>
  PVC_BY_SCHEDULE[schedule].find((r) => r.nps === nps);

/** Outside diameter of PVC: the iron pipe size, which the book says it follows. */
export const pvcOd = (nps: number): number => findRow(nps)?.od ?? NaN;

/** Wall thickness, worked from the iron pipe outside and the printed bore. */
export function pvcWall(nps: number, schedule: PvcSchedule = '40'): number {
  const row = pvcRow(nps, schedule);
  const od = pvcOd(nps);
  if (!row || !Number.isFinite(od)) return NaN;
  return (od - row.id) / 2;
}

/**
 * Maximum operating pressure, interpolated between the two printed
 * temperatures, which the book says may be done with reasonable accuracy.
 * A threaded joint takes it down to about 55 per cent.
 */
export function pvcPressure(
  nps: number,
  schedule: PvcSchedule = '40',
  type: PvcType = 'I',
  temperatureF = 75,
  ends: 'plain' | 'threaded' = 'plain'
): number {
  const row = pvcRow(nps, schedule);
  if (!row || !Number.isFinite(temperatureF)) return NaN;
  const [lowT, highT] = PVC_TEMPERATURES[type];
  const low = type === 'I' ? row.typeI75 : row.typeII75;
  const high = type === 'I' ? row.typeI150 : row.typeII130;
  if (temperatureF < lowT || temperatureF > highT) return NaN;
  const share = (temperatureF - lowT) / (highT - lowT);
  const plain = low + share * (high - low);
  return ends === 'threaded' ? plain * THREADED_PRESSURE_FACTOR : plain;
}

/** What a threaded joint is good for, given a plain end figure. */
export const threadedPressure = (plain: number): number =>
  Number.isFinite(plain) ? plain * THREADED_PRESSURE_FACTOR : NaN;

export const pvcSizes = (schedule: PvcSchedule = '40'): number[] =>
  PVC_BY_SCHEDULE[schedule].map((r) => r.nps);

export type PeSeries = 'rated75' | 'schedule40' | 'rated100';

export type PeRow = { nps: number; od: number; id: number; at75: number; at120: number };

export const PE_RATED_75: PeRow[] = [
  { nps: 0.5, od: 0.782, id: 0.622, at75: 75, at120: 48 },
  { nps: 0.75, od: 1.024, id: 0.824, at75: 75, at120: 48 },
  { nps: 1, od: 1.3, id: 1.05, at75: 75, at120: 48 },
  { nps: 1.25, od: 1.71, id: 1.38, at75: 75, at120: 48 },
  { nps: 1.5, od: 2.0, id: 1.61, at75: 75, at120: 48 },
  { nps: 2, od: 2.567, id: 2.067, at75: 75, at120: 48 },
  { nps: 3, od: 3.776, id: 3.068, at75: 75, at120: 48 },
  { nps: 4, od: 4.956, id: 4.026, at75: 75, at120: 48 },
];

export const PE_SCH40: PeRow[] = [
  { nps: 0.5, od: 0.84, id: 0.622, at75: 100, at120: 65 },
  { nps: 0.75, od: 1.05, id: 0.824, at75: 83, at120: 53 },
  { nps: 1, od: 1.315, id: 1.049, at75: 78, at120: 50 },
  { nps: 1.25, od: 1.66, id: 1.38, at75: 70, at120: 45 },
  { nps: 1.5, od: 1.9, id: 1.61, at75: 60, at120: 38 },
  { nps: 2, od: 2.375, id: 2.067, at75: 50, at120: 32 },
  { nps: 2.5, od: 2.875, id: 2.469, at75: 50, at120: 32 },
  { nps: 3, od: 3.5, id: 3.068, at75: 50, at120: 32 },
  { nps: 4, od: 4.5, id: 4.026, at75: 40, at120: 25 },
  { nps: 6, od: 6.625, id: 6.065, at75: 35, at120: 23 },
];

export const PE_RATED_100: PeRow[] = [
  { nps: 0.5, od: 0.842, id: 0.622, at75: 100, at120: 65 },
  { nps: 0.75, od: 1.114, id: 0.824, at75: 100, at120: 65 },
  { nps: 1, od: 1.41, id: 1.05, at75: 100, at120: 65 },
  { nps: 1.25, od: 1.86, id: 1.38, at75: 100, at120: 65 },
  { nps: 1.5, od: 2.17, id: 1.61, at75: 100, at120: 65 },
  { nps: 2, od: 2.777, id: 2.067, at75: 100, at120: 65 },
  { nps: 3, od: 4.068, id: 3.068, at75: 100, at120: 65 },
  { nps: 4, od: 5.386, id: 4.026, at75: 100, at120: 65 },
];

const PE_BY_SERIES: Record<PeSeries, PeRow[]> = {
  rated75: PE_RATED_75,
  schedule40: PE_SCH40,
  rated100: PE_RATED_100,
};

export const peRow = (nps: number, series: PeSeries = 'schedule40'): PeRow | undefined =>
  PE_BY_SERIES[series].find((r) => r.nps === nps);

/** Maximum operating pressure of polyethylene, interpolated by temperature. */
export function pePressure(
  nps: number,
  series: PeSeries = 'schedule40',
  temperatureF = 75
): number {
  const row = peRow(nps, series);
  if (!row || !Number.isFinite(temperatureF) || temperatureF < 75 || temperatureF > 120) return NaN;
  const share = (temperatureF - 75) / (120 - 75);
  return row.at75 + share * (row.at120 - row.at75);
}

export const peSizes = (series: PeSeries = 'schedule40'): number[] =>
  PE_BY_SERIES[series].map((r) => r.nps);

/**
 * Laying polyethylene in a ditch. The pipe is snaked rather than pulled
 * straight so it has slack to contract, and covered before the backfill goes
 * in, both of which the page sets out.
 */
export const PE_SLACK_PER_HUNDRED_FEET = 1;
export const PE_MINIMUM_COVER_BEFORE_BACKFILL = 6;

/** Extra pipe to allow so a run can be snaked in the ditch, in feet. */
export const peSlack = (runFeet: number): number =>
  Number.isFinite(runFeet) && runFeet > 0 ? (runFeet / 100) * PE_SLACK_PER_HUNDRED_FEET : NaN;
