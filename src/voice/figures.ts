// Figures said for a tool, handed to its screen
// --------------------------------------------
// A spoken "rise 12" has to reach the rolling offset whether the screen is
// already open (it fills in place) or is being opened by the same command
// (it fills on arrival). So the figures are published by tool (figureBus.ts),
// and the screen in front takes them: at once if it is already in front, or
// when it comes in front if they arrived first.

import { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import type { FigureRoute } from './toolFigures';
import { listenForFigures, takeWaitingFigures, type Take } from './figureBus';

export { publishFigures } from './figureBus';

/** On a tool's screen: take any figures said for it, while it is the screen in front. */
export function useSpokenFigures(route: FigureRoute, take: Take): void {
  const ref = useRef(take);
  ref.current = take;
  const focused = useIsFocused();
  const front = useRef(focused);
  front.current = focused;
  useEffect(
    () => listenForFigures(route, (f) => ref.current(f), () => front.current),
    [route],
  );
  // Coming in front, by being opened or gone back to, it takes what was said for it on the way.
  useEffect(() => {
    if (focused) takeWaitingFigures(route, (f) => ref.current(f));
  }, [route, focused]);
}

/** A figure as text for its field: a length said with a unit goes into the reader's units; a bare number goes in as said. */
export function figureText(f: { n: number; inches: boolean }, num: (inches: number) => string): string {
  return f.inches ? num(f.n) : String(Math.round(f.n * 10000) / 10000);
}
