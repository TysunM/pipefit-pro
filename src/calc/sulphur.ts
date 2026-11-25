// Sulphur between two heats
// -------------------------
// The trace of sulphur in stainless steel decides which way a fusion weld's
// puddle flows. Welded to each other, a low-sulphur heat and a higher one
// pull the puddle toward the low-sulphur side, and the further apart they
// are the further it goes: the bead walks off the joint and the root on the
// other side can go short. It is the classic orbital failure that no
// program change made at the machine explains, because it is in the steel.
//
// No code sets how far apart two heats may be, so the line is the crew's
// (Settings → Welding), 0.005% by default. What ASME BPE does set, for 316L
// made to be orbital welded, is each heat's own sulphur: 0.005 to 0.017%.
// That band is from the BPE editions since 2002; check the edition the job
// is built to.
//
// Sources: The Fabricator, "Specifying the sulfur content of 316L stainless
// steel for orbital welding"; Mishra et al., Acta Materialia 2008, on the
// shift toward the lower-sulphur side.

export const BPE_SULPHUR = { min: 0.005, max: 0.017 } as const;
export const DEFAULT_SULPHUR_GAP = 0.005;
/** The most sulphur a heat can be entered with, weight per cent: free-machining grades run to about 0.35. */
export const MAX_SULPHUR = 1;
/** The crew's line, kept within reason: a typing slip of 5 for 0.005 is not taken. */
export const SULPHUR_GAP_RANGE = { min: 0.0005, max: 0.05 } as const;

/** "0.012", "0.0008": enough places to read a trace. */
export const pct = (s: number): string => (s > 0 && s < 0.001 ? s.toFixed(4) : s.toFixed(3));

export type HeatSulphur = { heat: string; s: number | null; inBook: boolean };

export type SulphurCheck =
  | { state: 'unknown'; notInBook: string[]; noFigure: string[] }
  | { state: 'matched'; low: { heat: string; s: number }; high: { heat: string; s: number }; gap: number }
  | { state: 'apart'; low: { heat: string; s: number }; high: { heat: string; s: number }; gap: number; ratio: number | null };

/**
 * The heats welded together, checked against each other: the lowest and the
 * highest sulphur, and whether they are further apart than the crew's line.
 * Until every heat named has a figure it says which do not, rather than
 * passing two it cannot see.
 */
export function sulphurCheck(heats: readonly HeatSulphur[], limit: number = DEFAULT_SULPHUR_GAP): SulphurCheck | null {
  const named = heats.filter((h) => h.heat.trim());
  if (named.length < 2) return null;
  const notInBook = named.filter((h) => !h.inBook).map((h) => h.heat);
  const noFigure = named.filter((h) => h.inBook && h.s === null).map((h) => h.heat);
  if (notInBook.length || noFigure.length) return { state: 'unknown', notInBook, noFigure };
  const known = named as { heat: string; s: number; inBook: boolean }[];
  const low = known.reduce((a, b) => (b.s < a.s ? b : a));
  const high = known.reduce((a, b) => (b.s > a.s ? b : a));
  // A hair under the line, as a cert prints it, is under it: 0.0050 apart is not over 0.005.
  const gap = Math.round((high.s - low.s) * 1e6) / 1e6;
  const pair = { low: { heat: low.heat, s: low.s }, high: { heat: high.heat, s: high.s }, gap };
  if (gap <= limit) return { state: 'matched', ...pair };
  return { state: 'apart', ...pair, ratio: low.s > 0 ? high.s / low.s : null };
}

/** What the check says, in the words the screen shows, and how loudly. */
export function sulphurWords(c: SulphurCheck, limit: number = DEFAULT_SULPHUR_GAP): { tone: 'ok' | 'warn' | 'info'; text: string } {
  if (c.state === 'unknown') {
    const bits = [
      c.notInBook.length ? `${c.notInBook.join(', ')} ${c.notInBook.length === 1 ? 'is' : 'are'} not in the heat book` : '',
      c.noFigure.length ? `${c.noFigure.join(', ')} ${c.noFigure.length === 1 ? 'has' : 'have'} no sulphur entered` : '',
    ].filter(Boolean);
    return { tone: 'info', text: `Sulphur not checked: ${bits.join('; ')}. Put it in off the MTR to check the heats against each other.` };
  }
  if (c.state === 'matched') return { tone: 'ok', text: `Sulphur ${pct(c.low.s)}% to ${pct(c.high.s)}%: within ${pct(limit)}% of each other.` };
  return {
    tone: 'warn',
    text:
      `Sulphur ${pct(c.low.s)}% on ${c.low.heat}, ${pct(c.high.s)}% on ${c.high.heat}: ${pct(c.gap)}% apart${c.ratio !== null && c.ratio >= 2 ? `, ${c.ratio.toFixed(1)} times` : ''}. ` +
      `The puddle pulls toward ${c.low.heat}, the lower-sulphur side, and the root on ${c.high.heat}'s side can go short. ` +
      'Match the heats if you can; if not, weld a coupon on these two heats first.',
  };
}

/** Whether a heat's own sulphur is outside the band ASME BPE gives 316L to be orbital welded. Only said of a 316 heat. */
export function bpeSulphurNote(material: string, s: number | null): string | null {
  if (s === null || !/316/.test(material)) return null;
  if (s >= BPE_SULPHUR.min && s <= BPE_SULPHUR.max) return null;
  return `${pct(s)}% is ${s < BPE_SULPHUR.min ? 'under' : 'over'} the ${pct(BPE_SULPHUR.min)}–${pct(BPE_SULPHUR.max)}% ASME BPE gives 316L to be orbital welded. Check the edition the job is built to.`;
}
