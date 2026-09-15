import { FlangeClass } from './flangedFitting';
import { steelGate } from './valve';

// Laying lengths of steel valves with butt welding ends, pages 2-57 to 2-62.
//
// In 900, 1500 and 2500 lb a butt welding valve is the same face to face as a
// flanged one, gate, globe and swing check alike, so those classes are read
// from the flanged tables rather than held again. The light classes are their
// own: a butt welding body needs weld prep on each end, and in 150 and 300 lb
// that makes it longer than the flanged valve. In 400 and 600 lb the flanged
// body was already long enough and the two agree.

export type WeldValveRow = {
  nps: number;
  faceToFace: Partial<Record<FlangeClass, number>>;
};

// Solid wedge and double disc gate valves, page 2-57.
export const WELD_GATE_LIGHT: WeldValveRow[] = [
  { nps: 1, faceToFace: { '150': 5, '300': undefined, '400': 8.5, '600': 8.5 } },
  { nps: 1.25, faceToFace: { '150': 5.5, '300': undefined, '400': 9, '600': 9 } },
  { nps: 1.5, faceToFace: { '150': 6.5, '300': 7.5, '400': 9.5, '600': 9.5 } },
  { nps: 2, faceToFace: { '150': 8.5, '300': 8.5, '400': 11.5, '600': 11.5 } },
  { nps: 2.5, faceToFace: { '150': 9.5, '300': 9.5, '400': 13, '600': 13 } },
  { nps: 3, faceToFace: { '150': 11.125, '300': 11.125, '400': 14, '600': 14 } },
  { nps: 4, faceToFace: { '150': 12, '300': 12, '400': 16, '600': 17 } },
  { nps: 5, faceToFace: { '150': 15, '300': 15, '400': 18, '600': 20 } },
  { nps: 6, faceToFace: { '150': 15.875, '300': 15.875, '400': 19.5, '600': 22 } },
  { nps: 8, faceToFace: { '150': 16.5, '300': 16.5, '400': 23.5, '600': 26 } },
  { nps: 10, faceToFace: { '150': 18, '300': 18, '400': 26.5, '600': 31 } },
  { nps: 12, faceToFace: { '150': 19.75, '300': 19.75, '400': 30, '600': 33 } },
  { nps: 14, faceToFace: { '150': 22.5, '300': 30, '400': 32.5, '600': 35 } },
  { nps: 16, faceToFace: { '150': 24, '300': 33, '400': 35.5, '600': 39 } },
  { nps: 18, faceToFace: { '150': 26, '300': 36, '400': 38.5, '600': 43 } },
  { nps: 20, faceToFace: { '150': 28, '300': 39, '400': 41.5, '600': 47 } },
  { nps: 24, faceToFace: { '150': 32, '300': 45, '400': 48.5, '600': 55 } },
];

// Globe and angle valves, page 2-59. The page prints 2 x A for the globe and
// A for the angle, so an angle valve is half of what is held here.
export const WELD_GLOBE_LIGHT: WeldValveRow[] = [
  { nps: 0.5, faceToFace: { '150': 4.25, '300': 6, '400': 6.5, '600': 6.5 } },
  { nps: 0.75, faceToFace: { '150': 4.625, '300': 7, '400': 7.5, '600': 7.5 } },
  { nps: 1, faceToFace: { '150': 5, '300': 8, '400': 8.5, '600': 8.5 } },
  { nps: 1.25, faceToFace: { '150': 5.5, '300': 8.5, '400': 9, '600': 9 } },
  { nps: 1.5, faceToFace: { '150': 6.5, '300': 9, '400': 9.5, '600': 9.5 } },
  { nps: 2, faceToFace: { '150': 8, '300': 10.5, '400': 11.5, '600': 11.5 } },
  { nps: 2.5, faceToFace: { '150': 8.5, '300': 11.5, '400': 13, '600': 13 } },
  { nps: 3, faceToFace: { '150': 9.5, '300': 12.5, '400': 14, '600': 14 } },
  { nps: 4, faceToFace: { '150': 11.5, '300': 14, '400': 16, '600': 17 } },
  { nps: 5, faceToFace: { '150': 14, '300': 15.75, '400': 18, '600': 20 } },
  { nps: 6, faceToFace: { '150': 16, '300': 17.5, '400': 19.5, '600': 22 } },
  { nps: 8, faceToFace: { '150': 19.5, '300': 22, '400': 23.5, '600': 26 } },
  { nps: 10, faceToFace: { '150': 24.5, '300': 24.5, '400': 26.5, '600': 31 } },
  { nps: 12, faceToFace: { '150': 27.5, '300': 28, '400': 30, '600': 33 } },
  { nps: 14, faceToFace: { '150': 31, '300': undefined, '400': undefined, '600': undefined } },
  { nps: 16, faceToFace: { '150': 36, '300': undefined, '400': undefined, '600': undefined } },
];

// Swing check valves, page 2-61.
export const WELD_CHECK_LIGHT: WeldValveRow[] = [
  { nps: 0.5, faceToFace: { '150': 4.25, '300': undefined, '400': 6.5, '600': 6.5 } },
  { nps: 0.75, faceToFace: { '150': 4.625, '300': undefined, '400': 7.5, '600': 7.5 } },
  { nps: 1, faceToFace: { '150': 5, '300': 8.5, '400': 8.5, '600': 8.5 } },
  { nps: 1.25, faceToFace: { '150': 5.5, '300': 9, '400': 9, '600': 9 } },
  { nps: 1.5, faceToFace: { '150': 6.5, '300': 9.5, '400': 9.5, '600': 9.5 } },
  { nps: 2, faceToFace: { '150': 8, '300': 10.5, '400': 11.5, '600': 11.5 } },
  { nps: 2.5, faceToFace: { '150': 8.5, '300': 11.5, '400': 13, '600': 13 } },
  { nps: 3, faceToFace: { '150': 9.5, '300': 12.5, '400': 14, '600': 14 } },
  { nps: 4, faceToFace: { '150': 11.5, '300': 14, '400': 16, '600': 17 } },
  { nps: 5, faceToFace: { '150': 13, '300': 15.75, '400': 18, '600': 20 } },
  { nps: 6, faceToFace: { '150': 14, '300': 17.5, '400': 19.5, '600': 22 } },
  { nps: 8, faceToFace: { '150': 19.5, '300': 21, '400': 23.5, '600': 26 } },
  { nps: 10, faceToFace: { '150': 24.5, '300': 24.5, '400': 26.5, '600': 31 } },
  { nps: 12, faceToFace: { '150': 27.5, '300': 28, '400': 30, '600': 33 } },
  { nps: 14, faceToFace: { '150': 31, '300': undefined, '400': undefined, '600': undefined } },
];
const GATE_BY_NPS = new Map(WELD_GATE_LIGHT.map((r) => [r.nps, r]));
const GLOBE_BY_NPS = new Map(WELD_GLOBE_LIGHT.map((r) => [r.nps, r]));
const CHECK_BY_NPS = new Map(WELD_CHECK_LIGHT.map((r) => [r.nps, r]));

const HEAVY: FlangeClass[] = ['900', '1500', '2500'];

/** The three quarter and half inch rows the heavy butt welding pages add. */
const HEAVY_SMALL: Record<number, Partial<Record<FlangeClass, number>>> = {
  0.5: { '2500': 10.375 },
  0.75: { '900': 9, '1500': 9, '2500': 10.75 },
};

function heavy(nps: number, cls: FlangeClass): number {
  if (!HEAVY.includes(cls)) return NaN;
  const small = HEAVY_SMALL[nps]?.[cls];
  if (small !== undefined) return small;
  return steelGate(nps, cls);
}

/** Face to face of a butt welding end gate valve. */
export function weldGate(nps: number, cls: FlangeClass): number {
  const light = GATE_BY_NPS.get(nps)?.faceToFace[cls];
  return light !== undefined ? light : heavy(nps, cls);
}

/** Face to face of a butt welding end globe valve. */
export function weldGlobe(nps: number, cls: FlangeClass): number {
  const light = GLOBE_BY_NPS.get(nps)?.faceToFace[cls];
  return light !== undefined ? light : heavy(nps, cls);
}

/** Face to centre of a butt welding end angle valve: half the globe figure. */
export const weldAngle = (nps: number, cls: FlangeClass): number => weldGlobe(nps, cls) / 2;

/** Face to face of a butt welding end swing check valve. */
export function weldCheck(nps: number, cls: FlangeClass): number {
  const light = CHECK_BY_NPS.get(nps)?.faceToFace[cls];
  return light !== undefined ? light : heavy(nps, cls);
}

export const weldValveSizes = (kind: 'gate' | 'globe' | 'check'): number[] =>
  (kind === 'gate' ? WELD_GATE_LIGHT : kind === 'globe' ? WELD_GLOBE_LIGHT : WELD_CHECK_LIGHT)
    .map((r) => r.nps);
