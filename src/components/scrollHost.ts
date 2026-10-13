import { createContext, useContext } from 'react';

/**
 * The page's scroll, for a tile being carried over it (Reorder.tsx): held
 * still while one is carried, and carried along itself when the tile reaches
 * the top or the foot of what is on screen. Screen.tsx provides it.
 */
export type ScrollHost = {
  /** Stop the page scrolling under a carried tile, and let it again. Locking measures the viewport. */
  lock: (on: boolean) => void;
  /** How far down the page is scrolled now. */
  y: () => number;
  /** Scroll by `dy`, kept within the page. */
  scrollBy: (dy: number) => void;
  /** Where the viewport sits in the window and how tall it is, as measured when last locked. */
  viewport: () => { top: number; height: number };
};

export const ScrollHostContext = createContext<ScrollHost | null>(null);

/** The page's scroll, or null off a scrolling page (the tab bar, a fixed screen). */
export const useScrollHost = (): ScrollHost | null => useContext(ScrollHostContext);
