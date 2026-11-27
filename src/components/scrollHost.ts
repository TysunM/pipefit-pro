import { createContext, useContext } from 'react';

/**
 * The page's scroll, for a tile being carried over it (Reorder.tsx): held
 * still while one is carried, and carried along itself when the tile reaches
 * the top or the foot of what is on screen. Screen.tsx provides it.
 *
 * The tab bar provides one too, scrolling across rather than down (`axis`
 * 'x'). Then everything below is said along that axis: how far across it is
 * scrolled, and the viewport's left edge and width.
 */
export type ScrollHost = {
  /** Stop the page scrolling under a carried tile, and let it again. Locking measures the viewport. */
  lock: (on: boolean) => void;
  /** How far down the page is scrolled now (across, for an 'x' host). */
  y: () => number;
  /** Scroll by `dy`, kept within the page. */
  scrollBy: (dy: number) => void;
  /** Where the viewport sits in the window and how tall it is (its left edge and width, for an 'x' host), as measured when last locked. */
  viewport: () => { top: number; height: number };
  /** Down the page, unless it says across. */
  axis?: 'x' | 'y';
};

export const ScrollHostContext = createContext<ScrollHost | null>(null);

/** The page's scroll, or null off a scrolling page (the tab bar, a fixed screen). */
export const useScrollHost = (): ScrollHost | null => useContext(ScrollHostContext);
