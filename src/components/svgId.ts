/**
 * Naming the gradients inside a drawing.
 *
 * SVG ids are global on a web page — every `<svg>` the app draws shares one
 * namespace — so two drawings that name a gradient the same thing both end up
 * pointing at whichever one the browser kept.
 *
 * That is not hypothetical. These ids used to read `<prefix><uid>` for a
 * drawing's first gradient and `<prefix><uid>e` for its second, and React
 * hands out ids as a counter in base 32. The key drawn with uid `r2` named its
 * edge highlight `sheenr2e`; the key drawn with uid `r2e` named its body the
 * same. On the calculator that left the 6 key filled with a neighbour's edge
 * highlight — which is almost entirely transparent — so it rendered as a hole
 * in the keypad while every key around it was bronze.
 *
 * The unique part now sits in the middle, with a one-character role on the
 * end. Two ids can then only match when the uid matches, and a matching uid
 * means the same drawing asked twice. svgIds.test.ts holds both halves of
 * that: the roles stay one character, and no prefix is a prefix of another.
 */

/** Every prefix used for an SVG id in this app. */
export const SVG_PREFIXES = ['glow', 'shop', 'spool'] as const;

export type SvgPrefix = (typeof SVG_PREFIXES)[number];

/** One gradient's id. `role` is a single character. */
export function svgId(prefix: SvgPrefix, uid: string, role: string): string {
  return `${prefix}${uid}${role}`;
}
