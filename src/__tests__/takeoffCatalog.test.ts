import {
  DEFAULT_TAKEOFF_OPTIONS,
  TAKEOFF_FAMILIES,
  TAKEOFF_OPTIONS,
  elbowTakeout,
  endHasGap,
  endTakeout,
  optionsForFamily,
  sizesFor,
  takeoffOption,
} from '../calc/takeoffCatalog';
import { solveCutLength } from '../calc/cutLength';
import { PIPE_SIZES, takeoff } from '../calc/pipe';
import { takeout } from '../calc/takeout';
import { takeout45 } from '../calc/takeout45';
import { weldingNeck } from '../calc/weldingNeck';
import { flangedFitting } from '../calc/flangedFitting';
import { solderTakeout } from '../calc/solderFitting';

const O = DEFAULT_TAKEOFF_OPTIONS;
const SIZES = PIPE_SIZES.map((s) => s.nps);

describe('the takeout catalogue', () => {
  test('every way of joining pipe is offered', () => {
    expect(TAKEOFF_FAMILIES.map((f) => f.id)).toEqual(['screwed', 'welded', 'flanged', 'soldered']);
    for (const f of TAKEOFF_FAMILIES) {
      expect(optionsForFamily(f.id).length).toBeGreaterThan(2);
    }
  });

  test('every id is unique and findable', () => {
    const ids = TAKEOFF_OPTIONS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(takeoffOption(id)).toBeDefined();
    expect(takeoffOption('nothing-like-this')).toBeUndefined();
  });

  test('every option says where its figure comes from', () => {
    for (const o of TAKEOFF_OPTIONS) {
      expect(o.source.length).toBeGreaterThan(10);
      expect(o.label.length).toBeGreaterThan(2);
    }
  });

  test('open end and custom are offered whatever the joint', () => {
    for (const f of TAKEOFF_FAMILIES) {
      const ids = optionsForFamily(f.id).map((o) => o.id);
      expect(ids).toContain('none');
      expect(ids).toContain('custom');
    }
  });

  // Nothing here holds a figure of its own: it all reads the handbook tables.
  test('the figures are the handbook tables, not a second copy of them', () => {
    for (const nps of SIZES) {
      if (Number.isFinite(takeout(nps))) {
        expect(endTakeout('screwed90', nps, O)).toBe(takeout(nps));
      }
      if (Number.isFinite(takeout45(nps))) {
        expect(endTakeout('screwed45', nps, O)).toBe(takeout45(nps));
      }
      expect(endTakeout('weldNeck', nps, O)).toBe(weldingNeck(nps, '150'));
      const f = flangedFitting(nps, '150');
      if (f) expect(endTakeout('flanged90', nps, O)).toBe(f.a);
      if (Number.isFinite(solderTakeout(nps))) {
        expect(endTakeout('solder90', nps, O)).toBe(solderTakeout(nps, 'elbow90'));
      }
    }
  });

  test('a pressure class changes what a flanged end takes out', () => {
    const low = endTakeout('weldNeck', 6, { ...O, flangeClass: '150' });
    const high = endTakeout('weldNeck', 6, { ...O, flangeClass: '1500' });
    expect(high).toBeGreaterThan(low);
    expect(low).toBe(weldingNeck(6, '150'));
    expect(high).toBe(weldingNeck(6, '1500'));
  });

  test('a short radius elbow takes out less than a long one', () => {
    for (const nps of SIZES) {
      const lr = endTakeout('weld90', nps, { ...O, radius: 'LR' });
      const sr = endTakeout('weld90', nps, { ...O, radius: 'SR' });
      expect(sr).toBeLessThan(lr);
    }
  });

  test('custom is used verbatim, and an open end takes out nothing', () => {
    expect(endTakeout('custom', 6, { ...O, custom: 2.75 })).toBe(2.75);
    expect(endTakeout('custom', 6, { ...O, custom: NaN })).toBe(0);
    expect(endTakeout('none', 6, O)).toBe(0);
  });

  test('a fitting a size is not made in gives nothing rather than a number', () => {
    expect(Number.isNaN(endTakeout('street45', 6, O))).toBe(true);
    expect(Number.isNaN(endTakeout('weldNeck', 30, O))).toBe(true);
    expect(Number.isNaN(endTakeout('nothing-like-this', 6, O))).toBe(true);
    expect(sizesFor('street45', SIZES, O)).toEqual([0.5, 0.75, 1, 1.25, 1.5, 2]);
  });
});

describe('what a joint adds to the cut', () => {
  // A screwed takeout already reaches the end of the pipe, and a soldered tube
  // bottoms in its socket. Only a welded or flanged end leaves a gap.
  test('only welded and flanged ends leave a gap', () => {
    expect(endHasGap('weld90')).toBe(true);
    expect(endHasGap('weldNeck')).toBe(true);
    expect(endHasGap('screwed90')).toBe(false);
    expect(endHasGap('street90')).toBe(false);
    expect(endHasGap('solder90')).toBe(false);
    expect(endHasGap('none')).toBe(false);
  });

  test('a screwed run takes no gap off, however big the gap setting', () => {
    const base = {
      centerToCenter: 60,
      customA: NaN,
      customB: NaN,
      nps: 2,
      kind: 'LR' as const,
      schedule: '40' as const,
    };
    const screwed = solveCutLength({ ...base, endA: 'screwed90', endB: 'screwed90', gap: 0.125 });
    expect(screwed.gapEnds).toBe(0);
    expect(screwed.totalDeduction).toBeCloseTo(2 * takeout(2), 9);

    const welded = solveCutLength({ ...base, endA: 'weld90', endB: 'weld90', gap: 0.125 });
    expect(welded.gapEnds).toBe(2);
    expect(welded.totalDeduction).toBeCloseTo(2 * 3 + 0.25, 9);
  });

  test('one welded end and one screwed takes one gap off', () => {
    const r = solveCutLength({
      centerToCenter: 60,
      endA: 'weld90',
      endB: 'screwed90',
      customA: NaN,
      customB: NaN,
      gap: 0.125,
      nps: 2,
      kind: 'LR',
      schedule: '40',
    });
    expect(r.gapEnds).toBe(1);
    expect(r.totalDeduction).toBeCloseTo(3 + takeout(2) + 0.125, 9);
  });

  test('the cut and the deduction always rebuild the centre to centre', () => {
    for (const a of TAKEOFF_OPTIONS.map((o) => o.id))
      for (const b of ['none', 'weld90', 'screwed90', 'solder90', 'custom']) {
        const r = solveCutLength({
          centerToCenter: 120,
          endA: a,
          endB: b,
          customA: 1.5,
          customB: 2.25,
          gap: 0.0625,
          nps: 2,
          kind: 'LR',
          schedule: '40',
        });
        if (!r.valid) continue;
        expect(r.pipeCut + r.totalDeduction).toBeCloseTo(120, 9);
      }
  });
});

describe('a bend and a bought elbow', () => {
  test('at 90 degrees they are the same number', () => {
    for (const nps of SIZES) {
      const e = elbowTakeout(nps, 'LR', 90);
      expect(e.value).toBeCloseTo(takeoff(nps, 'LR', 90), 9);
      expect(e.fromTable).toBe(true);
    }
  });

  test('at 45 degrees the fitting takes out more', () => {
    for (const nps of [2, 4, 6, 12]) {
      const fitting = elbowTakeout(nps, 'LR', 45);
      expect(fitting.fromTable).toBe(true);
      expect(fitting.value).toBeGreaterThan(takeoff(nps, 'LR', 45));
    }
  });

  test('at any other angle there is no fitting and the bend stands', () => {
    for (const angle of [11.25, 22.5, 30, 60, 75]) {
      const e = elbowTakeout(6, 'LR', angle);
      expect(e.fromTable).toBe(false);
      expect(e.value).toBeCloseTo(takeoff(6, 'LR', angle), 9);
    }
  });

  test('both are offered, so a fitter can pick the one in front of them', () => {
    const welded = optionsForFamily('welded').map((o) => o.id);
    expect(welded).toContain('weld45');
    expect(welded).toContain('bend45');
    expect(endTakeout('bend45', 2, O)).toBeCloseTo(takeoff(2, 'LR', 45), 9);
    expect(endTakeout('weld45', 2, O)).toBe(1.375);
  });
});
