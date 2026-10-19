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
// than one source: Series A classes 150 and 300 to 60", 600 and 900 to 48";
// Series B classes 150 and 300 to 60". Class 75, class 400, Series B 600 and
// 900, and Series A 600 above 48" are left out rather than guessed at. A
// flange not in these tables is bolted with the count set by hand and the
// stud size read off the drawing.
//
// As with B16.5, the class sets the studs and the studs set the torque. The
// stud size is shown wherever the flange is, so a man can check it against
// the studs in his hand before the torque is trusted.

import { studLabel, type SteelBolting } from './steelFlange';

export type LargeSeries = 'A' | 'B';
/** A series letter and a class number: the way a joint records a B16.47 flange. */
export type LargeClass = 'A150' | 'A300' | 'A600' | 'A900' | 'B150' | 'B300';

export const LARGE_CLASSES: readonly LargeClass[] = ['A150', 'A300', 'A600', 'A900', 'B150', 'B300'];

export type LargeBolting = SteelBolting & { series: LargeSeries };

const rows = (series: LargeSeries, cells: readonly (readonly [number, number, number])[]): LargeBolting[] =>
  cells.map(([nps, bolts, stud]) => ({ nps, label: `${nps}" OD`, bolts, stud, series }));

// Series A (MSS SP-44 drilling). Verified against the API International, Troop
// Industrial, Boltport, Wermac and pipingpipeline tables.
const A150 = rows('A', [
  [26, 24, 1.25], [28, 28, 1.25], [30, 28, 1.25], [32, 28, 1.5], [34, 32, 1.5], [36, 32, 1.5], [38, 32, 1.5], [40, 36, 1.5], [42, 36, 1.5],
  [44, 40, 1.5], [46, 40, 1.5], [48, 44, 1.5], [50, 44, 1.75], [52, 44, 1.75], [54, 44, 1.75], [56, 48, 1.75], [58, 48, 1.75], [60, 52, 1.75],
]);
const A300 = rows('A', [
  [26, 28, 1.625], [28, 28, 1.625], [30, 28, 1.75], [32, 28, 1.875], [34, 28, 1.875], [36, 32, 2], [38, 32, 1.5], [40, 32, 1.625], [42, 32, 1.625],
  [44, 32, 1.75], [46, 28, 1.875], [48, 32, 1.875], [50, 32, 2], [52, 32, 2], [54, 28, 2.25], [56, 28, 2.25], [58, 32, 2.25], [60, 32, 2.25],
]);
// Class 600 to 48": the published tables disagree above that, so it stops there.
const A600 = rows('A', [
  [26, 28, 1.875], [28, 28, 2], [30, 28, 2], [32, 28, 2.25], [34, 28, 2.25], [36, 28, 2.5], [38, 28, 2.25], [40, 32, 2.25], [42, 28, 2.5],
  [44, 32, 2.5], [46, 32, 2.5], [48, 32, 2.75],
]);
// Class 900 runs to 48" in the standard.
const A900 = rows('A', [
  [26, 20, 2.75], [28, 20, 3], [30, 20, 3], [32, 20, 3.25], [34, 20, 3.5], [36, 20, 3.5], [38, 20, 3.5], [40, 24, 3.5], [42, 24, 3.5],
  [44, 24, 3.75], [46, 24, 4], [48, 24, 4],
]);

// Series B (API 605 drilling). Verified against the Wermac, pipingpipeline,
// API International and Boltport tables.
const B150 = rows('B', [
  [26, 36, 0.75], [28, 40, 0.75], [30, 44, 0.75], [32, 48, 0.75], [34, 40, 0.875], [36, 44, 0.875], [38, 40, 1], [40, 44, 1], [42, 48, 1],
  [44, 52, 1], [46, 40, 1.125], [48, 44, 1.125], [50, 48, 1.125], [52, 52, 1.125], [54, 56, 1.125], [56, 60, 1.125], [58, 48, 1.25], [60, 52, 1.25],
]);
const B300 = rows('B', [
  [26, 32, 1.25], [28, 36, 1.25], [30, 36, 1.375], [32, 32, 1.5], [34, 36, 1.5], [36, 32, 1.375], [38, 36, 1.375], [40, 40, 1.625], [42, 36, 1.75],
  [44, 40, 1.75], [46, 36, 1.875], [48, 40, 1.875], [50, 44, 1.875], [52, 48, 1.875], [54, 48, 1.875], [56, 36, 2.25], [58, 40, 2.25], [60, 40, 2.25],
]);

const BY_CLASS: Record<LargeClass, LargeBolting[]> = { A150, A300, A600, A900, B150, B300 };

export const isLargeClass = (v: unknown): v is LargeClass => typeof v === 'string' && (LARGE_CLASSES as readonly string[]).includes(v);

export const largeFlange = (nps: number, cls: LargeClass): LargeBolting | undefined => BY_CLASS[cls].find((b) => b.nps === nps);

export const largeSizes = (cls: LargeClass): number[] => BY_CLASS[cls].map((b) => b.nps);

/** The series letter of a large class: 'A' for A150. */
export const seriesOf = (cls: LargeClass): LargeSeries => cls[0] as LargeSeries;

/** The class number of a large class: '150' for A150. */
export const largeNumber = (cls: LargeClass): string => cls.slice(1);

/** The large class for a series and a class number, where the tables have one: ('B', '300') is B300; ('B', '600') is undefined. */
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
