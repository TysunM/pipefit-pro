import { LARGE_CLASSES, gasketWords, isLargeClass, largeClassOf, largeFlange, largeNumber, largeSizes, largeStuds, largeWords, ringGasket, seriesFor, seriesOf, spiralGasket, type LargeClass } from '../calc/largeFlange';
import { formatInches } from '../calc/ftin';
import { referenceTorque, studLabel, threadsPerInch } from '../calc/steelFlange';
import { classWords, jointFlange, newJoint, parseRegister, serialiseRegister, putJoint, emptyRegister } from '../state/register';
import { fromSpec, newSpec, targetTorque } from '../state/boltingSpec';
import { jointRecordHtml } from '../print/jointRecord';

const T = Date.UTC(2026, 9, 18, 12);

describe('the B16.47 bolting tables', () => {
  it('run 26" to 60" in twos, to 48" in class 900', () => {
    for (const c of LARGE_CLASSES) {
      const sizes = largeSizes(c);
      expect(sizes[0]).toBe(26);
      expect(sizes.at(-1)).toBe(c === 'A900' || c === 'B900' ? 48 : 60);
      for (let i = 1; i < sizes.length; i++) expect(sizes[i]! - sizes[i - 1]!).toBe(2);
    }
  });

  it('always has a stud count in fours, twenty and up, on a stud 3/4" to 4"', () => {
    for (const c of LARGE_CLASSES) for (const n of largeSizes(c)) {
      const f = largeFlange(n, c)!;
      expect(f.bolts % 4).toBe(0);
      expect(f.bolts).toBeGreaterThanOrEqual(20);
      expect(f.stud).toBeGreaterThanOrEqual(0.75);
      expect(f.stud).toBeLessThanOrEqual(4);
      expect(f.series).toBe(seriesOf(c));
      expect(Number.isFinite(threadsPerInch(f.stud))).toBe(true);
    }
  });

  it('matches the published tables where they were checked against each other', () => {
    expect(largeFlange(26, 'A150')).toMatchObject({ bolts: 24, stud: 1.25 });
    expect(largeFlange(36, 'A150')).toMatchObject({ bolts: 32, stud: 1.5 });
    expect(largeFlange(60, 'A150')).toMatchObject({ bolts: 52, stud: 1.75 });
    expect(largeFlange(26, 'A300')).toMatchObject({ bolts: 28, stud: 1.625 });
    // From 38" the Series A class 300 drilling changes: more, smaller studs than 36".
    expect(largeFlange(36, 'A300')).toMatchObject({ bolts: 32, stud: 2 });
    expect(largeFlange(38, 'A300')).toMatchObject({ bolts: 32, stud: 1.5 });
    expect(largeFlange(60, 'A300')).toMatchObject({ bolts: 32, stud: 2.25 });
    expect(largeFlange(26, 'A600')).toMatchObject({ bolts: 28, stud: 1.875 });
    expect(largeFlange(48, 'A600')).toMatchObject({ bolts: 32, stud: 2.75 });
    expect(largeFlange(60, 'A600')).toMatchObject({ bolts: 28, stud: 3.5 });
    expect(largeFlange(26, 'A400')).toMatchObject({ bolts: 28, stud: 1.75 });
    expect(largeFlange(36, 'A400')).toMatchObject({ bolts: 32, stud: 2 });
    expect(largeFlange(60, 'A400')).toMatchObject({ bolts: 32, stud: 2.75 });
    expect(largeFlange(26, 'B400')).toMatchObject({ bolts: 28, stud: 1.375 });
    expect(largeFlange(28, 'B400')).toMatchObject({ bolts: 24, stud: 1.5 });
    expect(largeFlange(26, 'B600')).toMatchObject({ bolts: 28, stud: 1.625 });
    expect(largeFlange(34, 'B600')).toMatchObject({ bolts: 24, stud: 2.25 });
    expect(largeFlange(60, 'B600')).toMatchObject({ bolts: 28, stud: 3.5 });
    expect(largeFlange(26, 'B900')).toMatchObject({ bolts: 20, stud: 2.5 });
    expect(largeFlange(36, 'B900')).toMatchObject({ bolts: 24, stud: 3 });
    expect(largeFlange(48, 'B900')).toMatchObject({ bolts: 24, stud: 4 });
    expect(largeFlange(26, 'A900')).toMatchObject({ bolts: 20, stud: 2.75 });
    expect(largeFlange(48, 'A900')).toMatchObject({ bolts: 24, stud: 4 });
    expect(largeFlange(26, 'B150')).toMatchObject({ bolts: 36, stud: 0.75 });
    expect(largeFlange(36, 'B150')).toMatchObject({ bolts: 44, stud: 0.875 });
    expect(largeFlange(46, 'B150')).toMatchObject({ bolts: 40, stud: 1.125 });
    expect(largeFlange(60, 'B150')).toMatchObject({ bolts: 52, stud: 1.25 });
    expect(largeFlange(26, 'B300')).toMatchObject({ bolts: 32, stud: 1.25 });
    expect(largeFlange(36, 'B300')).toMatchObject({ bolts: 32, stud: 1.375 });
    expect(largeFlange(60, 'B300')).toMatchObject({ bolts: 40, stud: 2.25 });
  });

  it('the two series are two drillings of the same flange', () => {
    expect(largeFlange(36, 'A150')!.bolts).toBe(32);
    expect(largeFlange(36, 'B150')!.bolts).toBe(44);
    expect(largeFlange(36, 'A150')!.stud).toBeGreaterThan(largeFlange(36, 'B150')!.stud);
  });

  it('in classes 400, 600 and 900 the two series are drilled the same from 38" up, and differently below', () => {
    for (const n of ['400', '600', '900'] as const) {
      const a = largeSizes(`A${n}`).map((s) => largeFlange(s, `A${n}`)!);
      const b = largeSizes(`B${n}`).map((s) => largeFlange(s, `B${n}`)!);
      expect(a.map((f) => f.nps)).toEqual(b.map((f) => f.nps));
      const same = (i: number) => a[i]!.bolts === b[i]!.bolts && a[i]!.stud === b[i]!.stud;
      for (let i = 0; i < a.length; i += 1) if (a[i]!.nps >= 38) expect(same(i)).toBe(true);
      // Below 38" they are their own drillings; a size or two may coincide (30" class 900 does).
      expect(a.filter((f, i) => f.nps < 38 && !same(i)).length).toBeGreaterThanOrEqual(4);
    }
    for (const n of ['150', '300'] as const) {
      const [a, b] = [largeFlange(48, `A${n}`)!, largeFlange(48, `B${n}`)!];
      expect(a.bolts === b.bolts && a.stud === b.stud).toBe(false);
    }
  });

  it('names the gasket by its series, with figures where the table has them', () => {
    expect(ringGasket(36, 'A150')).toEqual({ id: 36, od: 41.25 });
    expect(ringGasket(60, 'A150')).toEqual({ id: 60, od: 67.5 });
    expect(ringGasket(36, 'B150')).toEqual({ id: 36, od: 38.875 });
    expect(ringGasket(36, 'A300')).toEqual({ id: 36, od: 44 });
    expect(ringGasket(26, 'B600')).toEqual({ id: 26, od: 30.125 });
    // From 38" up a Series B class 400 or 600 flange is the Series A flange, and takes its gasket.
    expect(ringGasket(48, 'B600')).toEqual(ringGasket(48, 'A600'));
    expect(ringGasket(48, 'B400')).toEqual({ id: 48, od: 53 });
    expect(ringGasket(36, 'A900')).toBeUndefined();
    expect(ringGasket(62, 'A150')).toBeUndefined();
    expect(spiralGasket(36, 'A150')).toEqual({ innerId: 35.75, sealId: 36.5, sealOd: 38.13, ringOd: 41.25 });
    expect(spiralGasket(60, 'B150')).toEqual({ innerId: 60.44, sealId: 61.31, sealOd: 62.44, ringOd: 64.19 });
    expect(spiralGasket(36, 'A300')).toBeUndefined();
    expect(gasketWords(36, 'A150')).toBe(
      'Gasket to ASME B16.20 (spiral wound) or B16.21 (flat ring) for B16.47 Series A, NPS 36 class 150; a Series B gasket does not fit. Flat ring 36" bore × 41-1/4" outside. Spiral wound: sealing element 36-1/2" × 38-1/8", outer ring 41-1/4", inner ring 35-3/4" bore.'
    );
    expect(gasketWords(36, 'B300')).toBe('Gasket to ASME B16.20 (spiral wound) or B16.21 (flat ring) for B16.47 Series B, NPS 36 class 300; a Series A gasket does not fit. Flat ring 36" bore × 41-1/4" outside.');
    expect(gasketWords(40, 'A900')).toBe('Gasket to ASME B16.20 (spiral wound) or B16.21 (flat ring) for B16.47 Series A, NPS 40 class 900; a Series B gasket does not fit.');
  });

  it('knows which series a class is tabled in, and nothing it was not asked for', () => {
    expect(seriesFor('150')).toEqual(['A', 'B']);
    expect(seriesFor('400')).toEqual(['A', 'B']);
    expect(seriesFor('1500')).toEqual([]);
    expect(seriesFor('125')).toEqual([]);
    expect(seriesFor('75')).toEqual([]);
    expect(largeClassOf('B', '75')).toBeUndefined();
    expect(largeClassOf('A', '300')).toBe('A300');
    expect(isLargeClass('A75')).toBe(false);
    expect(isLargeClass('B150')).toBe(true);
    expect(largeFlange(27, 'A150')).toBeUndefined();
    expect(largeFlange(50, 'A900')).toBeUndefined();
    expect(largeNumber('A900')).toBe('900');
    expect(largeWords('B300')).toBe('B16.47 Series B class 300');
    expect(largeStuds(largeFlange(36, 'A150')!)).toBe('32 × 1-1/2" studs');
    expect(studLabel(1.375)).toBe('1-3/8"');
    expect(studLabel(3.25)).toBe('3-1/4"');
  });
});

describe('a large flange on a joint', () => {
  const large = newJoint('j1', { cls: 'A150', nps: 36, bolts: 32, project: 'BP-1', tag: 'L-36' }, T);

  it('is described by its series and class, and survives the register', () => {
    expect(jointFlange(large)).toBe('36" OD · B16.47 Series A class 150 · 32 × 1-1/2" studs');
    expect(classWords('A150')).toBe('B16.47 Series A class 150');
    expect(classWords('150')).toBe('class 150');
    expect(classWords('125')).toBe('class 125 cast iron');
    const back = parseRegister(serialiseRegister(putJoint(emptyRegister(), large)));
    expect(back.dropped).toBe(0);
    expect(back.joints.find((j) => j.id === 'j1')?.cls).toBe('A150');
  });

  it('takes its torque from its own stud, and its class number\'s rule from the spec', () => {
    const spec = { ...newSpec('s1', T), stressKsi: 50, nutFactor: 0.16, byClass: { '150': { stressKsi: 40 } } };
    expect(targetTorque(spec, 'A150', 36)).toBe(Math.round(referenceTorque(1.5, 40_000, 0.16)));
    expect(targetTorque(spec, 'B150', 36)).toBe(Math.round(referenceTorque(0.875, 40_000, 0.16)));
    expect(targetTorque(spec, 'A900', 50)).toBeNull();
    // Class 600 has no rule of its own on this spec, so it is pulled to the spec's 50 ksi.
    expect(targetTorque(spec, 'A600', 50)).toBe(Math.round(referenceTorque(3, 50_000, 0.16)));
    expect(fromSpec(spec, 'A150', 36, 32).bolting.stressKsi).toBe(40);
  });

  it('is named with its studs on the joint record', () => {
    const html = jointRecordHtml({ joint: large, dateLine: 'Printed 18 Oct 2026', wrench: null, now: T });
    expect(html).toContain('36&quot; OD ASME B16.47 Series A class 150');
    expect(html).toContain('32 × 1-1/2&quot;, 8 threads per inch');
    expect(html).toContain('for B16.47 Series A, NPS 36 class 150; a Series B gasket does not fit. Flat ring 36&quot; bore × 41-1/4&quot; outside.');
  });
});

describe('the gasket tables, against the pages they came from', () => {
  // ASME B16.21 flat ring outside diameters, mm, by class 150, 300, 400, 600 (wermac.org, B16.47 Series A and B).
  const RING_A_MM: Record<number, number[]> = {
    26: [775, 835, 832, 867], 28: [832, 899, 892, 914], 30: [883, 953, 946, 972], 32: [940, 1006, 1003, 1022], 34: [991, 1057, 1054, 1073], 36: [1048, 1118, 1118, 1130],
    38: [1111, 1054, 1073, 1105], 40: [1162, 1114, 1127, 1156], 42: [1219, 1165, 1178, 1219], 44: [1276, 1219, 1232, 1270], 46: [1327, 1273, 1289, 1327], 48: [1384, 1324, 1346, 1391],
    50: [1435, 1378, 1403, 1448], 52: [1492, 1429, 1454, 1499], 54: [1549, 1492, 1518, 1556], 56: [1607, 1543, 1568, 1613], 58: [1664, 1594, 1619, 1664], 60: [1715, 1645, 1683, 1721],
  };
  const RING_B_MM: Record<number, number[]> = {
    26: [725, 772, 746, 765], 28: [776, 826, 800, 819], 30: [827, 886, 857, 879], 32: [881, 940, 911, 933], 34: [935, 994, 962, 997], 36: [987, 1048, 1022, 1048],
    38: [1045, 1099], 40: [1095, 1149], 42: [1146, 1200], 44: [1197, 1251], 46: [1256, 1318], 48: [1307, 1368], 50: [1357, 1419], 52: [1408, 1470], 54: [1464, 1530], 56: [1514, 1594], 58: [1580, 1656], 60: [1630, 1705],
  };
  // ASME B16.20 spiral wound, class 150, mm: inner ring bore, sealing element bore and outside, outer ring outside.
  const SPIRAL_A150_MM: Record<number, number[]> = {
    26: [654.1, 673.1, 704.9, 774.7], 28: [704.9, 723.9, 755.7, 831.9], 30: [755.7, 774.7, 806.5, 882.7], 32: [806.5, 825.5, 860.6, 939.8], 34: [857.3, 876.3, 911.4, 990.6], 36: [908.1, 927.1, 968.5, 1047.8],
    38: [958.9, 977.9, 1019.3, 1111.3], 40: [1009.7, 1028.7, 1070.1, 1162.1], 42: [1060.5, 1079.5, 1124, 1219.2], 44: [1111.3, 1130.3, 1178.1, 1276.4], 46: [1162.1, 1181.1, 1228.9, 1327.2], 48: [1212.9, 1231.9, 1279.7, 1384.3],
    50: [1263.7, 1282.7, 1333.5, 1435.1], 52: [1314.5, 1333.5, 1384.3, 1492.3], 54: [1358.9, 1384.3, 1435.1, 1549.4], 56: [1409.7, 1435.1, 1485.9, 1606.6], 58: [1460.5, 1485.9, 1536.7, 1663.7], 60: [1511.3, 1536.7, 1587.5, 1714.5],
  };
  const SPIRAL_B150_MM: Record<number, number[]> = {
    26: [654.1, 673.1, 698.5, 725.4], 28: [704.9, 723.9, 749.3, 776.2], 30: [755.7, 774.7, 800.1, 827], 32: [806.5, 825.5, 850.9, 881.1], 34: [857.3, 876.3, 908.1, 935], 36: [908.1, 927.1, 958.9, 987.6],
    38: [958.9, 974.9, 1009.7, 1044.7], 40: [1009.7, 1022.4, 1063.8, 1095.5], 42: [1060.5, 1079.5, 1114.6, 1146.3], 44: [1111.3, 1124, 1165.4, 1197.1], 46: [1162.1, 1181.1, 1224, 1255.8], 48: [1212.9, 1231.9, 1270, 1306.6],
    50: [1263.7, 1282.7, 1325.6, 1357.4], 52: [1314.5, 1333.5, 1376.4, 1408.2], 54: [1365.3, 1384.3, 1422.4, 1463.8], 56: [1422.4, 1444.8, 1478, 1514.6], 58: [1478, 1500.1, 1528.8, 1579.6], 60: [1535.2, 1557.3, 1586, 1630.4],
  };
  const classes = ['150', '300', '400', '600'] as const;

  it('reads the flat ring tables to the sixteenth, both series', () => {
    for (const [series, table] of [['A', RING_A_MM], ['B', RING_B_MM]] as const)
      for (const [nps, row] of Object.entries(table))
        row.forEach((mm, i) => {
          const g = ringGasket(Number(nps), `${series}${classes[i]!}` as LargeClass)!;
          expect(g.id).toBe(Number(nps));
          expect(Math.abs(g.od * 25.4 - mm)).toBeLessThan(0.8);
        });
  });

  it('reads the class 150 spiral wound tables to the hundredth, both series', () => {
    for (const [cls, table] of [['A150', SPIRAL_A150_MM], ['B150', SPIRAL_B150_MM]] as const)
      for (const [nps, row] of Object.entries(table)) {
        const g = spiralGasket(Number(nps), cls)!;
        [g.innerId, g.sealId, g.sealOd, g.ringOd].forEach((inch, i) => expect(Math.abs(inch * 25.4 - row[i]!)).toBeLessThan(0.15));
        expect(g.innerId < g.sealId && g.sealId < g.sealOd && g.sealOd < g.ringOd).toBe(true);
      }
  });

  it('puts the spiral wound outer ring on the flat ring diameter at every size, as both sit inside the same bolts', () => {
    for (const cls of ['A150', 'B150'] as const)
      for (const nps of largeSizes(cls)) expect(formatInches(spiralGasket(nps, cls)!.ringOd)).toBe(formatInches(ringGasket(nps, cls)!.od));
  });

  it('has a flat ring for every flange it tables in classes 150 to 600, and none in class 900', () => {
    for (const cls of LARGE_CLASSES)
      for (const nps of largeSizes(cls)) expect(ringGasket(nps, cls) === undefined).toBe(largeNumber(cls) === '900');
  });
});
