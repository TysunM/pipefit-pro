// Fitting the trade pad to the room
// ---------------------------------
// The pad is sized to the room left under the readout. With room, each row is
// a key with its second function written over it. Short of room, the second
// function goes inside the top of the key instead, which gives every row back
// the line it stood on; and where even that cannot fit (a very short phone, or
// the phone's text set very large) the pad scrolls rather than running its
// bottom rows under the tab bar, out of reach. Pure.

/** Room a row needs besides its key: the second function over it and the gap under it. */
export const ROW_EXTRA = 12 + 1 + 6;
/** The key height the pad is drawn at when there is room for it. */
export const KEY_HEIGHT = 54;
/** Below this, the second functions over the keys squeeze them: they go inside. */
export const COMPACT_BELOW = 40;
/** The gap between rows with the second functions inside. */
export const COMPACT_GAP = 4;
/** The shortest key drawn; less, and the pad scrolls instead. */
export const MIN_KEY = 32;

export type Fit = { keyHeight: number; compact: boolean; scrolls: boolean };

export function fitKeys(room: number | null, rows: number): Fit {
  if (room === null || rows <= 0) return { keyHeight: KEY_HEIGHT, compact: false, scrolls: false };
  const roomy = Math.floor(room / rows - ROW_EXTRA);
  if (roomy >= COMPACT_BELOW) return { keyHeight: Math.min(KEY_HEIGHT, roomy), compact: false, scrolls: false };
  const fit = Math.floor((room + COMPACT_GAP) / rows - COMPACT_GAP);
  return { keyHeight: Math.max(MIN_KEY, Math.min(KEY_HEIGHT, fit)), compact: true, scrolls: fit < MIN_KEY };
}

/** How tall the pad is drawn: every row and the gaps between. */
export const padHeight = (f: Fit, rows: number) => (f.compact ? rows * f.keyHeight + (rows - 1) * COMPACT_GAP : rows * (f.keyHeight + ROW_EXTRA) - 6);
