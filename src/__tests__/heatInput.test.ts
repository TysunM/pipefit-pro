import { PROCESSES, figure, formatDuration, heatInput, heatUnitFor, inHeatUnit, inSpeedUnit, parseDuration, processOf, speedUnitFor, weldLength } from '../calc/heatInput';

describe('heat input from volts and amps', () => {
  // 24 V, 180 A, 300 mm in a minute: 24 × 180 × 60 / 300 = 864 J/mm.
  const r = heatInput({ mode: 'va', amps: 180, volts: 24, lengthMm: 300, seconds: 60, k: 1 })!;
  test('arc energy, travel speed and heat input', () => {
    expect(r.arcEnergy).toBeCloseTo(864, 9);
    expect(r.heatInput).toBeCloseTo(864, 9);
    expect(r.travel).toBeCloseTo(5, 9);
  });
  test('agrees with the ASME form: V × A × 60 / travel in inches per minute, in J/in', () => {
    const ipm = inSpeedUnit(r.travel!, 'in/min');
    expect(inHeatUnit(r.heatInput, 'J/in')).toBeCloseTo((24 * 180 * 60) / ipm, 6);
    expect(inHeatUnit(r.heatInput, 'kJ/in')).toBeCloseTo(21.9456, 6);
    expect(inHeatUnit(r.heatInput, 'kJ/mm')).toBeCloseTo(0.864, 9);
    expect(inSpeedUnit(r.travel!, 'mm/min')).toBeCloseTo(300, 9);
    expect(inSpeedUnit(r.travel!, 'cm/min')).toBeCloseTo(30, 9);
  });
  test("the process's thermal efficiency comes off the arc energy", () => {
    const smaw = heatInput({ mode: 'va', amps: 180, volts: 24, lengthMm: 300, seconds: 60, k: processOf('smaw').k })!;
    expect(smaw.arcEnergy).toBeCloseTo(864, 9);
    expect(smaw.heatInput).toBeCloseTo(691.2, 9);
  });
  test('nothing until every figure it needs is there and above nought', () => {
    expect(heatInput({ mode: 'va', amps: 180, volts: 24, lengthMm: 300, seconds: null, k: 1 })).toBeNull();
    expect(heatInput({ mode: 'va', amps: 0, volts: 24, lengthMm: 300, seconds: 60, k: 1 })).toBeNull();
    expect(heatInput({ mode: 'va', amps: 180, volts: 24, lengthMm: null, seconds: 60, k: 1 })).toBeNull();
    expect(heatInput({ mode: 'va', amps: 180, volts: 24, lengthMm: 300, seconds: 60, k: 1.2 })).toBeNull();
  });
});

describe('heat input from a machine that reads out its total energy', () => {
  test('energy over length, the time only for the travel speed', () => {
    const r = heatInput({ mode: 'energy', energyKJ: 52, lengthMm: 600, seconds: null, k: 1 })!;
    expect(r.heatInput).toBeCloseTo(86.6667, 3);
    expect(r.travel).toBeNull();
    expect(heatInput({ mode: 'energy', energyKJ: 52, lengthMm: 600, seconds: 120, k: 1 })!.travel).toBeCloseTo(5, 9);
    expect(heatInput({ mode: 'energy', energyKJ: null, lengthMm: 600, seconds: 120, k: 1 })).toBeNull();
  });
});

describe('the length welded', () => {
  test('in inches or millimetres, or round a pipe from its diameter', () => {
    expect(weldLength(10, true, false)).toBeCloseTo(254, 9);
    expect(weldLength(254, false, false)).toBe(254);
    expect(weldLength(6.625, true, true)).toBeCloseTo(Math.PI * 6.625 * 25.4, 9);
    expect(weldLength(0, true, false)).toBeNull();
    expect(weldLength(null, true, true)).toBeNull();
  });
});

describe('units and efficiencies', () => {
  test('auto follows imperial or metric', () => {
    expect([heatUnitFor('auto', true), heatUnitFor('auto', false), heatUnitFor('J/in', false)]).toEqual(['kJ/in', 'kJ/mm', 'J/in']);
    expect([speedUnitFor('auto', true), speedUnitFor('auto', false), speedUnitFor('mm/s', true)]).toEqual(['in/min', 'mm/min', 'mm/s']);
  });
  test('the efficiencies are ISO/TR 17671-1, and none is the first and the default', () => {
    expect(PROCESSES[0]).toEqual({ id: 'none', label: 'None (ASME IX)', k: 1 });
    expect(Object.fromEntries(PROCESSES.map((p) => [p.id, p.k]))).toEqual({ none: 1, saw: 1, smaw: 0.8, gmaw: 0.8, fcaw: 0.8, gtaw: 0.6, paw: 0.6 });
    expect(processOf('nonsense').id).toBe('none');
  });
  test('three figures, the way a WPS range is written', () => {
    expect([figure(0.864), figure(21.9456), figure(691.2), figure(21945.6), figure(300)]).toEqual(['0.864', '21.9', '691', '21,946', '300']);
  });
});

describe('arc time', () => {
  test.each([
    ['90', 90],
    ['42.5', 42.5],
    ['1:30', 90],
    ['0:42.5', 42.5],
    ['1:02:03', 3723],
    [' 2:00 ', 120],
  ])('%s is %d seconds', (text, s) => expect(parseDuration(text)).toBe(s));
  test.each(['', 'abc', '0', '1:75', '1:60:00', '1:2:3:4', '-5', ':30'])('%p is not a time', (text) => expect(parseDuration(text)).toBeNull());
  test.each([
    [5, '0:05'],
    [42, '0:42'],
    [42.5, '0:42.5'],
    [90, '1:30'],
    [3723, '1:02:03'],
    [59.96, '1:00'],
  ])('%d seconds shows as %s', (s, text) => expect(formatDuration(s)).toBe(text));
  test('what the field shows reads back as the same time', () => {
    for (const s of [5, 42, 42.5, 90, 754, 3723]) expect(parseDuration(formatDuration(s))).toBeCloseTo(s, 6);
  });
});
