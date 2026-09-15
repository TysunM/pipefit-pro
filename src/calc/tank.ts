// Contents of cylindrical tanks, pages 5-26 to 5-28.
//
// The printed pages are a grid of diameters against lengths. All of it is one
// piece of geometry, so the geometry is held and the grid is used to check it,
// which also answers every diameter and length the pages do not print — and
// the far more useful question of what is in a tank that is only part full.

/** US gallons in a cubic foot. */
export const GALLONS_PER_CUBIC_FOOT = 7.480519;

/** Contents of a full cylindrical tank, in US gallons. */
export function tankGallons(diameterFeet: number, lengthFeet: number): number {
  if (![diameterFeet, lengthFeet].every(Number.isFinite)) return NaN;
  if (diameterFeet <= 0 || lengthFeet <= 0) return NaN;
  const cubicFeet = (Math.PI / 4) * diameterFeet * diameterFeet * lengthFeet;
  return cubicFeet * GALLONS_PER_CUBIC_FOOT;
}

/**
 * Contents of a tank standing on end, filled to a depth.
 *
 * The cross section is the full circle all the way up, so it is the full tank
 * scaled by how far up the liquid stands.
 */
export function verticalTankGallons(
  diameterFeet: number,
  depthFeet: number,
  heightFeet: number
): number {
  if (!Number.isFinite(depthFeet) || depthFeet < 0) return NaN;
  const full = tankGallons(diameterFeet, heightFeet);
  if (!Number.isFinite(full) || depthFeet > heightFeet) return NaN;
  return full * (depthFeet / heightFeet);
}

/**
 * Contents of a tank lying on its side, filled to a depth measured from the
 * bottom of the shell.
 *
 * The wetted cross section is a circular segment, which is the sector less the
 * triangle: r² (θ − sin θ cos θ) with θ the half angle at the surface.
 */
export function horizontalTankGallons(
  diameterFeet: number,
  lengthFeet: number,
  depthFeet: number
): number {
  if (![diameterFeet, lengthFeet, depthFeet].every(Number.isFinite)) return NaN;
  if (diameterFeet <= 0 || lengthFeet <= 0 || depthFeet < 0) return NaN;
  if (depthFeet > diameterFeet) return NaN;
  if (depthFeet === 0) return 0;
  if (depthFeet === diameterFeet) return tankGallons(diameterFeet, lengthFeet);

  const r = diameterFeet / 2;
  // Half angle at the centre subtended by the liquid surface.
  const theta = Math.acos((r - depthFeet) / r);
  const area = r * r * (theta - Math.sin(theta) * Math.cos(theta));
  return area * lengthFeet * GALLONS_PER_CUBIC_FOOT;
}

/**
 * How deep a tank lying on its side has to be filled to hold a wanted number
 * of gallons. Worked by halving, because the segment area cannot be turned
 * round for the depth in closed form.
 */
export function horizontalTankDepth(
  diameterFeet: number,
  lengthFeet: number,
  wantedGallons: number
): number {
  const full = tankGallons(diameterFeet, lengthFeet);
  if (!Number.isFinite(full) || !Number.isFinite(wantedGallons)) return NaN;
  if (wantedGallons < 0 || wantedGallons > full) return NaN;

  let low = 0;
  let high = diameterFeet;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (horizontalTankGallons(diameterFeet, lengthFeet, mid) < wantedGallons) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/** Gallons a foot of tank holds, which is what a dipstick reads against. */
export const tankGallonsPerFoot = (diameterFeet: number): number =>
  tankGallons(diameterFeet, 1);
