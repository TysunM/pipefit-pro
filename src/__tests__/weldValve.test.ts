import {
  WELD_CHECK_LIGHT,
  WELD_GATE_LIGHT,
  WELD_GLOBE_LIGHT,
  weldAngle,
  weldCheck,
  weldGate,
  weldGlobe,
  weldValveSizes,
} from '../calc/weldValve';
import { steelCheck, steelGate, steelGlobe } from '../calc/valve';
import { FlangeClass } from '../calc/flangedFitting';

const LIGHT: FlangeClass[] = ['150', '300', '400', '600'];
const HEAVY: FlangeClass[] = ['900', '1500', '2500'];

describe('valves with butt welding ends', () => {
  test('sizes as printed', () => {
    expect(WELD_GATE_LIGHT.length).toBe(17);
    expect(WELD_GLOBE_LIGHT.length).toBe(16);
    expect(WELD_CHECK_LIGHT.length).toBe(15);
    expect(weldValveSizes('globe')[0]).toBe(0.5);
    expect(weldValveSizes('gate')[0]).toBe(1);
  });

  test('rows read back as printed', () => {
    expect(weldGate(2, '150')).toBe(8.5);
    expect(weldGate(24, '600')).toBe(55);
    expect(weldGlobe(0.5, '150')).toBe(4.25);
    expect(weldCheck(5, '150')).toBe(13);
  });

  // In 900, 1500 and 2500 lb the butt welding pages print exactly what the
  // flanged pages do, for all three valve types.
  test('the heavy classes are the flanged figures', () => {
    for (const cls of HEAVY) {
      for (const nps of [1, 2, 3, 6, 12, 14, 24]) {
        const flanged = steelGate(nps, cls);
        if (!Number.isFinite(flanged)) continue;
        expect(weldGate(nps, cls)).toBe(flanged);
        expect(weldGlobe(nps, cls)).toBe(flanged);
        expect(weldCheck(nps, cls)).toBe(flanged);
      }
    }
  });

  test('the heavy pages add the same small sizes the flanged globe page does', () => {
    expect(weldCheck(0.75, '900')).toBe(9);
    expect(weldCheck(0.75, '900')).toBe(steelGlobe(0.75, '900'));
    expect(weldCheck(0.5, '2500')).toBe(10.375);
    expect(weldCheck(0.5, '2500')).toBe(steelGlobe(0.5, '2500'));
  });

  // A butt welding body carries weld prep on each end. In the two light
  // classes that makes it longer than the flanged valve; in 400 and 600 the
  // flanged body was already long enough and the two agree.
  test('in 150 and 300 lb a welded gate valve is longer than the flanged one', () => {
    let longer = 0;
    for (const r of WELD_GATE_LIGHT) {
      for (const cls of ['150', '300'] as const) {
        const welded = weldGate(r.nps, cls);
        const flanged = steelGate(r.nps, cls);
        if (!Number.isFinite(welded) || !Number.isFinite(flanged)) continue;
        expect(welded).toBeGreaterThanOrEqual(flanged);
        if (welded > flanged) longer++;
      }
    }
    expect(longer).toBeGreaterThan(12);
  });

  test('in 400 and 600 lb the welded and flanged gate valves agree', () => {
    for (const r of WELD_GATE_LIGHT) {
      for (const cls of ['400', '600'] as const) {
        const welded = weldGate(r.nps, cls);
        const flanged = steelGate(r.nps, cls);
        if (!Number.isFinite(welded) || !Number.isFinite(flanged)) continue;
        expect(welded).toBe(flanged);
      }
    }
  });

  // The check valve is the same body as the globe on all but three rows, the
  // same three the flanged tables differ on, and on those it is the shorter.
  test('a welded check matches the welded globe but for three rows', () => {
    const off: string[] = [];
    for (const r of WELD_CHECK_LIGHT) {
      for (const cls of LIGHT) {
        const c = weldCheck(r.nps, cls);
        const g = weldGlobe(r.nps, cls);
        if (!Number.isFinite(c) || !Number.isFinite(g)) continue;
        if (c !== g) off.push(`${r.nps}-${cls}`);
      }
    }
    expect(off).toEqual(['1-300', '1.25-300', '1.5-300', '5-150', '6-150', '8-300']);
    expect(weldCheck(5, '150')).toBeLessThan(weldGlobe(5, '150'));
    expect(weldCheck(8, '300')).toBeLessThan(weldGlobe(8, '300'));
  });

  test('an angle valve is half the globe valve here too', () => {
    expect(weldAngle(4, '150')).toBe(weldGlobe(4, '150') / 2);
    expect(weldAngle(4, '900')).toBe(weldGlobe(4, '900') / 2);
  });

  test('every column grows with the size', () => {
    for (const rows of [WELD_GATE_LIGHT, WELD_GLOBE_LIGHT, WELD_CHECK_LIGHT]) {
      for (const cls of LIGHT) {
        let last = 0;
        for (const r of rows) {
          const v = r.faceToFace[cls];
          if (v === undefined) continue;
          expect(v).toBeGreaterThanOrEqual(last);
          last = v;
        }
      }
    }
  });

  test('a heavier class is never the shorter valve', () => {
    for (const rows of [WELD_GATE_LIGHT, WELD_GLOBE_LIGHT, WELD_CHECK_LIGHT]) {
      for (const r of rows) {
        for (let i = 1; i < LIGHT.length; i++) {
          const a = r.faceToFace[LIGHT[i - 1]!];
          const b = r.faceToFace[LIGHT[i]!];
          if (a === undefined || b === undefined) continue;
          expect(b).toBeGreaterThanOrEqual(a);
        }
      }
    }
  });

  test('a size or class not made gives nothing', () => {
    expect(Number.isNaN(weldGate(0.5, '150'))).toBe(true);
    expect(Number.isNaN(weldGlobe(1, '300')) || weldGlobe(1, '300') === 8).toBe(true);
    expect(Number.isNaN(weldCheck(0.5, '300'))).toBe(true);
    expect(Number.isNaN(weldGlobe(20, '600'))).toBe(true);
    expect(Number.isNaN(weldCheck(30, '150'))).toBe(true);
  });
});
