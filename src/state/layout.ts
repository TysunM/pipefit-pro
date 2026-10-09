import { GROUPS, PROJECT_CARDS, START } from '../navigation/groups';
import { TAB_ORDER } from '../navigation/tabs';

// Where things stand
// ------------------
// The tabs along the foot, the tiles on the Home page and the tab pages and
// the cards down the Projects page each ship in an order (tabs.ts, groups.ts).
// A man can hold any of them until it lifts and drag it where he wants it,
// and this is what remembers where he put it.
//
// Every place he can rearrange is a ZONE: a named list of ids. A tab can move
// anywhere along the bar, a tile anywhere in its own section, a card anywhere
// down the page; nothing moves out of its zone. The store holds, per zone, the
// ids in the order he left them, and only for the zones he has touched. The
// shipped order is always the fallback: a zone the store does not name, an id
// it does not know, or one it left out, all fall back to it.
//
// What is stored is a preference, not work. Losing it costs a few drags, so it
// is kept like the recently-used strip: read once, written on every change,
// with none of the record stores' care about a newer app having written it.

export const LAYOUT_VERSION = 1;

export type Layout = { version: number; zones: Record<string, string[]> };

export const EMPTY_LAYOUT: Layout = { version: LAYOUT_VERSION, zones: {} };

/** The zone a tab page section's tiles move in. */
export const sectionZone = (groupId: string, sectionId: string): string => `${groupId}.${sectionId}`;

/** The tabs along the foot. */
export const TABS_ZONE = 'tabs';
/** The field tools on the Home page, the four shown before anything has been used. */
export const HOME_ZONE = 'home.start';
/** The record cards down the Projects page. */
export const PROJECTS_ZONE = 'projects';

/**
 * Every zone and its shipped order. The only list of zones there is: a zone
 * the store names that is not here is dropped on reading, so a tab or a
 * section taken out of the app takes its saved order with it.
 */
export const ZONES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  [TABS_ZONE]: TAB_ORDER,
  [HOME_ZONE]: START.map((t) => t.route),
  [PROJECTS_ZONE]: PROJECT_CARDS,
  ...Object.fromEntries(GROUPS.flatMap((g) => g.sections.map((s) => [sectionZone(g.id, s.id), s.tools.map((t) => t.route)]))),
});

export const isZone = (zone: string): boolean => Object.prototype.hasOwnProperty.call(ZONES, zone);

/** The shipped order of a zone; an unknown zone has none. */
export const shippedOrder = (zone: string): readonly string[] => ZONES[zone] ?? [];

// ------------------------------------------------------------ orders

/**
 * A stored order made good against the shipped one: ids the zone does not
 * hold are dropped, a repeat is dropped, and any shipped id the stored order
 * left out is put after, in shipped order, so a tool added to a section in an
 * update shows up at the end of it rather than nowhere.
 */
export function normaliseOrder(stored: readonly unknown[], shipped: readonly string[]): string[] {
  const out: string[] = [];
  for (const id of stored) {
    if (typeof id !== 'string') continue;
    if (!shipped.includes(id) || out.includes(id)) continue;
    out.push(id);
  }
  for (const id of shipped) if (!out.includes(id)) out.push(id);
  return out;
}

export const sameOrder = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);

/** The order a zone's ids stand in: the one stored, made good, or the shipped one. */
export function orderOf(layout: Layout, zone: string): readonly string[] {
  const shipped = shippedOrder(zone);
  const stored = layout.zones[zone];
  return stored ? normaliseOrder(stored, shipped) : shipped;
}

/** `items` in the order `order` puts their ids; an item the order does not name keeps its place, after the named ones. */
export function applyOrder<T>(items: readonly T[], idOf: (x: T) => string, order: readonly string[]): T[] {
  const rank = new Map(order.map((id, i) => [id, i]));
  const n = order.length;
  return items
    .map((x, i) => ({ x, k: rank.get(idOf(x)) ?? n + i }))
    .sort((a, b) => a.k - b.k)
    .map((r) => r.x);
}

/** `list` with the item at `from` taken out and put back at `to` (an index in the result). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const n = list.length;
  if (from < 0 || from >= n) return [...list];
  const dest = Math.max(0, Math.min(n - 1, to));
  if (dest === from) return [...list];
  const out = [...list];
  const [x] = out.splice(from, 1);
  out.splice(dest, 0, x as T);
  return out;
}

/**
 * `a` moved to where `b` stands. Said in ids rather than indexes because the
 * screen may show only some of a zone (the Home page shows the field tools a
 * man has not used yet), and the move has to land in the whole order.
 */
export function moveId(order: readonly string[], a: string, b: string): string[] {
  const from = order.indexOf(a);
  const to = order.indexOf(b);
  if (from < 0 || to < 0) return [...order];
  return moveItem(order, from, to);
}

/**
 * The layout with a zone's order set. An order that is the shipped one is not
 * stored: the store then says exactly which zones have been changed, and
 * putting everything back is emptying it.
 */
export function withOrder(layout: Layout, zone: string, order: readonly string[]): Layout {
  const shipped = shippedOrder(zone);
  if (!shipped.length) return layout;
  const next = normaliseOrder(order, shipped);
  const zones = { ...layout.zones };
  if (sameOrder(next, shipped)) {
    if (!(zone in zones)) return layout;
    delete zones[zone];
  } else {
    if (zones[zone] && sameOrder(zones[zone], next)) return layout;
    zones[zone] = next;
  }
  return { version: LAYOUT_VERSION, zones };
}

/** Whether anything stands anywhere but where it shipped. */
export const isCustomised = (layout: Layout): boolean => Object.keys(layout.zones).length > 0;

// ------------------------------------------------------------ storing

export function parseLayout(raw: string | null | undefined): Layout {
  if (!raw) return EMPTY_LAYOUT;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_LAYOUT;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return EMPTY_LAYOUT;
  const v = parsed as { version?: unknown; zones?: unknown };
  if (v.version !== LAYOUT_VERSION) return EMPTY_LAYOUT;
  if (!v.zones || typeof v.zones !== 'object' || Array.isArray(v.zones)) return EMPTY_LAYOUT;
  let out: Layout = EMPTY_LAYOUT;
  for (const [zone, order] of Object.entries(v.zones as Record<string, unknown>)) {
    if (!isZone(zone) || !Array.isArray(order)) continue;
    out = withOrder(out, zone, normaliseOrder(order, shippedOrder(zone)));
  }
  return out;
}

export const serialiseLayout = (layout: Layout): string => JSON.stringify({ version: LAYOUT_VERSION, zones: layout.zones });

// ------------------------------------------------------------ the drag

export type Rect = { x: number; y: number; width: number; height: number };
export type Point = { x: number; y: number };

export const centreOf = (r: Rect): Point => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });

/**
 * Which slot a point is over: first the row it is level with (the nearest
 * one, when it is in the gap between rows), then the nearest slot along
 * that row. Nearest rather than containing, so the gap between tiles, the
 * empty half of an odd last row and anywhere past the ends all still land
 * somewhere; by row first, so the empty half of the last row lands on the
 * last tile rather than the one above it. Ties go to the earlier slot. No
 * slots, no answer.
 */
export function nearestSlot(rects: readonly Rect[], p: Point): number {
  if (!rects.length) return -1;
  const off = (lo: number, size: number, v: number) => Math.max(0, lo - v, v - (lo + size));
  const dy = rects.map((r) => off(r.y, r.height, p.y));
  const nearestRow = Math.min(...dy);
  let best = -1;
  let bestD = Infinity;
  rects.forEach((r, i) => {
    if ((dy[i] as number) > nearestRow) return;
    const d = off(r.x, r.width, p.x);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

/**
 * How a zone lays its slots out, which decides where the others go while one
 * is carried: `slots` when every slot is the same size (a row of tabs, a grid
 * of tiles), so the others simply step into each other's places; `stack`
 * when they stand in a column of their own heights (the Projects cards), so
 * the column is re-stacked from the top.
 */
export type SlotMode = 'slots' | 'stack';

/** The space between stacked slots, read off where they were measured. */
export function stackGap(rects: readonly Rect[]): number {
  if (rects.length < 2) return 0;
  const gaps: number[] = [];
  for (let i = 1; i < rects.length; i += 1) gaps.push((rects[i] as Rect).y - ((rects[i - 1] as Rect).y + (rects[i - 1] as Rect).height));
  gaps.sort((a, b) => a - b);
  return Math.max(0, gaps[Math.floor(gaps.length / 2)] as number);
}

/**
 * Where every slot's item would stand with the item at `from` dropped at
 * `to`, by original index. The carried item's frame is where it will land.
 */
export function previewFrames(rects: readonly Rect[], from: number, to: number, mode: SlotMode): Rect[] {
  const n = rects.length;
  const order = moveItem(
    rects.map((_, i) => i),
    from,
    to
  );
  const frames: Rect[] = rects.map((r) => ({ ...r }));
  if (mode === 'slots') {
    order.forEach((orig, slot) => {
      frames[orig] = { ...(rects[slot] as Rect) };
    });
    return frames;
  }
  if (!n) return frames;
  const gap = stackGap(rects);
  let y = (rects[0] as Rect).y;
  for (const orig of order) {
    const r = rects[orig] as Rect;
    frames[orig] = { ...r, y };
    y += r.height + gap;
  }
  return frames;
}

/**
 * How far to carry the scroll, a finger this far into the edge band: nothing
 * outside it, up to `max` at the very edge, and gentle just inside the band
 * (the ramp is squared) so a tile can be dropped near the edge without the
 * page running away under it.
 */
export function edgeScroll(pos: number, length: number, band: number, max: number): number {
  if (length <= 0 || band <= 0) return 0;
  const depth = pos < band ? (band - pos) / band : pos > length - band ? (pos - (length - band)) / band : 0;
  if (!depth) return 0;
  const step = max * Math.min(1, depth) ** 2;
  return pos < band ? -step : step;
}
