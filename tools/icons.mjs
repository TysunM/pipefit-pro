import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { MARK } from './mark.js';
import fs from 'node:fs';

const OUT = new URL('../assets', import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function render(svg, size, file, transparent) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(
    `<html><body style="margin:0;padding:0;${transparent ? 'background:transparent' : ''}">
     <div style="width:${size}px;height:${size}px">${svg.replace('width="1024" height="1024"', `width="${size}" height="${size}"`)}</div>
     </body></html>`);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/${file}`, omitBackground: !!transparent });
  await page.close();
  const { size: bytes } = fs.statSync(`${OUT}/${file}`);
  console.log(`${file.padEnd(22)} ${size}x${size}  ${(bytes/1024).toFixed(1)} KB`);
}

// The square icon carries the near-black field the mark was designed on. A
// phone that draws its own light tile leaves a white icon with no edge at all.
const SQUARE_BG = `<rect width="1024" height="1024" fill="url(#ink)"/>`;
// android masks the adaptive foreground to ~66% of the canvas — keep the art inside it
await render(MARK(SQUARE_BG, 1.0), 1024, 'icon.png', false);
await render(MARK('', 0.62), 1024, 'adaptive-icon.png', true);
await render(MARK('', 0.86), 1024, 'splash-icon.png', true);
await render(MARK(SQUARE_BG, 1.0), 64, 'favicon.png', false);

await browser.close();
