// The mark
// --------
// What a man sees on his home screen before he has any reason to care. It has
// one job: look like a tool somebody paid for, at the size of a thumbnail.
//
// Three decisions.
//
// The glyph is a spool — a run, two ninety degree elbows, cut ends. Not a
// wrench, not a gauge, not a generic hard hat. The thing the app is for, drawn
// the way the app draws it, so the icon and the first screen agree.
//
// It is gold on deep emerald with a gold rule, because that reads as brass on
// green at any size and because it is the only combination in the palette that
// survives being shrunk to forty eight pixels. A thin outline mark disappears
// there; a heavy one does not.
//
// And the ring is a gradient across the gold ramp rather than a flat fill, so
// the edge catches the way a machined edge catches. That is the whole of the
// "expensive" impression and it costs four stops.

const RING_OUT = 452;
const RING_IN = 372;
const SW = 58;
const CAP_L = 132;
const CAP_T = 40;

/** A three leg spool: east, up, north — the one everybody draws first. */
const RUN = 'M0,0 L0,90 L190,90 L190,190 L284,190';

const capH = (x, y) => `<rect x="${x - CAP_L / 2}" y="${y - CAP_T / 2}" width="${CAP_L}" height="${CAP_T}" rx="8"/>`;
const capV = (x, y) => `<rect x="${x - CAP_T / 2}" y="${y - CAP_L / 2}" width="${CAP_T}" height="${CAP_L}" rx="8"/>`;

const glyphBody = (fill) => `
  <g fill="${fill}">
    <path d="${RUN}" fill="none" stroke="${fill}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="butt"/>
    ${capH(0, 0)}${capV(95, 90)}${capV(284, 190)}
  </g>`;

const CX = 123.5;
const CY = 109.5;
const GLYPH_SCALE = 1.2;

const ART = `
  <g filter="url(#lift)">
    <circle cx="512" cy="512" r="${(RING_OUT + RING_IN) / 2}" fill="none"
            stroke="url(#ring)" stroke-width="${RING_OUT - RING_IN}"/>
    <circle cx="512" cy="512" r="${RING_IN}" fill="url(#field)"/>
  </g>
  <g transform="translate(512,512) scale(${GLYPH_SCALE}) translate(${-CX},${-CY})" filter="url(#drop)">
    ${glyphBody('url(#brass)')}
  </g>`;

export const MARK = (bg, artScale = 1) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="ring" gradientUnits="userSpaceOnUse" x1="250" y1="120" x2="790" y2="910">
      <stop offset="0" stop-color="#F0DCA0"/>
      <stop offset="0.28" stop-color="#D8B863"/>
      <stop offset="0.55" stop-color="#9C7A24"/>
      <stop offset="0.78" stop-color="#D8B863"/>
      <stop offset="1" stop-color="#7A5A12"/>
    </linearGradient>
    <linearGradient id="field" gradientUnits="userSpaceOnUse" x1="512" y1="140" x2="512" y2="884">
      <stop offset="0" stop-color="#14463A"/>
      <stop offset="1" stop-color="#06201B"/>
    </linearGradient>
    <linearGradient id="brass" gradientUnits="userSpaceOnUse" x1="300" y1="300" x2="740" y2="720">
      <stop offset="0" stop-color="#F3E3B2"/>
      <stop offset="0.45" stop-color="#D8B863"/>
      <stop offset="1" stop-color="#A9861F"/>
    </linearGradient>
    <filter id="lift" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#02100D" flood-opacity="0.34"/>
    </filter>
    <filter id="drop" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#02100D" flood-opacity="0.45"/>
    </filter>
  </defs>
  ${bg}
  <g transform="translate(512,512) scale(${artScale}) translate(-512,-512)">${ART}</g>
</svg>`;
