import { FlangeClass } from './flangedFitting';

// Length through the hub of steel welding neck flanges, Y, pages 4-68 and 4-69.
//
// A welding neck flange butts to the pipe rather than sliding over it, so this
// is what it adds to the run at each joint.
//
// Two cells on those pages are inked over. The 400 lb eighteen inch is read as
// 6-1/2: from eight inch up every 400 lb figure is exactly a quarter more than
// the 300 lb one in the same size, and the 300 lb eighteen is 6-1/4. The 900 lb
// fourteen inch is read as 8-3/8: its fraction survives and only one whole
// number falls between the twelve inch and the sixteen.

export type WeldingNeck = { nps: number; label: string; y: Partial<Record<FlangeClass, number>> };

const N = undefined;

export const WELDING_NECKS: WeldingNeck[] = [
  { nps: 0.5, label: '1/2"', y: { '150': 1.875, '300': 2.0625, '400': 2.0625, '600': 2.0625, '900': 2.375, '1500': 2.375, '2500': 2.875 } },
  { nps: 0.75, label: '3/4"', y: { '150': 2.0625, '300': 2.25, '400': 2.25, '600': 2.25, '900': 2.75, '1500': 2.75, '2500': 3.125 } },
  { nps: 1, label: '1"', y: { '150': 2.1875, '300': 2.4375, '400': 2.4375, '600': 2.4375, '900': 2.875, '1500': 2.875, '2500': 3.5 } },
  { nps: 1.25, label: '1-1/4"', y: { '150': 2.25, '300': 2.5625, '400': 2.625, '600': 2.625, '900': 2.875, '1500': 2.875, '2500': 3.75 } },
  { nps: 1.5, label: '1-1/2"', y: { '150': 2.4375, '300': 2.6875, '400': 2.75, '600': 2.75, '900': 3.25, '1500': 3.25, '2500': 4.375 } },
  { nps: 2, label: '2"', y: { '150': 2.5, '300': 2.75, '400': 2.875, '600': 2.875, '900': 4.0, '1500': 4.0, '2500': 5.0 } },
  { nps: 2.5, label: '2-1/2"', y: { '150': 2.75, '300': 3.0, '400': 3.125, '600': 3.125, '900': 4.125, '1500': 4.125, '2500': 5.625 } },
  { nps: 3, label: '3"', y: { '150': 2.75, '300': 3.125, '400': 3.25, '600': 3.25, '900': 4.0, '1500': 4.625, '2500': 6.625 } },
  { nps: 3.5, label: '3-1/2"', y: { '150': 2.8125, '300': 3.1875, '400': 3.375, '600': 3.375, '900': N, '1500': N, '2500': N } },
  { nps: 4, label: '4"', y: { '150': 3.0, '300': 3.375, '400': 3.5, '600': 4.0, '900': 4.5, '1500': 4.875, '2500': 7.5 } },
  { nps: 5, label: '5"', y: { '150': 3.5, '300': 3.875, '400': 4.0, '600': 4.5, '900': 5.0, '1500': 6.125, '2500': 9.0 } },
  { nps: 6, label: '6"', y: { '150': 3.5, '300': 3.875, '400': 4.0625, '600': 4.625, '900': 5.5, '1500': 6.75, '2500': 10.75 } },
  { nps: 8, label: '8"', y: { '150': 4.0, '300': 4.375, '400': 4.625, '600': 5.25, '900': 6.375, '1500': 8.375, '2500': 12.5 } },
  { nps: 10, label: '10"', y: { '150': 4.0, '300': 4.625, '400': 4.875, '600': 6.0, '900': 7.25, '1500': 10.0, '2500': 16.5 } },
  { nps: 12, label: '12"', y: { '150': 4.5, '300': 5.125, '400': 5.375, '600': 6.125, '900': 7.875, '1500': 11.125, '2500': 18.25 } },
  { nps: 14, label: '14" OD', y: { '150': 5.0, '300': 5.625, '400': 5.875, '600': 6.5, '900': 8.375, '1500': 11.75, '2500': N } },
  { nps: 16, label: '16" OD', y: { '150': 5.0, '300': 5.75, '400': 6.0, '600': 7.0, '900': 8.5, '1500': 12.25, '2500': N } },
  { nps: 18, label: '18" OD', y: { '150': 5.5, '300': 6.25, '400': 6.5, '600': 7.25, '900': 9.0, '1500': 12.875, '2500': N } },
  { nps: 20, label: '20" OD', y: { '150': 5.6875, '300': 6.375, '400': 6.625, '600': 7.5, '900': 9.75, '1500': 14.0, '2500': N } },
  { nps: 24, label: '24" OD', y: { '150': 6.0, '300': 6.625, '400': 6.875, '600': 8.0, '900': 11.5, '1500': 16.0, '2500': N } },
];

const BY_NPS = new Map(WELDING_NECKS.map((w) => [w.nps, w]));

/** Length through the hub of a welding neck flange. */
export const weldingNeck = (nps: number, cls: FlangeClass = '150'): number =>
  BY_NPS.get(nps)?.y[cls] ?? NaN;

export const weldingNeckSizes = (cls: FlangeClass = '150'): number[] =>
  WELDING_NECKS.filter((w) => w.y[cls] !== undefined).map((w) => w.nps);
