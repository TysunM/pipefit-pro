// Pipe nipple lengths, long, short and close.
//
// A close nipple is threaded end to end. A short nipple has a little bare pipe
// in the middle. Long nipples are stocked in half inch steps from two to six
// inches, then whole inches from six to twelve, with the shortest one made in
// each size rising with the size.

export type Nipple = {
  nps: number;
  label: string;
  /** Shortest long nipple stocked in this size. */
  longestShortestLong: number;
  /** Length of a short nipple. */
  short: number;
  /** Length of a close nipple. */
  close: number;
};

export const LONGEST_LONG_NIPPLE = 12;

export const NIPPLES: Nipple[] = [
  { nps: 0.125, label: '1/8"', longestShortestLong: 2, short: 1.5, close: 0.75 },
  { nps: 0.25, label: '1/4"', longestShortestLong: 2, short: 1.5, close: 0.875 },
  { nps: 0.375, label: '3/8"', longestShortestLong: 2, short: 1.5, close: 1 },
  { nps: 0.5, label: '1/2"', longestShortestLong: 2, short: 1.5, close: 1.125 },
  { nps: 0.75, label: '3/4"', longestShortestLong: 2.5, short: 2, close: 1.375 },
  { nps: 1, label: '1"', longestShortestLong: 2.5, short: 2, close: 1.5 },
  { nps: 1.25, label: '1-1/4"', longestShortestLong: 3, short: 2.5, close: 1.625 },
  { nps: 1.5, label: '1-1/2"', longestShortestLong: 3, short: 2.5, close: 1.75 },
  { nps: 2, label: '2"', longestShortestLong: 3, short: 2.5, close: 2 },
  { nps: 2.5, label: '2-1/2"', longestShortestLong: 3.5, short: 3, close: 2.5 },
  { nps: 3, label: '3"', longestShortestLong: 3.5, short: 3, close: 2.625 },
  { nps: 3.5, label: '3-1/2"', longestShortestLong: 4.5, short: 4, close: 2.75 },
  { nps: 4, label: '4"', longestShortestLong: 4.5, short: 4, close: 2.875 },
  { nps: 5, label: '5"', longestShortestLong: 5, short: 4.5, close: 3 },
  { nps: 6, label: '6"', longestShortestLong: 5, short: 4.5, close: 3.125 },
  { nps: 8, label: '8"', longestShortestLong: 5.5, short: 5, close: 3.5 },
  { nps: 10, label: '10"', longestShortestLong: 8, short: 5, close: 3.875 },
  { nps: 12, label: '12"', longestShortestLong: 8, short: 6, close: 4.5 },
];

const BY_NPS = new Map(NIPPLES.map((n) => [n.nps, n]));

export const nipple = (nps: number): Nipple | undefined => BY_NPS.get(nps);

/**
 * The long nipple lengths stocked in a size: half inch steps to six inches,
 * then whole inches to twelve, starting at the shortest one made in that size.
 */
export function longNippleLengths(nps: number): number[] {
  const n = BY_NPS.get(nps);
  if (!n) return [];

  const out: number[] = [];
  for (let v = 2; v <= 6; v += 0.5) if (v >= n.longestShortestLong) out.push(v);
  for (let v = 7; v <= LONGEST_LONG_NIPPLE; v += 1) if (v >= n.longestShortestLong) out.push(v);
  return out;
}

/** The shortest stocked nipple that reaches a wanted length, if one does. */
export function nippleFor(nps: number, wanted: number): { kind: 'close' | 'short' | 'long'; length: number } | undefined {
  const n = BY_NPS.get(nps);
  if (!n || !Number.isFinite(wanted) || wanted <= 0) return undefined;

  if (wanted <= n.close) return { kind: 'close', length: n.close };
  if (wanted <= n.short) return { kind: 'short', length: n.short };

  for (const v of longNippleLengths(nps)) if (v >= wanted) return { kind: 'long', length: v };
  return undefined;
}
