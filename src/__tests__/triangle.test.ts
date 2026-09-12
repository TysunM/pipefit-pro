import {
  angleToPerFoot, angleToPercent, percentToAngle, slopeToAngle, solveTriangle,
  triFieldLabel, TRI_FIELDS, type TriField,
} from '../calc/triangle';
import { ALL_KEYS, KEYPAD, provisionalKeys, unassignedKeys, type KeyAction } from '../calc/keys';

const near = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe('right triangle register solver', () => {
  test('the 15 by 15 offset every fitter knows', () => {
    const s = solveTriangle({ field: 'offset', value: 15 }, { field: 'run', value: 15 });
    expect(s.valid).toBe(true);
    near(s.travel, 21.213203435596427, 1e-9);
    near(s.angle, 45);
    near(s.slopePercent, 100);
    near(s.slopePerFoot, 12);
  });

  test('the 3 4 5 triangle', () => {
    const s = solveTriangle({ field: 'offset', value: 3 }, { field: 'run', value: 4 });
    near(s.travel, 5);
    near(s.angle, 36.86989764584402, 1e-9);
  });

  test('offset and travel give the run back', () => {
    const s = solveTriangle({ field: 'offset', value: 3 }, { field: 'travel', value: 5 });
    near(s.run, 4);
    near(s.angle, 36.86989764584402, 1e-9);
  });

  test('run and travel give the offset back', () => {
    const s = solveTriangle({ field: 'run', value: 4 }, { field: 'travel', value: 5 });
    near(s.offset, 3);
  });

  test('angle with each of the three lengths', () => {
    const byOffset = solveTriangle({ field: 'angle', value: 45 }, { field: 'offset', value: 15 });
    near(byOffset.run, 15, 1e-9);
    near(byOffset.travel, 21.213203435596427, 1e-9);

    const byRun = solveTriangle({ field: 'angle', value: 45 }, { field: 'run', value: 15 });
    near(byRun.offset, 15, 1e-9);
    near(byRun.travel, 21.213203435596427, 1e-9);

    const byTravel = solveTriangle({ field: 'angle', value: 45 }, { field: 'travel', value: 21.213203435596427 });
    near(byTravel.offset, 15, 1e-9);
    near(byTravel.run, 15, 1e-9);
  });

  test('the offset multiplier falls out of angle and offset', () => {
    for (const a of [11.25, 22.5, 30, 45, 60, 72]) {
      const s = solveTriangle({ field: 'angle', value: a }, { field: 'offset', value: 1 });
      near(s.travel, 1 / Math.sin((a * Math.PI) / 180), 1e-12);
    }
  });

  test('every pair of fields solves, in either order, to the same answer', () => {
    const truth = { offset: 9, run: 12, travel: 15, angle: 36.86989764584402 };
    const pairs: [TriField, TriField][] = [
      ['offset', 'run'], ['offset', 'travel'], ['offset', 'angle'],
      ['run', 'travel'], ['run', 'angle'], ['travel', 'angle'],
    ];
    for (const [x, y] of pairs) {
      for (const [p, q] of [[x, y], [y, x]] as [TriField, TriField][]) {
        const s = solveTriangle({ field: p, value: truth[p] }, { field: q, value: truth[q] });
        expect(s.valid).toBe(true);
        near(s.offset, truth.offset, 1e-9);
        near(s.run, truth.run, 1e-9);
        near(s.travel, truth.travel, 1e-9);
        near(s.angle, truth.angle, 1e-9);
      }
    }
  });

  test('a travel no longer than the offset is refused', () => {
    for (const t of [3, 2]) {
      const s = solveTriangle({ field: 'offset', value: 3 }, { field: 'travel', value: t });
      expect(s.valid).toBe(false);
      expect(s.error).toMatch(/longer than the offset/i);
    }
  });

  test('a travel no longer than the run is refused', () => {
    const s = solveTriangle({ field: 'run', value: 4 }, { field: 'travel', value: 4 });
    expect(s.error).toMatch(/longer than the run/i);
  });

  test('the same field twice is refused', () => {
    expect(solveTriangle({ field: 'run', value: 4 }, { field: 'run', value: 5 }).error).toMatch(/two different/i);
  });

  test('a zero or negative length is refused', () => {
    for (const v of [0, -5]) {
      const s = solveTriangle({ field: 'offset', value: v }, { field: 'run', value: 10 });
      expect(s.error).toMatch(/greater than zero/i);
    }
  });

  test('an angle at or past the limits is refused', () => {
    for (const a of [0, 90, 91, -5]) {
      const s = solveTriangle({ field: 'angle', value: a }, { field: 'run', value: 10 });
      expect(s.error).toMatch(/between 0° and 90°/i);
    }
  });

  test('a missing value is refused rather than returning NaN results', () => {
    const s = solveTriangle({ field: 'offset', value: NaN }, { field: 'run', value: 10 });
    expect(s.valid).toBe(false);
    expect(Number.isFinite(s.travel)).toBe(false);
  });

  test('every field has a label', () => {
    for (const f of TRI_FIELDS) expect(triFieldLabel(f).length).toBeGreaterThan(0);
  });
});

describe('slope', () => {
  test('the two standard drain pitches', () => {
    near(slopeToAngle(0.25, 12), 1.193489423982035, 1e-12);
    near(slopeToAngle(0.125, 12), 0.596809451229177, 1e-12);
    near(angleToPerFoot(slopeToAngle(0.25, 12)), 0.25, 1e-12);
    near(angleToPerFoot(slopeToAngle(0.125, 12)), 0.125, 1e-12);
  });

  test('one in twelve is 45 degrees', () => near(slopeToAngle(12, 12), 45));
  test('a hundred percent is 45 degrees', () => near(percentToAngle(100), 45));
  test('percent and angle invert', () => {
    for (const p of [0.5, 2, 12.5, 50, 100, 250]) near(angleToPercent(percentToAngle(p)), p, 1e-9);
  });
  test('a zero run gives no slope rather than Infinity', () => {
    expect(Number.isFinite(slopeToAngle(5, 0))).toBe(false);
  });
  test('slope is undefined at and past vertical', () => {
    for (const a of [90, -90, 120]) expect(Number.isFinite(angleToPercent(a))).toBe(false);
  });
});

describe('keypad map', () => {
  test('eight rows of five keys, matching the housing', () => {
    expect(KEYPAD.length).toBe(8);
    for (const row of KEYPAD) expect(row.length).toBe(5);
    expect(ALL_KEYS.length).toBe(40);
  });

  test('every key has a label and an action', () => {
    for (const k of ALL_KEYS) {
      expect(k.label.length).toBeGreaterThan(0);
      expect(k.action.length).toBeGreaterThan(0);
    }
  });

  test('a shift label and a shift action always come as a pair', () => {
    for (const k of ALL_KEYS) expect(Boolean(k.shiftLabel)).toBe(Boolean(k.shiftAction));
  });

  test('Feet and Inch carry no shift, as on the housing', () => {
    for (const label of ['Feet', 'Inch']) {
      const k = ALL_KEYS.find((x) => x.label === label)!;
      expect(k.shiftAction).toBeUndefined();
    }
  });

  test('Conv carries no shift of its own', () => {
    expect(ALL_KEYS.find((k) => k.action === 'conv')!.shiftAction).toBeUndefined();
  });

  test('all ten digits are present exactly once', () => {
    const digits = ALL_KEYS.filter((k) => k.action === 'digit').map((k) => k.arg).sort();
    expect(digits).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  });

  test('the four arithmetic operators and equals are present', () => {
    for (const a of ['add', 'subtract', 'multiply', 'divide', 'equals'] as KeyAction[])
      expect(ALL_KEYS.some((k) => k.action === a)).toBe(true);
  });

  test('the trade keys are on the top row plus pipe size', () => {
    const top = KEYPAD[0]!.map((k) => k.action);
    expect(top).toEqual(['angleSlope', 'offset', 'run', 'travel', 'pipeMaterial']);
    expect(KEYPAD[0]!.map((k) => k.shiftAction)).toEqual(['takeoutArc', 'welders', 'cutback', 'roll', 'elbow']);
  });

  test('no action is bound to two different keys', () => {
    const primary: KeyAction[] = [];
    const shifted: KeyAction[] = [];
    for (const k of ALL_KEYS) {
      if (k.action !== 'digit') primary.push(k.action);
      if (k.shiftAction && k.shiftAction !== 'unassigned') shifted.push(k.shiftAction);
    }
    const bound = [...primary, ...shifted];
    expect(new Set(bound).size).toBe(bound.length);
  });

  test('every shift is bound; nothing is left unassigned', () => {
    expect(unassignedKeys()).toEqual([]);
  });

  test('every provisional key carries a note explaining what to confirm', () => {
    for (const k of provisionalKeys()) expect(k.note!.length).toBeGreaterThan(20);
  });
});
