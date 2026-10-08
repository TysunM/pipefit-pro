import { STEEL_CLASSES, isSteelClass, referenceTorque, rootArea, steelFlange, steelSizes, studLabel, threadsPerInch } from '../calc/steelFlange';

describe('the B16.5 bolting table', () => {
  it('runs 1/2" to 24" in every class but 2500, which stops at 12"', () => {
    for (const c of STEEL_CLASSES) {
      const sizes = steelSizes(c);
      expect(sizes[0]).toBe(0.5);
      expect(sizes.at(-1)).toBe(c === '2500' ? 12 : 24);
      expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
    }
  });

  it('always has a stud count in fours, from four up', () => {
    for (const c of STEEL_CLASSES) for (const n of steelSizes(c)) {
      const f = steelFlange(n, c)!;
      expect(f.bolts % 4).toBe(0);
      expect(f.bolts).toBeGreaterThanOrEqual(4);
    }
  });

  it('studs run 1/2" to 3-1/2", and the count never drops as the flange grows', () => {
    for (const c of STEEL_CLASSES) {
      const rows = steelSizes(c).map((n) => steelFlange(n, c)!);
      for (const r of rows) {
        expect(r.stud).toBeGreaterThanOrEqual(0.5);
        expect(r.stud).toBeLessThanOrEqual(3.5);
      }
      for (let i = 1; i < rows.length; i++) expect(rows[i]!.bolts).toBeGreaterThanOrEqual(rows[i - 1]!.bolts);
    }
    // B16.5 is not monotonic in stud size: 2" Class 300 takes eight 5/8" studs after the 1-1/2" flange's four 3/4".
    expect(steelFlange(1.5, '300')!.stud).toBe(0.75);
    expect(steelFlange(2, '300')!.stud).toBe(0.625);
  });

  it('matches the published chart on the flanges a fitter meets every day', () => {
    expect(steelFlange(2, '150')).toMatchObject({ bolts: 4, stud: 0.625 });
    expect(steelFlange(6, '150')).toMatchObject({ bolts: 8, stud: 0.75 });
    expect(steelFlange(10, '150')).toMatchObject({ bolts: 12, stud: 0.875 });
    expect(steelFlange(24, '150')).toMatchObject({ bolts: 20, stud: 1.25 });
    expect(steelFlange(6, '300')).toMatchObject({ bolts: 12, stud: 0.75 });
    expect(steelFlange(12, '300')).toMatchObject({ bolts: 16, stud: 1.125 });
    expect(steelFlange(2, '600')).toMatchObject({ bolts: 8, stud: 0.625 });
    expect(steelFlange(8, '600')).toMatchObject({ bolts: 12, stud: 1.125 });
    expect(steelFlange(6, '900')).toMatchObject({ bolts: 12, stud: 1.125 });
    expect(steelFlange(24, '900')).toMatchObject({ bolts: 20, stud: 2.5 });
    expect(steelFlange(12, '1500')).toMatchObject({ bolts: 16, stud: 2 });
    expect(steelFlange(6, '2500')).toMatchObject({ bolts: 8, stud: 2 });
  });

  it('the class sets the studs, not the torque: a 6" 150 and a 2" 600 share a stud', () => {
    expect(steelFlange(6, '150')!.stud).toBe(0.625 + 0.125);
    expect(steelFlange(2, '600')!.stud).toBe(0.625);
    expect(steelFlange(5, '150')!.stud).toBe(steelFlange(2.5, '300')!.stud);
  });

  it('has no 3-1/2" above class 600, and nothing it is not asked for', () => {
    expect(steelFlange(3.5, '900')).toBeUndefined();
    expect(steelFlange(7, '150')).toBeUndefined();
    expect(isSteelClass('400')).toBe(false);
    expect(isSteelClass('150')).toBe(true);
  });
});

describe('studs', () => {
  it('are UNC to 1" and 8-UN above', () => {
    expect(threadsPerInch(0.5)).toBe(13);
    expect(threadsPerInch(0.75)).toBe(10);
    expect(threadsPerInch(1)).toBe(8);
    expect(threadsPerInch(1.125)).toBe(8);
    expect(threadsPerInch(2.5)).toBe(8);
  });

  it('are labelled the way they are said', () => {
    expect(studLabel(0.5)).toBe('1/2"');
    expect(studLabel(0.625)).toBe('5/8"');
    expect(studLabel(0.75)).toBe('3/4"');
    expect(studLabel(0.875)).toBe('7/8"');
    expect(studLabel(1)).toBe('1"');
    expect(studLabel(1.125)).toBe('1-1/8"');
    expect(studLabel(1.25)).toBe('1-1/4"');
    expect(studLabel(2.5)).toBe('2-1/2"');
  });

  it('root area is the PCC-1 one, and the reference torque follows Appendix K', () => {
    expect(rootArea(0.75)).toBeCloseTo(0.302, 3);
    expect(rootArea(1)).toBeCloseTo(0.551, 3);
    expect(rootArea(1.25)).toBeCloseTo(0.929, 3);
    // 3/4" B7 at 50 ksi: 151 ft-lb at K 0.16, 189 at K 0.20.
    expect(Math.round(referenceTorque(0.75, 50_000, 0.16))).toBe(151);
    expect(Math.round(referenceTorque(0.75, 50_000, 0.2))).toBe(189);
    expect(Math.round(referenceTorque(1, 50_000, 0.16))).toBe(367);
    expect(referenceTorque(0.75, 0, 0.16)).toBeNaN();
    expect(referenceTorque(0.3, 50_000, 0.16)).toBeNaN();
  });
});
