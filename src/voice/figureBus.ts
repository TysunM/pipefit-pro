// Where spoken figures wait for their tool's screen
// ------------------------------------------------
// Pure: the screens listen through useSpokenFigures (figures.ts), which says
// whether each is the screen in front; the voice publishes here.

import type { FigureRoute, Figures } from './toolFigures';

/** A screen takes the figures, or says why it will not. */
export type Take = (f: Figures) => string | void;

/** A screen listening for its figures, and whether it is the one in front. */
type Listener = { take: Take; inFront: () => boolean };

const listening = new Map<FigureRoute, Set<Listener>>();
const waiting = new Map<FigureRoute, { f: Figures; at: number }>();

/** How long figures wait for their screen to open. */
const WAIT_MS = 10_000;

/**
 * Hand figures to a tool's screen. What comes back is the screen's reason for
 * refusing them, if it did.
 *
 * Only the screen in front takes them. One left further down the stack, or
 * on its way out as a fresh one opens, is not where they were said for:
 * given to it, they were lost, and "simple offset 10 at 45" said a second
 * time opened an empty screen. With none in front they wait for the screen
 * to come in front, for ten seconds.
 */
export function publishFigures(route: FigureRoute, f: Figures, now = Date.now()): string | undefined {
  const front = [...(listening.get(route) ?? [])].filter((l) => l.inFront());
  if (!front.length) {
    waiting.set(route, { f, at: now });
    return undefined;
  }
  waiting.delete(route);
  let refused: string | undefined;
  front.forEach((l) => {
    refused = l.take(f) || refused;
  });
  return refused;
}

/** A screen listens for its figures: they are given to it while `inFront` says so. Returns the way to stop. */
export function listenForFigures(route: FigureRoute, take: Take, inFront: () => boolean): () => void {
  const l: Listener = { take, inFront };
  let subs = listening.get(route);
  if (!subs) listening.set(route, (subs = new Set()));
  subs.add(l);
  return () => {
    subs!.delete(l);
  };
}

/** Figures said for a screen that was not in front yet, now that it is: taken once, if they are fresh. */
export function takeWaitingFigures(route: FigureRoute, take: Take, now = Date.now()): void {
  const w = waiting.get(route);
  waiting.delete(route);
  if (w && now - w.at < WAIT_MS) take(w.f);
}

