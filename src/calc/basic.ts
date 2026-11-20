// The phone calculator
// --------------------
// The everyday calculator a man has on his phone, beside the trade one: type
// the sum as it reads, see the answer under it as it is typed, press = to keep
// it. Scientific keys on demand, degrees by default (a fitter's angles are in
// degrees), and a history of what was worked.
//
// It is an expression, not a stack. What is on the display is a list of
// tokens, so backspace takes back exactly what the last key put there, and
// the sum is parsed here by precedence: 2+3×4 is 14, -2² is -4, 2^3^2 is 512.
// Nothing is ever handed to eval.
//
// Two habits of the phone calculators are kept on purpose. A percentage after
// + or - is a percentage of what it is added to, so 200+10% is 220 and the
// price-plus-tax sum works; anywhere else 10% is 0.1. And a number typed
// against a bracket, a constant or a function multiplies: 2π, 3(4+1), 2sin(30).
//
// Answers are cleaned to fifteen significant figures, so 0.1+0.2 is 0.3 and
// sin(30°) is 0.5; the floating-point dust past that is not a figure anyone
// cut a pipe to.

export type AngleMode = 'deg' | 'rad';

export type Fn = 'sin' | 'cos' | 'tan' | 'asin' | 'acos' | 'atan' | 'ln' | 'log' | 'sqrt' | 'cbrt' | 'abs' | 'exp' | 'pow10';
export type BinOp = '+' | '−' | '×' | '÷' | '^';
export type Postfix = '%' | '!' | '²' | '³' | '⁻¹';
export type Const = 'π' | 'e';

export type Tok =
  | { k: 'num'; s: string }
  | { k: 'op'; s: BinOp }
  | { k: 'open' }
  | { k: 'close' }
  | { k: 'fn'; s: Fn }
  | { k: 'const'; s: Const }
  | { k: 'post'; s: Postfix };

export const FN_TEXT: Record<Fn, string> = {
  sin: 'sin(',
  cos: 'cos(',
  tan: 'tan(',
  asin: 'sin⁻¹(',
  acos: 'cos⁻¹(',
  atan: 'tan⁻¹(',
  ln: 'ln(',
  log: 'log(',
  sqrt: '√(',
  cbrt: '∛(',
  abs: 'abs(',
  exp: 'e^(',
  pow10: '10^(',
};

export type BasicState = {
  toks: Tok[];
  /** An answer is on the display: a digit starts a new sum, an operator carries it on. */
  done: boolean;
  angle: AngleMode;
  /** The scientific keys' second functions are showing. */
  second: boolean;
  /** Why the last = gave no answer. Cleared by the next key. */
  error: string | null;
};

export const initialBasic = (angle: AngleMode = 'deg'): BasicState => ({ toks: [], done: false, angle, second: false, error: null });

export type BasicKey =
  | { t: 'digit'; d: string }
  | { t: 'dot' }
  | { t: 'op'; op: BinOp }
  | { t: 'paren' }
  | { t: 'post'; p: Postfix }
  | { t: 'sign' }
  | { t: 'back' }
  | { t: 'clear' }
  | { t: 'fn'; fn: Fn }
  | { t: 'const'; c: Const }
  | { t: 'second' }
  | { t: 'angle' }
  /** A figure from the history, put into the sum as a number. */
  | { t: 'insert'; value: number };

export type HistoryEntry = { expr: string; result: string; value: number };

/** The most digits one number takes, as the phone calculators allow. */
export const MAX_DIGITS = 15;

export class CalcError extends Error {}
export const DIVIDE_BY_ZERO = "Can't divide by 0.";
export const INVALID = 'Invalid input.';
export const BAD_FORMAT = 'Invalid format used.';
export const TOO_LARGE = 'Value too large.';

// ------------------------------------------------------------ keys

const last = (toks: readonly Tok[]): Tok | undefined => toks[toks.length - 1];

/** The sum so far ends in something a number can follow only by multiplying. */
const endsOperand = (toks: readonly Tok[]): boolean => {
  const l = last(toks);
  return !!l && (l.k === 'num' || l.k === 'const' || l.k === 'close' || l.k === 'post');
};

const openCount = (toks: readonly Tok[]): number => toks.reduce((n, x) => n + (x.k === 'open' || x.k === 'fn' ? 1 : x.k === 'close' ? -1 : 0), 0);

const digitCount = (s: string): number => s.replace(/[^0-9]/g, '').length;

/** An answer as tokens: a negative one leads with a minus the next key can carry on from. */
export function numberTokens(v: number): Tok[] {
  const s = plain(Math.abs(v));
  return v < 0 ? [{ k: 'op', s: '−' }, { k: 'num', s }] : [{ k: 'num', s }];
}

/** A figure put into a sum: a negative one goes in brackets so it cannot read as a subtraction. */
function figureTokens(v: number): Tok[] {
  const s = plain(Math.abs(v));
  return v < 0 ? [{ k: 'open' }, { k: 'op', s: '−' }, { k: 'num', s }, { k: 'close' }] : [{ k: 'num', s }];
}

export function pressBasic(state: BasicState, key: BasicKey): BasicState {
  const s: BasicState = { ...state, error: null };
  let toks = s.toks;

  switch (key.t) {
    case 'second':
      return { ...s, second: !s.second };
    case 'angle':
      return { ...s, angle: s.angle === 'deg' ? 'rad' : 'deg' };
    case 'clear':
      return { ...s, toks: [], done: false };
    case 'back': {
      if (!toks.length) return { ...s, done: false };
      const l = last(toks)!;
      if (l.k === 'num' && l.s.length > 1 && !/E/i.test(l.s)) return { ...s, done: false, toks: [...toks.slice(0, -1), { k: 'num', s: l.s.slice(0, -1) }] };
      return { ...s, done: false, toks: toks.slice(0, -1) };
    }
    case 'digit': {
      if (s.done) toks = [];
      const l = last(toks);
      if (l?.k === 'num' && !/E/i.test(l.s)) {
        if (digitCount(l.s) >= MAX_DIGITS) return { ...s, done: false, toks };
        const next = l.s === '0' ? key.d : l.s + key.d;
        return { ...s, done: false, toks: [...toks.slice(0, -1), { k: 'num', s: next }] };
      }
      const lead: Tok[] = endsOperand(toks) ? [{ k: 'op', s: '×' }] : [];
      return { ...s, done: false, toks: [...toks, ...lead, { k: 'num', s: key.d }] };
    }
    case 'dot': {
      if (s.done) toks = [];
      const l = last(toks);
      if (l?.k === 'num') {
        if (l.s.includes('.') || /E/i.test(l.s)) return { ...s, done: false, toks };
        return { ...s, done: false, toks: [...toks.slice(0, -1), { k: 'num', s: `${l.s}.` }] };
      }
      const lead: Tok[] = endsOperand(toks) ? [{ k: 'op', s: '×' }] : [];
      return { ...s, done: false, toks: [...toks, ...lead, { k: 'num', s: '0.' }] };
    }
    case 'op': {
      const l = last(toks);
      const unaryPlace = !l || l.k === 'open' || l.k === 'fn';
      if (unaryPlace) return key.op === '−' ? { ...s, done: false, toks: [...toks, { k: 'op', s: '−' }] } : { ...s, done: false };
      if (l.k === 'op') {
        // A minus after a power is the exponent's sign: 2^-1 is a half.
        if (l.s === '^' && key.op === '−') return { ...s, done: false, toks: [...toks, { k: 'op', s: '−' }] };
        // A second operator replaces the first, unless the first was a lone minus with nothing to take the place of.
        const before = toks[toks.length - 2];
        if (before?.k === 'op') return { ...s, done: false };
        if (!before || before.k === 'open' || before.k === 'fn') return { ...s, done: false };
        return { ...s, done: false, toks: [...toks.slice(0, -1), { k: 'op', s: key.op }] };
      }
      return { ...s, done: false, toks: [...toks, { k: 'op', s: key.op }] };
    }
    case 'paren': {
      if (openCount(toks) > 0 && endsOperand(toks)) return { ...s, done: false, toks: [...toks, { k: 'close' }] };
      const lead: Tok[] = endsOperand(toks) ? [{ k: 'op', s: '×' }] : [];
      return { ...s, done: false, toks: [...toks, ...lead, { k: 'open' }] };
    }
    case 'post': {
      if (!endsOperand(toks)) return { ...s, done: false };
      return { ...s, done: false, toks: [...toks, { k: 'post', s: key.p }] };
    }
    case 'sign': {
      const i = toks.length - 1;
      const l = toks[i];
      if (l && (l.k === 'num' || l.k === 'const')) {
        const a = toks[i - 1];
        const b = toks[i - 2];
        if (a?.k === 'op' && a.s === '−' && b?.k === 'open') return { ...s, done: false, toks: [...toks.slice(0, i - 2), l] };
        // A lone answer that is negative loses its minus.
        if (a?.k === 'op' && a.s === '−' && i === 1) return { ...s, done: false, toks: [l] };
        return { ...s, done: false, toks: [...toks.slice(0, i), { k: 'open' }, { k: 'op', s: '−' }, l] };
      }
      const lead: Tok[] = endsOperand(toks) ? [{ k: 'op', s: '×' }] : [];
      return { ...s, done: false, toks: [...toks, ...lead, { k: 'open' }, { k: 'op', s: '−' }] };
    }
    case 'fn': {
      // After an answer the function takes the answer: sin pressed on 30 is sin(30).
      if (s.done && toks.length) return { ...s, done: false, toks: [{ k: 'fn', s: key.fn }, ...toks, { k: 'close' }] };
      const lead: Tok[] = endsOperand(toks) ? [{ k: 'op', s: '×' }] : [];
      return { ...s, done: false, toks: [...toks, ...lead, { k: 'fn', s: key.fn }] };
    }
    case 'const': {
      if (s.done) toks = [];
      const lead: Tok[] = endsOperand(toks) ? [{ k: 'op', s: '×' }] : [];
      return { ...s, done: false, toks: [...toks, ...lead, { k: 'const', s: key.c }] };
    }
    case 'insert': {
      if (!Number.isFinite(key.value)) return s;
      if (s.done) toks = [];
      const lead: Tok[] = endsOperand(toks) ? [{ k: 'op', s: '×' }] : [];
      return { ...s, done: false, toks: [...toks, ...lead, ...(toks.length || lead.length ? figureTokens(key.value) : numberTokens(key.value))] };
    }
  }
}

/** Has anything to work out, beyond a number standing on its own. */
export const isSum = (toks: readonly Tok[]): boolean => toks.some((x) => x.k !== 'num') && !(toks.length === 2 && toks[0]!.k === 'op' && toks[1]!.k === 'num');

/**
 * Press =. With an answer, the sum goes to the history and the answer takes
 * its place; without one, the sum stays and the reason is shown.
 */
export function equalsBasic(state: BasicState): { state: BasicState; entry: HistoryEntry | null } {
  const s = { ...state, error: null };
  if (!s.toks.length || !isSum(s.toks)) return { state: s, entry: null };
  try {
    const value = evaluate(s.toks, s.angle);
    const entry: HistoryEntry = { expr: exprText(closeAll(s.toks)), result: formatNumber(value), value };
    return { state: { ...s, toks: numberTokens(value), done: true }, entry };
  } catch (e) {
    return { state: { ...s, error: e instanceof CalcError ? e.message : BAD_FORMAT }, entry: null };
  }
}

/** The answer as it stands, shown under the sum while it is typed; nothing while it does not work out. */
export function previewBasic(state: BasicState): string | null {
  if (state.done || state.error || !isSum(state.toks)) return null;
  // Nothing to show while the last key is still asking for what comes next.
  const l = last(state.toks)!;
  if (l.k === 'op' || l.k === 'open' || l.k === 'fn') return null;
  try {
    return formatNumber(evaluate(state.toks, state.angle));
  } catch {
    return null;
  }
}

/** The sum with its open brackets closed, the way it was worked. */
export function closeAll(toks: readonly Tok[]): Tok[] {
  const n = openCount(toks);
  return n > 0 ? [...toks, ...Array.from({ length: n }, (): Tok => ({ k: 'close' }))] : [...toks];
}

// ------------------------------------------------------------ working it out

/** Fifteen significant figures: the float dust goes, every figure a man reads stays. */
export const clean = (v: number): number => (v === 0 ? 0 : Number(v.toPrecision(15)));

const isMultiple = (x: number, of: number): boolean => Math.abs(x / of - Math.round(x / of)) < 1e-12;

export function evaluate(input: readonly Tok[], angle: AngleMode): number {
  // A sum left on an operator is worked as far as it goes; a bracket left open closes at the end.
  let toks = [...input];
  while (toks.length && last(toks)!.k === 'op') toks = toks.slice(0, -1);
  if (!toks.length) throw new CalcError(BAD_FORMAT);

  let i = 0;
  const peek = () => toks[i];

  const trig = (fn: 'sin' | 'cos' | 'tan', x: number): number => {
    if (angle === 'deg') {
      if (fn === 'sin' && isMultiple(x, 180)) return 0;
      if (fn === 'cos' && isMultiple(x - 90, 180)) return 0;
      if (fn === 'tan' && isMultiple(x, 180)) return 0;
      if (fn === 'tan' && isMultiple(x - 90, 180)) throw new CalcError(INVALID);
    }
    const r = angle === 'deg' ? (x * Math.PI) / 180 : x;
    const v = fn === 'sin' ? Math.sin(r) : fn === 'cos' ? Math.cos(r) : Math.tan(r);
    return Math.abs(v) < 1e-14 ? 0 : clean(v);
  };
  const fromRad = (r: number): number => (angle === 'deg' ? (r * 180) / Math.PI : r);

  const apply = (fn: Fn, x: number): number => {
    switch (fn) {
      case 'sin':
      case 'cos':
      case 'tan':
        return trig(fn, x);
      case 'asin':
      case 'acos':
        if (x < -1 || x > 1) throw new CalcError(INVALID);
        return fromRad(fn === 'asin' ? Math.asin(x) : Math.acos(x));
      case 'atan':
        return fromRad(Math.atan(x));
      case 'ln':
        if (x <= 0) throw new CalcError(INVALID);
        return Math.log(x);
      case 'log':
        if (x <= 0) throw new CalcError(INVALID);
        return Math.log10(x);
      case 'sqrt':
        if (x < 0) throw new CalcError(INVALID);
        return Math.sqrt(x);
      case 'cbrt':
        return Math.cbrt(x);
      case 'abs':
        return Math.abs(x);
      case 'exp':
        return Math.exp(x);
      case 'pow10':
        return 10 ** x;
    }
  };

  const factorial = (x: number): number => {
    if (x < 0 || !Number.isInteger(x)) throw new CalcError(INVALID);
    if (x > 170) throw new CalcError(TOO_LARGE);
    let f = 1;
    for (let k = 2; k <= x; k++) f *= k;
    return f;
  };

  const pow = (a: number, b: number): number => {
    const v = a ** b;
    if (Number.isNaN(v)) throw new CalcError(INVALID);
    return v;
  };

  /** A closing bracket, or the end of the sum standing in for one. */
  const closeOrEnd = () => {
    const t = peek();
    if (t?.k === 'close') i++;
    else if (t) throw new CalcError(BAD_FORMAT);
  };

  type Val = { v: number; pct: boolean };

  const primary = (): number => {
    const t = peek();
    if (!t) throw new CalcError(BAD_FORMAT);
    i++;
    switch (t.k) {
      case 'num': {
        const v = Number(t.s);
        if (!Number.isFinite(v)) throw new CalcError(BAD_FORMAT);
        return v;
      }
      case 'const':
        return t.s === 'π' ? Math.PI : Math.E;
      case 'open': {
        if (!peek() || peek()!.k === 'close') throw new CalcError(BAD_FORMAT);
        const v = additive();
        closeOrEnd();
        return v;
      }
      case 'fn': {
        if (!peek() || peek()!.k === 'close') throw new CalcError(BAD_FORMAT);
        const v = additive();
        closeOrEnd();
        return apply(t.s, v);
      }
      default:
        throw new CalcError(BAD_FORMAT);
    }
  };

  const postfix = (): Val => {
    let v = primary();
    let pct = false;
    while (peek()?.k === 'post') {
      const p = (peek() as { k: 'post'; s: Postfix }).s;
      i++;
      pct = p === '%';
      if (p === '%') v /= 100;
      else if (p === '!') v = factorial(v);
      else if (p === '²') v = v * v;
      else if (p === '³') v = v * v * v;
      else {
        if (v === 0) throw new CalcError(DIVIDE_BY_ZERO);
        v = 1 / v;
      }
    }
    return { v, pct };
  };

  // Right-associative, and above a leading minus: 2^3^2 is 2^9, -2^2 is -4, 2^-1 is a half.
  const power = (): Val => {
    const base = postfix();
    const t = peek();
    if (t?.k === 'op' && t.s === '^') {
      i++;
      return { v: pow(base.v, unary().v), pct: false };
    }
    return base;
  };

  const unary = (): Val => {
    const t = peek();
    if (t?.k === 'op' && (t.s === '−' || t.s === '+')) {
      i++;
      const r = unary();
      return { v: t.s === '−' ? -r.v : r.v, pct: r.pct };
    }
    return power();
  };

  const term = (): Val => {
    let left = unary();
    let factors = 1;
    for (;;) {
      const t = peek();
      if (t?.k !== 'op' || (t.s !== '×' && t.s !== '÷')) break;
      i++;
      const r = unary().v;
      factors++;
      if (t.s === '÷') {
        if (r === 0) throw new CalcError(DIVIDE_BY_ZERO);
        left = { v: left.v / r, pct: false };
      } else left = { v: left.v * r, pct: false };
    }
    return factors === 1 ? left : { v: left.v, pct: false };
  };

  // After + or -, a percentage is of what it is added to: 200+10% is 220.
  function additive(): number {
    let left = term().v;
    for (;;) {
      const t = peek();
      if (t?.k !== 'op' || (t.s !== '+' && t.s !== '−')) break;
      i++;
      const r = term();
      const v = r.pct ? left * r.v : r.v;
      left = t.s === '+' ? left + v : left - v;
    }
    return left;
  }

  const v = additive();
  if (i < toks.length) throw new CalcError(BAD_FORMAT);
  if (Number.isNaN(v)) throw new CalcError(INVALID);
  if (!Number.isFinite(v)) throw new CalcError(TOO_LARGE);
  return clean(v);
}

// ------------------------------------------------------------ reading it

/** A number as typed or stored, no grouping: 1234.5, 1.2E+20. */
export function plain(v: number): string {
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e15 || a < 1e-6) return exponent(v);
  return String(clean(v));
}

function exponent(v: number): string {
  const [m, e] = v.toExponential(9).split('e');
  const mant = m!.includes('.') ? m!.replace(/0+$/, '').replace(/\.$/, '') : m!;
  const n = Number(e);
  return `${mant}E${n < 0 ? '-' : '+'}${Math.abs(n)}`;
}

/** Thousands commas on the whole part, the rest as typed. */
export function group(s: string): string {
  if (/E/i.test(s)) return s;
  const [whole, frac] = s.split('.');
  const g = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac === undefined ? g : `${g}.${frac}`;
}

/** An answer as the display shows it: 1,234.5; 0.3; 1.23456789E+20. */
export function formatNumber(v: number): string {
  if (Object.is(v, -0) || v === 0) return '0';
  const s = plain(v);
  return v < 0 ? `−${group(s.replace('-', ''))}` : group(s);
}

const POST_TEXT: Record<Postfix, string> = { '%': '%', '!': '!', '²': '²', '³': '³', '⁻¹': '⁻¹' };

/** One token as the display shows it. */
export function tokText(t: Tok): string {
  switch (t.k) {
    case 'num':
      return group(t.s);
    case 'op':
      return t.s;
    case 'open':
      return '(';
    case 'close':
      return ')';
    case 'fn':
      return FN_TEXT[t.s];
    case 'const':
      return t.s;
    case 'post':
      return POST_TEXT[t.s];
  }
}

export const exprText = (toks: readonly Tok[]): string => toks.map(tokText).join('');

// ------------------------------------------------------------ the history

export const MAX_HISTORY = 50;

/** Newest first, the oldest dropped past the limit. */
export const remember = (history: readonly HistoryEntry[], entry: HistoryEntry): HistoryEntry[] => [entry, ...history].slice(0, MAX_HISTORY);
