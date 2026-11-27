// The gear check
// --------------
// Everything below the hook, each piece against the rating on its own tag:
// which piece is working hardest, and whether any is over. A lift is only as
// strong as its weakest piece.
//
// Where a piece sits decides what it carries:
// - on each sling leg (a sling, a shackle at the pick, an eyebolt): the leg's
//   tension, the heaviest leg if they differ. A sling in a basket hitch has
//   both its parts going up to the hook, so it carries two legs' worth, against
//   the basket rating on its tag (rated for straight-up parts; the angle is
//   already in the leg tension);
// - in line with the whole load (the hook or master link, a chain fall, a
//   come-along, a beam clamp, a spreader): the hook load, the load and the
//   rigging hung under it.
//
// The rating is the one on the tag for the way it is used (vertical, choker
// or basket for a sling). No maker's table is guessed at.
//
// Then the questions that make a lift critical. Any yes, and it gets an
// engineered lift plan, signed off, before it goes up. Pounds throughout. Pure.

export type GearKind = 'sling' | 'shackle' | 'eyebolt' | 'hook' | 'chainfall' | 'comealong' | 'beamclamp' | 'spreader' | 'other';
export type Hitch = 'vertical' | 'choker' | 'basket';
export type GearItem = { id: string; kind: GearKind; hitch?: Hitch; /** The working load limit on its tag, for the way it is used. */ rated: number | null; /** A choke tighter than 120°: the choker rating on the tag comes down. */ tightChoke?: boolean };

export type GearKindInfo = { label: string; where: 'leg' | 'hook'; note?: string };
export const GEAR_KINDS: Record<GearKind, GearKindInfo> = {
  sling: { label: 'Sling', where: 'leg' },
  shackle: { label: 'Shackle', where: 'leg', note: 'Loaded through the bow and pin, never side-loaded on the pin. The pin all the way home.' },
  eyebolt: { label: 'Eyebolt', where: 'leg', note: 'Shouldered eyebolts only, seated flat. Loaded at any angle off the shank, its rating comes down a long way: check the maker\'s chart for the angle.' },
  hook: { label: 'Hook or master link', where: 'hook', note: 'The latch closed, the load in the bowl, never on the tip.' },
  chainfall: { label: 'Chain fall', where: 'hook', note: 'Hung from rated structure. The load chain straight, no twists, never wrapped round the load.' },
  comealong: { label: 'Come-along', where: 'hook', note: 'For pulling. Overhead only if its maker rates it for lifting. No cheater bar on the handle.' },
  beamclamp: { label: 'Beam clamp', where: 'hook', note: "Sized to the beam's flange, tightened, and the beam able to take the load: ask before you hang off steel." },
  spreader: { label: 'Spreader or lifting beam', where: 'hook', note: 'Rated and marked for the lift, the slings on its lugs as it is rated.' },
  other: { label: 'Other', where: 'hook' },
};

export const HITCHES: { value: Hitch; label: string }[] = [
  { value: 'vertical', label: 'Vertical' },
  { value: 'choker', label: 'Choker' },
  { value: 'basket', label: 'Basket' },
];

/** At or over this share of its rating a piece is working hard: look at it twice. */
export const HEAVY = 0.9;

export type GearStatus = 'ok' | 'heavy' | 'over' | 'unrated';
export type GearLine = { item: GearItem; label: string; force: number; pct: number | null; status: GearStatus; notes: string[] };
export type GearResult = { hookLoad: number; maxLeg: number; lines: GearLine[]; weakest: number | null; over: boolean; unrated: number };

export function itemLabel(i: GearItem): string {
  const k = GEAR_KINDS[i.kind].label;
  return i.kind === 'sling' ? `${k}, ${HITCHES.find((h) => h.value === (i.hitch ?? 'vertical'))!.label.toLowerCase()} hitch` : k;
}

/** Each piece against its tag: what it carries, how hard it is working, and the one working hardest. */
export function checkGear(input: { load: number; rigging: number; legs: readonly number[]; items: readonly GearItem[] }): GearResult {
  const hookLoad = Math.max(0, input.load) + Math.max(0, input.rigging);
  const maxLeg = input.legs.length ? Math.max(...input.legs) : hookLoad;
  const lines = input.items.map((item): GearLine => {
    const info = GEAR_KINDS[item.kind];
    const basket = item.kind === 'sling' && item.hitch === 'basket';
    const force = info.where === 'hook' ? hookLoad : maxLeg * (basket ? 2 : 1);
    const pct = item.rated !== null && item.rated > 0 ? force / item.rated : null;
    const notes: string[] = [];
    if (info.note) notes.push(info.note);
    if (item.kind === 'sling' && item.hitch === 'choker') notes.push(item.tightChoke ? "Choked tighter than 120°: the choker rating on the tag comes down. Use the maker's chart for the angle, or choke it looser." : 'Choker rating off the tag. A choke tighter than 120° lowers it.');
    if (basket) notes.push('Both parts of the basket go up to the hook: it carries two legs, against the basket rating on its tag. Keep the bend round the load gentle.');
    if (item.kind === 'sling') notes.push('Pad any sharp edge. A sling cut, crushed, kinked or with its tag missing comes out of service.');
    const status: GearStatus = pct === null ? 'unrated' : pct > 1 + 1e-9 ? 'over' : pct >= HEAVY ? 'heavy' : 'ok';
    return { item, label: itemLabel(item), force, pct, status, notes };
  });
  let weakest: number | null = null;
  lines.forEach((l, i) => {
    if (l.pct !== null && (weakest === null || l.pct > lines[weakest]!.pct!)) weakest = i;
  });
  return { hookLoad, maxLeg, lines, weakest, over: lines.some((l) => l.status === 'over'), unrated: lines.filter((l) => l.status === 'unrated').length };
}

/** The legs a load hangs on: each one's tension, from the load, how many legs carry it, and their angle from horizontal. */
export function legTensions(load: number, carrying: number, angle: number): number[] {
  if (!(load > 0) || !(carrying >= 1) || !(angle > 0 && angle <= 90)) return [];
  const each = load / carrying / Math.sin((angle * Math.PI) / 180);
  return Array.from({ length: carrying }, () => each);
}

export const CRITICAL: { id: string; text: string }[] = [
  { id: 'capacity', text: "Over 75% of the crane or hoist's rating at that radius (ask the operator)" },
  { id: 'two', text: 'Two or more cranes or hoists on the one load' },
  { id: 'over', text: 'Over people, an occupied building, or live lines and equipment' },
  { id: 'people', text: 'Lifting people' },
  { id: 'unknown', text: "The weight or centre of gravity isn't known, or the load could shift" },
];

/** A lift with any of these is critical: an engineered lift plan, signed off, before it goes up. */
export const isCritical = (answers: Record<string, boolean>) => CRITICAL.some((q) => answers[q.id]);
