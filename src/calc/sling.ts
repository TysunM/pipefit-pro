// Sling angles
// ------------
// A sling leg at an angle pulls harder than the load it holds: the leg's
// tension is its share of the load times the angle factor, 1 / sin of the
// angle from horizontal (L / H: the sling's length over the hook's height
// above the pick point). At 60 degrees a leg carries 1.155 times its share,
// at 45 degrees 1.414, at 30 degrees twice. Below 30 degrees from horizontal
// a sling is not used, unless the sling's maker or a qualified person says so
// (ASME B30.9).
//
// Three and four leg bridles on a rigid load: the conservative practice is
// that two legs carry the whole load and the others only balance it, unless
// the assembly is rated, or rigged with an equaliser, for all its legs to share.
//
// Off centre: with the hook over the centre of gravity and the pick points
// level, the pick point nearer the CG takes the bigger share,
//   share A = W x dB / (dA + dB),  tension A = share A x LA / H,
// and the slings must be of different lengths, LA = sqrt(dA^2 + H^2), for the
// load to hang level.
//
// Pure. The load and length units are only labels: every figure comes out in
// the units it went in.

export const MIN_ANGLE = 30;
export const GOOD_ANGLE = 60;

export type LoadUnit = 'lb' | 'ton' | 'kg' | 't';
export type LengthUnit = 'ft' | 'in' | 'm' | 'mm';
export const LOAD_UNITS: { value: LoadUnit; label: string }[] = [
  { value: 'lb', label: 'lb' },
  { value: 'ton', label: 'US ton' },
  { value: 'kg', label: 'kg' },
  { value: 't', label: 'tonne' },
];
export const LENGTH_UNITS: { value: LengthUnit; label: string }[] = [
  { value: 'ft', label: 'ft' },
  { value: 'in', label: 'in' },
  { value: 'm', label: 'm' },
  { value: 'mm', label: 'mm' },
];

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** How much harder than its share a leg pulls at an angle from horizontal. */
export const angleFactor = (fromHorizontal: number) => 1 / Math.sin(rad(fromHorizontal));

export type Band = 'good' | 'fair' | 'caution' | 'danger';
/** 60 and up is good; 45 to 60 fair; 30 to 45 caution; under 30 not to be used. */
export function band(fromHorizontal: number): Band {
  if (fromHorizontal < MIN_ANGLE - 1e-9) return 'danger';
  if (fromHorizontal < 45 - 1e-9) return 'caution';
  if (fromHorizontal < GOOD_ANGLE - 1e-9) return 'fair';
  return 'good';
}

export type AngleBy =
  | { by: 'angle'; angle: number | null; from: 'horizontal' | 'vertical' }
  | { by: 'height'; length: number | null; height: number | null }
  | { by: 'reach'; length: number | null; reach: number | null };

/** The angle from horizontal, from whichever the fitter has: the angle, the sling and the hook's height, or the sling and its reach. */
export function angleFrom(a: AngleBy): { ok: true; deg: number } | { ok: false; why: string | null } {
  if (a.by === 'angle') {
    if (a.angle === null) return { ok: false, why: null };
    const h = a.from === 'horizontal' ? a.angle : 90 - a.angle;
    if (!(h > 0 && h <= 90)) return { ok: false, why: a.from === 'horizontal' ? 'A sling angle from horizontal is over 0 and up to 90 degrees.' : 'An angle from vertical is 0 up to, but not, 90 degrees.' };
    return { ok: true, deg: h };
  }
  if (a.length === null || (a.by === 'height' ? a.height : a.reach) === null) return { ok: false, why: null };
  if (!(a.length > 0)) return { ok: false, why: 'The sling length is more than nothing.' };
  if (a.by === 'height') {
    const h = a.height!;
    if (!(h > 0)) return { ok: false, why: 'The hook is above the pick points: a height over nothing.' };
    if (h > a.length * (1 + 1e-9)) return { ok: false, why: 'The hook cannot be higher above the pick point than the sling is long.' };
    return { ok: true, deg: deg(Math.asin(Math.min(1, h / a.length))) };
  }
  const r = a.reach!;
  if (!(r >= 0)) return { ok: false, why: 'The reach is measured out from the hook, nothing or more.' };
  if (r >= a.length) return { ok: false, why: 'A sling cannot reach out as far as it is long, or further: it would be flat.' };
  return { ok: true, deg: deg(Math.acos(r / a.length)) };
}

export type Even = {
  /** Legs on the hook, and how many of them are taken to carry the load. */
  legs: number;
  carrying: number;
  angle: number;
  factor: number;
  /** Each carrying leg's share of the load, straight down. */
  share: number;
  tension: number;
  /** What each carrying leg pulls in on its pick point, sideways. */
  sideways: number;
  /** The tension in all the carrying legs together. */
  total: number;
  band: Band;
};

/** Legs of equal length, the hook over the load's middle. A single leg hangs straight. */
export function evenLift(load: number, legs: 1 | 2 | 3 | 4, allShare: boolean, angle: number): Even {
  const a = legs === 1 ? 90 : angle;
  const carrying = legs <= 2 ? legs : allShare ? legs : 2;
  const share = load / carrying;
  const f = angleFactor(a);
  const tension = share * f;
  return { legs, carrying, angle: a, factor: f, share, tension, sideways: tension * Math.cos(rad(a)), total: tension * carrying, band: band(a) };
}

export type Leg = { reach: number; length: number; angle: number; share: number; tension: number; sideways: number; band: Band; slack: boolean };

/**
 * Two legs, the centre of gravity nearer one pick point. `dA` and `dB` are the
 * pick points' distances, level, from the CG; `height` is the hook's above them.
 * Each leg's length is the length it must be for the load to hang level.
 */
export function offCentre(load: number, dA: number, dB: number, height: number): { ok: true; a: Leg; b: Leg } | { ok: false; why: string } {
  if (!(dA >= 0 && dB >= 0) || dA + dB <= 0) return { ok: false, why: 'Put in how far each pick point is from the centre of gravity, measured level.' };
  if (!(height > 0)) return { ok: false, why: 'The hook is above the pick points: a height over nothing.' };
  const leg = (d: number, other: number): Leg => {
    const share = (load * other) / (dA + dB);
    const length = Math.hypot(d, height);
    const angle = deg(Math.atan2(height, d));
    return { reach: d, length, angle, share, tension: (share * length) / height, sideways: (share * d) / height, band: band(angle), slack: share <= 1e-9 };
  };
  return { ok: true, a: leg(dA, dB), b: leg(dB, dA) };
}

/** A leg's tension against its sling's rated load, straight (vertical) off the tag. */
export function againstTag(tension: number, rated: number | null): { pct: number; over: boolean } | null {
  if (rated === null || !(rated > 0)) return null;
  const pct = (tension / rated) * 100;
  return { pct, over: tension > rated * (1 + 1e-9) };
}

/** The table on every rigger's card. */
export const FACTORS = [90, 75, 60, 50, 45, 40, 30].map((d) => ({ angle: d, factor: angleFactor(d) }));

const group = (n: string) => {
  const [i, f] = n.split('.');
  return i!.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (f ? `.${f}` : '');
};

/** A load as a rigger reads it: whole pounds and kilograms, tons and tonnes to two places. */
export function loadText(v: number, u: LoadUnit): string {
  const n = u === 'lb' || u === 'kg' ? group(String(Math.round(v))) : group(v.toFixed(2));
  return `${n} ${LOAD_UNITS.find((x) => x.value === u)!.label}`;
}

/** A length: feet and metres to two places, inches to one, millimetres whole. */
export function lengthText(v: number, u: LengthUnit): string {
  return `${u === 'mm' ? group(String(Math.round(v))) : u === 'in' ? v.toFixed(1) : v.toFixed(2)} ${u}`;
}

export const angleText = (d: number) => `${d.toFixed(1)}°`;
