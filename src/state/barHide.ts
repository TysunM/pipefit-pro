// The tab bar out of the way while you read
// ------------------------------------------
// On a tab's page the bar slides away as the page is scrolled down, and comes
// back the moment it is scrolled up a little, at the top, or at the foot of
// the page, where the next thing you do is go somewhere else. A page too short
// to scroll much never loses it. This is when; components/barHide.tsx moves
// it. Pure.

export type BarScroll = { hidden: boolean; /** Where the page was last. */ last: number; /** Where it last turned round. */ turn: number; down: boolean };

export const BAR_START: BarScroll = { hidden: false, last: 0, turn: 0, down: true };

/** How far a page moves one way before the bar goes, or comes back. */
export const BAR_TRAVEL = 24;

/** Shown on purpose (back on the page): it takes a fresh stretch down to hide it again. */
export const barShown = (s: BarScroll): BarScroll => ({ ...s, hidden: false, turn: s.last, down: true });

/** Where the page is scrolled to now, `content` tall in a window `view` tall: is the bar hidden? */
export function barAfterScroll(s: BarScroll, y: number, content: number, view: number, travel = BAR_TRAVEL): BarScroll {
  // A page coming back to where it was, or its content resizing, is not a scroll.
  if (y === s.last && content - view >= 4 * travel && y > travel && y + view < content - travel) return s;
  const down = y > s.last ? true : y < s.last ? false : s.down;
  const turn = down !== s.down ? s.last : s.turn;
  let hidden = s.hidden;
  // Too little to scroll to be worth it, at the top, or at the foot: it shows.
  if (content - view < 4 * travel || y <= travel || y + view >= content - travel) hidden = false;
  else if (down && y - turn > travel) hidden = true;
  else if (!down && turn - y > travel) hidden = false;
  return { hidden, last: y, turn, down };
}

// The bar, tucked away by hand
// ----------------------------
// On any tab the bar can be pulled down off the foot (on the Calculator,
// which doesn't scroll, the keys grow into the room). A handle stays to bring
// it back. Set to hide on every tab, it tucks itself as each tab opens.

/** How far the bar is pulled down, or how fast it is flicked, to tuck it. Less, and it springs back. */
export const TUCK_PULL = 28;
export const TUCK_FLICK = 0.6;
/** The handle left at the foot when it is tucked: tall enough to find with a thumb. */
export const HANDLE_HEIGHT = 20;

/** A drag on the bar that is mostly down: the bar's, not a scroll along it or a tab's press. */
export const pullsDown = (dx: number, dy: number) => dy > 8 && dy > 1.5 * Math.abs(dx);
/** Let go of a pull: far or fast enough, it tucks. */
export const tucksAt = (dy: number, vy: number) => dy > TUCK_PULL || vy > TUCK_FLICK;
/** Let go on the handle: a tap, or a pull up, brings the bar back. */
export const handleShows = (dx: number, dy: number) => (Math.abs(dx) < 10 && Math.abs(dy) < 10) || dy < -12;
