// Large steel flange bolting, ASME B16.47
// ---------------------------------------
// Above 24" a steel flange is not in B16.5 but in B16.47, which has two
// drillings for every size: Series A, the heavier flange from MSS SP-44 with
// fewer, bigger studs; and Series B, the compact flange from API 605 with
// more, smaller ones. A 36" class 150 is 32 studs of 1-1/2" in Series A and
// 44 studs of 7/8" in Series B. The fitter tells them apart by counting the
// holes, which is why the bolt-up offers both and takes a spoken bolt count
// to pick between them.
//
// What is here is what could be verified against published tables from more
// than one source: Series A and Series B, classes 150, 300, 400 and 600 to
// 60" and class 900 to 48". In classes 400, 600 and 900 the standard drills
// the two series the same from 38" up, and the tables say so by sharing
// those rows. Class 75 is left out rather than guessed at. A flange not in
// these tables is bolted with the count set by hand and the stud size read
// off the drawing. Two cells differ between sources: class 400 at 46" and
// 54", where two stud tables agree on 36 and 28 bolts and a third gives 32
// for each; the two are taken.
//
// As with B16.5, the class sets the studs and the studs set the torque. The
// stud size is shown wherever the flange is, so a man can check it against
// the studs in his hand before the torque is trusted.
//
// The gasket follows the series too: a Series A and a Series B gasket of the
// same size and class are different sizes, so the record names the series
// the gasket is for, and gives figures where a table could be verified: the
// B16.21 flat ring for both series in classes 150 to 600, and the B16.20
// spiral wound gasket in class 150, from the published tables (wermac.org,
// as supplied) checked against each other, against the class 150 ring table
// this file carried first, and against a second site's inch figures. The
// spiral wound outer ring and the flat ring come out the same diameter at
// every size, as they must, both sitting inside the same bolts. The other
// spiral wound classes wait on their tables.

import { formatInches } from './ftin';
import { studLabel, type SteelBolting } from './steelFlange';

export type LargeSeries = 'A' | 'B';
/** A series letter and a class number: the way a joint records a B16.47 flange. */
export type LargeClass = 'A150' | 'A300' | 'A400' | 'A600' | 'A900' | 'B150' | 'B300' | 'B400' | 'B600' | 'B900';

export const LARGE_CLASSES: readonly LargeClass[] = ['A150', 'A300', 'A400', 'A600', 'A900', 'B150', 'B300', 'B400', 'B600', 'B900'];

export type LargeBolting = SteelBolting & { series: LargeSeries };

type Cell = readonly [nps: number, bolts: number, stud: number];

const rows = (series: LargeSeries, cells: readonly Cell[]): LargeBolting[] =>
  cells.map(([nps, bolts, stud]) => ({ nps, label: `${nps}" OD`, bolts, stud, series }));

// Series A (MSS SP-44 drilling). Verified against the API International, Troop
// Industrial, Boltport, Wermac and pipingpipeline tables.
const A150: Cell[] = [
  [26, 24, 1.25], [28, 28, 1.25], [30, 28, 1.25], [32, 28, 1.5], [34, 32, 1.5], [36, 32, 1.5], [38, 32, 1.5], [40, 36, 1.5], [42, 36, 1.5],
  [44, 40, 1.5], [46, 40, 1.5], [48, 44, 1.5], [50, 44, 1.75], [52, 44, 1.75], [54, 44, 1.75], [56, 48, 1.75], [58, 48, 1.75], [60, 52, 1.75],
];
const A300: Cell[] = [
  [26, 28, 1.625], [28, 28, 1.625], [30, 28, 1.75], [32, 28, 1.875], [34, 28, 1.875], [36, 32, 2], [38, 32, 1.5], [40, 32, 1.625], [42, 32, 1.625],
  [44, 32, 1.75], [46, 28, 1.875], [48, 32, 1.875], [50, 32, 2], [52, 32, 2], [54, 28, 2.25], [56, 28, 2.25], [58, 32, 2.25], [60, 32, 2.25],
];

// Series B (API 605 drilling). Verified against the Wermac, pipingpipeline,
// API International, Troop Industrial and Boltport tables.
const B150: Cell[] = [
  [26, 36, 0.75], [28, 40, 0.75], [30, 44, 0.75], [32, 48, 0.75], [34, 40, 0.875], [36, 44, 0.875], [38, 40, 1], [40, 44, 1], [42, 48, 1],
  [44, 52, 1], [46, 40, 1.125], [48, 44, 1.125], [50, 48, 1.125], [52, 52, 1.125], [54, 56, 1.125], [56, 60, 1.125], [58, 48, 1.25], [60, 52, 1.25],
];
const B300: Cell[] = [
  [26, 32, 1.25], [28, 36, 1.25], [30, 36, 1.375], [32, 32, 1.5], [34, 36, 1.5], [36, 32, 1.375], [38, 36, 1.375], [40, 40, 1.625], [42, 36, 1.75],
  [44, 40, 1.75], [46, 36, 1.875], [48, 40, 1.875], [50, 44, 1.875], [52, 48, 1.875], [54, 48, 1.875], [56, 36, 2.25], [58, 40, 2.25], [60, 40, 2.25],
];

// Classes 400, 600 and 900: the two series to 36", then one drilling from 38" up.
const A400_TO_36: Cell[] = [[26, 28, 1.75], [28, 28, 1.875], [30, 28, 2], [32, 28, 2], [34, 28, 2], [36, 32, 2]];
const B400_TO_36: Cell[] = [[26, 28, 1.375], [28, 24, 1.5], [30, 28, 1.5], [32, 28, 1.625], [34, 32, 1.625], [36, 28, 1.75]];
const FROM_38_400: Cell[] = [
  [38, 32, 1.75], [40, 32, 1.875], [42, 32, 1.875], [44, 32, 2], [46, 36, 2], [48, 28, 2.25], [50, 32, 2.25], [52, 32, 2.25], [54, 28, 2.5],
  [56, 32, 2.5], [58, 32, 2.5], [60, 32, 2.75],
];
const A600_TO_36: Cell[] = [[26, 28, 1.875], [28, 28, 2], [30, 28, 2], [32, 28, 2.25], [34, 28, 2.25], [36, 28, 2.5]];
const B600_TO_36: Cell[] = [[26, 28, 1.625], [28, 28, 1.75], [30, 28, 1.875], [32, 28, 2], [34, 24, 2.25], [36, 28, 2.25]];
const FROM_38_600: Cell[] = [
  [38, 28, 2.25], [40, 32, 2.25], [42, 28, 2.5], [44, 32, 2.5], [46, 32, 2.5], [48, 32, 2.75], [50, 28, 3], [52, 32, 3], [54, 32, 3],
  [56, 32, 3.25], [58, 32, 3.25], [60, 28, 3.5],
];
const A900_TO_36: Cell[] = [[26, 20, 2.75], [28, 20, 3], [30, 20, 3], [32, 20, 3.25], [34, 20, 3.5], [36, 20, 3.5]];
const B900_TO_36: Cell[] = [[26, 20, 2.5], [28, 20, 2.75], [30, 20, 3], [32, 20, 3], [34, 20, 3.25], [36, 24, 3]];
// Class 900 runs to 48" in the standard.
const FROM_38_900: Cell[] = [[38, 20, 3.5], [40, 24, 3.5], [42, 24, 3.5], [44, 24, 3.75], [46, 24, 4], [48, 24, 4]];

const BY_CLASS: Record<LargeClass, LargeBolting[]> = {
  A150: rows('A', A150),
  A300: rows('A', A300),
  A400: rows('A', [...A400_TO_36, ...FROM_38_400]),
  A600: rows('A', [...A600_TO_36, ...FROM_38_600]),
  A900: rows('A', [...A900_TO_36, ...FROM_38_900]),
  B150: rows('B', B150),
  B300: rows('B', B300),
  B400: rows('B', [...B400_TO_36, ...FROM_38_400]),
  B600: rows('B', [...B600_TO_36, ...FROM_38_600]),
  B900: rows('B', [...B900_TO_36, ...FROM_38_900]),
};

export const isLargeClass = (v: unknown): v is LargeClass => typeof v === 'string' && (LARGE_CLASSES as readonly string[]).includes(v);

export const largeFlange = (nps: number, cls: LargeClass): LargeBolting | undefined => BY_CLASS[cls].find((b) => b.nps === nps);

export const largeSizes = (cls: LargeClass): number[] => BY_CLASS[cls].map((b) => b.nps);

/** The series letter of a large class: 'A' for A150. */
export const seriesOf = (cls: LargeClass): LargeSeries => cls[0] as LargeSeries;

/** The class number of a large class: '150' for A150. */
export const largeNumber = (cls: LargeClass): string => cls.slice(1);

/** The large class for a series and a class number, where the tables have one: ('B', '300') is B300; ('B', '75') is undefined. */
export const largeClassOf = (series: LargeSeries, number: string): LargeClass | undefined => {
  const c = `${series}${number}`;
  return isLargeClass(c) ? c : undefined;
};

/** The series a class number is tabled in, A first. */
export const seriesFor = (number: string): LargeSeries[] => (['A', 'B'] as const).filter((s) => isLargeClass(`${s}${number}`));

/** "B16.47 Series A class 150". */
export const largeWords = (cls: LargeClass): string => `B16.47 Series ${seriesOf(cls)} class ${largeNumber(cls)}`;

/** "32 × 1-1/2" studs". */
export const largeStuds = (f: LargeBolting): string => `${f.bolts} × ${studLabel(f.stud)} studs`;

// ------------------------------------------------------------ the gasket

// Flat ring gaskets, ASME B16.21, for a raised face: the bore is the pipe
// size and the outside diameter the raised face. Outside diameters in inches
// by class, 150, 300, 400 and 600, from the B16.21 tables for B16.47 Series A
// and Series B (wermac.org, as supplied, in millimetres to the millimetre:
// the nearest sixteenth is never in doubt). Class 900 is not tabled. In
// Series B, classes 400 and 600 are tabled to 36": from 38" up the flange is
// the Series A flange, and the Series A figure is the Series B figure too.
const RING_A: Record<number, readonly [number, number, number, number]> = {
  26: [30.5, 32.875, 32.75, 34.125],
  28: [32.75, 35.375, 35.125, 36],
  30: [34.75, 37.5, 37.25, 38.25],
  32: [37, 39.625, 39.5, 40.25],
  34: [39, 41.625, 41.5, 42.25],
  36: [41.25, 44, 44, 44.5],
  38: [43.75, 41.5, 42.25, 43.5],
  40: [45.75, 43.875, 44.375, 45.5],
  42: [48, 45.875, 46.375, 48],
  44: [50.25, 48, 48.5, 50],
  46: [52.25, 50.125, 50.75, 52.25],
  48: [54.5, 52.125, 53, 54.75],
  50: [56.5, 54.25, 55.25, 57],
  52: [58.75, 56.25, 57.25, 59],
  54: [61, 58.75, 59.75, 61.25],
  56: [63.25, 60.75, 61.75, 63.5],
  58: [65.5, 62.75, 63.75, 65.5],
  60: [67.5, 64.75, 66.25, 67.75],
};
const RING_B: Record<number, readonly number[]> = {
  26: [28.5625, 30.375, 29.375, 30.125],
  28: [30.5625, 32.5, 31.5, 32.25],
  30: [32.5625, 34.875, 33.75, 34.625],
  32: [34.6875, 37, 35.875, 36.75],
  34: [36.8125, 39.125, 37.875, 39.25],
  36: [38.875, 41.25, 40.25, 41.25],
  38: [41.125, 43.25],
  40: [43.125, 45.25],
  42: [45.125, 47.25],
  44: [47.125, 49.25],
  46: [49.4375, 51.875],
  48: [51.4375, 53.875],
  50: [53.4375, 55.875],
  52: [55.4375, 57.875],
  54: [57.625, 60.25],
  56: [59.625, 62.75],
  58: [62.1875, 65.1875],
  60: [64.1875, 67.125],
};
const RING_COLUMN: Record<string, number> = { '150': 0, '300': 1, '400': 2, '600': 3 };

/** The flat ring gasket's bore and outside diameter, inches, where the table has them. */
export function ringGasket(nps: number, cls: LargeClass): { id: number; od: number } | undefined {
  const col = RING_COLUMN[largeNumber(cls)];
  if (col === undefined) return undefined;
  const own = (seriesOf(cls) === 'A' ? RING_A : RING_B)[nps]?.[col];
  const od = own ?? (seriesOf(cls) === 'B' && col >= 2 ? RING_A[nps]?.[col] : undefined);
  return od === undefined ? undefined : { id: nps, od };
}

// Spiral wound gaskets, ASME B16.20, class 150: inner ring bore, sealing
// element bore and outside diameter, outer ring outside diameter, in inches
// to two places as the standard gives them, from the B16.20 tables for
// B16.47 Series A and Series B (wermac.org, as supplied, in millimetres),
// checked against a second site's inch figures at both ends of each table.
const SPIRAL_A150: Record<number, readonly [number, number, number, number]> = {
  26: [25.75, 26.5, 27.75, 30.5],
  28: [27.75, 28.5, 29.75, 32.75],
  30: [29.75, 30.5, 31.75, 34.75],
  32: [31.75, 32.5, 33.88, 37],
  34: [33.75, 34.5, 35.88, 39],
  36: [35.75, 36.5, 38.13, 41.25],
  38: [37.75, 38.5, 40.13, 43.75],
  40: [39.75, 40.5, 42.13, 45.75],
  42: [41.75, 42.5, 44.25, 48],
  44: [43.75, 44.5, 46.38, 50.25],
  46: [45.75, 46.5, 48.38, 52.25],
  48: [47.75, 48.5, 50.38, 54.5],
  50: [49.75, 50.5, 52.5, 56.5],
  52: [51.75, 52.5, 54.5, 58.75],
  54: [53.5, 54.5, 56.5, 61],
  56: [55.5, 56.5, 58.5, 63.25],
  58: [57.5, 58.5, 60.5, 65.5],
  60: [59.5, 60.5, 62.5, 67.5],
};
const SPIRAL_B150: Record<number, readonly [number, number, number, number]> = {
  26: [25.75, 26.5, 27.5, 28.56],
  28: [27.75, 28.5, 29.5, 30.56],
  30: [29.75, 30.5, 31.5, 32.56],
  32: [31.75, 32.5, 33.5, 34.69],
  34: [33.75, 34.5, 35.75, 36.81],
  36: [35.75, 36.5, 37.75, 38.88],
  38: [37.75, 38.38, 39.75, 41.13],
  40: [39.75, 40.25, 41.88, 43.13],
  42: [41.75, 42.5, 43.88, 45.13],
  44: [43.75, 44.25, 45.88, 47.13],
  46: [45.75, 46.5, 48.19, 49.44],
  48: [47.75, 48.5, 50, 51.44],
  50: [49.75, 50.5, 52.19, 53.44],
  52: [51.75, 52.5, 54.19, 55.44],
  54: [53.75, 54.5, 56, 57.63],
  56: [56, 56.88, 58.19, 59.63],
  58: [58.19, 59.06, 60.19, 62.19],
  60: [60.44, 61.31, 62.44, 64.19],
};
const SPIRAL: Partial<Record<LargeClass, Record<number, readonly [number, number, number, number]>>> = { A150: SPIRAL_A150, B150: SPIRAL_B150 };

export type SpiralGasket = { innerId: number; sealId: number; sealOd: number; ringOd: number };

/** The spiral wound gasket's four diameters, inches, where the table has them. */
export function spiralGasket(nps: number, cls: LargeClass): SpiralGasket | undefined {
  const r = SPIRAL[cls]?.[nps];
  return r ? { innerId: r[0], sealId: r[1], sealOd: r[2], ringOd: r[3] } : undefined;
}

/**
 * What the gasket for a large flange is ordered as. A Series A and a Series
 * B gasket of the same size and class are different sizes, so the series is
 * part of the name and the record says the other one does not fit; then the
 * figures, where the tables have them.
 */
export function gasketWords(nps: number, cls: LargeClass): string {
  const s = seriesOf(cls);
  const ring = ringGasket(nps, cls);
  const spiral = spiralGasket(nps, cls);
  const figures =
    (ring ? ` Flat ring ${formatInches(ring.id)} bore × ${formatInches(ring.od)} outside.` : '') +
    (spiral ? ` Spiral wound: sealing element ${formatInches(spiral.sealId)} × ${formatInches(spiral.sealOd)}, outer ring ${formatInches(spiral.ringOd)}, inner ring ${formatInches(spiral.innerId)} bore.` : '');
  return `Gasket to ASME B16.20 (spiral wound) or B16.21 (flat ring) for B16.47 Series ${s}, NPS ${nps} class ${largeNumber(cls)}; a Series ${s === 'A' ? 'B' : 'A'} gasket does not fit.${figures}`;
}
