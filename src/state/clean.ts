// What every store does to a value on the way in: a name is one trimmed line,
// a note keeps its line breaks, and a figure out of range is "not given" —
// never zero, because a zero is a reading and a blank is not.

export const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
export const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
export const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** A short name as kept: one line, trimmed, capped. '' for anything that is not a string. */
export const cleanName = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';

/** Words as kept: trimmed at the ends, capped, line breaks allowed. */
export const cleanText = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/\r\n?/g, '\n').trim().slice(0, max) : '';

/** A figure from `min` to `max`, or null. */
export function cleanNum(v: unknown, max: number, { min = 0, integer = false }: { min?: number; integer?: boolean } = {}): number | null {
  if (!isNum(v) || v < min || v > max) return null;
  return integer && !Number.isInteger(v) ? null : v;
}

/** A moment, as stored: a whole number of milliseconds after 1970, or null. */
export const cleanTime = (v: unknown): number | null => (isInt(v) && v > 0 ? v : null);
