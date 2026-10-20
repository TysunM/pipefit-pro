import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BRAND_MARK, BRAND_P } from '../print/brand';
import { BRAND_DEFS, nameplate } from '../print/nameplate';
import { jointRecordHtml } from '../print/jointRecord';
import { turnoverHtml } from '../print/turnover';
import { newJoint } from '../state/register';

const T = Date.UTC(2026, 9, 20, 12);
const png = (name: string) => {
  const b = readFileSync(join(__dirname, '..', '..', 'assets', name));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), png: b.toString('base64') };
};
const count = (s: string, needle: string) => s.split(needle).length - 1;

describe('the printed nameplate', () => {
  test('carries the same two pictures the header draws', () => {
    // tools/brand.mjs writes them; this fails until it has been run after a change.
    expect(BRAND_P).toEqual(png('wordmark-p.png'));
    expect(BRAND_MARK).toEqual(png('wordmark-light.png'));
  });

  test('is a plate the width of the page, screwed at the corners, with the P leading the wordmark', () => {
    const plate = nameplate();
    expect(plate.startsWith('<svg class="plate" viewBox="0 0 186 13"')).toBe(true);
    expect(count(plate, 'url(#pf-screw)')).toBe(4);
    expect(count(plate, '<use href="#pf-p"')).toBe(1);
    expect(count(plate, '<use href="#pf-mark"')).toBe(1);
    // The P stands just left of the lettering, the pair centred on the plate.
    const p = /<use href="#pf-p" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)"/.exec(plate)!;
    const m = /<use href="#pf-mark" x="([\d.]+)" y="[\d.]+" width="([\d.]+)"/.exec(plate)!;
    const x0 = Number(p[1]);
    const x1 = Number(m[1]) + Number(m[2]);
    expect(Number(m[1]) - (x0 + Number(p[3]))).toBeCloseTo(0.45, 2);
    expect((x0 + x1) / 2).toBeCloseTo(93, 0);
    // The pictures themselves are not in the plate: they are drawn by reference.
    expect(plate).not.toContain('base64');
    expect(BRAND_DEFS).toContain(`data:image/png;base64,${BRAND_P.png.slice(0, 40)}`);
  });

  test('heads a joint record once, with the pictures carried once', () => {
    const j = newJoint('j1', { cls: '150', nps: 6, bolts: 8, torque: 90, project: 'BP-1' }, T);
    const html = jointRecordHtml({ joint: j, dateLine: 'Printed 20 Oct 2026', wrench: null, now: T });
    expect(count(html, BRAND_DEFS)).toBe(1);
    expect(count(html, '<svg class="plate"')).toBe(1);
    expect(html.indexOf(BRAND_DEFS)).toBeLessThan(html.indexOf('<svg class="plate"'));
    expect(html).toContain('<header><svg class="plate"');
  });

  test('heads the turnover package, and every joint record page in it, from one set of pictures', () => {
    const html = turnoverHtml({ job: 'BP-1', dateLine: 'Printed 20 Oct 2026', joints: [], heats: [], sketches: [], readings: [], spools: [], tests: [], grid: 20 });
    expect(count(html, BRAND_DEFS)).toBe(1);
    expect(count(html, '<svg class="plate"')).toBe(1);
    expect(count(html, '.plate { display: block; width: 100%;')).toBe(1);
  });
});
