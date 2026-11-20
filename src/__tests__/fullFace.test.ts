import { fullFaceGasket, fullFaceWords, steelFlange, steelSizes } from '../calc/steelFlange';
import { jointRecordHtml } from '../print/jointRecord';
import { newJoint } from '../state/register';

// ASME B16.21 full face gaskets, class 150, mm, as the page gives them: bore, outside, holes, hole, bolt circle (wermac.org).
const PAGE: [number, number, number, number, number, number][] = [
  [0.5, 21, 89, 4, 16, 60.3], [0.75, 27, 99, 4, 16, 69.9], [1, 33, 108, 4, 16, 79.4], [1.25, 42, 118, 4, 16, 88.9], [1.5, 49, 127, 4, 16, 98.4], [2, 60, 152, 4, 19, 120.7], [2.5, 73, 178, 4, 19, 139.7],
  [3, 89, 191, 4, 19, 152.4], [3.5, 102, 216, 8, 19, 177.8], [4, 114, 229, 8, 19, 190.5], [5, 141, 254, 8, 22, 215.9], [6, 168, 279, 8, 22, 241.3], [8, 219, 343, 8, 22, 298.5], [10, 273, 406, 12, 25, 362],
  [12, 324, 483, 12, 25, 431.8], [14, 356, 533, 12, 28, 476.3], [16, 406, 597, 16, 28, 539.8], [18, 457, 635, 16, 32, 577.9], [20, 508, 699, 20, 32, 635], [24, 610, 813, 20, 35, 749.3],
];

describe('the class 150 full face gasket', () => {
  it('is tabled for every B16.5 class 150 size and no other', () => {
    expect(steelSizes('150').map((n) => fullFaceGasket(n) !== undefined)).toEqual(steelSizes('150').map(() => true));
    expect(fullFaceGasket(26)).toBeUndefined();
    expect(fullFaceGasket(2)).toEqual({ id: 2.375, od: 6, holes: 4, hole: 0.75, bc: 4.75 });
    expect(fullFaceGasket(24)).toEqual({ id: 24, od: 32, holes: 20, hole: 1.375, bc: 29.5 });
  });

  it('reads the page to the sixteenth, and its holes are the class 150 studs with an eighth of clearance', () => {
    for (const [nps, id, od, holes, hole, bc] of PAGE) {
      const g = fullFaceGasket(nps)!;
      expect(Math.abs(g.id * 25.4 - id)).toBeLessThan(0.8);
      expect(Math.abs(g.od * 25.4 - od)).toBeLessThan(0.8);
      expect(Math.abs(g.bc * 25.4 - bc)).toBeLessThan(0.15);
      expect(Math.abs(g.hole * 25.4 - hole)).toBeLessThan(0.8);
      const f = steelFlange(nps, '150')!;
      expect(g.holes).toBe(holes);
      expect(g.holes).toBe(f.bolts);
      expect(g.hole).toBeCloseTo(f.stud + 0.125, 6);
    }
  });

  it('is said in the caption and on the record for a class 150 flange', () => {
    expect(fullFaceWords(2)).toBe('Class 150 drilling: 4 holes 3/4" on a 4-3/4" bolt circle. Full face gasket to ASME B16.21, for a flat face: 2-3/8" bore × 6" outside, punched to the same holes; a raised face takes a ring gasket from the drawing.');
    expect(fullFaceWords(26)).toBe('');
    const T = Date.UTC(2026, 9, 21, 12);
    const html = (cls: '150' | '300') => jointRecordHtml({ joint: newJoint('j', { cls, nps: 2, bolts: cls === '150' ? 4 : 8, torque: 60, project: 'BP-1' }, T), dateLine: 'Printed 21 Oct 2026', wrench: null, now: T });
    expect(html('150')).toContain('Full face gasket to ASME B16.21');
    expect(html('300')).not.toContain('Gasket size');
  });
});
