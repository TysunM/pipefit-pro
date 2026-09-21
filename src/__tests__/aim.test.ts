import {
  AXES,
  aimRun,
  LEVEL_AXES,
  axisOf,
  flatAxes,
  flattenDir,
  flattenDirs,
  isFlat,
  planeNormal,
  planeOf,
  sameAim,
} from '../calc/aim';
import { LegDir, dirVector, turnDeg } from '../calc/direction';
import { cross, dot, len, unit } from '../calc/spool';

const d = (bearing: number, slope: number): LegDir => ({ bearing, slope });

describe('the six axes', () => {
  it('offers six, not four — up and down are the two a d-pad would drop', () => {
    expect(AXES).toHaveLength(6);
    expect(AXES.map((a) => a.id).sort()).toEqual(['DN', 'E', 'N', 'S', 'UP', 'W']);
  });

  it('points each one where its name says', () => {
    const v = (id: string) => dirVector(AXES.find((a) => a.id === id)!.dir);
    expect(v('UP').y).toBeCloseTo(1, 9);
    expect(v('DN').y).toBeCloseTo(-1, 9);
    expect(v('N').z).toBeCloseTo(1, 9);
    expect(v('E').x).toBeCloseTo(1, 9);
    expect(v('S').z).toBeCloseTo(-1, 9);
    expect(v('W').x).toBeCloseTo(-1, 9);
  });

  it('holds all six square to each other, so every turn between them is 90', () => {
    for (const a of AXES) {
      for (const b of AXES) {
        if (a.id === b.id) continue;
        const c = dot(unit(dirVector(a.dir)), unit(dirVector(b.dir)));
        // Square, or dead opposite. Nothing in between.
        expect(Math.abs(c) < 1e-9 || Math.abs(Math.abs(c) - 1) < 1e-9).toBe(true);
      }
    }
  });

  it('recognises a leg already on an axis, and refuses one that is between', () => {
    expect(axisOf(d(90, 0))?.id).toBe('E');
    expect(axisOf(d(0, 90))?.id).toBe('UP');
    expect(axisOf(d(45, 0))).toBeNull();
    expect(axisOf(d(90, 30))).toBeNull();
  });

  it('reads a vertical leg as up whatever bearing it carries, because bearing is dead there', () => {
    expect(axisOf(d(0, 90))?.id).toBe('UP');
    expect(axisOf(d(137, 90))?.id).toBe('UP');
    expect(axisOf(d(270, -90))?.id).toBe('DN');
  });

  it('calls two aims the same only when they are, to within half a degree', () => {
    expect(sameAim(d(90, 0), d(90.4, 0))).toBe(true);
    expect(sameAim(d(90, 0), d(91, 0))).toBe(false);
  });
});

describe('the plane a flat run lies in', () => {
  it('takes the bearing of the first leg that has one', () => {
    expect(planeOf([d(135, 0), d(0, 90)])).toBe(135);
  });

  it('skips a vertical first leg rather than taking its dead bearing', () => {
    expect(planeOf([d(999, 90), d(210, 0)])).toBe(210);
  });

  it('gives north for a run that is vertical throughout, the same way every time', () => {
    expect(planeOf([d(0, 90), d(0, -90)])).toBe(0);
  });

  it('is perpendicular to the bearing it names, and level', () => {
    for (const b of [0, 37, 90, 211, 359]) {
      const n = planeNormal(b);
      expect(len(n)).toBeCloseTo(1, 9);
      expect(n.y).toBeCloseTo(0, 9);
      expect(dot(n, dirVector(d(b, 0)))).toBeCloseTo(0, 9);
    }
  });
});

describe('pressing a run flat', () => {
  it('leaves a leg already in the plane exactly where it was', () => {
    const flat = flattenDir(d(90, 30), 90)!;
    expect(flat.bearing).toBeCloseTo(90, 6);
    expect(flat.slope).toBeCloseTo(30, 6);
  });

  it('leaves up and down alone — they are in every vertical plane', () => {
    expect(flattenDir(d(0, 90), 137)!.slope).toBeCloseTo(90, 6);
    expect(flattenDir(d(0, -90), 137)!.slope).toBeCloseTo(-90, 6);
  });

  it('swings a leg off the plane onto the nearer side of it', () => {
    // 45 east of a north plane leans north, so it lands on north.
    const flat = flattenDir(d(45, 0), 0)!;
    expect(turnDeg(flat.bearing)).toBeCloseTo(0, 6);
    // 135 leans south, so it lands on south rather than being dragged round.
    expect(turnDeg(flattenDir(d(135, 0), 0)!.bearing)).toBeCloseTo(180, 6);
  });

  it('keeps the rise when it swings the plan', () => {
    const flat = flattenDir(d(45, 45), 0)!;
    // The horizontal part halves; the vertical part does not move, so the leg
    // gets steeper rather than just turning.
    expect(flat.slope).toBeGreaterThan(45);
    expect(turnDeg(flat.bearing)).toBeCloseTo(0, 6);
  });

  it('refuses a leg running square out of the plane, rather than picking a side for it', () => {
    expect(flattenDir(d(90, 0), 0)).toBeNull();
    expect(flattenDir(d(270, 0), 0)).toBeNull();
  });

  it('gives that leg the plane bearing across a whole run, and counts it out loud', () => {
    const { dirs, guessed } = flattenDirs([d(0, 0), d(90, 0), d(0, 90)], 0);
    expect(guessed).toBe(1);
    expect(turnDeg(dirs[1]!.bearing)).toBeCloseTo(0, 6);
    expect(dirs).toHaveLength(3);
  });

  it('is idempotent: flattening a flat run changes nothing and guesses nothing', () => {
    const once = flattenDirs([d(0, 0), d(90, 0), d(0, 90)], 0);
    const twice = flattenDirs(once.dirs, 0);
    expect(twice.guessed).toBe(0);
    twice.dirs.forEach((x, i) => {
      expect(turnDeg(x.bearing)).toBeCloseTo(turnDeg(once.dirs[i]!.bearing), 6);
      expect(x.slope).toBeCloseTo(once.dirs[i]!.slope, 6);
    });
  });

  it('says a run is flat only when every leg truly lies in the plane', () => {
    expect(isFlat([d(0, 0), d(0, 90), d(180, -45)], 0)).toBe(true);
    expect(isFlat([d(0, 0), d(90, 0)], 0)).toBe(false);
  });

  it('leaves a flattened run flat, which is the property the mode rests on', () => {
    const { dirs } = flattenDirs([d(17, 12), d(233, -61), d(88, 4)], 17);
    expect(isFlat(dirs, 17)).toBe(true);
  });
});

describe('the eight directions inside a plane', () => {
  it('offers eight — the four square and the four forty fives between', () => {
    expect(flatAxes(0)).toHaveLength(8);
  });

  it('keeps every one of them in the plane', () => {
    for (const b of [0, 45, 137, 290]) {
      expect(isFlat(flatAxes(b).map((a) => a.dir), b)).toBe(true);
    }
  });

  it('turns 45 between each and its neighbour, so every bend is a stock elbow', () => {
    const axes = flatAxes(0);
    for (let i = 0; i < axes.length; i += 1) {
      const a = unit(dirVector(axes[i]!.dir));
      const b = unit(dirVector(axes[(i + 1) % axes.length]!.dir));
      expect((Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * 180) / Math.PI).toBeCloseTo(45, 6);
    }
  });

  it('sweeps the full circle once, with no direction repeated', () => {
    const seen = flatAxes(0).map((a) => {
      const v = dirVector(a.dir);
      return `${v.x.toFixed(6)},${v.y.toFixed(6)},${v.z.toFixed(6)}`;
    });
    expect(new Set(seen).size).toBe(8);
  });

  it('carries the four level axes when the plane runs along one of them', () => {
    const ids = flatAxes(90).map((a) => a.dir);
    expect(ids.some((x) => sameAim(x, LEVEL_AXES.find((a) => a.id === 'E')!.dir))).toBe(true);
    expect(ids.some((x) => sameAim(x, LEVEL_AXES.find((a) => a.id === 'W')!.dir))).toBe(true);
  });
});

describe('pointing the whole run', () => {
  const run: LegDir[] = [d(90, 0), d(0, 90), d(0, 0)];

  const angleBetween = (a: LegDir, b: LegDir) =>
    (Math.acos(Math.max(-1, Math.min(1, dot(unit(dirVector(a)), unit(dirVector(b)))))) * 180) / Math.PI;

  it('lands the first leg exactly where it was pointed', () => {
    for (const target of AXES) {
      const out = aimRun(run, target.dir);
      expect(sameAim(out[0]!, target.dir)).toBe(true);
    }
  });

  it('keeps every angle between every pair of legs, so no cut can move', () => {
    for (const target of AXES) {
      const out = aimRun(run, target.dir);
      for (let i = 0; i < run.length; i += 1) {
        for (let j = i + 1; j < run.length; j += 1) {
          expect(angleBetween(out[i]!, out[j]!)).toBeCloseTo(angleBetween(run[i]!, run[j]!), 6);
        }
      }
    }
  });

  it('can stand a run on end, which swinging the compass cannot do', () => {
    const up = aimRun(run, { bearing: 0, slope: 90 });
    expect(up[0]!.slope).toBeCloseTo(90, 6);
    // And back down again.
    expect(aimRun(run, { bearing: 0, slope: -90 })[0]!.slope).toBeCloseTo(-90, 6);
  });

  it('leaves a run already pointing that way completely alone', () => {
    const same = aimRun(run, d(90, 0));
    same.forEach((x, i) => {
      expect(sameAim(x, run[i]!)).toBe(true);
    });
  });

  it('turns a run pointing dead the other way, rather than giving up on it', () => {
    const out = aimRun(run, d(270, 0));
    expect(sameAim(out[0]!, d(270, 0))).toBe(true);
    expect(out).toHaveLength(run.length);
  });

  it('picks the same half turn every time, so doing it twice comes home', () => {
    const there = aimRun(run, d(270, 0));
    const back = aimRun(there, d(90, 0));
    back.forEach((x, i) => {
      expect(sameAim(x, run[i]!)).toBe(true);
    });
  });

  it('turns the run rather than mirroring it, which would be the other hand', () => {
    // Pairwise angles alone do not separate the two: a reflection keeps every
    // one of them as well, and a reflected spool is the opposite hand and does
    // not fit the job. Handedness is what tells them apart, so that is what is
    // checked — the signed volume the three legs span keeps its sign under a
    // turn and flips under a mirror.
    const chirality = (xs: LegDir[]) =>
      dot(cross(unit(dirVector(xs[0]!)), unit(dirVector(xs[1]!))), unit(dirVector(xs[2]!)));
    const was = chirality(run);
    for (const target of AXES) {
      const got = chirality(aimRun(run, target.dir));
      expect(Math.sign(got)).toBe(Math.sign(was));
      expect(Math.abs(got)).toBeCloseTo(Math.abs(was), 6);
    }
  });

  it('survives an empty run without inventing one', () => {
    expect(aimRun([], d(0, 90))).toEqual([]);
  });
});
