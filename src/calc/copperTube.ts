// Copper tube, pages 5-13 to 5-16.
//
// Every type runs on the same outside diameter: the nominal size plus an
// eighth of an inch, in every size on all four pages. Only the bore changes,
// so only the bore is held and everything else is worked from it.
//
// Type K is the heavy wall, L the medium, M the light. K and L are made in
// hard and soft temper, M in hard only. K and L bend cold and soft temper K
// and L can be bent large radius by hand; L in hard temper and M are not to be
// bent. DWV is drainage tube, made from an inch and a quarter up.

export type CopperType = 'K' | 'L' | 'M' | 'DWV';

/** Copper, pounds per cubic inch. */
export const COPPER_DENSITY = 0.323;

/** What the outside diameter runs over the nominal size, on every type. */
export const COPPER_OD_OVER_NOMINAL = 0.125;

const BORE_K: [number, number][] = [
  [0.125, 0.186], [0.25, 0.311], [0.375, 0.402], [0.5, 0.527], [0.625, 0.652], [0.75, 0.745], [1, 0.995], [1.25, 1.245], [1.5, 1.481], [2, 1.959], [2.5, 2.435], [3, 2.907], [4, 3.857], [5, 4.805], [6, 5.741], [8, 7.583], [10, 9.449], [12, 11.315]
];

const BORE_L: [number, number][] = [
  [0.125, 0.2], [0.25, 0.315], [0.375, 0.43], [0.5, 0.545], [0.625, 0.666], [0.75, 0.785], [1, 1.025], [1.25, 1.265], [1.5, 1.505], [2, 1.985], [2.5, 2.465], [3, 2.945], [4, 3.905], [5, 4.875], [6, 5.845], [8, 7.725], [10, 9.625], [12, 11.565]
];

const BORE_M: [number, number][] = [
  [0.125, 0.2], [0.25, 0.325], [0.375, 0.45], [0.5, 0.569], [0.625, 0.69], [0.75, 0.811], [1, 1.055], [1.25, 1.291], [1.5, 1.527], [2, 2.009]
];

const BORE_DWV: [number, number][] = [
  [1.25, 1.295], [1.5, 1.541], [2, 2.041], [3, 3.035], [4, 4.009], [5, 4.981], [6, 5.959]
];

const BORES: Record<CopperType, Map<number, number>> = {
  K: new Map(BORE_K),
  L: new Map(BORE_L),
  M: new Map(BORE_M),
  DWV: new Map(BORE_DWV),
};

/**
 * The type L two and a half inch bore.
 *
 * Page 5-14 prints it as 1.465, which is smaller than the two inch above it
 * and would make the wall nearly six tenths of an inch on a two and a
 * half inch tube. The printed weight of 2.48 pounds a foot works back to a
 * wall of eighty thousandths, which is a bore of 2.465. The leading digit is
 * what went astray.
 */
export const TYPE_L_TWO_AND_A_HALF = { printed: 1.465, held: 2.465 };

export type CopperTube = {
  nps: number;
  label: string;
  type: CopperType;
  od: number;
  id: number;
  wall: number;
  /** Outside circumference. */
  circumference: number;
  /** Cross sectional area of the bore, square inches. */
  boreArea: number;
  /** Weight of the tube itself, pounds per foot. */
  weightPerFoot: number;
  /** Weight of the water it holds, pounds per foot. */
  filledWeightPerFoot: number;
  /** Gallons it holds per foot. */
  gallonsPerFoot: number;
};

/** Outside diameter of copper tube: the nominal size plus an eighth. */
export const copperOd = (nps: number): number =>
  Number.isFinite(nps) && nps > 0 ? nps + COPPER_OD_OVER_NOMINAL : NaN;

export function copperTube(nps: number, type: CopperType = 'L'): CopperTube | undefined {
  const id = BORES[type].get(nps);
  if (id === undefined) return undefined;
  const od = copperOd(nps);
  const wall = (od - id) / 2;
  const boreArea = (Math.PI * id * id) / 4;
  return {
    nps,
    label: labelFor(nps),
    type,
    od,
    id,
    wall,
    circumference: Math.PI * od,
    boreArea,
    weightPerFoot: 12 * Math.PI * COPPER_DENSITY * wall * (od - wall),
    filledWeightPerFoot: boreArea * 12 * 0.0361273,
    gallonsPerFoot: (boreArea * 12) / 231,
  };
}

const LABELS = new Map<number, string>([
  [0.125, '1/8"'],
  [0.25, '1/4"'],
  [0.375, '3/8"'],
  [0.5, '1/2"'],
  [0.625, '5/8"'],
  [0.75, '3/4"'],
  [1, '1"'],
  [1.25, '1-1/4"'],
  [1.5, '1-1/2"'],
  [2, '2"'],
  [2.5, '2-1/2"'],
  [3, '3"'],
  [4, '4"'],
  [5, '5"'],
  [6, '6"'],
  [8, '8"'],
  [10, '10"'],
  [12, '12"'],
]);

const labelFor = (nps: number): string => LABELS.get(nps) ?? `${nps}"`;

export const copperSizes = (type: CopperType = 'L'): number[] => [...BORES[type].keys()];

/** Whether a type and temper may be bent cold. */
export function copperBends(type: CopperType, temper: 'hard' | 'soft' = 'soft'): boolean {
  if (type === 'DWV') return false;
  if (type === 'M') return false;
  if (type === 'L') return temper === 'soft';
  return true;
}

/** Tempers a type is made in. */
export const copperTempers = (type: CopperType): ('hard' | 'soft')[] =>
  type === 'M' || type === 'DWV' ? ['hard'] : ['hard', 'soft'];

/** Largest size a portable bender is made for. */
export const LARGEST_HAND_BENT_COPPER = 1;
