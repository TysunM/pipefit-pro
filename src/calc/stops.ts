/**
 * Which of `n` evenly spaced stops a fraction of the track lands nearest.
 * A tap past either end lands on that end rather than off the scale.
 */
export function nearestStop(n: number, fraction: number): number {
  if (n <= 1) return 0;
  const f = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
  return Math.round(f * (n - 1));
}
