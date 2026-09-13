import { WELDING_NECKS, weldingNeck, weldingNeckSizes } from '../calc/weldingNeck';
import { FlangeClass } from '../calc/flangedFitting';
import { flange } from '../calc/flange';
import { findRow } from '../calc/pipeData';

const CLASSES: FlangeClass[] = ['150', '300', '400', '600', '900', '1500', '2500'];

describe('steel welding neck flanges', () => {
  test('twenty printed sizes, half inch to twenty four', () => {
    expect(WELDING_NECKS.length).toBe(20);
    expect(WELDING_NECKS[0]!.nps).toBe(0.5);
    expect(WELDING_NECKS[19]!.nps).toBe(24);
  });

  test('rows read back as printed', () => {
    expect(weldingNeck(4, '150')).toBe(3);
    expect(weldingNeck(24, '300')).toBe(6.625);
    expect(weldingNeck(12, '1500')).toBe(11.125);
    expect(weldingNeck(12, '2500')).toBe(18.25);
  });

  test('three and a half inch is made to 600 lb only', () => {
    for (const cls of ['150', '300', '400', '600'] as const) {
      expect(Number.isFinite(weldingNeck(3.5, cls))).toBe(true);
    }
    for (const cls of ['900', '1500', '2500'] as const) {
      expect(Number.isNaN(weldingNeck(3.5, cls))).toBe(true);
    }
  });

  test('2500 lb stops at twelve inch', () => {
    expect(weldingNeckSizes('2500').length).toBe(14);
    for (const nps of [14, 16, 18, 20, 24]) {
      expect(Number.isNaN(weldingNeck(nps, '2500'))).toBe(true);
    }
  });

  // The 400 lb column tracks the 300 lb one at a fixed quarter inch from eight
  // inch up, which is what recovers the inked eighteen inch figure.
  test('400 lb runs a quarter inch over 300 lb from eight inch up', () => {
    for (const nps of [8, 10, 12, 14, 16, 18, 20, 24]) {
      expect(weldingNeck(nps, '400') - weldingNeck(nps, '300')).toBeCloseTo(0.25, 12);
    }
    expect(weldingNeck(18, '400')).toBe(6.5);
  });

  // The inked whole number on the 900 lb fourteen inch: only one value falls
  // between the twelve and the sixteen with that fraction.
  test('the 900 lb fourteen inch sits between its neighbours', () => {
    expect(weldingNeck(14, '900')).toBe(8.375);
    expect(weldingNeck(14, '900')).toBeGreaterThan(weldingNeck(12, '900'));
    expect(weldingNeck(14, '900')).toBeLessThan(weldingNeck(16, '900'));
  });

  test('400 and 600 lb are the same flange up to three and a half inch', () => {
    for (const nps of [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 3.5]) {
      expect(weldingNeck(nps, '400')).toBe(weldingNeck(nps, '600'));
    }
    expect(weldingNeck(4, '600')).toBeGreaterThan(weldingNeck(4, '400'));
  });

  // The same overlap the fittings, valves and flanges all show.
  test('900 and 1500 lb are the same flange below three inch', () => {
    for (const nps of [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5]) {
      expect(weldingNeck(nps, '900')).toBe(weldingNeck(nps, '1500'));
    }
    expect(weldingNeck(3, '900')).toBeLessThan(weldingNeck(2.5, '900'));
    expect(weldingNeck(3, '900')).toBeLessThan(weldingNeck(3, '1500'));
  });

  test('each class is at least as long as the one below it', () => {
    for (let i = 1; i < CLASSES.length; i++) {
      for (const w of WELDING_NECKS) {
        const a = weldingNeck(w.nps, CLASSES[i - 1]!);
        const b = weldingNeck(w.nps, CLASSES[i]!);
        if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
        if (CLASSES[i] === '900' && w.nps === 3) continue;
        expect(b).toBeGreaterThanOrEqual(a);
      }
    }
  });

  // A welding neck has a hub to taper down to the pipe, so it always stands
  // taller than a plain flange of the same class.
  test('it is longer than the flange it replaces', () => {
    for (const cls of CLASSES) {
      for (const w of WELDING_NECKS) {
        const y = weldingNeck(w.nps, cls);
        const plain = flange(w.nps, cls);
        if (!Number.isFinite(y) || !plain) continue;
        expect(y).toBeGreaterThan(plain.q);
      }
    }
  });

  test('every value lands on a clean sixteenth and every size is real', () => {
    for (const w of WELDING_NECKS) {
      expect(findRow(w.nps)).toBeDefined();
      for (const cls of CLASSES) {
        const v = w.y[cls];
        if (v === undefined) continue;
        expect(Math.abs(v * 16 - Math.round(v * 16))).toBeLessThan(1e-9);
      }
    }
  });

  test('a size not listed gives nothing', () => {
    expect(Number.isNaN(weldingNeck(30, '150'))).toBe(true);
    expect(Number.isNaN(weldingNeck(7, '300'))).toBe(true);
  });
});
