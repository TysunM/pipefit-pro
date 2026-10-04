// Laser meters over Bluetooth
// ---------------------------
// Two families, two protocols, both Bluetooth Low Energy:
//
//   Leica DISTO (D1, D2, D110, D510, X3, X4 …) — a published GATT service.
//   Distance is a little-endian float32 in metres on its own characteristic,
//   sent as an indication each time the button is pressed; tilt, on models
//   that have it, is another float32 in radians. A unit characteristic says
//   what the display is set to: the float is only metres when that is a metre
//   format, so anything else is refused rather than guessed at.
//
//   Bosch GLM (50 C, 50-27 C, 100-25 C, 120 C …) — one characteristic that
//   carries Bosch's own framed protocol, documented only under NDA and known
//   here from what has been read off the wire. Writing C0 55 02 01 00 1A
//   turns on "autosync": each measurement then arrives as a frame starting
//   C0 55 10, with the distance as a little-endian float32 in metres at
//   byte 7. A frame that does not read that way is shown as its bytes, so a
//   model that differs can be fixed from a screenshot rather than guessed.
//
// Nothing here touches Bluetooth; it decodes bytes. The connection is in
// state/laser.tsx.

export type LaserBrand = 'leica' | 'bosch';

export const LEICA = {
  service: '3ab10100-f831-4395-b29d-570977d5bf94',
  distance: '3ab10101-f831-4395-b29d-570977d5bf94',
  distanceUnit: '3ab10102-f831-4395-b29d-570977d5bf94',
  angle: '3ab10103-f831-4395-b29d-570977d5bf94',
} as const;

export const BOSCH = {
  service: '02a6c0d0-0451-4000-b000-fb3210111989',
  data: '02a6c0d1-0451-4000-b000-fb3210111989',
  /** Turns on autosync: every measurement taken is sent. */
  autosync: [0xc0, 0x55, 0x02, 0x01, 0x00, 0x1a],
} as const;

/** Longest reading believed: the longest-range meters here stop at 250 m. */
const MAX_M = 300;

const bytes = (v: DataView | ArrayLike<number>): Uint8Array =>
  v instanceof DataView ? new Uint8Array(v.buffer, v.byteOffset, v.byteLength) : Uint8Array.from(v as ArrayLike<number>);

const f32 = (b: Uint8Array, at: number): number | null =>
  b.length >= at + 4 ? new DataView(b.buffer, b.byteOffset, b.byteLength).getFloat32(at, true) : null;

const sane = (m: number | null): number | null => (m !== null && Number.isFinite(m) && m > 0 && m <= MAX_M ? m : null);

/** A DISTO distance indication, in metres, or null. */
export const leicaDistance = (v: DataView | ArrayLike<number>): number | null => sane(f32(bytes(v), 0));

/** A DISTO tilt indication, in degrees, or null. */
export function leicaTilt(v: DataView | ArrayLike<number>): number | null {
  const r = f32(bytes(v), 0);
  return r !== null && Number.isFinite(r) && Math.abs(r) <= Math.PI ? (r * 180) / Math.PI : null;
}

/**
 * Whether the DISTO's display unit makes the distance float metres. Its codes
 * 0 to 3 are the metre formats (m to 3 or 4 places, mm); feet and inches are
 * not, and the meter has to be set to metres for the figure to be read
 * right. The app shows it in your units either way.
 */
export function leicaMetres(v: DataView | ArrayLike<number>): boolean {
  const b = bytes(v);
  if (b.length < 1) return false;
  const code = b.length >= 2 ? b[0]! | (b[1]! << 8) : b[0]!;
  return code >= 0 && code <= 3;
}

/** A GLM autosync frame, in metres, or null when the frame is not a measurement. */
export function boschDistance(v: DataView | ArrayLike<number>): number | null {
  const b = bytes(v);
  if (b.length < 11 || b[0] !== 0xc0 || b[1] !== 0x55 || b[2] !== 0x10) return null;
  return sane(f32(b, 7));
}

/** Bytes as the hex a frame is talked about in: C0 55 10 06 … */
export const hex = (v: DataView | ArrayLike<number>): string =>
  [...bytes(v)].map((x) => x.toString(16).toUpperCase().padStart(2, '0')).join(' ');
