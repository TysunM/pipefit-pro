// The mark
// --------
// What a man sees on his home screen before he has any reason to care. It has
// one job: look like a tool somebody paid for, at the size of a thumbnail.
//
// Three runs of pipe, each turning ninety and flanged at both open ends,
// staggered down the diagonal so they overlap and read as a rack rather than
// as one part. Three and not two: two bends read as a plumbing fixture, three
// reads as pipework. Drawn square-on rather than isometric, because at forty
// eight pixels an isometric run has no vertical to anchor it and the three
// collapse into one gold smear — measured, not assumed.
//
// Brass on a near-black field. The field is nearly black rather than emerald
// so the brass separates at small sizes, where a mid-green ground and a gold
// glyph start to share a value. The emerald survives as the top of the field
// gradient, which keeps the icon and the app the same family without costing
// the contrast.
//
// Every fill is a gradient across the brass ramp, and every run carries a dark
// outline under it. That outline is what stops the three runs merging where
// they overlap, and it is the whole of the "machined" impression.

const SW = 132;
const COUNT = 3;
const STEP_X = 186;
const STEP_Y = 164;
const X0 = 196;
const Y0 = 232;
const REACH = 300;
const DROP = 640;

/** One run: up the page, turning ninety to the right, flanged at both ends. */
const run = (x, y, drop) => `
  <g>
    <path d="M${x},${y + drop} L${x},${y + SW * 0.9} Q${x},${y} ${x + SW * 0.9},${y} L${x + REACH},${y}"
          fill="none" stroke="#06231C" stroke-width="${SW + 26}"/>
    <path d="M${x},${y + drop} L${x},${y + SW * 0.9} Q${x},${y} ${x + SW * 0.9},${y} L${x + REACH},${y}"
          fill="none" stroke="url(#brass)" stroke-width="${SW}"/>
    <ellipse cx="${x}" cy="${y + drop}" rx="${SW / 2 + 32}" ry="38"
             fill="url(#flange)" stroke="#06231C" stroke-width="10"/>
    <ellipse cx="${x + REACH}" cy="${y}" rx="32" ry="${SW / 2 + 28}"
             fill="url(#flange)" stroke="#06231C" stroke-width="10"/>
  </g>`;

const ART = Array.from({ length: COUNT }, (_, i) =>
  run(X0 + i * STEP_X, Y0 + i * STEP_Y, DROP - i * STEP_Y)
).join('');

export const MARK = (bg, artScale = 1) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="ink" x1="512" y1="0" x2="512" y2="1024" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0A2018"/>
      <stop offset="1" stop-color="#010806"/>
    </linearGradient>
    <linearGradient id="brass" x1="150" y1="150" x2="900" y2="900" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#F6E9C2"/>
      <stop offset="0.38" stop-color="#DCBC68"/>
      <stop offset="0.72" stop-color="#B08F32"/>
      <stop offset="1" stop-color="#E0C176"/>
    </linearGradient>
    <linearGradient id="flange" x1="0" y1="0" x2="0" y2="1024" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FCF5DC"/>
      <stop offset="1" stop-color="#BB9740"/>
    </linearGradient>
  </defs>
  ${bg}
  <g transform="translate(512,512) scale(${artScale}) translate(-512,-512)">${ART}</g>
</svg>`;
