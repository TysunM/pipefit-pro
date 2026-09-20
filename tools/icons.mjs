// Icons
// -----
// The mark is his drawing, at assets/source/mark.png. Nothing here redraws it.
// This lifts the ink off the field it was drawn on, recolours it, and sets it
// into the four sizes the app ships, so the assets can be rebuilt from the
// source instead of being hand-placed files nobody can reproduce.
//
// Three things it does that are not obvious.
//
// Alpha comes from how dark each pixel is rather than from a threshold, so the
// smoothing in the original survives. Thresholding a 1920px drawing down to
// 1024 and then to 48 is what makes an icon look chewed at the edges.
//
// The pipe is black and the dimension is blue, and the two are told apart by
// what they are rather than by where they sit. The pipework is one welded run,
// so it is one connected region of ink and by a long way the largest; the
// dimension is dashes and three letters, which are two dozen small ones. Label
// the regions, take the biggest as the pipe, and everything else is annotation.
// No coordinates are hard-coded, so redrawing the source does not break this.
//
// And the adaptive foreground is drawn at 0.60 of the canvas, not filling it.
// Android composites a 108dp foreground and shows 72dp of it — a third of the
// canvas is cropped away before anyone sees it, and the amount varies with the
// launcher's mask. 0.60 lands inside the window on a circle, which is the
// tightest of them.

/** The pipe. */
const STEEL = '#000000';
/** The dimension and its letters — the blue he framed the drawing in. */
const BLUE = '#0A4FBE';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync, statSync } from 'node:fs';

const HERE = new URL('..', import.meta.url).pathname;
const src = readFileSync(`${HERE}assets/source/mark.png`).toString('base64');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
await page.setContent('<body></body>');

const out = await page.evaluate(async ({ data, steel, blue }) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + data;
  await img.decode();

  const w = img.naturalWidth, h = img.naturalHeight;
  const lifted = new OffscreenCanvas(w, h), ctx = lifted.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const frame = ctx.getImageData(0, 0, w, h), px = frame.data;

  // Dark pixels are the drawing. The white field is not, and neither is the
  // blue border — its blue channel is far above the cut, so it drops out here
  // rather than needing to be cropped off by hand.
  const alpha = new Uint8Array(w * h);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let q = 0; q < w * h; q++) {
    const i = q * 4, r = px[i], g = px[i + 1], b = px[i + 2];
    const a = (r < 120 && g < 120 && b < 120)
      ? Math.min(255, Math.round((255 - (r * 0.299 + g * 0.587 + b * 0.114)) * 1.18))
      : 0;
    alpha[q] = a;
    if (a > 24) {
      const cx = q % w, cy = (q / w) | 0;
      if (cx < x0) x0 = cx;
      if (cx > x1) x1 = cx;
      if (cy < y0) y0 = cy;
      if (cy > y1) y1 = cy;
    }
  }
  const mw = x1 - x0 + 1, mh = y1 - y0 + 1;

  // Label the regions of ink, four-connected, and keep the largest. A stack of
  // indices rather than recursion: the pipe is around a hundred thousand
  // pixels and a recursive fill would blow the stack on it.
  const label = new Int32Array(w * h).fill(-1);
  const stack = new Int32Array(w * h);
  const counts = [];
  for (let seed = 0; seed < w * h; seed++) {
    if (alpha[seed] <= 24 || label[seed] !== -1) continue;
    const id = counts.length;
    let top = 0, size = 0;
    stack[top++] = seed;
    label[seed] = id;
    while (top > 0) {
      const q = stack[--top];
      size++;
      const cx = q % w;
      if (cx > 0 && alpha[q - 1] > 24 && label[q - 1] === -1) { label[q - 1] = id; stack[top++] = q - 1; }
      if (cx < w - 1 && alpha[q + 1] > 24 && label[q + 1] === -1) { label[q + 1] = id; stack[top++] = q + 1; }
      if (q >= w && alpha[q - w] > 24 && label[q - w] === -1) { label[q - w] = id; stack[top++] = q - w; }
      if (q < w * (h - 1) && alpha[q + w] > 24 && label[q + w] === -1) { label[q + w] = id; stack[top++] = q + w; }
    }
    counts.push(size);
  }
  let pipe = -1;
  for (let i = 0; i < counts.length; i++) if (pipe < 0 || counts[i] > counts[pipe]) pipe = i;

  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [sr, sg, sb] = hex(steel), [br, bg, bb] = hex(blue);
  for (let q = 0; q < w * h; q++) {
    const i = q * 4, mine = label[q] === pipe;
    px[i] = mine ? sr : br;
    px[i + 1] = mine ? sg : bg;
    px[i + 2] = mine ? sb : bb;
    px[i + 3] = alpha[q];
  }
  ctx.putImageData(frame, 0, 0);

  // Square, sized by the mark's longer side so his proportions are kept.
  // `plate` fills a rounded card instead of the whole square — the splash
  // needs that, because the mark is black and the dark splash ground is not
  // far off it. A white card under the mark reads on either ground, where a
  // bare black mark reads on only one.
  const cut = async (size, fit, bg, plate = 0) => {
    const o = new OffscreenCanvas(size, size), g = o.getContext('2d');
    if (bg && !plate) {
      g.fillStyle = bg;
      g.fillRect(0, 0, size, size);
    }
    if (plate) {
      const m = size * (1 - plate) / 2;
      g.fillStyle = bg;
      g.beginPath();
      g.roundRect(m, m, size * plate, size * plate, size * plate * 0.17);
      g.fill();
    }
    g.imageSmoothingQuality = 'high';
    const box = size * fit, s = Math.min(box / mw, box / mh);
    const dw = mw * s, dh = mh * s;
    g.drawImage(lifted, x0, y0, mw, mh, (size - dw) / 2, (size - dh) / 2, dw, dh);
    const blob = await o.convertToBlob({ type: 'image/png' });
    return await new Promise((done) => {
      const fr = new FileReader();
      fr.onload = () => done(fr.result.split(',')[1]);
      fr.readAsDataURL(blob);
    });
  };

  return {
    // The mark is black, so both fields it is set into are white.
    'icon.png': await cut(1024, 0.78, '#FFFFFF'),
    'adaptive-icon.png': await cut(1024, 0.60, null),
    'splash-icon.png': await cut(1024, 0.66, '#FFFFFF', 0.90),
    'favicon.png': await cut(64, 0.82, '#FFFFFF'),
  };
}, { data: src, steel: STEEL, blue: BLUE });

for (const [name, data] of Object.entries(out)) {
  writeFileSync(`${HERE}assets/${name}`, Buffer.from(data, 'base64'));
  console.log(`${name.padEnd(22)} ${(statSync(`${HERE}assets/${name}`).size / 1024).toFixed(1)} KB`);
}

await browser.close();
