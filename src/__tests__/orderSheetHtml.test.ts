import { OrderSpool, planOrder } from '../calc/orderSheet';
import { orderSheetHtml } from '../print/orderSheetHtml';

const spool = (over: Partial<OrderSpool> & { id: string; cuts: number[] }): OrderSpool => ({
  name: over.id.toUpperCase(),
  place: '',
  nps: 2,
  kind: 'LR',
  schedule: '40',
  ...over,
});

const html = (spools: OrderSpool[]) =>
  orderSheetHtml({
    sheet: planOrder(spools, 240, 0.125),
    stock: '20 ft',
    kerf: '0.13 in',
    dateLine: 'Printed 20 Sep 2026',
    length: (v) => `${v.toFixed(2)} in`,
    short: (v) => v.toFixed(2),
  });

const TWO = [spool({ id: 'a', name: 'Ridge', place: 'Level 3', cuts: [100] }), spool({ id: 'b', name: 'Drop', cuts: [100] })];

describe('the page is one self-contained sheet', () => {
  test('it is a whole document, not a fragment', () => {
    const h = html(TWO);
    expect(h.startsWith('<!doctype html>')).toBe(true);
    expect(h.trimEnd().endsWith('</html>')).toBe(true);
  });

  test('it fetches nothing — no scripts, no images, no stylesheets', () => {
    // A sheet that needs the network is a sheet that prints blank on a site
    // with no signal.
    const h = html(TWO);
    expect(h).not.toContain('<script');
    expect(h).not.toContain('<img');
    expect(h).not.toContain('<link');
    expect(h).not.toContain('http://');
  });
});

describe('the buying half comes first', () => {
  test('the order table leads, before the marks and the sticks', () => {
    const h = html(TWO);
    expect(h.indexOf('To buy')).toBeGreaterThan(-1);
    expect(h.indexOf('To buy')).toBeLessThan(h.indexOf('Spools on this order'));
    expect(h.indexOf('Spools on this order')).toBeLessThan(h.indexOf('cut from'));
  });

  test('the saving is stated in words, with both counts', () => {
    const h = html(TWO);
    expect(h).toContain('buys 1 stick instead of 2');
  });

  test('and when there is none, it says that instead of leaving a blank', () => {
    const h = html([spool({ id: 'a', cuts: [239] })]);
    expect(h).toContain('no fewer than ordering them one at a time');
  });
});

describe('the cutting half is readable at the saw', () => {
  test('every piece appears under its mark', () => {
    const h = html(TWO);
    expect(h).toContain('A1');
    expect(h).toContain('B1');
  });

  test('the key names the spool behind each mark', () => {
    const h = html(TWO);
    expect(h).toContain('Ridge');
    expect(h).toContain('Level 3');
  });

  test('each size gets its own cutting table', () => {
    const h = html([spool({ id: 'a', nps: 2, cuts: [100] }), spool({ id: 'b', nps: 6, cuts: [100] })]);
    expect(h).toContain('2&quot; SCH 40 — cut from');
    expect(h).toContain('6&quot; SCH 40 — cut from');
  });
});

describe('nothing is quietly left out', () => {
  test('a spool that will not build is listed with its reason', () => {
    const h = html([spool({ id: 'a', cuts: [100] }), spool({ id: 'bad', name: 'Bad one', cuts: [], problem: 'Leg 2 is too short.' })]);
    expect(h).toContain('Left off');
    expect(h).toContain('Bad one');
    expect(h).toContain('Leg 2 is too short.');
  });

  test('a group that cannot be ordered says so at the top of the page', () => {
    const h = html([spool({ id: 'a', cuts: [300] })]);
    expect(h).toContain('cannot be filled as drawn');
  });
});

describe('a spool name cannot break the page', () => {
  test('angle brackets and quotes in a name come out as text', () => {
    const h = html([spool({ id: 'a', name: 'Riser <3" & up', cuts: [100] })]);
    expect(h).toContain('Riser &lt;3&quot; &amp; up');
    // The raw form would have opened a tag that swallows the rest of the page.
    expect(h).not.toContain('Riser <3"');
  });

  test('a place is escaped the same way', () => {
    const h = html([spool({ id: 'a', place: '</table><script>x</script>', cuts: [100] })]);
    expect(h).not.toContain('<script>x');
  });
});
