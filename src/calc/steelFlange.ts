// Steel flange bolting, ASME B16.5
// ---------------------------------
// What a bolt-up needs to know about a steel flange: how many studs, and how
// big. Class 150 through 2500, NPS 1/2 through 24, from the B16.5 dimensional
// tables. Class 400 is left out: it is rarely stocked and its bolting was not
// verified against the standard when this table was written.
//
// The class does not set the torque. It sets the stud count and size, and the
// stud size sets the torque (with the material, the lubricant and the gasket).
// A 6" Class 150 and a 2" Class 600 both carry 3/4" studs and get the same
// torque per stud. That is why nothing in here is a torque figure.
//
// Studs 1" and under are UNC; 1-1/8" and up are 8-UN, which is what the
// threads-per-inch helper encodes.

export type SteelClass = '150' | '300' | '600' | '900' | '1500' | '2500';

export const STEEL_CLASSES: readonly SteelClass[] = ['150', '300', '600', '900', '1500', '2500'];

export type SteelBolting = {
  nps: number;
  label: string;
  bolts: number;
  /** Stud diameter, inches. */
  stud: number;
};

const L = (nps: number): string => {
  if (nps >= 14) return `${nps}" OD`;
  const whole = Math.floor(nps);
  const frac = nps - whole;
  const f = frac === 0.5 ? '1/2' : frac === 0.25 ? '1/4' : frac === 0.75 ? '3/4' : '';
  return whole === 0 ? `${f}"` : f ? `${whole}-${f}"` : `${whole}"`;
};

const row = (nps: number, bolts: number, stud: number): SteelBolting => ({ nps, label: L(nps), bolts, stud });

export const STEEL_150: SteelBolting[] = [
  row(0.5, 4, 0.5), row(0.75, 4, 0.5), row(1, 4, 0.5), row(1.25, 4, 0.5), row(1.5, 4, 0.5),
  row(2, 4, 0.625), row(2.5, 4, 0.625), row(3, 4, 0.625), row(3.5, 8, 0.625), row(4, 8, 0.625),
  row(5, 8, 0.75), row(6, 8, 0.75), row(8, 8, 0.75), row(10, 12, 0.875), row(12, 12, 0.875),
  row(14, 12, 1), row(16, 16, 1), row(18, 16, 1.125), row(20, 20, 1.125), row(24, 20, 1.25),
];

export const STEEL_300: SteelBolting[] = [
  row(0.5, 4, 0.5), row(0.75, 4, 0.625), row(1, 4, 0.625), row(1.25, 4, 0.625), row(1.5, 4, 0.75),
  row(2, 8, 0.625), row(2.5, 8, 0.75), row(3, 8, 0.75), row(3.5, 8, 0.75), row(4, 8, 0.75),
  row(5, 8, 0.75), row(6, 12, 0.75), row(8, 12, 0.875), row(10, 16, 1), row(12, 16, 1.125),
  row(14, 20, 1.125), row(16, 20, 1.25), row(18, 24, 1.25), row(20, 24, 1.25), row(24, 24, 1.5),
];

export const STEEL_600: SteelBolting[] = [
  row(0.5, 4, 0.5), row(0.75, 4, 0.625), row(1, 4, 0.625), row(1.25, 4, 0.625), row(1.5, 4, 0.75),
  row(2, 8, 0.625), row(2.5, 8, 0.75), row(3, 8, 0.75), row(3.5, 8, 0.875), row(4, 8, 0.875),
  row(5, 8, 1), row(6, 12, 1), row(8, 12, 1.125), row(10, 16, 1.25), row(12, 20, 1.25),
  row(14, 20, 1.375), row(16, 20, 1.5), row(18, 20, 1.625), row(20, 24, 1.625), row(24, 24, 1.875),
];

export const STEEL_900: SteelBolting[] = [
  row(0.5, 4, 0.75), row(0.75, 4, 0.75), row(1, 4, 0.875), row(1.25, 4, 0.875), row(1.5, 4, 1),
  row(2, 8, 0.875), row(2.5, 8, 1), row(3, 8, 0.875), row(4, 8, 1.125),
  row(5, 8, 1.25), row(6, 12, 1.125), row(8, 12, 1.375), row(10, 16, 1.375), row(12, 20, 1.375),
  row(14, 20, 1.5), row(16, 20, 1.625), row(18, 20, 1.875), row(20, 20, 2), row(24, 20, 2.5),
];

export const STEEL_1500: SteelBolting[] = [
  row(0.5, 4, 0.75), row(0.75, 4, 0.75), row(1, 4, 0.875), row(1.25, 4, 0.875), row(1.5, 4, 1),
  row(2, 8, 0.875), row(2.5, 8, 1), row(3, 8, 1.125), row(4, 8, 1.25),
  row(5, 8, 1.5), row(6, 12, 1.375), row(8, 12, 1.625), row(10, 12, 1.875), row(12, 16, 2),
  row(14, 16, 2.25), row(16, 16, 2.5), row(18, 16, 2.75), row(20, 16, 3), row(24, 16, 3.5),
];

export const STEEL_2500: SteelBolting[] = [
  row(0.5, 4, 0.75), row(0.75, 4, 0.75), row(1, 4, 0.875), row(1.25, 4, 1), row(1.5, 4, 1.125),
  row(2, 8, 1), row(2.5, 8, 1.125), row(3, 8, 1.25), row(4, 8, 1.5),
  row(5, 8, 1.75), row(6, 8, 2), row(8, 12, 2), row(10, 12, 2.5), row(12, 12, 2.75),
];

const BY_CLASS: Record<SteelClass, SteelBolting[]> = {
  '150': STEEL_150,
  '300': STEEL_300,
  '600': STEEL_600,
  '900': STEEL_900,
  '1500': STEEL_1500,
  '2500': STEEL_2500,
};

export const isSteelClass = (v: unknown): v is SteelClass => typeof v === 'string' && (STEEL_CLASSES as readonly string[]).includes(v);

export const steelFlange = (nps: number, cls: SteelClass): SteelBolting | undefined => BY_CLASS[cls].find((b) => b.nps === nps);

export const steelSizes = (cls: SteelClass): number[] => BY_CLASS[cls].map((b) => b.nps);

/** Threads per inch for a B16.5 stud: UNC to 1", 8-UN from 1-1/8" up. */
export function threadsPerInch(stud: number): number {
  const unc: Record<string, number> = { '0.5': 13, '0.625': 11, '0.75': 10, '0.875': 9, '1': 8 };
  if (stud > 1) return 8;
  return unc[String(stud)] ?? NaN;
}

/** A stud size the way it is said: 3/4", 1-1/8". */
export function studLabel(stud: number): string {
  const whole = Math.floor(stud);
  const frac = Math.round((stud - whole) * 8);
  const f = frac === 0 ? '' : frac % 4 === 0 ? '1/2' : frac % 2 === 0 ? `${frac / 2}/4` : `${frac}/8`;
  if (whole === 0) return `${f}"`;
  return f ? `${whole}-${f}"` : `${whole}"`;
}

/**
 * Root area of the stud, square inches, by the formula PCC-1 and ASME VIII
 * use for bolt load: pi/4 (D - 1.3/n)^2. Tables built on the tensile stress
 * area run about ten percent higher.
 */
export function rootArea(stud: number): number {
  const n = threadsPerInch(stud);
  if (!Number.isFinite(n)) return NaN;
  const d = stud - 1.3 / n;
  return (Math.PI / 4) * d * d;
}

/**
 * Reference torque by the PCC-1 Appendix K method, foot-pounds:
 * T = K x D x F / 12, with F the bolt load on the root area at the target
 * stress. A reference, never the job's figure: the bolting specification
 * governs, and this exists so a foreman can check that figure is in range.
 */
export function referenceTorque(stud: number, stressPsi: number, nutFactor: number): number {
  const area = rootArea(stud);
  if (!Number.isFinite(area) || !(stressPsi > 0) || !(nutFactor > 0)) return NaN;
  return (nutFactor * stud * stressPsi * area) / 12;
}
