import {
  MIN_BEND_RADIUS,
  advisableBendRadius,
  bendRadiusSizes,
  bendsInWroughtIron,
  checkBendRadius,
  minBendRadius,
} from '../calc/bendRadius';
import { findRow } from '../calc/pipeData';

describe('minimum bending radius', () => {
  test('seventeen printed sizes, quarter inch to twelve', () => {
    expect(MIN_BEND_RADIUS.length).toBe(17);
    expect(bendRadiusSizes()[0]).toBe(0.25);
    expect(bendRadiusSizes()[16]).toBe(12);
  });

  test('rows read back as printed', () => {
    expect(minBendRadius(1)).toBe(2);
    expect(minBendRadius(1, 'wroughtIron')).toBe(2.125);
    expect(minBendRadius(6)).toBe(22);
    expect(minBendRadius(12, 'wroughtIron')).toBe(46);
  });

  test('quarter and three eighths are not listed in wrought iron', () => {
    expect(bendsInWroughtIron(0.25)).toBe(false);
    expect(bendsInWroughtIron(0.375)).toBe(false);
    expect(bendsInWroughtIron(0.5)).toBe(true);
    expect(Number.isNaN(minBendRadius(0.25, 'wroughtIron'))).toBe(true);
  });

  test('both columns grow with the size', () => {
    for (let i = 1; i < MIN_BEND_RADIUS.length; i++) {
      expect(MIN_BEND_RADIUS[i]!.steel).toBeGreaterThan(MIN_BEND_RADIUS[i - 1]!.steel);
      const a = MIN_BEND_RADIUS[i - 1]!.wroughtIron;
      const b = MIN_BEND_RADIUS[i]!.wroughtIron;
      if (Number.isFinite(a) && Number.isFinite(b)) expect(b).toBeGreaterThanOrEqual(a);
    }
  });

  // Wrought iron is the less forgiving of the two, except at the very bottom
  // of the range where the half inch figure is a shade tighter.
  test('wrought iron needs at least as much radius as steel from three quarter up', () => {
    for (const r of MIN_BEND_RADIUS) {
      if (!Number.isFinite(r.wroughtIron) || r.nps < 0.75) continue;
      expect(r.wroughtIron).toBeGreaterThanOrEqual(r.steel);
    }
    expect(minBendRadius(0.5, 'wroughtIron')).toBeLessThan(minBendRadius(0.5));
  });

  test('a radius is always more than the pipe is round', () => {
    for (const r of MIN_BEND_RADIUS) {
      const od = findRow(r.nps)!.od;
      expect(r.steel).toBeGreaterThan(od / 2);
    }
  });

  test('every size is a real pipe size', () => {
    for (const r of MIN_BEND_RADIUS) expect(findRow(r.nps)).toBeDefined();
  });

  describe('what the pipe makers advise', () => {
    test('five times the nominal size', () => {
      expect(advisableBendRadius(2)).toBe(10);
      expect(advisableBendRadius(0.5)).toBe(2.5);
    });

    // If this ever flipped, the advice would be looser than the floor and the
    // verdict below would be meaningless.
    test('it is never tighter than the tabled floor', () => {
      for (const r of MIN_BEND_RADIUS) {
        const advised = advisableBendRadius(r.nps);
        expect(advised).toBeGreaterThan(r.steel);
        if (Number.isFinite(r.wroughtIron)) expect(advised).toBeGreaterThan(r.wroughtIron);
      }
    });
  });

  describe('checking a radius', () => {
    test('tighter than the table is refused outright', () => {
      expect(checkBendRadius(2, 2.9)).toBe('belowMinimum');
      expect(checkBendRadius(2, 3)).toBe('belowAdvised');
    });

    test('between the table and five times the size is flagged', () => {
      expect(checkBendRadius(2, 8)).toBe('belowAdvised');
      expect(checkBendRadius(2, 10)).toBe('ok');
      expect(checkBendRadius(2, 24)).toBe('ok');
    });

    test('the material matters where the two columns differ', () => {
      expect(checkBendRadius(2, 4)).toBe('belowAdvised');
      expect(checkBendRadius(2, 4, 'wroughtIron')).toBe('belowMinimum');
    });

    test('a size or material the book does not carry says so rather than passing it', () => {
      expect(checkBendRadius(14, 60)).toBe('unknown');
      expect(checkBendRadius(0.25, 2, 'wroughtIron')).toBe('unknown');
      expect(checkBendRadius(2, 0)).toBe('unknown');
      expect(checkBendRadius(2, NaN)).toBe('unknown');
    });
  });
});
