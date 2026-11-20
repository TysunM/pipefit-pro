import { equalsBasic, evaluate, exprText, formatNumber, initialBasic, isSum, MAX_DIGITS, MAX_HISTORY, previewBasic, pressBasic, remember, type BasicKey, type BasicState, type Fn, type HistoryEntry } from '../calc/basic';

// Keys as a thumb presses them: digits and . as themselves, + − × ÷ ^ as operators,
// ( for the bracket key, % ! ² ³ ' for the postfix keys (' is 1/x), ~ for +/-,
// < for backspace, C for clear, p and E for π and e, = for equals.
function keys(s: BasicState, seq: string): BasicState {
  for (const ch of seq) {
    let k: BasicKey | 'eq';
    if (/[0-9]/.test(ch)) k = { t: 'digit', d: ch };
    else if (ch === '.') k = { t: 'dot' };
    else if ('+−×÷^'.includes(ch)) k = { t: 'op', op: ch as '+' };
    else if (ch === '-') k = { t: 'op', op: '−' };
    else if (ch === '(') k = { t: 'paren' };
    else if ('%!²³'.includes(ch)) k = { t: 'post', p: ch as '%' };
    else if (ch === "'") k = { t: 'post', p: '⁻¹' };
    else if (ch === '~') k = { t: 'sign' };
    else if (ch === '<') k = { t: 'back' };
    else if (ch === 'C') k = { t: 'clear' };
    else if (ch === 'p') k = { t: 'const', c: 'π' };
    else if (ch === 'E') k = { t: 'const', c: 'e' };
    else if (ch === '=') k = 'eq';
    else throw new Error(`no key ${ch}`);
    s = k === 'eq' ? equalsBasic(s).state : pressBasic(s, k);
  }
  return s;
}
const fn = (s: BasicState, f: Fn) => pressBasic(s, { t: 'fn', fn: f });
const ex = (s: BasicState) => exprText(s.toks);
const answer = (seq: string, angle: 'deg' | 'rad' = 'deg') => {
  const s = keys(initialBasic(angle), seq);
  return s.error ?? exprText(s.toks);
};

describe('the phone calculator works a sum by precedence', () => {
  test.each([
    ['2+3×4=', '14'],
    ['10−4−3=', '3'],
    ['8÷4÷2=', '1'],
    ['2^3^2=', '512'],
    ['(2+3(×4=', '20'],
    ['-2²=', '−4'],
    ['2^-1=', '0.5'],
    ['0.1+0.2=', '0.3'],
    ['1÷3×3=', '1'],
    ['5!=', '120'],
    ['4\'=', '0.25'],
    ['3³=', '27'],
    ['12345679×9=', '111,111,111'],
    ['1000000×1000000000=', '1E+15'],
    ['1÷3=', '0.333333333333333'],
  ])('%s gives %s', (seq, want) => expect(answer(seq)).toBe(want));

  test('a number against a bracket, a constant or a function multiplies', () => {
    expect(answer('2(3+1(=')).toBe('8');
    expect(answer('2p=')).toBe('6.28318530717959');
    expect(answer('(2((3=')).toBe('6');
    expect(ex(keys(initialBasic(), '2p'))).toBe('2×π');
    expect(evaluate(fn(keys(initialBasic(), '2'), 'sqrt').toks.concat(keys(initialBasic(), '9').toks), 'deg')).toBe(6);
  });

  test('brackets left open close themselves at =', () => {
    expect(answer('(2+3×(4=')).toBe('14');
    expect(equalsBasic(keys(initialBasic(), '(2+3')).entry?.expr).toBe('(2+3)');
  });

  test('a sum left on an operator is worked as far as it goes', () => {
    expect(answer('7+=')).toBe('7');
  });
});

describe('percent works the way the phone does it', () => {
  test.each([
    ['200+10%=', '220'],
    ['200−10%=', '180'],
    ['200×10%=', '20'],
    ['50%=', '0.5'],
    ['80÷50%=', '160'],
    ['(100+10%(×2=', '220'],
  ])('%s gives %s', (seq, want) => expect(answer(seq)).toBe(want));
});

describe('scientific keys', () => {
  const sci = (f: Fn, x: string, angle: 'deg' | 'rad' = 'deg') => {
    const s = keys(fn(initialBasic(angle), f), x);
    const r = equalsBasic(s).state;
    return r.error ?? exprText(r.toks);
  };
  test('trig in degrees comes out clean at the angles a fitter uses', () => {
    expect(sci('sin', '30')).toBe('0.5');
    expect(sci('cos', '60')).toBe('0.5');
    expect(sci('tan', '45')).toBe('1');
    expect(sci('sin', '180')).toBe('0');
    expect(sci('cos', '90')).toBe('0');
    expect(sci('tan', '22.5')).toBe('0.414213562373095');
    expect(sci('tan', '90')).toBe('Invalid input.');
    expect(sci('asin', '0.5')).toBe('30');
    expect(sci('atan', '1')).toBe('45');
  });
  test('and in radians when switched', () => {
    expect(sci('sin', 'p', 'rad')).toBe('0');
    expect(sci('atan', '1', 'rad')).toBe('0.785398163397448');
    expect(pressBasic(initialBasic('deg'), { t: 'angle' }).angle).toBe('rad');
  });
  test('logs, roots, powers', () => {
    expect(sci('log', '1000')).toBe('3');
    expect(sci('ln', 'E')).toBe('1');
    expect(sci('sqrt', '144')).toBe('12');
    expect(sci('cbrt', '-27')).toBe('−3');
    expect(sci('exp', '0')).toBe('1');
    expect(sci('pow10', '3')).toBe('1,000');
    expect(sci('abs', '-5')).toBe('5');
  });
  test('a function pressed on an answer takes the answer', () => {
    const s = fn(keys(initialBasic(), '15+15='), 'sin');
    expect(exprText(s.toks)).toBe('sin(30)');
    expect(exprText(equalsBasic(s).state.toks)).toBe('0.5');
  });
  test('2nd swaps the keys and says so', () => expect(pressBasic(initialBasic(), { t: 'second' }).second).toBe(true));
});

describe('what cannot be worked says why, and keeps the sum', () => {
  test.each([
    ['5÷0=', "Can't divide by 0."],
    ['0\'=', "Can't divide by 0."],
    ['3.5!=', 'Invalid input.'],
    ['171!=', 'Value too large.'],
    ['((=', 'Invalid format used.'],
  ])('%s says %s', (seq, why) => expect(answer(seq)).toBe(why));
  test('square root and logs of what they cannot take', () => {
    expect(equalsBasic(keys(fn(initialBasic(), 'sqrt'), '-4')).state.error).toBe('Invalid input.');
    expect(equalsBasic(keys(fn(initialBasic(), 'log'), '0')).state.error).toBe('Invalid input.');
  });
  test('the sum stays on the display, and the next key clears the message', () => {
    const s = keys(initialBasic(), '5÷0=');
    expect(exprText(s.toks)).toBe('5÷0');
    expect(pressBasic(s, { t: 'back' }).error).toBeNull();
  });
});

describe('the keys behave as the phone keys do', () => {
  test('a second operator replaces the first; a minus after a power is its sign', () => {
    expect(ex(keys(initialBasic(), '5+×'))).toBe('5×');
    expect(ex(keys(initialBasic(), '2^-'))).toBe('2^−');
    expect(ex(keys(initialBasic(), '2^-+'))).toBe('2^−');
  });
  test('an operator cannot start a sum, except a minus', () => {
    expect(keys(initialBasic(), '+').toks).toEqual([]);
    expect(ex(keys(initialBasic(), '-5'))).toBe('−5');
    expect(ex(keys(initialBasic(), '(-×'))).toBe('(−');
  });
  test('no leading zeros, one point per number', () => {
    expect(ex(keys(initialBasic(), '007'))).toBe('7');
    expect(ex(keys(initialBasic(), '1.2.3'))).toBe('1.23');
    expect(ex(keys(initialBasic(), '.5'))).toBe('0.5');
    expect(ex(keys(initialBasic(), '2+.'))).toBe('2+0.');
  });
  test(`a number takes ${MAX_DIGITS} digits`, () => expect(ex(keys(initialBasic(), '1'.repeat(20))).replace(/,/g, '')).toBe('1'.repeat(MAX_DIGITS)));
  test('the bracket key opens, then closes when there is something to close', () => {
    expect(ex(keys(initialBasic(), '(2+3(4'))).toBe('(2+3)×4');
    expect(ex(keys(initialBasic(), '((2+3(('))).toBe('((2+3))');
    expect(ex(keys(initialBasic(), '2×((3'))).toBe('2×((3');
    expect(ex(keys(initialBasic(), '((('))).toBe('(((');
  });
  test('+/- wraps the number in a negative and takes it off again', () => {
    expect(ex(keys(initialBasic(), '5×3~'))).toBe('5×(−3');
    expect(ex(keys(initialBasic(), '5×3~~'))).toBe('5×3');
    expect(answer('5×3~=')).toBe('−15');
    expect(ex(keys(initialBasic(), '5×3~=~'))).toBe('15');
    expect(ex(keys(initialBasic(), '~'))).toBe('(−');
  });
  test('backspace takes back exactly what the last key put there', () => {
    expect(ex(keys(initialBasic(), '123<'))).toBe('12');
    expect(ex(keys(initialBasic(), '12+<'))).toBe('12');
    expect(ex(keys(fn(keys(initialBasic(), '2+'), 'sin'), '<'))).toBe('2+');
    expect(ex(keys(initialBasic(), '5<<'))).toBe('');
  });
  test('after =, a digit starts afresh and an operator carries the answer on', () => {
    expect(ex(keys(initialBasic(), '2+3=7'))).toBe('7');
    expect(ex(keys(initialBasic(), '2+3=×2'))).toBe('5×2');
    expect(answer('2+3=×2=')).toBe('10');
    expect(answer('3−8=+1=')).toBe('−4');
    expect(ex(keys(initialBasic(), '2+3=²'))).toBe('5²');
  });
  test('= on a number on its own does nothing and records nothing', () => {
    const s = keys(initialBasic(), '42');
    expect(isSum(s.toks)).toBe(false);
    expect(equalsBasic(s).entry).toBeNull();
    expect(equalsBasic(keys(initialBasic(), '-42')).entry).toBeNull();
  });
  test('C clears everything', () => expect(keys(initialBasic(), '2+3C').toks).toEqual([]));
});

describe('the answer as the sum is typed', () => {
  test('shows once there is a sum, and not while an operator waits', () => {
    expect(previewBasic(keys(initialBasic(), '12'))).toBeNull();
    expect(previewBasic(keys(initialBasic(), '12+3'))).toBe('15');
    expect(previewBasic(keys(initialBasic(), '12+3×'))).toBeNull();
    expect(previewBasic(keys(initialBasic(), '(1+2'))).toBe('3');
    expect(previewBasic(keys(initialBasic(), '5÷0'))).toBeNull();
    expect(previewBasic(keys(initialBasic(), '2+3='))).toBeNull();
  });
});

describe('reading the figures', () => {
  test('commas on the whole part, a true minus, an exponent past fifteen figures', () => {
    expect(formatNumber(1234567.891)).toBe('1,234,567.891');
    expect(formatNumber(-0.5)).toBe('−0.5');
    expect(formatNumber(-0)).toBe('0');
    expect(formatNumber(2 ** 60)).toBe('1.152921505E+18');
    expect(formatNumber(1.5e-7)).toBe('1.5E-7');
    expect(ex(keys(initialBasic(), '1234.50'))).toBe('1,234.50');
  });
});

describe('the history', () => {
  test('= records the sum and its answer, newest first, to a limit', () => {
    const r = equalsBasic(keys(initialBasic(), '1200×1.08'));
    expect(r.entry).toEqual({ expr: '1,200×1.08', result: '1,296', value: 1296 });
    let h: HistoryEntry[] = [];
    for (let k = 0; k < MAX_HISTORY + 5; k++) h = remember(h, { expr: `${k}+0`, result: String(k), value: k });
    expect(h).toHaveLength(MAX_HISTORY);
    expect(h[0]!.value).toBe(MAX_HISTORY + 4);
  });
  test('an answer from the history goes into the sum as a figure', () => {
    expect(ex(pressBasic(keys(initialBasic(), '10+'), { t: 'insert', value: 1296 }))).toBe('10+1,296');
    expect(ex(pressBasic(keys(initialBasic(), '10−'), { t: 'insert', value: -4 }))).toBe('10−(−4)');
    expect(ex(pressBasic(keys(initialBasic(), '10'), { t: 'insert', value: 3 }))).toBe('10×3');
    expect(ex(pressBasic(initialBasic(), { t: 'insert', value: -4 }))).toBe('−4');
  });
});
