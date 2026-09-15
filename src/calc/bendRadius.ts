// Shortest radius standard weight pipe can be bent to, cold, where some
// flattening at the bend is allowed. Handbook page 1-106.
//
// The page carries two recommendations alongside the table. National Tube put
// the minimum advisable radius at five times the nominal size for steel; Byers
// say the same for wrought iron from 2-1/2 to 4 inch, and that wrought iron
// over 2-1/2 should be bent hot if a smaller radius is wanted. Five times the
// size is larger than the tabled minimum in every size either company covers,
// so the table is the hard floor and five times the size is the advice.

export type MinBendRadius = {
  nps: number;
  label: string;
  /** Shortest radius for steel pipe, inches. */
  steel: number;
  /** Shortest radius for wrought iron pipe, or no value where not listed. */
  wroughtIron: number;
};

const N = NaN;

export const MIN_BEND_RADIUS: MinBendRadius[] = [
  { nps: 0.25, label: '1/4"', steel: 1, wroughtIron: N },
  { nps: 0.375, label: '3/8"', steel: 1.25, wroughtIron: N },
  { nps: 0.5, label: '1/2"', steel: 1.5, wroughtIron: 1.375 },
  { nps: 0.75, label: '3/4"', steel: 1.75, wroughtIron: 1.75 },
  { nps: 1, label: '1"', steel: 2, wroughtIron: 2.125 },
  { nps: 1.25, label: '1-1/4"', steel: 2.25, wroughtIron: 2.75 },
  { nps: 1.5, label: '1-1/2"', steel: 2.5, wroughtIron: 3.5 },
  { nps: 2, label: '2"', steel: 3, wroughtIron: 5.5 },
  { nps: 2.5, label: '2-1/2"', steel: 5, wroughtIron: 10 },
  { nps: 3, label: '3"', steel: 8, wroughtIron: 12 },
  { nps: 3.5, label: '3-1/2"', steel: 10, wroughtIron: 14 },
  { nps: 4, label: '4"', steel: 12, wroughtIron: 16 },
  { nps: 5, label: '5"', steel: 18, wroughtIron: 20 },
  { nps: 6, label: '6"', steel: 22, wroughtIron: 26 },
  { nps: 8, label: '8"', steel: 30, wroughtIron: 30 },
  { nps: 10, label: '10"', steel: 36, wroughtIron: 36 },
  { nps: 12, label: '12"', steel: 46, wroughtIron: 46 },
];

export type BendMaterial = 'steel' | 'wroughtIron';

const BY_NPS = new Map(MIN_BEND_RADIUS.map((r) => [r.nps, r]));

/** The tabled floor for a size and material. */
export const minBendRadius = (nps: number, material: BendMaterial = 'steel'): number =>
  BY_NPS.get(nps)?.[material] ?? NaN;

/** Five times the nominal size, what both pipe makers advise as a minimum. */
export const advisableBendRadius = (nps: number): number =>
  BY_NPS.has(nps) ? 5 * nps : NaN;

export type RadiusVerdict = 'ok' | 'belowAdvised' | 'belowMinimum' | 'unknown';

/**
 * Whether a bend radius is safe for a size. Below the tabled figure the pipe
 * is being bent tighter than it is made to take; between there and five times
 * the size it is inside what the pipe makers advise.
 */
export function checkBendRadius(
  nps: number,
  radius: number,
  material: BendMaterial = 'steel'
): RadiusVerdict {
  const floor = minBendRadius(nps, material);
  if (!Number.isFinite(floor) || !Number.isFinite(radius) || radius <= 0) return 'unknown';
  if (radius < floor) return 'belowMinimum';
  if (radius < advisableBendRadius(nps)) return 'belowAdvised';
  return 'ok';
}

/** Whether the book lists wrought iron in a size. */
export const bendsInWroughtIron = (nps: number): boolean =>
  Number.isFinite(BY_NPS.get(nps)?.wroughtIron ?? NaN);

export const bendRadiusSizes = (): number[] => MIN_BEND_RADIUS.map((r) => r.nps);
