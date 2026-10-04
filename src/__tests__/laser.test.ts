import { BOSCH, boschDistance, hex, leicaDistance, leicaMetres, leicaTilt } from '../calc/laser';

/** A float32, little-endian, as the meters send it. */
const le = (x: number) => {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setFloat32(0, x, true);
  return [...b];
};

describe('Leica DISTO', () => {
  test('a distance indication is metres as a float', () => {
    expect(leicaDistance(le(3.2512))).toBeCloseTo(3.2512, 4);
  });

  test('nothing, zero, negative or past the range is no reading', () => {
    expect(leicaDistance([])).toBeNull();
    expect(leicaDistance(le(0))).toBeNull();
    expect(leicaDistance(le(-1))).toBeNull();
    expect(leicaDistance(le(5000))).toBeNull();
    expect(leicaDistance(le(NaN))).toBeNull();
  });

  test('a DataView reads the same as bytes', () => {
    const buf = new Uint8Array([9, 9, ...le(1.5)]);
    expect(leicaDistance(new DataView(buf.buffer, 2, 4))).toBeCloseTo(1.5, 6);
  });

  test('tilt comes in radians and goes out in degrees', () => {
    expect(leicaTilt(le(Math.PI / 6))).toBeCloseTo(30, 4);
    expect(leicaTilt(le(-Math.PI / 4))).toBeCloseTo(-45, 4);
    expect(leicaTilt(le(9))).toBeNull();
  });

  test('only a metre display unit gives metres', () => {
    expect(leicaMetres([0, 0])).toBe(true);
    expect(leicaMetres([3, 0])).toBe(true);
    expect(leicaMetres([4, 0])).toBe(false);
    expect(leicaMetres([])).toBe(false);
  });
});

describe('Bosch GLM', () => {
  const frame = (m: number) => [0xc0, 0x55, 0x10, 0x06, 0x00, 0x00, 0x00, ...le(m), 0x00, 0x00, 0x00, 0x00];

  test('an autosync frame carries metres at byte 7', () => {
    expect(boschDistance(frame(2.437))).toBeCloseTo(2.437, 4);
  });

  test('anything that is not a measurement frame is no reading', () => {
    expect(boschDistance(frame(0))).toBeNull();
    expect(boschDistance([0xc0, 0x55, 0x02, 0x01, 0x00])).toBeNull();
    expect(boschDistance([0x00, 0x55, 0x10, 0x06, 0, 0, 0, ...le(2)])).toBeNull();
    expect(boschDistance([0xc0, 0x55, 0x10])).toBeNull();
  });

  test('the autosync command and frames read as hex', () => {
    expect(hex(BOSCH.autosync)).toBe('C0 55 02 01 00 1A');
  });
});
