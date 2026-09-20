// The mark
// --------
// A P built out of pipe: the bowl turns through half a circle, the stem comes
// up from a flange and elbows into it, with couplings where a fitter would put
// them. A letterform and a spool at the same time, which is the only way to
// say what the app is in one glyph.
//
// Three things about how it is drawn.
//
// The outline is the frame blue rather than black. Black would make it a
// pictogram; the blue makes the outline part of the same object as the border,
// so the tile reads as one piece of work rather than a drawing pasted onto a
// background.
//
// The bore is one gradient across the whole mark, lit from the top left. A
// highlight stroke down the centre of a pipe is the obvious way to suggest a
// cylinder and it is the wrong one — it reads as a second, thinner pipe inside
// the first. One catch along the lit edge, offset rather than centred, does
// the job without the artefact.
//
// And the whole outline carries a soft drop shadow, so the pipework sits above
// the white field rather than printed on it. That is the embossing, and it is
// four lines.

const BLUE = '#0A4FBE';
/** The bore. */
const SW = 136;
/** The outline either side of it. */
const OUT = 30;

const BOWL = 'M300,262 L640,262 Q826,262 826,436 Q826,610 640,610 L516,610';
const STEM = 'M292,856 L292,628 Q292,498 422,498 L556,498';

const coupV = (cx, cy, w = 92, h = 196) => ({ x: cx - w / 2, y: cy - h / 2, w, h });
const coupH = (cx, cy, w = 196, h = 92) => ({ x: cx - w / 2, y: cy - h / 2, w, h });
const FITTINGS = [coupV(300, 262), coupV(512, 498), coupH(292, 856)];

const rect = (r, fill) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="26" fill="${fill}"/>`;
const grown = (r, by) => ({ x: r.x - by, y: r.y - by, w: r.w + by * 2, h: r.h + by * 2 });
const run = (d, stroke, w) =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;

/** The pipework, without the field it sits on. */
const GLYPH = `
  <g filter="url(#emboss)">
    ${run(BOWL, BLUE, SW + OUT * 2)}
    ${run(STEM, BLUE, SW + OUT * 2)}
    ${FITTINGS.map((r) => rect(grown(r, OUT), BLUE)).join('')}
  </g>
  ${run(BOWL, 'url(#sheen)', SW)}
  ${run(STEM, 'url(#sheen)', SW)}
  ${FITTINGS.map((r) => rect(r, 'url(#sheen)')).join('')}
  <g opacity="0.75" transform="translate(-14,-16)">
    ${run(BOWL, '#FFFFFF', 18)}
    ${run(STEM, '#FFFFFF', 18)}
  </g>`;

const DEFS = `
  <linearGradient id="sheen" x1="180" y1="120" x2="600" y2="980" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#FFFFFF"/>
    <stop offset="0.30" stop-color="#F7FAFE"/>
    <stop offset="0.62" stop-color="#DCE7F6"/>
    <stop offset="1" stop-color="#BACDE8"/>
  </linearGradient>
  <filter id="emboss" x="-14%" y="-14%" width="128%" height="128%">
    <feDropShadow dx="0" dy="7" stdDeviation="6" flood-color="#062F79" flood-opacity="0.22"/>
  </filter>`;

/**
 * `bg` is the field behind the glyph, which the caller supplies because the
 * three places this is used want three different ones: the square icon wants
 * the framed white, the adaptive foreground wants nothing at all because
 * Android paints its own, and the splash wants nothing for the same reason.
 */
export const MARK = (bg, artScale = 1) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>${DEFS}</defs>
  ${bg}
  <g transform="translate(512,512) scale(${artScale}) translate(-512,-512)">${GLYPH}</g>
</svg>`;

/** The blue border with the white field inside it, as drawn. */
export const FRAMED = `<rect width="1024" height="1024" fill="${BLUE}"/><rect x="46" y="46" width="932" height="932" fill="#FFFFFF"/>`;
