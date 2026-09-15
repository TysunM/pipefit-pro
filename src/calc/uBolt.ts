// U-bolts for pipe hangers, page 2-66.
//
// The length is measured with a quarter inch plate and half an inch of thread
// standing proud of the nut, which is what the drawing sets out. Sizes up to
// four inch are made in the four small bolt diameters, five inch and up in the
// three large ones.

export type UBoltRow = { nps: number; label: string; lengths: Partial<Record<string, number>> };

/** Plate thickness the lengths are figured against. */
export const U_BOLT_PLATE = 0.25;
/** Thread standing proud of the nut, which the lengths also allow for. */
export const U_BOLT_THREAD_PROUD = 0.5;

export const U_BOLTS: UBoltRow[] = [
  { nps: 0.5, label: '1/2"', lengths: { '1/4': 5.25, '3/8': 6.125 } },
  { nps: 0.75, label: '3/4"', lengths: { '1/4': 5.75, '3/8': 6.75 } },
  { nps: 1, label: '1"', lengths: { '1/4': 6.25, '3/8': 7.375 } },
  { nps: 1.25, label: '1-1/4"', lengths: { '1/4': 7.125, '3/8': 8 } },
  { nps: 1.5, label: '1-1/2"', lengths: { '1/4': 7.875, '3/8': 8.75 } },
  { nps: 2, label: '2"', lengths: { '1/4': 8.875, '3/8': 9.5 } },
  { nps: 2.5, label: '2-1/2"', lengths: { '1/4': 9.25, '3/8': 9.25, '1/2': 11.125, '5/8': 11.125 } },
  { nps: 3, label: '3"', lengths: { '1/4': 11.75, '3/8': 11.75, '1/2': 12.25, '5/8': 12.25 } },
  { nps: 3.5, label: '3-1/2"', lengths: { '1/4': 13, '3/8': 13, '1/2': 14.25, '5/8': 14.25 } },
  { nps: 4, label: '4"', lengths: { '1/4': 14.375, '3/8': 14.375, '1/2': 15.375, '5/8': 15.375 } },
  { nps: 5, label: '5"', lengths: { '3/4': 19, '7/8': 19, '1': 19.75 } },
  { nps: 6, label: '6"', lengths: { '3/4': 21.625, '7/8': 21.625, '1': 22.375 } },
  { nps: 8, label: '8"', lengths: { '3/4': 26.875, '7/8': 26.875, '1': 27.875 } },
  { nps: 10, label: '10"', lengths: { '3/4': 32.5, '7/8': 32.5, '1': 37.5 } },
];

/** Bolt diameters the page carries, smallest first. */
export const U_BOLT_DIAMETERS = ['1/4', '3/8', '1/2', '5/8', '3/4', '7/8', '1'] as const;
export type UBoltDiameter = (typeof U_BOLT_DIAMETERS)[number];

const BY_NPS = new Map(U_BOLTS.map((u) => [u.nps, u]));

/** Length of a U-bolt for a size and bolt diameter. */
export const uBolt = (nps: number, diameter: UBoltDiameter): number =>
  BY_NPS.get(nps)?.lengths[diameter] ?? NaN;

/** Bolt diameters a size is made in. */
export const uBoltDiameters = (nps: number): UBoltDiameter[] =>
  U_BOLT_DIAMETERS.filter((d) => Number.isFinite(BY_NPS.get(nps)?.lengths[d] ?? NaN));

export const uBoltSizes = (): number[] => U_BOLTS.map((u) => u.nps);
