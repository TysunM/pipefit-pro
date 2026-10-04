// Figures said for a tool, handed to its screen
// --------------------------------------------
// A spoken "rise 12" has to reach the rolling offset whether the screen is
// already open (it fills in place) or is being opened by the same command
// (it fills on arrival). So the figures are published here by tool, and the
// screen takes them: at once if it is listening, or when it mounts if they
// arrived first.

import { useEffect, useRef } from 'react';
import type { FigureRoute, Figures } from './toolFigures';

type Take = (f: Figures) => void;

const listening = new Map<FigureRoute, Set<Take>>();
const waiting = new Map<FigureRoute, { f: Figures; at: number }>();

/** How long figures wait for their screen to open. */
const WAIT_MS = 10_000;

export function publishFigures(route: FigureRoute, f: Figures, now = Date.now()): void {
  const subs = listening.get(route);
  if (subs?.size) subs.forEach((take) => take(f));
  else waiting.set(route, { f, at: now });
}

/** On a tool's screen: take any figures said for it. */
export function useSpokenFigures(route: FigureRoute, take: Take): void {
  const ref = useRef(take);
  ref.current = take;
  useEffect(() => {
    const w = waiting.get(route);
    waiting.delete(route);
    if (w && Date.now() - w.at < WAIT_MS) ref.current(w.f);
    const fn: Take = (f) => ref.current(f);
    let subs = listening.get(route);
    if (!subs) listening.set(route, (subs = new Set()));
    subs.add(fn);
    return () => {
      subs!.delete(fn);
    };
  }, [route]);
}

/** A figure as text for its field: a length said with a unit goes into the reader's units; a bare number goes in as said. */
export function figureText(f: { n: number; inches: boolean }, num: (inches: number) => string): string {
  return f.inches ? num(f.n) : String(Math.round(f.n * 10000) / 10000);
}
