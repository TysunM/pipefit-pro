// Telling a finger from a palm
// ----------------------------
// A hand drawing on a phone rests on it. On a phone with curved sides the
// heel of the hand lands on the very edge of the glass, and a second touch
// there used to turn a stroke into a two-finger move of the page. Two plain
// rules keep the stroke: a touch that comes down on the edge of the screen
// is a palm, and once a stroke is under way a new touch is a palm too. Two
// fingers meant to move or turn the page land together, before the first
// has drawn anything.

/** How far in from the side of the screen, in points, a touch is taken for a palm. */
export const PALM_EDGE = 12;

/** How soon after the first finger a second must land to count as two fingers together. */
export const TOGETHER_MS = 150;

/** A touch that came down this close to either side of the screen. */
export const onEdge = (pageX: number, screenWidth: number, edge = PALM_EDGE): boolean =>
  pageX < edge || pageX > screenWidth - edge;

/**
 * Whether a second finger turns what is happening into a two-finger move of
 * the page: yes before a stroke has started (nothing drawn yet, or the two
 * landed together); no once one is under way, when it is a hand resting.
 */
export const startsTwoFingers = (drawing: boolean, drawn: boolean, sinceStartMs: number): boolean =>
  !drawing || !drawn || sinceStartMs < TOGETHER_MS;
