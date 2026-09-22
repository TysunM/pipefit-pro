// The heat book
// -------------
// A separate store from the joint register, and separately versioned, for one
// reason: a heat covers many pieces. One length of A106 gets cut into six
// spools and welded into thirty joints, and all thirty point at the same
// number. Copying the material, the mill and the cert reference onto each of
// them would mean thirty places to correct when the cert turns up filed under
// something else.
//
// So heats are held once, keyed by their number, and a joint carries the
// numbers alone. Which also means adding heats to a register written by an
// older app cannot break it: a joint with no heats is a joint with none
// recorded, which is a true statement about a job and exactly what the
// traceability report should say about it.
//
// Everything here is pure, like register.ts. The provider holds one book and
// persists it; the reasoning is in these functions so it tests without a
// device.

import { Heat, HeatForm, normaliseHeat } from '../calc/heat';

/**
 * Bumped only when the stored shape changes in a way an older app would read
 * wrongly. A book written by a NEWER app is left alone rather than parsed
 * optimistically, the same rule the joint register follows and for the same
 * reason: the web app and the APK run side by side.
 */
export const HEAT_BOOK_VERSION = 1;

/**
 * Heats kept, oldest dropped first past the cap.
 *
 * A big job runs to a few hundred heats. Two thousand is far past any of them
 * and still leaves the book a few hundred kilobytes, which is the size that
 * keeps a write cheap enough to do on every keystroke.
 */
export const MAX_HEATS = 2000;

export type HeatBook = {
  heats: Heat[];
  /** The store was written by a newer app and has been left alone. */
  foreign: boolean;
  /** Entries the store held that did not survive validation. */
  dropped: number;
};

export const emptyBook = (): HeatBook => ({ heats: [], foreign: false, dropped: 0 });

const isRec = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

const FORMS: readonly HeatForm[] = ['pipe', 'fitting', 'flange', 'plate', 'bolting', 'other'];
const form = (v: unknown): HeatForm => (FORMS.includes(v as HeatForm) ? (v as HeatForm) : 'other');

/**
 * One stored heat, or null.
 *
 * The heat number is the only field that can fail: everything else has a sane
 * empty value, and an entry with a blank material is a real thing somebody
 * writes down at the rack meaning to fill it in later. An entry with no number
 * is not a heat at all.
 */
export function validHeat(v: unknown): Heat | null {
  if (!isRec(v)) return null;
  const heat = str(v.heat).trim();
  if (!heat || !normaliseHeat(heat)) return null;
  const nps = typeof v.nps === 'number' && Number.isFinite(v.nps) && v.nps > 0 ? v.nps : null;
  const createdAt = isInt(v.createdAt) ? v.createdAt : 0;
  return {
    heat,
    material: str(v.material),
    form: form(v.form),
    nps,
    schedule: str(v.schedule),
    mill: str(v.mill),
    mtr: str(v.mtr),
    certified: v.certified === true,
    note: str(v.note),
    createdAt,
    updatedAt: isInt(v.updatedAt) ? v.updatedAt : createdAt,
  };
}

export function serialiseBook(b: HeatBook): string {
  return JSON.stringify({ v: HEAT_BOOK_VERSION, heats: b.heats });
}

/**
 * Read the store. Nothing throws and nothing guesses.
 *
 * Two heats whose numbers differ only by case or a dash are one heat, so the
 * later entry wins and the earlier is counted as dropped — the book must not
 * hold `E7Z419` and `e7z-419` as two rows, because then a joint pointing at
 * one of them is proved and a joint pointing at the other is not.
 */
export function parseBook(raw: string | null | undefined): HeatBook {
  if (!raw) return emptyBook();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...emptyBook(), dropped: 1 };
  }

  if (!isRec(parsed)) return { ...emptyBook(), dropped: 1 };
  if (!isInt(parsed.v) || parsed.v < 1) return { ...emptyBook(), dropped: 1 };
  if (parsed.v > HEAT_BOOK_VERSION) return { ...emptyBook(), foreign: true };
  if (!Array.isArray(parsed.heats)) return { ...emptyBook(), dropped: 1 };

  const byKey = new Map<string, Heat>();
  let dropped = 0;
  for (const row of parsed.heats) {
    const h = validHeat(row);
    if (!h) {
      dropped += 1;
      continue;
    }
    const key = normaliseHeat(h.heat);
    if (byKey.has(key)) dropped += 1;
    byKey.set(key, h);
  }

  return { heats: sortHeats([...byKey.values()]), foreign: false, dropped };
}

/** Certs still to chase first, then most recently touched. */
export function sortHeats(heats: Heat[]): Heat[] {
  return heats.slice().sort((a, b) => {
    if (a.certified !== b.certified) return a.certified ? 1 : -1;
    return b.updatedAt - a.updatedAt || a.heat.localeCompare(b.heat);
  });
}

/** The heat a number points at, through spelling, or undefined. */
export function findHeat(b: HeatBook, number: string): Heat | undefined {
  const n = normaliseHeat(number);
  return b.heats.find((h) => normaliseHeat(h.heat) === n);
}

/**
 * Store a heat, replacing any entry that is the same heat spelled differently.
 *
 * Over the cap, certified entries go first and oldest first among those: a
 * heat whose cert is in hand has already done its job, and one still waiting
 * on a cert is the row somebody has to act on.
 */
export function putHeat(b: HeatBook, heat: Heat): HeatBook {
  const key = normaliseHeat(heat.heat);
  const kept = b.heats.filter((h) => normaliseHeat(h.heat) !== key);
  kept.push(heat);
  if (kept.length <= MAX_HEATS) return { ...b, heats: sortHeats(kept) };

  const over = kept.length - MAX_HEATS;
  const droppable = kept
    .filter((h) => h.certified && normaliseHeat(h.heat) !== key)
    .sort((a, b2) => a.updatedAt - b2.updatedAt)
    .slice(0, over);
  const gone = new Set(droppable.map((h) => normaliseHeat(h.heat)));
  return { ...b, heats: sortHeats(kept.filter((h) => !gone.has(normaliseHeat(h.heat)))) };
}

export function removeHeat(b: HeatBook, number: string): HeatBook {
  const n = normaliseHeat(number);
  return { ...b, heats: b.heats.filter((h) => normaliseHeat(h.heat) !== n) };
}
