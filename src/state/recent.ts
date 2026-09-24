// What you reached for last
// -------------------------
// Grouping the tools behind six cards costs a tap on everything that is not on
// the front page. A fitter uses two or three tools in a shift, not fourteen,
// so the strip pays that tap back on the ones he actually opens and leaves the
// cards as the way he finds the rest.
//
// Stored separately from settings on purpose. Settings are choices a man made
// and expects to find where he left them; this churns every time the app is
// opened, and losing it costs nothing.

export const RECENT_VERSION = 1;

/** How many the strip shows. Three fits across a phone without shrinking text. */
export const SHOW_RECENT = 3;

/**
 * How many are kept.
 *
 * More than are shown, so that when a tool is dropped from the app the strip
 * still fills from what is behind it rather than going short.
 */
export const KEEP_RECENT = 8;

export type RecentStore = { version: number; routes: string[] };

export const EMPTY: RecentStore = { version: RECENT_VERSION, routes: [] };

/**
 * Read what was stored.
 *
 * `known` decides what is still a real tool. A route that has been taken out
 * of the app since — thread engagement was — is dropped rather than left to
 * render a card that navigates nowhere. A store written by a newer version is
 * left alone the same way the other stores leave one alone: it is read as
 * empty rather than half-understood.
 */
export function parseRecent(raw: string | null, known: (route: string) => boolean): RecentStore {
  if (!raw) return EMPTY;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return EMPTY;
  const store = parsed as Partial<RecentStore>;
  if (store.version !== RECENT_VERSION) return EMPTY;
  if (!Array.isArray(store.routes)) return EMPTY;

  const routes: string[] = [];
  for (const r of store.routes) {
    if (typeof r !== 'string') continue;
    if (!known(r)) continue;
    if (routes.includes(r)) continue;
    routes.push(r);
    if (routes.length >= KEEP_RECENT) break;
  }
  return { version: RECENT_VERSION, routes };
}

/**
 * Put a tool at the front.
 *
 * Opening the same tool twice does not fill the strip with it, and opening one
 * that is already in the list moves it up rather than adding it again.
 */
export function pushRecent(routes: readonly string[], route: string): string[] {
  const next = [route, ...routes.filter((r) => r !== route)];
  return next.slice(0, KEEP_RECENT);
}

/** What the strip shows, newest first. */
export function shown(routes: readonly string[]): string[] {
  return routes.slice(0, SHOW_RECENT);
}
