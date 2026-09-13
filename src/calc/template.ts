import { rad } from './units';

// Wrap-around cut templates. A band of paper the length of the pipe's actual
// circumference, divided into equal segments, with an ordinate measured at
// each division. Wrap it on, mark the ordinates, join them, and cut.
//
// Everything here is the exact intersection geometry rather than a drawn
// approximation, so the number of segments only changes how finely the curve
// is sampled, never where it lies.

export type Ordinate = {
  index: number;
  /** How far along the band, from its start. */
  along: number;
  /** Height at that point, measured from the shortest side of the cut. */
  rise: number;
};

export type TemplateResult = {
  valid: boolean;
  error?: string;
  circumference: number;
  segmentLength: number;
  /** Total rise from the shortest side of the cut to the longest. */
  totalRise: number;
  ordinates: Ordinate[];
};

const EMPTY: TemplateResult = {
  valid: false,
  circumference: NaN,
  segmentLength: NaN,
  totalRise: NaN,
  ordinates: [],
};

export const segmentLength = (od: number, segments: number): number =>
  Number.isFinite(od) && od > 0 && Number.isInteger(segments) && segments > 0
    ? (Math.PI * od) / segments
    : NaN;

function check(od: number, segments: number): string | undefined {
  if (!Number.isFinite(od) || od <= 0) return 'Enter an outside diameter greater than zero.';
  if (!Number.isInteger(segments) || segments < 4) return 'Use at least four segments.';
  if (segments > 64) return 'Sixty-four segments is as fine as this is worth.';
  return undefined;
}

/**
 * A miter cut: a plane crossing the pipe at `cutAngle` from square. Two pipes
 * each cut this way turn through twice the angle, so a 45° turn is made from
 * two 22.5° cuts.
 */
export function miterTemplate(od: number, cutAngle: number, segments = 16): TemplateResult {
  const bad = check(od, segments);
  if (bad) return { ...EMPTY, error: bad };
  if (!(cutAngle > 0 && cutAngle < 90)) return { ...EMPTY, error: 'Cut angle must be between 0° and 90°.' };

  const r = od / 2;
  const circumference = Math.PI * od;
  const seg = circumference / segments;
  const t = Math.tan(rad(cutAngle));

  const ordinates: Ordinate[] = [];
  for (let i = 0; i <= segments; i++) {
    const phi = (2 * Math.PI * i) / segments;
    // Measured up from the shortest point of the cut.
    ordinates.push({ index: i, along: i * seg, rise: r * t * (1 - Math.cos(phi)) });
  }

  return { valid: true, circumference, segmentLength: seg, totalRise: od * t, ordinates };
}

/**
 * The end cut on a branch meeting a header, both axes crossing, at `angle`
 * from the header's axis. Ninety degrees is a tee; anything less is a lateral.
 * Ordinates are the length left on the branch, measured from where it would
 * reach the header's axis.
 */
export function branchTemplate(
  headerOd: number,
  branchOd: number,
  angle: number,
  segments = 16
): TemplateResult {
  const bad = check(branchOd, segments);
  if (bad) return { ...EMPTY, error: bad };
  if (!Number.isFinite(headerOd) || headerOd <= 0) return { ...EMPTY, error: 'Enter a header diameter greater than zero.' };
  if (branchOd > headerOd) return { ...EMPTY, error: 'The branch cannot be larger than the header.' };
  if (!(angle > 0 && angle <= 90)) return { ...EMPTY, error: 'Branch angle must be between 0° and 90°.' };

  const R = headerOd / 2;
  const r = branchOd / 2;
  const a = rad(angle);
  const circumference = Math.PI * branchOd;
  const seg = circumference / segments;

  // Walking the branch surface at angle phi, the cut lands where the branch
  // surface meets the header surface.
  const reach = (phi: number): number =>
    (Math.sqrt(R * R - r * r * Math.sin(phi) * Math.sin(phi)) - r * Math.cos(phi) * Math.cos(a)) / Math.sin(a);

  const raw: number[] = [];
  for (let i = 0; i <= segments; i++) raw.push(reach((2 * Math.PI * i) / segments));

  const shortest = Math.min(...raw);
  const longest = Math.max(...raw);

  return {
    valid: true,
    circumference,
    segmentLength: seg,
    totalRise: longest - shortest,
    ordinates: raw.map((v, i) => ({ index: i, along: i * seg, rise: v - shortest })),
  };
}

/**
 * The hole to cut in the header for that branch, as ordinates around the
 * header's own circumference either side of the branch centreline.
 */
export function holeTemplate(
  headerOd: number,
  branchOd: number,
  angle: number,
  segments = 16
): TemplateResult {
  const bad = check(headerOd, segments);
  if (bad) return { ...EMPTY, error: bad };
  if (!Number.isFinite(branchOd) || branchOd <= 0) return { ...EMPTY, error: 'Enter a branch diameter greater than zero.' };
  if (branchOd > headerOd) return { ...EMPTY, error: 'The branch cannot be larger than the header.' };
  if (!(angle > 0 && angle <= 90)) return { ...EMPTY, error: 'Branch angle must be between 0° and 90°.' };

  const R = headerOd / 2;
  const r = branchOd / 2;
  const a = rad(angle);
  const circumference = Math.PI * headerOd;
  const seg = circumference / segments;

  // Half the hole, from the branch centreline out to its widest point, taken
  // along the header axis.
  const ordinates: Ordinate[] = [];
  for (let i = 0; i <= segments; i++) {
    const phi = (2 * Math.PI * i) / segments;
    const y = r * Math.sin(phi);
    if (Math.abs(y) > R) continue;
    const z = Math.sqrt(R * R - y * y);
    // Position along the header axis where the branch surface cuts through.
    const x = r * Math.cos(phi) / Math.sin(a) + z / Math.tan(a);
    // Arc position around the header, measured from its crown.
    ordinates.push({ index: i, along: R * Math.asin(Math.max(-1, Math.min(1, y / R))), rise: x });
  }

  if (!ordinates.length) return { ...EMPTY, error: 'The branch does not meet the header.' };

  const lows = Math.min(...ordinates.map((o) => o.rise));
  return {
    valid: true,
    circumference,
    segmentLength: seg,
    totalRise: Math.max(...ordinates.map((o) => o.rise)) - lows,
    ordinates: ordinates.map((o) => ({ ...o, rise: o.rise - lows })),
  };
}
