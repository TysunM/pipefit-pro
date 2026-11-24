import { displayText, initialState, press, pressMany } from '../calc/engine';
import { equalsBasic, exprText, initialBasic, pressBasic } from '../calc/basic';
import { formatConverted } from '../calc/convert';
import { converted, readCalc, speakDisplay, standardKeys, tapeFraction, tradeSteps, worksOut } from '../voice/calcSpeech';

/** Said to the trade calculator: the answer as its display shows it. */
function trade(said: string): string {
  const c = readCalc(said);
  if (c?.kind !== 'sum') throw new Error(`not a sum: ${said}`);
  const steps = tradeSteps(c.items);
  if (!steps) throw new Error(`no keys: ${said}`);
  let s = pressMany(initialState(), steps);
  if (worksOut(c.items)) s = press(s, 'equals');
  return displayText(s);
}

/** Said to the phone calculator: the answer as its display shows it. */
function standard(said: string): string {
  const c = readCalc(said);
  if (c?.kind !== 'sum') throw new Error(`not a sum: ${said}`);
  let s = initialBasic('deg');
  for (const k of standardKeys(c.items)!) s = pressBasic(s, k);
  const r = equalsBasic(s);
  return r.state.error ?? exprText(r.state.toks);
}

describe('a sum said to the trade calculator, worked by its own engine', () => {
  test.each([
    ['12 and a half plus 3 foot 2', '50-1/2"'],
    ['twelve and a half plus three foot two', '50-1/2"'],
    ['10 foot minus 3 and a quarter', '116-3/4"'],
    ['10 feet minus 3 1/4 inches', '116-3/4"'],
    ['3 foot 2 and 3/8 plus 1 foot 6', '56-3/8"'],
    ['350 mil plus 2 inches', '15-3/4"'],
    ['what is 2 foot times 3', '72"'],
    ['12.5 inches plus 4 inches', '16-1/2"'],
    ['2 plus 2', '4'],
    ['what\'s 2 to the power of 10', '1024'],
    ['square root of 144', '12'],
    ['square root of open bracket 9 plus 7 close bracket', '4'],
    ['sine of 30', '0.5'],
    ['200 plus 10 percent', '210'],
    ['open bracket 2 plus 3 close bracket times 4', '20'],
    ['add 12 and 3', '15'],
    ['subtract 3 from 10', '7'],
    ['multiply 6 by 7', '42'],
    ['divide 100 by 8', '12.5'],
    ['5 squared', '25'],
    ['2 cubed', '8'],
    ['12 + 3 × 2', '18'],
    ['an inch and a half plus a half', '2"'],
  ])('%s = %s', (said, shown) => expect(trade(said)).toBe(shown));
});

describe('a sum said to the phone calculator, worked by its own engine', () => {
  test.each([
    ['2 plus 2', '4'],
    ['12 and a half times 4', '50'],
    ['square root of 16 plus 2', '6'],
    ['square root of open bracket 9 plus 7 close bracket', '4'],
    ['2 to the power of 10', '1,024'],
    ['5 factorial', '120'],
    ['200 plus 10 percent', '220'],
    ['what is 100 divided by 8', '12.5'],
    ['pi times 2 squared', '12.5663706143592'],
  ])('%s = %s', (said, shown) => expect(standard(said)).toBe(shown));
});

describe('what the calculator hears', () => {
  test('carrying on from the answer', () => {
    expect(readCalc('times 3')).toMatchObject({ kind: 'sum', carry: true });
    expect(readCalc('plus 2 foot')).toMatchObject({ kind: 'sum', carry: true });
    expect(readCalc('12 plus 3')).toMatchObject({ kind: 'sum', carry: false });
  });
  test('the keys round a sum', () => {
    expect(readCalc('clear')).toEqual({ kind: 'clear' });
    expect(readCalc('all clear')).toEqual({ kind: 'clear' });
    expect(readCalc('backspace')).toEqual({ kind: 'back' });
    expect(readCalc('equals')).toEqual({ kind: 'equals' });
  });
  test('anything else is not the calculator\'s', () => {
    for (const s of ['rolling offset', 'standard', 'trade', 'save', 'half inch PVC', '3 two inch welds', 'weld 14 rejected', '148 psi', 'crew of 6', 'heat input'])
      expect(readCalc(s)).toBeNull();
  });
  test('a figure alone is entered, not worked', () => {
    const c = readCalc('42');
    expect(c?.kind === 'sum' && worksOut(c.items)).toBe(false);
  });
  test('a tape fraction is kept exact; anything else is a decimal', () => {
    expect(tapeFraction(0.375)).toEqual({ n: 3, d: 8 });
    expect(tapeFraction(0.5)).toEqual({ n: 1, d: 2 });
    expect(tapeFraction(1 / 3)).toBeNull();
  });
  test('the answer read aloud', () => {
    expect(speakDisplay('50-1/2"')).toBe('50 and 1/2 inches');
    expect(speakDisplay('72"')).toBe('72 inches');
    expect(speakDisplay('17280 sq inch')).toBe('17280 square inch');
  });
});

describe('conversions', () => {
  const conv = (s: string) => {
    const c = readCalc(s);
    if (c?.kind !== 'convert') throw new Error(`not a conversion: ${s}`);
    return `${c.from.id}>${c.to.id} ${formatConverted(converted(c))}`;
  };
  test.each([
    ['convert 3 feet to millimetres', 'ft>mm 914.4'],
    ['3 foot 2 to mm', 'in>mm 965.2'],
    ['how many psi in 10 bar', 'bar>psi 145.0377377'],
    ['how many inches in a foot', 'ft>in 12'],
    ['100 degrees fahrenheit to celsius', 'f>c 37.77777778'],
    ['5 gallons to litres', 'gal>l 18.92705892'],
    ['50 foot pounds to newton metres', 'ftlb>nm 67.79089742'],
    ['20 gpm in litres per minute', 'gpm>lpm 75.70823568'],
  ])('%s', (said, out) => expect(conv(said)).toBe(out));
});
