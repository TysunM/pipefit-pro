// Flow, velocity, pressure and force, and the circle geometry underneath
// them. Every relation here is exact, so a value can be entered anywhere in
// the chain and the rest follow.

export type Circle = {
  diameter: number;
  radius: number;
  circumference: number;
  area: number;
};

export function circleFromDiameter(d: number): Circle | undefined {
  if (!Number.isFinite(d) || d <= 0) return undefined;
  return { diameter: d, radius: d / 2, circumference: Math.PI * d, area: (Math.PI * d * d) / 4 };
}

export function circleFromCircumference(c: number): Circle | undefined {
  if (!Number.isFinite(c) || c <= 0) return undefined;
  return circleFromDiameter(c / Math.PI);
}

export function circleFromArea(a: number): Circle | undefined {
  if (!Number.isFinite(a) || a <= 0) return undefined;
  return circleFromDiameter(2 * Math.sqrt(a / Math.PI));
}

export const CUBIC_INCHES_PER_GALLON = 231;

// Flow in gallons per minute through a bore of the given area in square
// inches, at a velocity in feet per second.
export function flowFromVelocity(areaSqIn: number, velocityFtPerSec: number): number {
  if (!Number.isFinite(areaSqIn) || areaSqIn <= 0) return NaN;
  if (!Number.isFinite(velocityFtPerSec)) return NaN;
  const cubicInchesPerMinute = areaSqIn * velocityFtPerSec * 12 * 60;
  return cubicInchesPerMinute / CUBIC_INCHES_PER_GALLON;
}

export function velocityFromFlow(areaSqIn: number, gpm: number): number {
  if (!Number.isFinite(areaSqIn) || areaSqIn <= 0) return NaN;
  if (!Number.isFinite(gpm)) return NaN;
  return (gpm * CUBIC_INCHES_PER_GALLON) / (areaSqIn * 12 * 60);
}

export function areaFromFlowAndVelocity(gpm: number, velocityFtPerSec: number): number {
  if (!Number.isFinite(gpm) || !Number.isFinite(velocityFtPerSec) || velocityFtPerSec === 0) return NaN;
  return (gpm * CUBIC_INCHES_PER_GALLON) / (velocityFtPerSec * 12 * 60);
}

// Force on an area, and the pressure that produces it.
export const forceFromPressure = (areaSqIn: number, psi: number): number =>
  Number.isFinite(areaSqIn) && Number.isFinite(psi) ? areaSqIn * psi : NaN;

export const pressureFromForce = (areaSqIn: number, lbf: number): number =>
  Number.isFinite(areaSqIn) && areaSqIn > 0 && Number.isFinite(lbf) ? lbf / areaSqIn : NaN;

export const areaFromForceAndPressure = (lbf: number, psi: number): number =>
  Number.isFinite(lbf) && Number.isFinite(psi) && psi !== 0 ? lbf / psi : NaN;

// A column of water: one foot of head is this many psi at 39.2 degrees F.
export const PSI_PER_FOOT_OF_WATER = 0.4335275;

export const headToPressure = (feet: number): number =>
  Number.isFinite(feet) ? feet * PSI_PER_FOOT_OF_WATER : NaN;

export const pressureToHead = (psi: number): number =>
  Number.isFinite(psi) ? psi / PSI_PER_FOOT_OF_WATER : NaN;
