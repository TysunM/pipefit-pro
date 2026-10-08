// Clearing a job off the phone
// ----------------------------
// At the end of a job, or of a day, the work saved under it comes off the
// phone so the next starts clean: the bolt-ups, isos, spools, level readings,
// pressure tests, cut list, welds, shift reports and pre-task plans. What is kept is what
// every job uses — the heat book, the welder roster, the calibration register,
// the fitting library, the skills passport, the orientation and the settings — and the unnamed
// bolt-up slot.
//
// Pure: the screen gathers what is shown under the job and asks for a backup
// first; this says what goes and takes it off.

export type ClearCounts = { label: string; count: number }[];

type Ids = { id: string };

/** What clearing would take off, kind by kind, with only the kinds that have any. */
export function clearCounts(kinds: readonly { label: string; items: readonly unknown[] }[]): ClearCounts {
  return kinds.filter((k) => k.items.length).map((k) => ({ label: k.label, count: k.items.length }));
}

/** A list with the given records taken off, by id. The same list back when there was nothing to take. */
export function without<T extends Ids>(xs: readonly T[], gone: readonly Ids[]): T[] {
  if (!gone.length) return xs as T[];
  const ids = new Set(gone.map((g) => g.id));
  const left = xs.filter((x) => !ids.has(x.id));
  return left.length === xs.length ? (xs as T[]) : left;
}

/** "14 joints, 3 isos and 22 welds". */
export function countsText(c: ClearCounts): string {
  const parts = c.map((k) => `${k.count} ${k.count === 1 ? k.label.replace(/s$/, '') : k.label}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : (parts[0] ?? 'nothing');
}
