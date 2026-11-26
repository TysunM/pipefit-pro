import { FACTORS, MIN_ANGLE, againstTag, angleFactor, angleFrom, band, evenLift, lengthText, loadText, offCentre } from '../calc/sling';

const near = (a: number, b: number, d = 1e-3) => expect(Math.abs(a - b)).toBeLessThan(d);

describe('the angle factor', () => {
  test("the rigger's card: 90 is 1, 60 is 1.155, 45 is 1.414, 30 is 2", () => {
    near(angleFactor(90), 1);
    near(angleFactor(60), 1.1547);
    near(angleFactor(45), 1.4142);
    near(angleFactor(30), 2);
    expect(FACTORS.map((f) => f.angle)).toEqual([90, 75, 60, 50, 45, 40, 30]);
  });
  test('the bands: 30 is the least that is used, 60 and up is good', () => {
    expect(MIN_ANGLE).toBe(30);
    expect([band(29.9), band(30), band(44.9), band(45), band(59.9), band(60), band(90)]).toEqual(['danger', 'caution', 'caution', 'fair', 'fair', 'good', 'good']);
  });
});

describe('the angle, from what the fitter has', () => {
  test('from horizontal, from vertical, from the sling and the height, from the sling and the reach', () => {
    expect(angleFrom({ by: 'angle', angle: 60, from: 'horizontal' })).toEqual({ ok: true, deg: 60 });
    expect(angleFrom({ by: 'angle', angle: 30, from: 'vertical' })).toEqual({ ok: true, deg: 60 });
    const h = angleFrom({ by: 'height', length: 10, height: 5 });
    expect(h.ok && h.deg).toBeCloseTo(30, 9);
    const r = angleFrom({ by: 'reach', length: 10, reach: 5 });
    expect(r.ok && r.deg).toBeCloseTo(60, 9);
  });
  test('what cannot be is said, not worked out; what is not filled in yet is quiet', () => {
    expect(angleFrom({ by: 'height', length: 10, height: 12 })).toEqual({ ok: false, why: expect.stringMatching(/higher/) });
    expect(angleFrom({ by: 'reach', length: 10, reach: 10 })).toEqual({ ok: false, why: expect.stringMatching(/flat/) });
    expect(angleFrom({ by: 'angle', angle: 0, from: 'horizontal' }).ok).toBe(false);
    expect(angleFrom({ by: 'angle', angle: 90, from: 'vertical' }).ok).toBe(false);
    expect(angleFrom({ by: 'height', length: 10, height: null })).toEqual({ ok: false, why: null });
  });
});

describe('legs of equal length', () => {
  test('two legs at 60 degrees on 10,000 lb: 5,774 a leg, pulling 2,887 in on each pick point', () => {
    const e = evenLift(10_000, 2, false, 60);
    near(e.share, 5000);
    near(e.tension, 5773.5, 0.1);
    near(e.sideways, 2886.8, 0.1);
    near(e.total, 11547, 1);
    expect(e.band).toBe('good');
  });
  test('three and four legs on a rigid load: two legs carry it, unless rated or equalised for all to share', () => {
    near(evenLift(10_000, 4, false, 45).tension, 7071.1, 0.1);
    expect(evenLift(10_000, 4, false, 45).carrying).toBe(2);
    near(evenLift(10_000, 4, true, 45).tension, 3535.5, 0.1);
    expect(evenLift(9_000, 3, true, 60).carrying).toBe(3);
  });
  test('one leg hangs straight, whatever angle was put in', () => {
    expect(evenLift(4_000, 1, false, 30)).toMatchObject({ angle: 90, carrying: 1, tension: 4_000 });
  });
});

describe('off centre', () => {
  test('the CG 4 from A and 6 from B, the hook 8 above: A takes 6,000 and pulls 6,708; B takes 4,000 and pulls 5,000', () => {
    const o = offCentre(10_000, 4, 6, 8);
    if (!o.ok) throw new Error(o.why);
    near(o.a.share, 6000);
    near(o.a.tension, 6708.2, 0.1);
    near(o.a.length, 8.944, 0.001);
    near(o.a.angle, 63.435, 0.001);
    near(o.b.share, 4000);
    near(o.b.tension, 5000);
    near(o.b.length, 10);
    near(o.b.angle, 53.13, 0.01);
    // The pulls in on the two pick points are equal and opposite: the hook hangs still.
    near(o.a.sideways, o.b.sideways);
    near(o.a.sideways, 3000);
  });
  test('the pick point right under the CG takes it all; the other leg hangs slack', () => {
    const o = offCentre(10_000, 0, 6, 8);
    expect(o.ok && [o.a.share, o.b.slack]).toEqual([10_000, true]);
  });
  test('it needs the distances and a height', () => {
    expect(offCentre(1, 0, 0, 5).ok).toBe(false);
    expect(offCentre(1, 2, 2, 0).ok).toBe(false);
  });
});

describe('against the tag, and said plainly', () => {
  test('a leg under the tag is a share of it; over it says so', () => {
    expect(againstTag(5773.5, 6000)).toEqual({ pct: expect.closeTo(96.2, 1), over: false });
    expect(againstTag(5773.5, 5000)?.over).toBe(true);
    expect(againstTag(5000, null)).toBeNull();
  });
  test('loads and lengths read the way they are written on a tag and a tape', () => {
    expect(loadText(5773.5, 'lb')).toBe('5,774 lb');
    expect(loadText(2.8867, 'ton')).toBe('2.89 US ton');
    expect(loadText(12_345.6, 'kg')).toBe('12,346 kg');
    expect(lengthText(8.9443, 'ft')).toBe('8.94 ft');
    expect(lengthText(2272.4, 'mm')).toBe('2,272 mm');
  });
});
