// Heat numbers, and the mistake this exists to catch
// --------------------------------------------------
// Every piece of pressure pipe carries a heat number, and the mill cert ties
// that number to the chemistry and the mechanical test that make the piece
// legal to weld. Proving it is the paperwork: a weld map with heats pencilled
// on it, transcribed into a spreadsheet, matched by hand against a folder of
// certs. Three copies of the same string, written out by three people.
//
// Which is where the failure comes from, and it is not the filing. It is that
// a heat number is a meaningless string stamped into curved steel, and the
// characters people get wrong are always the same ones:
//
//   O and 0.  I, l and 1.  S and 5.  B and 8.  Z and 2.  G and 6.
//
// A106 heat `E7Z419` written down as `E72419` still looks like a heat number.
// It passes every check except the one that matters, and it is found at
// turnover, when the piece is in the rack and the cert it points at does not
// exist. So the register does not merely store what it is given: it says when
// a new heat differs from one already in it only by characters that get
// confused, because two spellings of one heat is exactly the error it is for.
//
// Nothing here reads a camera. Sorting out what the string means, and whether
// it can be proved, is the part worth being careful about; getting the string
// in is typing, and later a lens.

/** What the piece is, because a heat is stamped on all of them. */
export type HeatForm = 'pipe' | 'fitting' | 'flange' | 'plate' | 'bolting' | 'other';

export const HEAT_FORMS: readonly { id: HeatForm; label: string }[] = [
  { id: 'pipe', label: 'Pipe' },
  { id: 'fitting', label: 'Fitting' },
  { id: 'flange', label: 'Flange' },
  { id: 'plate', label: 'Plate' },
  { id: 'bolting', label: 'Bolting' },
  { id: 'other', label: 'Other' },
];

export type Heat = {
  /** As stamped, kept exactly as entered — this is what a checker compares to. */
  heat: string;
  /** The spec and grade: A106 Gr B, A312 TP316L, A105. */
  material: string;
  form: HeatForm;
  /** The table size, or null when it does not apply. */
  nps: number | null;
  schedule: string;
  /** Who made it. */
  mill: string;
  /** What the cert is filed as — a document number, a folder, a bundle tag. */
  mtr: string;
  /** Whether the cert is actually in hand. Nothing else here can prove it. */
  certified: boolean;
  note: string;
  createdAt: number;
  updatedAt: number;
};

/**
 * The comparable form of a heat number.
 *
 * Case and the separators people sprinkle in carry no information — `e7z419`,
 * `E7Z419` and `E7Z-419` are one heat — so they come out. Nothing else is
 * touched: the characters themselves are what the checker reads off the steel.
 */
export function normaliseHeat(raw: string): string {
  return raw.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

/** Heat numbers that are the same heat once spelling is set aside. */
export const sameHeat = (a: string, b: string): boolean => normaliseHeat(a) === normaliseHeat(b);

// The characters that get confused, in both directions. Deliberately not a
// phonetic or edit-distance scheme: those call `A106` and `A105` near
// neighbours, and those are two different heats from two different mills.
// Only the shapes a stamp and a stencil actually blur are folded together.
const CONFUSED: readonly string[][] = [
  ['O', '0', 'D', 'Q'],
  ['I', '1', 'L', 'T'],
  ['S', '5'],
  ['B', '8'],
  ['Z', '2'],
  ['G', '6'],
  ['U', 'V'],
];

const SHAPE = new Map<string, string>();
CONFUSED.forEach((group) => group.forEach((c) => SHAPE.set(c, group[0]!)));

/**
 * A heat number with every confusable character folded onto one of its group.
 *
 * Two heats with the same shape are either the same heat written down twice,
 * or two heats nobody will ever be able to tell apart on a turnover package.
 * Both are worth stopping at the keyboard.
 */
export function heatShape(raw: string): string {
  return normaliseHeat(raw)
    .split('')
    .map((c) => SHAPE.get(c) ?? c)
    .join('');
}

export type HeatClash = {
  /** The heat already in the register that the new one could be. */
  existing: string;
  /** True when they are the same string once case and dashes are set aside. */
  identical: boolean;
};

/**
 * Whether a heat about to be entered could be one already held.
 *
 * `identical` separates the two cases the screen has to say differently: a
 * heat already in the register is a duplicate to merge, and a heat that only
 * looks like one is a question — which is right, the steel or the cert?
 */
export function findClash(raw: string, existing: readonly Heat[]): HeatClash | null {
  const n = normaliseHeat(raw);
  if (!n) return null;
  const exact = existing.find((h) => normaliseHeat(h.heat) === n);
  if (exact) return { existing: exact.heat, identical: true };
  const shape = heatShape(raw);
  const near = existing.find((h) => heatShape(h.heat) === shape);
  return near ? { existing: near.heat, identical: false } : null;
}

/** Which characters two heats disagree on, for the screen to point at. */
export function differingAt(a: string, b: string): number[] {
  const x = normaliseHeat(a);
  const y = normaliseHeat(b);
  const out: number[] = [];
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    if (x[i] !== y[i]) out.push(i);
  }
  return out;
}

// What can and cannot be proved
// -----------------------------
// The question a turnover package answers is not "what went in" — it is "what
// can you prove went in". So the gap matters more than the inventory, and it
// is worth naming rather than leaving somebody to diff two lists at the end
// of a job.

export type Traceability = {
  /** Joints with at least one heat, every one of which has its cert in hand. */
  proved: string[];
  /** Joints carrying a heat whose cert is not in hand. */
  uncertified: string[];
  /** Joints with no heat recorded against them at all. */
  unrecorded: string[];
};

/**
 * What a job can prove, joint by joint.
 *
 * A joint with no heats is a different problem from one whose heat has no
 * cert: the first is a note nobody made, the second is a cert nobody chased.
 * They go to different people, so they are counted apart.
 */
export function traceability(
  joints: readonly { id: string; heats: readonly string[] }[],
  heats: readonly Heat[],
): Traceability {
  const certified = new Set(heats.filter((h) => h.certified).map((h) => normaliseHeat(h.heat)));
  const known = new Set(heats.map((h) => normaliseHeat(h.heat)));
  const out: Traceability = { proved: [], uncertified: [], unrecorded: [] };
  for (const j of joints) {
    if (!j.heats.length) {
      out.unrecorded.push(j.id);
      continue;
    }
    const all = j.heats.every((h) => {
      const n = normaliseHeat(h);
      return known.has(n) && certified.has(n);
    });
    (all ? out.proved : out.uncertified).push(j.id);
  }
  return out;
}

/** A heat with nothing filled in but the number, for a fresh entry. */
export function newHeat(heat: string, now: number): Heat {
  return {
    heat: heat.trim(),
    material: '',
    form: 'pipe',
    nps: null,
    schedule: '',
    mill: '',
    mtr: '',
    certified: false,
    note: '',
    createdAt: now,
    updatedAt: now,
  };
}
