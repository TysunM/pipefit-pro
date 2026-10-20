// The nameplate
// -------------
// The app's own header, on paper: a brushed steel plate screwed at the
// corners, the icon's P and the wordmark on it. It heads the turnover package
// and every joint record, so a page that gets separated from the rest still
// says what made it, in the same lettering as the phone it came from.
//
// It is drawn as SVG, not CSS. A browser's print dialog drops CSS backgrounds
// unless a box is ticked, and a plate that is a background prints as nothing;
// an SVG is content and prints as drawn. The two pictures are carried once
// per document, in a hidden block of definitions, and every plate draws them
// by reference: a package with forty joint records holds one copy, not forty.

import { BRAND_MARK, BRAND_P } from './brand';

/** The page's width between the margins, mm: A4 less 12 mm a side (sheet.ts). */
const W = 186;
/** The plate's height, mm. */
const H = 13;
/** Where the screws sit, in from the corners, mm. */
const INSET = 2.4;
/** The P's side, and the lettering's height beside it, in the header's proportions (AppHeader.tsx). */
const P = 8.4;
const MARK_H = P * (44 / 40);
const MARK_W = (MARK_H * BRAND_MARK.w) / BRAND_MARK.h;
const GAP = 0.45;

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The definitions a document carries once: the two pictures, the plate's
 * sheen and the screw heads. Goes right after `<body>`.
 */
export const BRAND_DEFS =
  '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
  `<clipPath id="pf-pc"><rect width="${BRAND_P.w}" height="${BRAND_P.h}" rx="${Math.round(BRAND_P.w * 0.225)}"/></clipPath>` +
  `<symbol id="pf-p" viewBox="0 0 ${BRAND_P.w} ${BRAND_P.h}"><image href="data:image/png;base64,${BRAND_P.png}" width="${BRAND_P.w}" height="${BRAND_P.h}" clip-path="url(#pf-pc)"/></symbol>` +
  `<symbol id="pf-mark" viewBox="0 0 ${BRAND_MARK.w} ${BRAND_MARK.h}"><image href="data:image/png;base64,${BRAND_MARK.png}" width="${BRAND_MARK.w}" height="${BRAND_MARK.h}"/></symbol>` +
  '<linearGradient id="pf-steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef0f3"/><stop offset="0.5" stop-color="#bfc5cc"/><stop offset="1" stop-color="#d6dbe0"/></linearGradient>' +
  '<radialGradient id="pf-screw" cx="38%" cy="35%" r="65%"><stop offset="0" stop-color="#f6f7f9"/><stop offset="1" stop-color="#9aa0a8"/></radialGradient>' +
  '</defs></svg>';

/** A Phillips screw head, mm. */
const screw = (cx: number, cy: number): string =>
  `<circle cx="${cx}" cy="${cy}" r="1.25" fill="#4a5058"/>` +
  `<circle cx="${cx}" cy="${cy}" r="1" fill="url(#pf-screw)"/>` +
  `<path d="M${r2(cx - 0.55)} ${cy}H${r2(cx + 0.55)}M${cx} ${r2(cy - 0.55)}V${r2(cy + 0.55)}" stroke="#6b7179" stroke-width="0.28"/>`;

/** The plate, the full width of the page, with the P and the wordmark centred on it. */
export function nameplate(): string {
  const x = r2((W - (P + GAP + MARK_W)) / 2);
  const corners: [number, number][] = [
    [INSET, INSET],
    [W - INSET, INSET],
    [INSET, H - INSET],
    [W - INSET, H - INSET],
  ];
  return (
    `<svg class="plate" viewBox="0 0 ${W} ${H}" role="img" aria-label="PipeFit Pro">` +
    `<rect x="0.2" y="0.2" width="${W - 0.4}" height="${H - 0.4}" rx="1.6" fill="url(#pf-steel)" stroke="#5c626a" stroke-width="0.25"/>` +
    `<rect x="0.6" y="0.6" width="${W - 1.2}" height="${H - 1.2}" rx="1.3" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="0.25"/>` +
    [0.3, 0.55, 0.8].map((f) => `<rect x="1" y="${r2(H * f)}" width="${W - 2}" height="0.15" fill="#000000" opacity="0.05"/>`).join('') +
    corners.map(([cx, cy]) => screw(cx, cy)).join('') +
    `<use href="#pf-p" x="${x}" y="${r2((H - P) / 2)}" width="${P}" height="${P}"/>` +
    `<use href="#pf-mark" x="${r2(x + P + GAP)}" y="${r2((H - MARK_H) / 2)}" width="${r2(MARK_W)}" height="${r2(MARK_H)}"/>` +
    '</svg>'
  );
}

/** The plate sits across the top of the header, above the titles. */
export const NAMEPLATE_CSS = `
  .plate { display: block; width: 100%; height: auto; margin: 0 0 2.5mm; }
`;
