const RING_OUT = 440;
const RING_IN = 366;
const BLUE = '#2F49A0';
const SW = 54;
const CAP_L = 128;
const CAP_T = 38;

const RUN = 'M0,0 L0,90 L190,90 L190,190 L284,190';

const capH = (x, y) => `<rect x="${x - CAP_L / 2}" y="${y - CAP_T / 2}" width="${CAP_L}" height="${CAP_T}" rx="7"/>`;
const capV = (x, y) => `<rect x="${x - CAP_T / 2}" y="${y - CAP_L / 2}" width="${CAP_T}" height="${CAP_L}" rx="7"/>`;

const glyphBody = (fill) => `
  <g fill="${fill}">
    <path d="${RUN}" fill="none" stroke="${fill}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="butt"/>
    ${capH(0, 0)}${capV(95, 90)}${capV(284, 190)}
  </g>`;

const CX = 123.5;
const CY = 109.5;
const GLYPH_SCALE = 1.18;

const ART = `
  <g filter="url(#lift)">
    <circle cx="512" cy="512" r="${(RING_OUT + RING_IN) / 2}" fill="none"
            stroke="url(#ring)" stroke-width="${RING_OUT - RING_IN}"/>
    <circle cx="512" cy="512" r="${RING_IN}" fill="#FFFFFF"/>
  </g>
  <g transform="translate(512,512) scale(${GLYPH_SCALE}) translate(${-CX},${-CY})" filter="url(#drop)">
    ${glyphBody(BLUE)}
  </g>`;

export const MARK = (bg, artScale = 1) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="ring" gradientUnits="userSpaceOnUse" x1="512" y1="72" x2="512" y2="952">
      <stop offset="0" stop-color="#DC2B2B"/>
      <stop offset="0.32" stop-color="#E5502A"/>
      <stop offset="0.60" stop-color="#F0902C"/>
      <stop offset="1" stop-color="#F8DE2F"/>
    </linearGradient>
    <filter id="lift" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="15" flood-color="#2A1608" flood-opacity="0.22"/>
    </filter>
    <filter id="drop" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="9" stdDeviation="9" flood-color="#101A3C" flood-opacity="0.26"/>
    </filter>
  </defs>
  ${bg}
  <g transform="translate(512,512) scale(${artScale}) translate(-512,-512)">${ART}</g>
</svg>`;
