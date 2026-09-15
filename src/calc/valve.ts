import { FlangeClass, ringJointAllowance } from './flangedFitting';

// Face to face laying lengths of flanged valves.
//
// A valve is bolted between two flange faces, so the figure is face to face,
// not centre to face. An angle valve is the exception: the book prints the
// globe valve as 2 x A and the angle valve as A, the same casting opened out,
// so an angle valve reaches half as far along the run.
//
// The ring joint tables are the raised face ones plus twice the class's ring
// joint allowance, because a valve carries the allowance at both ends. That
// holds for every class from two inch up. Below two inch the valve tables do
// their own rounding, and those rows are held as printed.

export type ValveClass = '125' | '175' | '250' | FlangeClass;

export type ValveRow = {
  nps: number;
  label: string;
  /** Face to face by pressure class. No value where that size is not made. */
  faceToFace: Partial<Record<ValveClass, number>>;
};

const N = undefined;

// Cast iron flanged gate valves, wedge and double disc. Pages 4-99 and 4-100.
// Both patterns carry identical figures in every size both are made in; they
// differ only in which sizes each is made in, which `castIronGateMade` holds.
export const GATE_CAST_IRON: ValveRow[] = [
  { nps: 2, label: '2"', faceToFace: { '125': 7, '175': 7.25, '250': 8.5 } },
  { nps: 2.5, label: '2-1/2"', faceToFace: { '125': 7.5, '175': 8, '250': 9.5 } },
  { nps: 3, label: '3"', faceToFace: { '125': 8, '175': 9.25, '250': 11.125 } },
  { nps: 3.5, label: '3-1/2"', faceToFace: { '125': 8.5, '175': 10, '250': 11.875 } },
  { nps: 4, label: '4"', faceToFace: { '125': 9, '175': 10.5, '250': 12 } },
  { nps: 5, label: '5"', faceToFace: { '125': 10, '175': 11.5, '250': 15 } },
  { nps: 6, label: '6"', faceToFace: { '125': 10.5, '175': 13, '250': 15.875 } },
  { nps: 8, label: '8"', faceToFace: { '125': 11.5, '175': 14.25, '250': 16.5 } },
  { nps: 10, label: '10"', faceToFace: { '125': 13, '175': 16.75, '250': 18 } },
  { nps: 12, label: '12"', faceToFace: { '125': 14, '175': 17.5, '250': 19.75 } },
  { nps: 14, label: '14" OD', faceToFace: { '125': 15, '175': N, '250': 22.5 } },
  { nps: 16, label: '16" OD', faceToFace: { '125': 16, '175': N, '250': 24 } },
  { nps: 18, label: '18" OD', faceToFace: { '125': 17, '175': N, '250': 26 } },
  { nps: 20, label: '20" OD', faceToFace: { '125': 18, '175': N, '250': 28 } },
  { nps: 24, label: '24" OD', faceToFace: { '125': 20, '175': N, '250': 31 } },
];

/** Whether a cast iron gate valve of a pattern is made in a size and class. */
export function castIronGateMade(
  nps: number,
  cls: '125' | '175' | '250',
  pattern: 'wedge' | 'doubleDisc' = 'wedge'
): boolean {
  const row = GATE_CAST_IRON.find((r) => r.nps === nps);
  if (!row || row.faceToFace[cls] === undefined) return false;
  if (pattern === 'wedge') return true;
  // The double disc table lists 3-1/2 and 5 inch in 125 lb only, and the four
  // sizes above twelve inch in 250 lb only.
  if (nps === 3.5 || nps === 5) return cls === '125';
  if (nps > 12) return cls === '250';
  return true;
}

// Steel flanged gate valves, solid wedge and double disc, raised face.
// Pages 4-101 and 4-102.
export const GATE_STEEL: ValveRow[] = [
  { nps: 1, label: '1"', faceToFace: { '150': N, '300': N, '400': 8.5, '600': 8.5, '900': 10, '1500': 10, '2500': 12.125 } },
  { nps: 1.25, label: '1-1/4"', faceToFace: { '150': N, '300': N, '400': 9, '600': 9, '900': 11, '1500': 11, '2500': 13.75 } },
  { nps: 1.5, label: '1-1/2"', faceToFace: { '150': N, '300': 7.5, '400': 9.5, '600': 9.5, '900': 12, '1500': 12, '2500': 15.125 } },
  { nps: 2, label: '2"', faceToFace: { '150': 7, '300': 8.5, '400': 11.5, '600': 11.5, '900': 14.5, '1500': 14.5, '2500': 17.75 } },
  { nps: 2.5, label: '2-1/2"', faceToFace: { '150': 7.5, '300': 9.5, '400': 13, '600': 13, '900': 16.5, '1500': 16.5, '2500': 20 } },
  { nps: 3, label: '3"', faceToFace: { '150': 8, '300': 11.125, '400': 14, '600': 14, '900': 15, '1500': 18.5, '2500': 22.75 } },
  { nps: 3.5, label: '3-1/2"', faceToFace: { '150': 8.5, '300': 11.875, '400': N, '600': N } },
  { nps: 4, label: '4"', faceToFace: { '150': 9, '300': 12, '400': 16, '600': 17, '900': 18, '1500': 21.5, '2500': 26.5 } },
  { nps: 5, label: '5"', faceToFace: { '150': 10, '300': 15, '400': 18, '600': 20, '900': 22, '1500': 26.5, '2500': 31.25 } },
  { nps: 6, label: '6"', faceToFace: { '150': 10.5, '300': 15.875, '400': 19.5, '600': 22, '900': 24, '1500': 27.75, '2500': 36 } },
  { nps: 8, label: '8"', faceToFace: { '150': 11.5, '300': 16.5, '400': 23.5, '600': 26, '900': 29, '1500': 32.75, '2500': 40.25 } },
  { nps: 10, label: '10"', faceToFace: { '150': 13, '300': 18, '400': 26.5, '600': 31, '900': 33, '1500': 39, '2500': 50 } },
  { nps: 12, label: '12"', faceToFace: { '150': 14, '300': 19.75, '400': 30, '600': 33, '900': 38, '1500': 44.5, '2500': 56 } },
  { nps: 14, label: '14" OD', faceToFace: { '150': 15, '300': 30, '400': 32.5, '600': 35, '900': 40.5, '1500': 49.5, '2500': N } },
  { nps: 16, label: '16" OD', faceToFace: { '150': 16, '300': 33, '400': 35.5, '600': 39, '900': 44.5, '1500': 54.5, '2500': N } },
  { nps: 18, label: '18" OD', faceToFace: { '150': 17, '300': 36, '400': 38.5, '600': 43, '900': 48, '1500': 60.5, '2500': N } },
  { nps: 20, label: '20" OD', faceToFace: { '150': 18, '300': 39, '400': 41.5, '600': 47, '900': 52, '1500': 65.5, '2500': N } },
  { nps: 24, label: '24" OD', faceToFace: { '150': 20, '300': 45, '400': 48.5, '600': 55, '900': 61, '1500': 76.5, '2500': N } },
];

/**
 * Ring joint rows below two inch, held as printed. Above two inch the rule
 * gives every figure on both ring joint pages, so nothing is held here.
 *
 * The 150 lb column is the odd one: a ring joint gate valve is made in one,
 * one and a quarter and one and a half inch where a raised face one is not.
 */
const GATE_STEEL_RING_JOINT_SMALL: Record<number, Partial<Record<ValveClass, number>>> = {
  1: { '150': 5.5, '400': 8.5, '600': 8.5, '900': 10, '1500': 10, '2500': 12.125 },
  1.25: { '150': 6, '400': 9, '600': 9, '900': 11, '1500': 11, '2500': 13.875 },
  1.5: { '150': 7, '300': 8, '400': 9.5, '600': 9.5, '900': 12, '1500': 12, '2500': 15.25 },
};

const STEEL_BY_NPS = new Map(GATE_STEEL.map((r) => [r.nps, r]));
const CI_BY_NPS = new Map(GATE_CAST_IRON.map((r) => [r.nps, r]));

/** Face to face of a cast iron flanged gate valve. */
export const castIronGate = (nps: number, cls: '125' | '175' | '250'): number =>
  CI_BY_NPS.get(nps)?.faceToFace[cls] ?? NaN;

/** Face to face of a steel flanged gate valve. */
export function steelGate(
  nps: number,
  cls: FlangeClass,
  facing: 'raisedFace' | 'ringJoint' = 'raisedFace'
): number {
  const raised = STEEL_BY_NPS.get(nps)?.faceToFace[cls];
  if (facing === 'raisedFace') return raised ?? NaN;
  if (nps < 2) return GATE_STEEL_RING_JOINT_SMALL[nps]?.[cls] ?? NaN;
  if (raised === undefined) return NaN;
  const d = ringJointAllowance(nps, cls);
  return Number.isFinite(d) ? raised + 2 * d : NaN;
}

export const gateSteelSizes = (): number[] => GATE_STEEL.map((r) => r.nps);
export const gateCastIronSizes = (): number[] => GATE_CAST_IRON.map((r) => r.nps);

// Cast iron flanged globe and angle valves, 125 and 250 lb. Page 4-105.
// The book prints the globe valve as 2 x A and the angle valve as A: the same
// casting opened out, so an angle valve reaches half as far along the run.
export const GLOBE_CAST_IRON: ValveRow[] = [
  { nps: 2, label: '2"', faceToFace: { '125': 8, '250': 10.5 } },
  { nps: 2.5, label: '2-1/2"', faceToFace: { '125': 8.5, '250': 11.5 } },
  { nps: 3, label: '3"', faceToFace: { '125': 9.5, '250': 12.5 } },
  { nps: 3.5, label: '3-1/2"', faceToFace: { '125': 10.5, '250': 13.25 } },
  { nps: 4, label: '4"', faceToFace: { '125': 11.5, '250': 14 } },
  { nps: 5, label: '5"', faceToFace: { '125': 13, '250': 15.75 } },
  { nps: 6, label: '6"', faceToFace: { '125': 14, '250': 17.5 } },
  { nps: 8, label: '8"', faceToFace: { '125': 19.5, '250': 21 } },
];

// Steel flanged globe and angle valves, raised face, the light classes.
// Page 4-106. The heavy classes are on page 4-107 and carry the same figures
// as the gate valve, so they are read from GATE_STEEL rather than held twice.
export const GLOBE_STEEL_LIGHT: ValveRow[] = [
  { nps: 0.75, label: '3/4"', faceToFace: { '400': 7.5, '600': 7.5 } },
  { nps: 1, label: '1"', faceToFace: { '400': 8.5, '600': 8.5 } },
  { nps: 1.25, label: '1-1/4"', faceToFace: { '400': 9, '600': 9 } },
  { nps: 1.5, label: '1-1/2"', faceToFace: { '400': 9.5, '600': 9.5 } },
  { nps: 2, label: '2"', faceToFace: { '150': 8, '300': 10.5, '400': 11.5, '600': 11.5 } },
  { nps: 2.5, label: '2-1/2"', faceToFace: { '150': 8.5, '300': 11.5, '400': 13, '600': 13 } },
  { nps: 3, label: '3"', faceToFace: { '150': 9.5, '300': 12.5, '400': 14, '600': 14 } },
  { nps: 3.5, label: '3-1/2"', faceToFace: { '150': 10.5, '300': 13.25 } },
  { nps: 4, label: '4"', faceToFace: { '150': 11.5, '300': 14, '400': 16, '600': 17 } },
  { nps: 5, label: '5"', faceToFace: { '150': 14, '300': 15.75, '400': 18, '600': 20 } },
  { nps: 6, label: '6"', faceToFace: { '150': 16, '300': 17.5, '400': 19.5, '600': 22 } },
  { nps: 8, label: '8"', faceToFace: { '150': 19.5, '300': 22, '400': 23.5, '600': 26 } },
];

// Steel flanged swing check valves, raised face, the light classes. Page 4-111.
// The heavy classes, page 4-112, are again the gate valve figures.
export const CHECK_STEEL_LIGHT: ValveRow[] = [
  { nps: 2, label: '2"', faceToFace: { '150': 8, '300': 10.5, '400': 11.5, '600': 11.5 } },
  { nps: 2.5, label: '2-1/2"', faceToFace: { '150': 8.5, '300': 11.5, '400': 13, '600': 13 } },
  { nps: 3, label: '3"', faceToFace: { '150': 9.5, '300': 12.5, '400': 14, '600': 14 } },
  { nps: 3.5, label: '3-1/2"', faceToFace: { '150': 10.5, '300': 13.25 } },
  { nps: 4, label: '4"', faceToFace: { '150': 11.5, '300': 14, '400': 16, '600': 17 } },
  { nps: 5, label: '5"', faceToFace: { '150': 13, '300': 15.75 } },
  { nps: 6, label: '6"', faceToFace: { '150': 14, '300': 17.5, '400': 19.5, '600': 22 } },
  { nps: 8, label: '8"', faceToFace: { '300': 21, '400': 23.5, '600': 26 } },
  { nps: 10, label: '10"', faceToFace: { '300': 24.5, '400': 26.5, '600': 31 } },
  { nps: 12, label: '12"', faceToFace: { '300': 28, '400': 30, '600': 33 } },
];

// The three quarter and half inch rows the heavy globe and check tables add
// below where the gate table starts. Pages 4-107 and 4-112.
const HEAVY_SMALL: Record<number, Partial<Record<ValveClass, number>>> = {
  0.5: { '2500': 10.375 },
  0.75: { '900': 9, '1500': 9, '2500': 10.75 },
};

/** Largest size the heavy class globe and check tables carry. */
const HEAVY_GLOBE_TOP = 14;

const HEAVY: ValveClass[] = ['900', '1500', '2500'];
const GLOBE_CI_BY_NPS = new Map(GLOBE_CAST_IRON.map((r) => [r.nps, r]));
const GLOBE_LIGHT_BY_NPS = new Map(GLOBE_STEEL_LIGHT.map((r) => [r.nps, r]));
const CHECK_LIGHT_BY_NPS = new Map(CHECK_STEEL_LIGHT.map((r) => [r.nps, r]));

/** Face to face of a cast iron flanged globe valve. */
export const castIronGlobe = (nps: number, cls: '125' | '250'): number =>
  GLOBE_CI_BY_NPS.get(nps)?.faceToFace[cls] ?? NaN;

/** Face to centre of a cast iron flanged angle valve: half the globe figure. */
export const castIronAngle = (nps: number, cls: '125' | '250'): number =>
  castIronGlobe(nps, cls) / 2;

function heavySteel(nps: number, cls: FlangeClass): number {
  if (!HEAVY.includes(cls) || nps > HEAVY_GLOBE_TOP) return NaN;
  const small = HEAVY_SMALL[nps]?.[cls];
  if (small !== undefined) return small;
  return STEEL_BY_NPS.get(nps)?.faceToFace[cls] ?? NaN;
}

/** Face to face of a steel flanged globe valve. */
export function steelGlobe(nps: number, cls: FlangeClass): number {
  const light = GLOBE_LIGHT_BY_NPS.get(nps)?.faceToFace[cls];
  if (light !== undefined) return light;
  return heavySteel(nps, cls);
}

/** Face to centre of a steel flanged angle valve: half the globe figure. */
export const steelAngle = (nps: number, cls: FlangeClass): number => steelGlobe(nps, cls) / 2;

/** Face to face of a steel flanged swing check valve. */
export function steelCheck(nps: number, cls: FlangeClass): number {
  const light = CHECK_LIGHT_BY_NPS.get(nps)?.faceToFace[cls];
  if (light !== undefined) return light;
  return heavySteel(nps, cls);
}

/**
 * The check valve page carries a warning worth keeping with the numbers: the
 * table does not cover a check valve whose seat sits at about 45 degrees to
 * the run, or any other pattern needing a large clearance.
 */
export const CHECK_VALVE_CAVEAT =
  'These lengths do not cover a swing check with the seat at about 45 degrees ' +
  'to the run, or any pattern needing large clearances.';
