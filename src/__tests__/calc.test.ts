import { solveOffset } from '../calc/offset';
import { solveRolling } from '../calc/rolling';
import { END_FITTINGS, endTakeoff, solveCutLength } from '../calc/cutLength';
import { offsetMultiplier, offsetShrinkPerUnit, solveSaddle } from '../calc/saddle';
import { solveMiter } from '../calc/miter';
import { NPT_TABLE, findThread, solveThread } from '../calc/thread';
import { BENDER_PRESETS, solveBender } from '../calc/bender';
import {
  PIPE_SIZES,
  backArc,
  bendRadius,
  centerlineArc,
  findSize,
  pipeWeightPerFoot,
  takeoff,
  throatArc,
} from '../calc/pipe';
import { decimal, parseNumber, toFraction } from '../calc/format';
import { MM_PER_INCH, fromInches, rad, toInches } from '../calc/units';

const near = (a: number, b: number, tol = 0.005) => {
  if (!Number.isFinite(a)) throw new Error(`expected finite, got ${a}`);
  expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);
};

const ANGLES = [11.25, 22.5, 30, 45, 60] as const;
const SCHEDULES = ['10', '40', '80'] as const;

describe('pipe data table integrity', () => {
  test('every size carries all three schedules', () => {
    for (const s of PIPE_SIZES) for (const sch of SCHEDULES) expect(typeof s.wall[sch]).toBe('number');
  });

  test('wall is always less than half the OD', () => {
    for (const s of PIPE_SIZES) for (const sch of SCHEDULES) expect(s.wall[sch]).toBeLessThan(s.od / 2);
  });

  test('wall thickness increases with schedule', () => {
    for (const s of PIPE_SIZES) {
      expect(s.wall['10']).toBeLessThanOrEqual(s.wall['40']);
      expect(s.wall['40']).toBeLessThan(s.wall['80']);
    }
  });

  test('OD strictly increases with nominal size', () => {
    for (let i = 1; i < PIPE_SIZES.length; i += 1) {
      expect(PIPE_SIZES[i]!.od).toBeGreaterThan(PIPE_SIZES[i - 1]!.od);
      expect(PIPE_SIZES[i]!.nps).toBeGreaterThan(PIPE_SIZES[i - 1]!.nps);
    }
  });

  test('OD equals NPS for 14 inch and larger', () => {
    for (const s of PIPE_SIZES.filter((x) => x.nps >= 14)) expect(s.od).toBe(s.nps);
  });

  test('findSize returns the requested size for every entry', () => {
    for (const s of PIPE_SIZES) expect(findSize(s.nps).label).toBe(s.label);
  });

  test('published SCH40 weights per foot', () => {
    near(pipeWeightPerFoot(findSize(0.5).od, findSize(0.5).wall['40']), 0.851, 0.01);
    near(pipeWeightPerFoot(findSize(1).od, findSize(1).wall['40']), 1.679, 0.01);
    near(pipeWeightPerFoot(findSize(2).od, findSize(2).wall['40']), 3.653, 0.01);
    near(pipeWeightPerFoot(findSize(4).od, findSize(4).wall['40']), 10.79, 0.02);
    near(pipeWeightPerFoot(findSize(6).od, findSize(6).wall['40']), 18.974, 0.02);
    near(pipeWeightPerFoot(findSize(8).od, findSize(8).wall['40']), 28.554, 0.03);
    near(pipeWeightPerFoot(findSize(12).od, findSize(12).wall['40']), 53.52, 0.05);
  });

  test('weight rises with schedule at every size', () => {
    for (const s of PIPE_SIZES) {
      const w10 = pipeWeightPerFoot(s.od, s.wall['10']);
      const w40 = pipeWeightPerFoot(s.od, s.wall['40']);
      const w80 = pipeWeightPerFoot(s.od, s.wall['80']);
      expect(w40).toBeGreaterThanOrEqual(w10);
      expect(w80).toBeGreaterThan(w40);
    }
  });
});

describe('elbow geometry identities across every size and angle', () => {
  test('long radius is 1.5D and short radius is 1.0D', () => {
    for (const s of PIPE_SIZES) {
      near(bendRadius(s.nps, 'LR'), 1.5 * s.nps, 1e-9);
      near(bendRadius(s.nps, 'SR'), 1.0 * s.nps, 1e-9);
    }
  });

  test('takeoff equals R tan(theta/2) everywhere', () => {
    for (const s of PIPE_SIZES) {
      for (const kind of ['LR', 'SR'] as const) {
        for (const a of [...ANGLES, 90]) {
          near(takeoff(s.nps, kind, a), bendRadius(s.nps, kind) * Math.tan(rad(a) / 2), 1e-9);
        }
      }
    }
  });

  test('90 degree LR takeoff equals the bend radius', () => {
    for (const s of PIPE_SIZES) near(takeoff(s.nps, 'LR', 90), 1.5 * s.nps, 1e-9);
  });

  test('throat < centreline < back arc at every size and angle', () => {
    for (const s of PIPE_SIZES) {
      for (const a of ANGLES) {
        const t = throatArc(s.nps, 'LR', a, s.od);
        const c = centerlineArc(s.nps, 'LR', a);
        const b = backArc(s.nps, 'LR', a, s.od);
        expect(t).toBeLessThan(c);
        expect(c).toBeLessThan(b);
        near((t + b) / 2, c, 1e-9);
      }
    }
  });

  test('arc lengths scale linearly with angle', () => {
    near(centerlineArc(2, 'LR', 90), 2 * centerlineArc(2, 'LR', 45), 1e-9);
    near(centerlineArc(6, 'LR', 45), 2 * centerlineArc(6, 'LR', 22.5), 1e-9);
  });

  test('reference screenshot values for 2 inch LR at 45 degrees', () => {
    const od = findSize(2).od;
    near(takeoff(2, 'LR', 45), 1.2426);
    near(centerlineArc(2, 'LR', 45), 2.3562);
    near(throatArc(2, 'LR', 45, od), 1.4235);
    near(backArc(2, 'LR', 45, od), 3.2887);
  });
});

describe('simple offset — reference screenshot 10 x 10 at 45 degrees', () => {
  const r = solveOffset({ offset: 10, fittingAngle: 45, gap: 0, nps: 2, kind: 'LR', schedule: '40', lockRun: false });

  test('solves', () => expect(r.valid).toBe(true));
  test('run 10.00', () => near(r.run, 10));
  test('travel 14.14', () => near(r.travel, 14.1421));
  test('pipe cut 11.66', () => near(r.pipeCut, 11.6569));
  test('setback 1.24', () => near(r.setback, 1.2426));
  test('throat 1.42', () => near(r.throatArc, 1.4235));
  test('back 3.29', () => near(r.backArc, 3.2887));
  test('centreline arc 2.36', () => near(r.centerlineArc, 2.3562));
  test('pipe weight 3.55 lb', () => near(r.spoolPipe, 3.548, 0.02));
  test('shrink 4.14', () => near(r.shrink, 4.1421));
});

describe('simple offset — invariants over a wide sweep', () => {
  const offsets = [0.5, 3, 10, 27.375, 96];
  const sizes = [0.5, 2, 6, 12, 24];

  test('travel is the hypotenuse of run and offset', () => {
    for (const offset of offsets)
      for (const a of ANGLES) {
        const r = solveOffset({ offset, fittingAngle: a, gap: 0, nps: 2, kind: 'LR', schedule: '40', lockRun: false });
        if (!r.valid) continue;
        near(Math.hypot(r.run, r.offset), r.travel, 1e-6);
      }
  });

  test('shrink is travel minus run', () => {
    for (const offset of offsets)
      for (const a of ANGLES) {
        const r = solveOffset({ offset, fittingAngle: a, gap: 0, nps: 2, kind: 'LR', schedule: '40', lockRun: false });
        if (!r.valid) continue;
        near(r.shrink, r.travel - r.run, 1e-9);
      }
  });

  test('cut plus both takeoffs reconstructs travel when the gap is zero', () => {
    for (const offset of offsets)
      for (const nps of sizes)
        for (const a of ANGLES) {
          const r = solveOffset({ offset, fittingAngle: a, gap: 0, nps, kind: 'LR', schedule: '40', lockRun: false });
          if (!r.valid) continue;
          near(r.pipeCut + 2 * r.setback, r.travel, 1e-6);
        }
  });

  test('a weld gap shortens the cut by exactly two gaps', () => {
    const base = solveOffset({ offset: 10, fittingAngle: 45, gap: 0, nps: 2, kind: 'LR', schedule: '40', lockRun: false });
    const gapped = solveOffset({ offset: 10, fittingAngle: 45, gap: 0.125, nps: 2, kind: 'LR', schedule: '40', lockRun: false });
    near(base.pipeCut - gapped.pipeCut, 0.25, 1e-9);
  });

  test('short radius always cuts longer pipe than long radius', () => {
    for (const a of ANGLES) {
      const lr = solveOffset({ offset: 12, fittingAngle: a, gap: 0, nps: 4, kind: 'LR', schedule: '40', lockRun: false });
      const sr = solveOffset({ offset: 12, fittingAngle: a, gap: 0, nps: 4, kind: 'SR', schedule: '40', lockRun: false });
      if (!lr.valid || !sr.valid) continue;
      expect(sr.pipeCut).toBeGreaterThan(lr.pipeCut);
    }
  });

  test('locking the run round-trips back to the same angle', () => {
    for (const a of ANGLES) {
      const free = solveOffset({ offset: 18, fittingAngle: a, gap: 0, nps: 2, kind: 'LR', schedule: '40', lockRun: false });
      const locked = solveOffset({
        offset: 18,
        run: free.run,
        fittingAngle: 0,
        gap: 0,
        nps: 2,
        kind: 'LR',
        schedule: '40',
        lockRun: true,
      });
      near(locked.cutAngle, a, 1e-6);
      near(locked.travel, free.travel, 1e-6);
      near(locked.pipeCut, free.pipeCut, 1e-6);
    }
  });

  test('a steeper fitting angle always shortens the run', () => {
    let previous = Infinity;
    for (const a of ANGLES) {
      const r = solveOffset({ offset: 10, fittingAngle: a, gap: 0, nps: 2, kind: 'LR', schedule: '40', lockRun: false });
      expect(r.run).toBeLessThan(previous);
      previous = r.run;
    }
  });
});

describe('simple offset — guards', () => {
  const base = { fittingAngle: 45, gap: 0, nps: 2, kind: 'LR' as const, schedule: '40' as const, lockRun: false };

  test('rejects zero offset', () => expect(solveOffset({ ...base, offset: 0 }).valid).toBe(false));
  test('rejects negative offset', () => expect(solveOffset({ ...base, offset: -5 }).valid).toBe(false));
  test('rejects NaN offset', () => expect(solveOffset({ ...base, offset: NaN }).valid).toBe(false));
  test('rejects a 0 degree fitting', () => expect(solveOffset({ ...base, offset: 10, fittingAngle: 0 }).valid).toBe(false));
  test('rejects a 90 degree fitting through the angle guard', () =>
    expect(solveOffset({ ...base, offset: 10, fittingAngle: 91 }).valid).toBe(false));
  test('rejects a locked run of zero', () =>
    expect(solveOffset({ ...base, offset: 10, run: 0, lockRun: true }).valid).toBe(false));
  test('rejects a blank locked run instead of silently using the chip angle', () => {
    const r = solveOffset({ ...base, offset: 10, run: NaN, lockRun: true });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/run/i);
  });
  test('a locked run never falls back to the fitting angle', () => {
    const r = solveOffset({ ...base, offset: 10, run: NaN, fittingAngle: 45, lockRun: true });
    expect(Number.isFinite(r.cutAngle)).toBe(false);
  });
  test('rejects when takeoffs swallow the travel', () => {
    const r = solveOffset({ ...base, offset: 1, nps: 12 });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/exceed/i);
  });
  test('an invalid result never reports a positive cut', () => {
    const r = solveOffset({ ...base, offset: 1, nps: 12 });
    expect(r.pipeCut > 0).toBe(false);
  });
});

describe('rolling offset — reference screenshot rise 12 roll 5 run 36', () => {
  const r = solveRolling({ rise: 12, roll: 5, run: 36, useFittingAngle: false, gap: 0, nps: 2, kind: 'LR', schedule: '40' });

  test('solves', () => expect(r.valid).toBe(true));
  test('true offset 13.00', () => near(r.trueOffset, 13));
  test('travel 38.28', () => near(r.travel, 38.2753));
  test('required elbow 19.86 degrees', () => near(r.cutAngle, 19.8558, 0.01));
  test('roll angle 22.6 degrees', () => near(r.rollAngle, 22.6199, 0.01));
  test('setback 0.53', () => near(r.setback, 0.5252));
  test('pipe cut 37.23', () => near(r.pipeCut, 37.2249, 0.01));
  test('pipe weight 11.3 lb', () => near(r.spoolPipe, 11.33, 0.05));
});

describe('rolling offset — invariants', () => {
  const cases = [
    { rise: 12, roll: 5, run: 36 },
    { rise: 3, roll: 4, run: 10 },
    { rise: 20, roll: 20, run: 20 },
    { rise: 0.5, roll: 9, run: 44 },
    { rise: 48, roll: 1, run: 120 },
  ];

  test('true offset is the hypotenuse of rise and roll', () => {
    for (const c of cases) {
      const r = solveRolling({ ...c, useFittingAngle: false, gap: 0, nps: 2, kind: 'LR', schedule: '40' });
      near(r.trueOffset, Math.hypot(c.rise, c.roll), 1e-9);
    }
  });

  test('travel is the hypotenuse of run and true offset', () => {
    for (const c of cases) {
      const r = solveRolling({ ...c, useFittingAngle: false, gap: 0, nps: 2, kind: 'LR', schedule: '40' });
      near(r.travel, Math.hypot(c.run, r.trueOffset), 1e-9);
    }
  });

  test('roll angle is atan(roll / rise)', () => {
    for (const c of cases) {
      const r = solveRolling({ ...c, useFittingAngle: false, gap: 0, nps: 2, kind: 'LR', schedule: '40' });
      near(r.rollAngle, (Math.atan2(c.roll, c.rise) * 180) / Math.PI, 1e-9);
    }
  });

  test('cut plus both takeoffs reconstructs travel at zero gap', () => {
    for (const c of cases) {
      const r = solveRolling({ ...c, useFittingAngle: false, gap: 0, nps: 2, kind: 'LR', schedule: '40' });
      if (!r.valid) continue;
      near(r.pipeCut + 2 * r.setback, r.travel, 1e-6);
    }
  });

  test('stock elbow mode round-trips to the same run', () => {
    for (const a of ANGLES) {
      const stock = solveRolling({
        rise: 12,
        roll: 5,
        fittingAngle: a,
        useFittingAngle: true,
        gap: 0,
        nps: 2,
        kind: 'LR',
        schedule: '40',
      });
      const back = solveRolling({
        rise: 12,
        roll: 5,
        run: stock.run,
        useFittingAngle: false,
        gap: 0,
        nps: 2,
        kind: 'LR',
        schedule: '40',
      });
      near(back.cutAngle, a, 1e-6);
      near(back.travel, stock.travel, 1e-6);
    }
  });

  test('a rolling offset with zero roll collapses to a simple offset', () => {
    const rolling = solveRolling({ rise: 10, roll: 0, run: 10, useFittingAngle: false, gap: 0, nps: 2, kind: 'LR', schedule: '40' });
    const simple = solveOffset({ offset: 10, fittingAngle: 45, gap: 0, nps: 2, kind: 'LR', schedule: '40', lockRun: false });
    near(rolling.travel, simple.travel, 1e-6);
    near(rolling.pipeCut, simple.pipeCut, 1e-6);
    near(rolling.cutAngle, 45, 1e-6);
  });

  test('rise and roll are interchangeable for the true offset', () => {
    const a = solveRolling({ rise: 7, roll: 24, run: 30, useFittingAngle: false, gap: 0, nps: 2, kind: 'LR', schedule: '40' });
    const b = solveRolling({ rise: 24, roll: 7, run: 30, useFittingAngle: false, gap: 0, nps: 2, kind: 'LR', schedule: '40' });
    near(a.trueOffset, b.trueOffset, 1e-9);
    near(a.pipeCut, b.pipeCut, 1e-9);
  });
});

describe('rolling offset — guards', () => {
  const base = { useFittingAngle: false, gap: 0, nps: 2, kind: 'LR' as const, schedule: '40' as const };
  test('rejects rise and roll both zero', () => expect(solveRolling({ ...base, rise: 0, roll: 0, run: 10 }).valid).toBe(false));
  test('rejects NaN rise', () => expect(solveRolling({ ...base, rise: NaN, roll: 5, run: 10 }).valid).toBe(false));
  test('rejects a run of zero', () => expect(solveRolling({ ...base, rise: 12, roll: 5, run: 0 }).valid).toBe(false));
  test('rejects a bad stock elbow angle', () =>
    expect(solveRolling({ ...base, rise: 12, roll: 5, useFittingAngle: true, fittingAngle: 0 }).valid).toBe(false));
});

describe('cut length', () => {
  const base = { customA: NaN, customB: NaN, gap: 0, nps: 2, kind: 'LR' as const, schedule: '40' as const };

  test('two 90 LR elbows on 2 inch, 24 inch C2C', () => {
    const r = solveCutLength({ ...base, centerToCenter: 24, endA: 'elbow90', endB: 'elbow90' });
    near(r.takeoffA, 3);
    near(r.pipeCut, 18);
  });

  test('deduction always reconstructs the C2C', () => {
    for (const endA of END_FITTINGS.map((f) => f.id))
      for (const endB of END_FITTINGS.map((f) => f.id)) {
        const r = solveCutLength({ ...base, centerToCenter: 60, endA, endB, customA: 1.5, customB: 2.25, gap: 0.0625 });
        if (!r.valid) continue;
        near(r.pipeCut + r.totalDeduction, 60, 1e-9);
      }
  });

  test('weld gap applies once per welded end', () => {
    const one = solveCutLength({ ...base, centerToCenter: 24, endA: 'elbow90', endB: 'none', gap: 0.125 });
    near(one.totalDeduction, 3.125);
    const two = solveCutLength({ ...base, centerToCenter: 24, endA: 'elbow90', endB: 'elbow90', gap: 0.125 });
    near(two.totalDeduction, 6.25);
  });

  test('an open end deducts nothing', () => {
    const r = solveCutLength({ ...base, centerToCenter: 24, endA: 'none', endB: 'none' });
    near(r.pipeCut, 24);
    near(r.totalDeduction, 0);
  });

  test('elbow takeoffs agree with the offset solver', () => {
    for (const s of PIPE_SIZES) {
      near(endTakeoff('elbow90', s.nps, 'LR', NaN), takeoff(s.nps, 'LR', 90), 1e-9);
      near(endTakeoff('elbow45', s.nps, 'LR', NaN), takeoff(s.nps, 'LR', 45), 1e-9);
    }
  });

  test('custom takeout is used verbatim', () => {
    const r = solveCutLength({ ...base, centerToCenter: 24, endA: 'custom', endB: 'custom', customA: 2, customB: 3 });
    near(r.pipeCut, 19);
  });

  test('every catalogue fitting resolves for every listed pipe size', () => {
    for (const s of PIPE_SIZES)
      for (const f of ['elbow90', 'elbow45', 'tee', 'flange150', 'flange300'] as const) {
        const v = endTakeoff(f, s.nps, 'LR', NaN);
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThan(0);
      }
  });

  test('tee centre-to-end matches published B16.9 values', () => {
    near(endTakeoff('tee', 2, 'LR', NaN), 2.5, 1e-9);
    near(endTakeoff('tee', 6, 'LR', NaN), 5.625, 1e-9);
    near(endTakeoff('tee', 12, 'LR', NaN), 10.0, 1e-9);
  });

  test('Class 300 flanges are never shorter than Class 150', () => {
    for (const s of PIPE_SIZES)
      expect(endTakeoff('flange300', s.nps, 'LR', NaN)).toBeGreaterThanOrEqual(endTakeoff('flange150', s.nps, 'LR', NaN));
  });

  test('rejects when deductions swallow the dimension', () => {
    const r = solveCutLength({ ...base, centerToCenter: 2, endA: 'elbow90', endB: 'elbow90' });
    expect(r.valid).toBe(false);
  });

  test('rejects a missing C2C', () => {
    expect(solveCutLength({ ...base, centerToCenter: NaN, endA: 'none', endB: 'none' }).valid).toBe(false);
  });
});

describe('saddle bend — three point geometry', () => {
  const H = 4;
  const D = 30;
  const r = solveSaddle({ type: 'three', depth: H, width: NaN, distanceToObstruction: D, centerAngle: 45 });

  test('solves with three marks', () => {
    expect(r.valid).toBe(true);
    expect(r.marks).toHaveLength(3);
  });

  test('side bends are half the centre bend', () => near(r.sideAngle, 22.5, 1e-9));

  test('multiplier is 1/sin(22.5) exactly', () => near(r.multiplier, 1 / Math.sin(rad(22.5)), 1e-12));

  test('outer marks sit one multiplier span either side of centre', () => {
    near(r.marks[1]!.position - r.marks[0]!.position, H * r.multiplier, 1e-9);
    near(r.marks[2]!.position - r.marks[1]!.position, H * r.multiplier, 1e-9);
  });

  test('the peak lands over the obstruction once shrink is applied', () => {
    const horizontalOfPeak = r.marks[0]!.position + H / Math.tan(rad(r.sideAngle));
    near(horizontalOfPeak, D, 1e-9);
  });

  test('total shrink equals conduit length minus horizontal span', () => {
    const conduit = r.marks[2]!.position - r.marks[0]!.position;
    const horizontal = (2 * H) / Math.tan(rad(r.sideAngle));
    near(r.shrink, conduit - horizontal, 1e-9);
  });

  test('shrink is twice the per-bend figure', () => near(r.shrink, r.shrinkPerBend * 2, 1e-12));

  test('marks stay in ascending order', () => {
    expect(r.marks[0]!.position).toBeLessThan(r.marks[1]!.position);
    expect(r.marks[1]!.position).toBeLessThan(r.marks[2]!.position);
  });

  test('the peak lands correctly at every angle and depth', () => {
    for (const angle of [22.5, 30, 45, 60]) {
      for (const depth of [1, 4, 9.5]) {
        const s = solveSaddle({ type: 'three', depth, width: NaN, distanceToObstruction: 60, centerAngle: angle });
        if (!s.valid) continue;
        near(s.marks[0]!.position + depth / Math.tan(rad(s.sideAngle)), 60, 1e-9);
      }
    }
  });
});

describe('saddle bend — four point geometry', () => {
  const H = 4;
  const W = 6;
  const D = 30;
  const r = solveSaddle({ type: 'four', depth: H, width: W, distanceToObstruction: D, centerAngle: 45 });

  test('solves with four marks', () => {
    expect(r.valid).toBe(true);
    expect(r.marks).toHaveLength(4);
  });

  test('the conduit reaches full height exactly at the obstruction', () => {
    const horizontalOfSecondMark = r.marks[0]!.position + H / Math.tan(rad(45));
    near(horizontalOfSecondMark, D, 1e-9);
  });

  test('the level run spans the obstruction width', () => {
    near(r.marks[2]!.position - r.marks[1]!.position, W, 1e-9);
  });

  test('both offsets use the same span', () => {
    near(r.marks[1]!.position - r.marks[0]!.position, r.marks[3]!.position - r.marks[2]!.position, 1e-9);
    near(r.marks[1]!.position - r.marks[0]!.position, H * r.multiplier, 1e-9);
  });

  test('total shrink equals conduit length minus horizontal span', () => {
    const conduit = r.marks[3]!.position - r.marks[0]!.position;
    const horizontal = (2 * H) / Math.tan(rad(45)) + W;
    near(r.shrink, conduit - horizontal, 1e-9);
  });

  test('clears the obstruction at every angle', () => {
    for (const angle of [22.5, 30, 45, 60]) {
      const s = solveSaddle({ type: 'four', depth: 5, width: 8, distanceToObstruction: 40, centerAngle: angle });
      if (!s.valid) continue;
      near(s.marks[0]!.position + 5 / Math.tan(rad(angle)), 40, 1e-9);
      near(s.marks[2]!.position - s.marks[1]!.position, 8, 1e-9);
    }
  });

  test('marks stay in ascending order', () => {
    for (let i = 1; i < r.marks.length; i += 1) expect(r.marks[i]!.position).toBeGreaterThan(r.marks[i - 1]!.position);
  });

  test('no mark ever lands before the conduit end', () => {
    for (const angle of [22.5, 30, 45, 60])
      for (const depth of [1, 5, 12]) {
        const s = solveSaddle({ type: 'four', depth, width: 6, distanceToObstruction: 40, centerAngle: angle });
        if (!s.valid) continue;
        expect(s.marks[0]!.position).toBeGreaterThanOrEqual(0);
      }
  });
});

describe('saddle bend — helpers and guards', () => {
  test('multiplier table matches the trade values', () => {
    near(offsetMultiplier(10), 5.759, 0.001);
    near(offsetMultiplier(22.5), 2.613, 0.001);
    near(offsetMultiplier(30), 2.0, 1e-9);
    near(offsetMultiplier(45), 1.4142, 0.001);
    near(offsetMultiplier(60), 1.1547, 0.001);
  });

  test('shrink per unit matches the trade offset table', () => {
    near(offsetShrinkPerUnit(22.5), 0.1989, 0.001);
    near(offsetShrinkPerUnit(30), 0.2679, 0.001);
    near(offsetShrinkPerUnit(45), 0.4142, 0.001);
    near(offsetShrinkPerUnit(60), 0.5774, 0.001);
  });

  test('rejects zero depth', () =>
    expect(solveSaddle({ type: 'three', depth: 0, width: 6, distanceToObstruction: 30, centerAngle: 45 }).valid).toBe(false));
  test('rejects zero distance', () =>
    expect(solveSaddle({ type: 'three', depth: 4, width: 6, distanceToObstruction: 0, centerAngle: 45 }).valid).toBe(false));
  test('rejects a bad angle', () =>
    expect(solveSaddle({ type: 'three', depth: 4, width: 6, distanceToObstruction: 30, centerAngle: 0 }).valid).toBe(false));
  test('four point needs a width', () =>
    expect(solveSaddle({ type: 'four', depth: 4, width: NaN, distanceToObstruction: 30, centerAngle: 45 }).valid).toBe(false));
  test('rejects an obstruction too close for a three point saddle', () => {
    const s = solveSaddle({ type: 'three', depth: 20, width: NaN, distanceToObstruction: 1, centerAngle: 45 });
    expect(s.valid).toBe(false);
    expect(s.error).toMatch(/too close/i);
  });
  test('rejects an obstruction too close for a four point saddle', () => {
    const s = solveSaddle({ type: 'four', depth: 20, width: 6, distanceToObstruction: 1, centerAngle: 45 });
    expect(s.valid).toBe(false);
    expect(s.error).toMatch(/too close/i);
  });
  test('reports the clearance actually required when it rejects', () => {
    const s = solveSaddle({ type: 'four', depth: 20, width: 6, distanceToObstruction: 1, centerAngle: 45 });
    near(s.minimumDistance, 20, 1e-9);
  });
});

describe('miter bend', () => {
  const r = solveMiter({ totalAngle: 90, segments: 3, nps: 6, schedule: '40', centerlineRadius: 9 });

  test('two cuts for three segments', () => expect(r.cuts).toBe(2));
  test('cut angle is total over twice the cuts', () => near(r.cutAngle, 22.5, 1e-12));
  test('mid segment is twice the cut angle', () => near(r.midSegmentAngle, 45, 1e-12));
  test('end segment equals the cut angle', () => near(r.endSegmentAngle, 22.5, 1e-12));
  test('throat shorter than back', () => expect(r.throatLength).toBeLessThan(r.backLength));
  test('no code warning at exactly 22.5', () => expect(r.codeWarning).toBeUndefined());

  test('cuts always reconstruct the total angle', () => {
    for (const total of [22.5, 30, 45, 60, 90])
      for (const segments of [2, 3, 4, 5, 6]) {
        const m = solveMiter({ totalAngle: total, segments, nps: 6, schedule: '40', centerlineRadius: 9 });
        if (!m.valid) continue;
        near(m.cutAngle * 2 * m.cuts, total, 1e-9);
      }
  });

  test('cutback equals OD times tan of the cut angle', () => {
    for (const segments of [2, 3, 4, 5]) {
      const m = solveMiter({ totalAngle: 90, segments, nps: 6, schedule: '40', centerlineRadius: 9 });
      near(m.cutbackMax, findSize(6).od * Math.tan(rad(m.cutAngle)), 1e-9);
    }
  });

  test('back minus throat equals two cutbacks', () => {
    const m = solveMiter({ totalAngle: 90, segments: 4, nps: 8, schedule: '40', centerlineRadius: 12 });
    near(m.backLength - m.throatLength, 2 * m.cutbackMax, 1e-9);
  });

  test('more segments means a smaller cut angle', () => {
    let previous = Infinity;
    for (const segments of [2, 3, 4, 5, 6]) {
      const m = solveMiter({ totalAngle: 90, segments, nps: 6, schedule: '40', centerlineRadius: 9 });
      expect(m.cutAngle).toBeLessThan(previous);
      previous = m.cutAngle;
    }
  });

  test('centreline arc equals R times theta', () => {
    const m = solveMiter({ totalAngle: 60, segments: 3, nps: 4, schedule: '40', centerlineRadius: 8 });
    near(m.centerlineArc, 8 * rad(60), 1e-9);
  });

  test('warns above 22.5 degrees', () => {
    const w = solveMiter({ totalAngle: 90, segments: 2, nps: 6, schedule: '40', centerlineRadius: 9 });
    near(w.cutAngle, 45, 1e-12);
    expect(w.codeWarning).toMatch(/B31\.3/);
  });

  test('rejects radius inside the pipe wall', () =>
    expect(solveMiter({ totalAngle: 90, segments: 3, nps: 6, schedule: '40', centerlineRadius: 2 }).valid).toBe(false));
  test('rejects one segment', () =>
    expect(solveMiter({ totalAngle: 90, segments: 1, nps: 6, schedule: '40', centerlineRadius: 9 }).valid).toBe(false));
  test('rejects a fractional segment count', () =>
    expect(solveMiter({ totalAngle: 90, segments: 2.5, nps: 6, schedule: '40', centerlineRadius: 9 }).valid).toBe(false));
  test('rejects a zero total angle', () =>
    expect(solveMiter({ totalAngle: 0, segments: 3, nps: 6, schedule: '40', centerlineRadius: 9 }).valid).toBe(false));
  test('rejects beyond 90 degrees', () =>
    expect(solveMiter({ totalAngle: 120, segments: 3, nps: 6, schedule: '40', centerlineRadius: 9 }).valid).toBe(false));
});

describe('thread engagement', () => {
  const r = solveThread({ nps: 2, turnsPastHandTight: 3, centerToCenter: NaN, centerToFace: NaN });

  test('pitch is one over TPI', () => near(r.pitch, 1 / 11.5, 1e-9));
  test('wrench makeup is turns times pitch', () => near(r.wrenchMakeup, 3 / 11.5, 1e-9));
  test('total engagement adds hand tight', () => near(r.totalEngagement, 0.436 + 3 / 11.5, 1e-9));
  test('deduction is fitting face minus engagement', () => near(r.deductionPerEnd, 2.25 - r.totalEngagement, 1e-9));

  test('cut plus both deductions reconstructs the C2C', () => {
    for (const nps of NPT_TABLE.map((t) => t.nps)) {
      const s = solveThread({ nps, turnsPastHandTight: 3, centerToCenter: 48, centerToFace: NaN });
      if (!Number.isFinite(s.pipeCut)) continue;
      near(s.pipeCut + 2 * s.deductionPerEnd, 48, 1e-9);
    }
  });

  test('more wrench turns leaves a longer pipe', () => {
    const a = solveThread({ nps: 2, turnsPastHandTight: 2, centerToCenter: 48, centerToFace: NaN });
    const b = solveThread({ nps: 2, turnsPastHandTight: 4, centerToCenter: 48, centerToFace: NaN });
    expect(b.pipeCut).toBeGreaterThan(a.pipeCut);
  });

  test('a custom fitting face overrides the table', () => {
    const s = solveThread({ nps: 2, turnsPastHandTight: 3, centerToCenter: 48, centerToFace: 4 });
    near(s.centerToFace, 4, 1e-9);
    near(s.pipeCut, 48 - 2 * (4 - s.totalEngagement), 1e-9);
  });

  test('every listed size has a positive deduction at default turns', () => {
    for (const t of NPT_TABLE) {
      const s = solveThread({ nps: t.nps, turnsPastHandTight: t.wrenchTurns, centerToCenter: NaN, centerToFace: NaN });
      expect(s.deductionPerEnd).toBeGreaterThan(0);
    }
  });

  test('every listed size keeps thread in reserve at default turns', () => {
    for (const t of NPT_TABLE) {
      const s = solveThread({ nps: t.nps, turnsPastHandTight: t.wrenchTurns, centerToCenter: NaN, centerToFace: NaN });
      expect(s.overThreaded).toBe(false);
    }
  });

  test('flags over-threading', () => {
    const over = solveThread({ nps: 2, turnsPastHandTight: 20, centerToCenter: NaN, centerToFace: NaN });
    expect(over.overThreaded).toBe(true);
    expect(over.error).toMatch(/exceeds/i);
  });

  test('rejects a C2C shorter than the deductions', () => {
    const s = solveThread({ nps: 6, turnsPastHandTight: 3, centerToCenter: 2, centerToFace: NaN });
    expect(s.cutError).toMatch(/exceed/i);
    expect(Number.isFinite(s.pipeCut)).toBe(false);
  });

  test('findThread falls back rather than throwing', () => expect(findThread(999).label).toBe('2"'));
});

describe('hand bender', () => {
  const r = solveBender({ angle: 90, radius: 4, takeUp: 5, stubHeight: 12 });

  test('setback at 90 equals the radius', () => near(r.setback, 4, 1e-9));
  test('arc length is R theta', () => near(r.arcLength, 4 * rad(90), 1e-9));
  test('gain is tangents minus arc', () => near(r.gain, 2 * r.setback - r.arcLength, 1e-12));
  test('stub mark is height minus take-up', () => near(r.stubMark, 7, 1e-9));

  test('gain is positive at every practical angle', () => {
    for (const a of [5, 10, 22.5, 30, 45, 60, 90, 120, 170]) {
      const b = solveBender({ angle: a, radius: 6, takeUp: 8, stubHeight: NaN });
      expect(b.gain).toBeGreaterThan(0);
    }
  });

  test('setback and arc both grow with angle', () => {
    let lastSetback = 0;
    let lastArc = 0;
    for (const a of [10, 22.5, 30, 45, 60, 90]) {
      const b = solveBender({ angle: a, radius: 5, takeUp: 6, stubHeight: NaN });
      expect(b.setback).toBeGreaterThan(lastSetback);
      expect(b.arcLength).toBeGreaterThan(lastArc);
      lastSetback = b.setback;
      lastArc = b.arcLength;
    }
  });

  test('setback matches the elbow takeoff formula', () => {
    for (const s of PIPE_SIZES.slice(0, 8))
      for (const a of ANGLES) {
        const b = solveBender({ angle: a, radius: bendRadius(s.nps, 'LR'), takeUp: NaN, stubHeight: NaN });
        near(b.setback, takeoff(s.nps, 'LR', a), 1e-9);
      }
  });

  test('doubling the radius doubles setback, arc and gain', () => {
    const a = solveBender({ angle: 45, radius: 4, takeUp: NaN, stubHeight: NaN });
    const b = solveBender({ angle: 45, radius: 8, takeUp: NaN, stubHeight: NaN });
    near(b.setback, a.setback * 2, 1e-9);
    near(b.arcLength, a.arcLength * 2, 1e-9);
    near(b.gain, a.gain * 2, 1e-9);
  });

  test('every preset carries a usable radius and take-up', () => {
    for (const p of BENDER_PRESETS) {
      expect(p.radius).toBeGreaterThan(0);
      expect(p.takeUp).toBeGreaterThan(0);
      const b = solveBender({ angle: 90, radius: p.radius, takeUp: p.takeUp, stubHeight: 12 });
      expect(b.valid).toBe(true);
    }
  });

  test('stub mark is absent when no stub height is given', () => {
    const b = solveBender({ angle: 90, radius: 4, takeUp: 5, stubHeight: NaN });
    expect(Number.isFinite(b.stubMark)).toBe(false);
  });

  test('rejects a zero radius', () => expect(solveBender({ angle: 90, radius: 0, takeUp: 5, stubHeight: 12 }).valid).toBe(false));
  test('rejects a zero angle', () => expect(solveBender({ angle: 0, radius: 4, takeUp: 5, stubHeight: 12 }).valid).toBe(false));
  test('rejects 180 degrees', () => expect(solveBender({ angle: 180, radius: 4, takeUp: 5, stubHeight: 12 }).valid).toBe(false));
});

describe('unit conversion', () => {
  test('inch to millimetre round-trips', () => {
    for (const v of [0.0625, 1, 11.6569, 240, 1000]) {
      near(toInches(fromInches(v, 'metric'), 'metric'), v, 1e-9);
      near(toInches(fromInches(v, 'imperial'), 'imperial'), v, 1e-9);
    }
  });

  test('one inch is 25.4 millimetres', () => near(fromInches(1, 'metric'), MM_PER_INCH, 1e-12));

  test('a metric-entered offset gives the same cut as its imperial twin', () => {
    const imperial = solveOffset({ offset: 10, fittingAngle: 45, gap: 0, nps: 2, kind: 'LR', schedule: '40', lockRun: false });
    const metric = solveOffset({
      offset: toInches(254, 'metric'),
      fittingAngle: 45,
      gap: 0,
      nps: 2,
      kind: 'LR',
      schedule: '40',
      lockRun: false,
    });
    near(metric.pipeCut, imperial.pipeCut, 1e-9);
    near(fromInches(metric.pipeCut, 'metric'), 296.09, 0.01);
  });
});

describe('fraction readout', () => {
  test('renders sixteenths', () => expect(toFraction(11.6569, 16)).toBe('11 11/16"'));
  test('reduces the fraction', () => expect(toFraction(0.5, 16)).toBe('1/2"'));
  test('rolls up to the next whole number', () => expect(toFraction(2.999, 16)).toBe('3"'));
  test('returns empty when fractions are off', () => expect(toFraction(1.5, 0)).toBe(''));
  test('handles negatives', () => expect(toFraction(-1.5, 16)).toBe('-1 1/2"'));
  test('handles a bare whole number', () => expect(toFraction(4, 16)).toBe('4"'));
  test('returns empty for a non-finite value', () => expect(toFraction(NaN, 16)).toBe(''));

  test('every sixteenth tick round-trips through the parser', () => {
    for (let i = 0; i <= 16 * 8; i += 1) {
      const value = i / 16;
      const rendered = toFraction(value, 16).replace('"', '');
      near(parseNumber(rendered), value, 1e-12);
    }
  });

  test('every 32nd tick round-trips through the parser', () => {
    for (let i = 0; i <= 32 * 4; i += 1) {
      const value = i / 32;
      const rendered = toFraction(value, 32).replace('"', '');
      near(parseNumber(rendered), value, 1e-12);
    }
  });

  test('rounding error never exceeds half a tick', () => {
    for (const denom of [8, 16, 32, 64] as const) {
      for (let i = 0; i < 400; i += 1) {
        const value = i * 0.137;
        const rendered = toFraction(value, denom).replace('"', '');
        expect(Math.abs(parseNumber(rendered) - value)).toBeLessThanOrEqual(0.5 / denom + 1e-9);
      }
    }
  });
});

describe('input parsing', () => {
  test('parses a mixed fraction', () => near(parseNumber('11 5/8'), 11.625, 1e-12));
  test('parses a bare fraction', () => near(parseNumber('3/16'), 0.1875, 1e-12));
  test('parses a negative mixed fraction', () => near(parseNumber('-1 1/2'), -1.5, 1e-12));
  test('parses a decimal with an inch mark', () => near(parseNumber('14.14"'), 14.14, 1e-12));
  test('parses a decimal with a foot mark', () => near(parseNumber("14.14'"), 14.14, 1e-12));
  test('parses spaces around the slash', () => near(parseNumber('2 3 / 4'), 2.75, 1e-12));
  test('rejects junk', () => expect(Number.isNaN(parseNumber('abc'))).toBe(true));
  test('rejects an empty string', () => expect(Number.isNaN(parseNumber(''))).toBe(true));
  test('rejects two numbers with no slash', () => expect(Number.isNaN(parseNumber('1 2'))).toBe(true));
  test('rejects a zero denominator', () => expect(Number.isNaN(parseNumber('1/0'))).toBe(true));
  test('rejects a zero denominator in a mixed fraction', () => expect(Number.isNaN(parseNumber('1 1/0'))).toBe(true));
  test('decimal formatter guards non-finite input', () => expect(decimal(NaN)).toBe('—'));
});

describe('cross-solver consistency', () => {
  test('a 45 degree simple offset agrees with the cut length solver', () => {
    const offset = solveOffset({ offset: 10, fittingAngle: 45, gap: 0, nps: 2, kind: 'LR', schedule: '40', lockRun: false });
    const cut = solveCutLength({
      centerToCenter: offset.travel,
      endA: 'elbow45',
      endB: 'elbow45',
      customA: NaN,
      customB: NaN,
      gap: 0,
      nps: 2,
      kind: 'LR',
      schedule: '40',
    });
    near(cut.pipeCut, offset.pipeCut, 1e-9);
  });

  test('a bender at the elbow radius reproduces the elbow setback', () => {
    const offset = solveOffset({ offset: 10, fittingAngle: 45, gap: 0, nps: 2, kind: 'LR', schedule: '40', lockRun: false });
    const bend = solveBender({ angle: 45, radius: bendRadius(2, 'LR'), takeUp: NaN, stubHeight: NaN });
    near(bend.setback, offset.setback, 1e-9);
    near(bend.arcLength, offset.centerlineArc, 1e-9);
  });

  test('a four point saddle at 45 degrees uses the simple offset multiplier', () => {
    const saddle = solveSaddle({ type: 'four', depth: 10, width: 12, distanceToObstruction: 40, centerAngle: 45 });
    const offset = solveOffset({ offset: 10, fittingAngle: 45, gap: 0, nps: 2, kind: 'LR', schedule: '40', lockRun: false });
    near(saddle.marks[1]!.position - saddle.marks[0]!.position, offset.travel, 1e-9);
  });
});
