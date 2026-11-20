// Where the mic is left
// ---------------------
// The floating mic can be dragged anywhere on the screen and stays where it
// is let go, on every screen and after the app is shut. A left-handed fitter
// wants it on the left; one who works the bottom of the page wants it up top.
//
// The place is kept as a share of the room the mic can move in, not as
// points, so the mic is still on the screen when the phone turns, a bigger
// phone restores the backup, or the web app's window is narrowed. Nothing is
// kept until it is first moved: until then it stands where it shipped, low on
// the right above the tab bar.

/** How far a finger moves before a press on the mic is a drag rather than a tap. A gloved tap wanders. */
export const TAP_SLOP = 10;
/** Clear of the screen's edges. */
export const EDGE = 8;

/** Across and down the room the mic can stand in, each 0 to 1. */
export type MicPlace = { fx: number; fy: number };
/** The range the mic's top-left corner can take, in points. */
export type MicArea = { left: number; top: number; right: number; bottom: number };
export type Point = { x: number; y: number };

export const MIC_PLACE_KEY = 'pipefit.micplace.v1';

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Where the mic may stand on a screen this size, inside the status bar and the home indicator. */
export function micArea(width: number, height: number, insets: { top: number; bottom: number }, size: number): MicArea {
  const left = EDGE;
  const top = insets.top + EDGE;
  return { left, top, right: Math.max(left, width - size - EDGE), bottom: Math.max(top, height - insets.bottom - size - EDGE) };
}

export function clampPoint(p: Point, a: MicArea): Point {
  return { x: Math.min(a.right, Math.max(a.left, p.x)), y: Math.min(a.bottom, Math.max(a.top, p.y)) };
}

export function placeToPoint(p: MicPlace, a: MicArea): Point {
  return { x: a.left + clamp01(p.fx) * (a.right - a.left), y: a.top + clamp01(p.fy) * (a.bottom - a.top) };
}

export function pointToPlace(p: Point, a: MicArea): MicPlace {
  const w = a.right - a.left;
  const h = a.bottom - a.top;
  return { fx: w > 0 ? clamp01((p.x - a.left) / w) : 0, fy: h > 0 ? clamp01((p.y - a.top) / h) : 0 };
}

/** A press that moved this far is a tap. */
export const isTap = (dx: number, dy: number): boolean => Math.hypot(dx, dy) <= TAP_SLOP;

export function parseMicPlace(raw: string | null | undefined): MicPlace | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as { v?: unknown; fx?: unknown; fy?: unknown };
    if (v?.v !== 1 || typeof v.fx !== 'number' || typeof v.fy !== 'number' || !Number.isFinite(v.fx) || !Number.isFinite(v.fy)) return null;
    return { fx: clamp01(v.fx), fy: clamp01(v.fy) };
  } catch {
    return null;
  }
}

export const serialiseMicPlace = (p: MicPlace): string => JSON.stringify({ v: 1, fx: p.fx, fy: p.fy });
