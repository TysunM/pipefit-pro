// Laying the bolts out on the flange face.
//
// The one hard requirement is that no two bolt targets overlap. A flange with
// 68 holes drawn to fit a phone puts them 12 pixels apart, and a target that
// spills into its neighbour means a fitter aiming at bolt 34 registers bolt 35
// — which, on a screen whose whole job is to refuse the wrong bolt, is worse
// than useless.
//
// So the face is sized from the bolt count rather than the other way round. If
// the pitch on the available width would be too tight, the face grows: the
// full-screen view draws it that size and follows the bolt being asked for.
// On the page it is drawn fitted instead (fittedFace), small, with the whole
// flange in view, and the bolt is logged from a button rather than a fingertip. Below, `pitch` is the centre-to-centre distance between
// neighbouring bolts, and `marker` and `slop` are always divided out of it, so
// the targets tile the circle exactly and never past it.

/** Smallest centre-to-centre spacing worth drawing at. */
export const MIN_PITCH = 26;
/** Biggest bolt marker, and the rim clearance that keeps it inside the face. */
export const MARKER_MAX = 44;
export const MARKER_MIN = 18;
export const RIM_PAD = MARKER_MAX / 2 + 2;

export type FaceLayout = {
  /** Width and height of the square the face is drawn in. */
  face: number;
  /** Centre, in face coordinates. */
  c: number;
  /** Flange rim radius. */
  odR: number;
  /** Bolt circle radius. */
  bcR: number;
  /** Centre to centre between neighbouring bolts. */
  pitch: number;
  /** Diameter of a bolt marker. */
  marker: number;
  /** Extra touch radius around a marker. Never enough to reach a neighbour. */
  slop: number;
  /** Diameter of the highlight ring on the bolt the sequence is asking for. */
  ring: number;
  /** True when the face had to grow past the width it was given. */
  scrolls: boolean;
};

/**
 * @param bolts how many holes are in the flange
 * @param available the width the face may use before it has to scroll
 * @param bcFrac bolt circle over flange OD, from the table when there is one
 * @param minPitch closest two bolts may be drawn; the full-screen view asks for more
 */
export function flangeFace(bolts: number, available: number, bcFrac: number, minPitch = MIN_PITCH): FaceLayout {
  const avail = Math.max(1, available);
  const frac = Number.isFinite(bcFrac) && bcFrac > 0 && bcFrac < 1 ? bcFrac : 0.85;

  if (!Number.isInteger(bolts) || bolts < 1) {
    const odR = Math.max(0, avail / 2 - RIM_PAD);
    return {
      face: avail,
      c: avail / 2,
      odR,
      bcR: odR * frac,
      pitch: 0,
      marker: 0,
      slop: 0,
      ring: 0,
      scrolls: false,
    };
  }

  // The width at which the pitch comes out at exactly MIN_PITCH. Same relation
  // as `pitch` below, rearranged, so the two cannot drift apart.
  const needed = bolts > 1 ? 2 * (minPitch / (2 * Math.sin(Math.PI / bolts) * frac) + RIM_PAD) : 0;
  const face = Math.max(avail, Math.ceil(needed));

  const odR = Math.max(0, face / 2 - RIM_PAD);
  const bcR = odR * frac;
  const pitch = bolts > 1 ? 2 * bcR * Math.sin(Math.PI / bolts) : face;
  const marker = Math.max(MARKER_MIN, Math.min(MARKER_MAX, pitch * 0.8));
  // What is left of the pitch once the marker has had its share, halved
  // between the two neighbours that share the gap.
  const slop = Math.max(0, Math.min(8, (pitch - marker) / 2));
  const ring = Math.max(marker, Math.min(marker + 10, Math.max(pitch, marker)));

  return { face, c: face / 2, odR, bcR, pitch, marker, slop, ring, scrolls: face > avail };
}

/** Where a bolt marker's centre goes, from its angle off the centreline. */
export function boltCentre(layout: FaceLayout, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: layout.c + layout.bcR * Math.sin(rad), y: layout.c - layout.bcR * Math.cos(rad) };
}

/**
 * The whole flange in the width given, however many bolts it has. Below the
 * pitch flangeFace keeps, each marker shrinks to exactly its share of the
 * circle and loses its touch slop, so they still never overlap: they are for
 * seeing where the bolt is, and the bolt is logged from the button under the
 * face. A flange that fits anyway comes back exactly as flangeFace draws it.
 */
export function fittedFace(bolts: number, available: number, bcFrac: number): FaceLayout {
  const L = flangeFace(bolts, available, bcFrac);
  if (!L.scrolls) return L;
  const face = Math.max(1, available);
  const c = face / 2;
  const frac = Number.isFinite(bcFrac) && bcFrac > 0 && bcFrac < 1 ? bcFrac : 0.85;
  const sin = Math.sin(Math.PI / bolts);
  // A marker on the bolt circle has to stay inside the face: bcR + pitch / 2 + 2 <= c.
  const odR = c - 2;
  const bcR = Math.min(odR * frac, (c - 2) / (1 + sin));
  const pitch = 2 * bcR * sin;
  const marker = Math.min(MARKER_MAX, pitch);
  return { face, c, odR, bcR, pitch, marker, slop: 0, ring: marker, scrolls: false };
}
