// Expansion of pipe per 100 feet, page 5-25.
//
// The table gives how much a hundred feet has grown from nought degrees at
// each temperature. The expansion between two temperatures is the difference
// between their two figures, which is how the book's own worked example runs.

export type ExpansionMaterial = 'steel' | 'wroughtIron' | 'copper';

export type ExpansionRow = {
  temperatureF: number;
  steel: number;
  wroughtIron: number;
  copper: number;
};

export const EXPANSION: ExpansionRow[] = [
  { temperatureF: 0, steel: 0, wroughtIron: 0, copper: 0 },
  { temperatureF: 20, steel: 0.149, wroughtIron: 0.156, copper: 0.222 },
  { temperatureF: 40, steel: 0.299, wroughtIron: 0.313, copper: 0.444 },
  { temperatureF: 60, steel: 0.449, wroughtIron: 0.47, copper: 0.668 },
  { temperatureF: 80, steel: 0.601, wroughtIron: 0.629, copper: 0.893 },
  { temperatureF: 100, steel: 0.755, wroughtIron: 0.791, copper: 1.119 },
  { temperatureF: 120, steel: 0.909, wroughtIron: 0.952, copper: 1.346 },
  { temperatureF: 140, steel: 1.066, wroughtIron: 1.115, copper: 1.575 },
  { temperatureF: 160, steel: 1.224, wroughtIron: 1.281, copper: 1.805 },
  { temperatureF: 180, steel: 1.384, wroughtIron: 1.447, copper: 2.035 },
  { temperatureF: 200, steel: 1.545, wroughtIron: 1.616, copper: 2.268 },
  { temperatureF: 220, steel: 1.708, wroughtIron: 1.786, copper: 2.501 },
  { temperatureF: 240, steel: 1.872, wroughtIron: 1.957, copper: 2.736 },
  { temperatureF: 260, steel: 2.038, wroughtIron: 2.13, copper: 2.971 },
  { temperatureF: 280, steel: 2.207, wroughtIron: 2.305, copper: 3.208 },
  { temperatureF: 300, steel: 2.376, wroughtIron: 2.481, copper: 3.446 },
  { temperatureF: 320, steel: 2.547, wroughtIron: 2.659, copper: 3.685 },
  { temperatureF: 340, steel: 2.718, wroughtIron: 2.838, copper: 3.926 },
  { temperatureF: 360, steel: 2.892, wroughtIron: 3.017, copper: 4.167 },
  { temperatureF: 380, steel: 3.069, wroughtIron: 3.199, copper: 4.411 },
  { temperatureF: 400, steel: 3.245, wroughtIron: 3.383, copper: 4.653 },
  { temperatureF: 500, steel: 4.148, wroughtIron: 4.327, copper: 5.892 },
  { temperatureF: 600, steel: 5.096, wroughtIron: 5.309, copper: 7.16 },
  { temperatureF: 700, steel: 6.083, wroughtIron: 6.351, copper: 8.46 },
  { temperatureF: 800, steel: 7.102, wroughtIron: 7.384, copper: 9.783 },
  { temperatureF: 900, steel: 8.172, wroughtIron: 8.489, copper: 11.144 },
  { temperatureF: 1000, steel: 9.275, wroughtIron: 9.627, copper: 12.532 },
  // The page prints 10.042 for steel here. Every other hundred degree step in
  // that column runs between one and one and a quarter inches, and 9.275 to
  // 10.042 is 0.767 while 10.042 to 11.598 is 1.556. The two digits after the
  // point have been swapped: 10.402 puts the steps at 1.127 and 1.196, in line
  // with the wrought iron and copper columns, which are both regular there.
  { temperatureF: 1100, steel: 10.402, wroughtIron: 10.804, copper: 13.95 },
  { temperatureF: 1200, steel: 11.598, wroughtIron: 12.02, copper: 15.397 },
];

/** What page 5-25 prints for steel at 1100 degrees, against what is held. */
export const STEEL_AT_1100 = { printed: 10.042, held: 10.402 };

export const LOWEST_TEMPERATURE = 0;
export const HIGHEST_TEMPERATURE = 1200;

/** Growth of a hundred feet from nought degrees, interpolated. */
export function growthFromZero(temperatureF: number, material: ExpansionMaterial): number {
  if (!Number.isFinite(temperatureF)) return NaN;
  if (temperatureF < LOWEST_TEMPERATURE || temperatureF > HIGHEST_TEMPERATURE) return NaN;
  for (let i = 1; i < EXPANSION.length; i++) {
    const lo = EXPANSION[i - 1]!;
    const hi = EXPANSION[i]!;
    if (temperatureF > hi.temperatureF) continue;
    const share = (temperatureF - lo.temperatureF) / (hi.temperatureF - lo.temperatureF);
    return lo[material] + share * (hi[material] - lo[material]);
  }
  return NaN;
}

/**
 * How much a run grows going from one temperature to a higher one, in inches.
 *
 * The book's worked example: 740 feet of steel put in at 60 degrees, with 400
 * degree steam turned on, grows 20.69 inches.
 */
export function expansion(
  runFeet: number,
  fromF: number,
  toF: number,
  material: ExpansionMaterial = 'steel'
): number {
  const low = growthFromZero(fromF, material);
  const high = growthFromZero(toF, material);
  if (!Number.isFinite(low) || !Number.isFinite(high) || !Number.isFinite(runFeet)) return NaN;
  if (runFeet <= 0) return NaN;
  return ((high - low) * runFeet) / 100;
}

/** The same figure per hundred feet, which is how the table reads. */
export const expansionPerHundredFeet = (
  fromF: number,
  toF: number,
  material: ExpansionMaterial = 'steel'
): number => expansion(100, fromF, toF, material);

export const expansionTemperatures = (): number[] => EXPANSION.map((r) => r.temperatureF);
