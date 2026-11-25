// A formula, typed by anyone
// --------------------------
// The orbital section lets any fitter write an equation: "pi * OD * RPM",
// "(Ip * tp + Ib * tb) / (tp + tb)". This reads one and works it out, and
// nothing more: it is a small arithmetic reader, never the phone's own code
// runner, so a formula can only ever produce a number or say why it cannot.
//
// What it reads: numbers, names (OD, Ip, gap), + - * / ^, brackets, pi, and a
// short list of functions (sqrt, abs, min, max, round, floor, ceil, sin, cos,
// tan, asin, acos, atan, log, ln). Angles are degrees, as on the job. Names
// are matched without regard to case, so "od" and "OD" are the same box.
// × ÷ · and the long minus a phone's keyboard may give are read as * / * -.
//
// ^ binds tightest and to the right, and a leading minus is weaker than it:
// -2^2 is -4 and 2^3^2 is 512, as on a scientific calculator.

export const MAX_FORMULA = 240;
const MAX_DEPTH = 40;

export type Node =
  | { k: 'num'; v: number }
  | { k: 'var'; name: string }
  | { k: 'neg'; a: Node }
  | { k: 'bin'; op: '+' | '-' | '*' | '/' | '^'; a: Node; b: Node }
  | { k: 'call'; fn: string; args: Node[] };

const DEG = Math.PI / 180;

type Fn = { min: number; max: number; f: (...x: number[]) => number };
export const FUNCTIONS: Readonly<Record<string, Fn>> = {
  sqrt: { min: 1, max: 1, f: Math.sqrt },
  abs: { min: 1, max: 1, f: Math.abs },
  min: { min: 2, max: 8, f: Math.min },
  max: { min: 2, max: 8, f: Math.max },
  round: { min: 1, max: 2, f: (x, places = 0) => Math.round(x * 10 ** places) / 10 ** places },
  floor: { min: 1, max: 1, f: Math.floor },
  ceil: { min: 1, max: 1, f: Math.ceil },
  sin: { min: 1, max: 1, f: (d) => Math.sin(d * DEG) },
  cos: { min: 1, max: 1, f: (d) => Math.cos(d * DEG) },
  tan: { min: 1, max: 1, f: (d) => Math.tan(d * DEG) },
  asin: { min: 1, max: 1, f: (x) => Math.asin(x) / DEG },
  acos: { min: 1, max: 1, f: (x) => Math.acos(x) / DEG },
  atan: { min: 1, max: 1, f: (x) => Math.atan(x) / DEG },
  log: { min: 1, max: 1, f: Math.log10 },
  ln: { min: 1, max: 1, f: Math.log },
};

/** Names a formula may use without their being an input. */
export const CONSTANTS: Readonly<Record<string, number>> = { pi: Math.PI };

// Own keys only: a name like "constructor" or "toString" is an ordinary box,
// never something the phone's objects carry.
const own = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);
const fnOf = (k: string): Fn | undefined => (own(FUNCTIONS, k) ? FUNCTIONS[k] : undefined);

/** A name a formula can give its own answer or an input: letters first, then letters, digits or _. */
export const NAME = /^[A-Za-z][A-Za-z0-9_]{0,15}$/;
/** Whether a name is taken by a function or a constant, and so cannot be a box. */
export const reservedName = (name: string): boolean => own(FUNCTIONS, name.toLowerCase()) || own(CONSTANTS, name.toLowerCase());
/** The one spelling a name is matched by. */
export const nameKey = (name: string): string => name.toLowerCase();

export type Parsed = { ok: true; node: Node; vars: string[] } | { ok: false; why: string; at: number };

type Tok = { t: 'num'; v: number; at: number } | { t: 'name'; v: string; at: number } | { t: 'op'; v: string; at: number } | { t: 'end'; at: number };

function tokens(src: string): Tok[] | { why: string; at: number } {
  const s = src.replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/π/g, 'pi');
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    const num = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
    if (num) {
      out.push({ t: 'num', v: Number(num[1]), at: i });
      i += num[1]!.length;
      continue;
    }
    const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i));
    if (name) {
      out.push({ t: 'name', v: name[0], at: i });
      i += name[0].length;
      continue;
    }
    if ('+-*/^(),'.includes(c)) {
      out.push({ t: 'op', v: c, at: i });
      i += 1;
      continue;
    }
    return { why: `"${c}" is not something a formula can hold. Use numbers, names, + - * / ^ and brackets.`, at: i };
  }
  out.push({ t: 'end', at: s.length });
  return out;
}

/** Read a formula: its shape, and the names it needs a value for, in the order they first appear. */
export function parseFormula(src: string): Parsed {
  if (!src.trim()) return { ok: false, why: 'Type the formula: pi * OD * RPM.', at: 0 };
  if (src.length > MAX_FORMULA) return { ok: false, why: `A formula is ${MAX_FORMULA} characters at most.`, at: MAX_FORMULA };
  const toks = tokens(src);
  if (!Array.isArray(toks)) return { ok: false, ...toks };
  let p = 0;
  const vars = new Map<string, string>();
  const peek = () => toks[p]!;
  const isOp = (v: string) => peek().t === 'op' && (peek() as { v: string }).v === v;
  class Stop extends Error {
    constructor(
      public why: string,
      public at: number,
    ) {
      super(why);
    }
  }
  const missing = (after: string) => {
    const tk = peek();
    if (tk.t === 'end') throw new Stop(`Something is missing after ${after}.`, tk.at);
    throw new Stop(`"${tk.t === 'num' || tk.t === 'name' || tk.t === 'op' ? tk.v : ''}" cannot go there.`, tk.at);
  };

  const expr = (depth: number): Node => {
    if (depth > MAX_DEPTH) throw new Stop('The formula is nested too deep.', peek().at);
    let a = term(depth);
    while (isOp('+') || isOp('-')) {
      const op = (toks[p++] as { v: string }).v as '+' | '-';
      a = { k: 'bin', op, a, b: term(depth) };
    }
    return a;
  };
  const term = (depth: number): Node => {
    let a = unary(depth);
    while (isOp('*') || isOp('/')) {
      const op = (toks[p++] as { v: string }).v as '*' | '/';
      a = { k: 'bin', op, a, b: unary(depth) };
    }
    return a;
  };
  const unary = (depth: number): Node => {
    if (depth > MAX_DEPTH) throw new Stop('The formula is nested too deep.', peek().at);
    if (isOp('-')) {
      p += 1;
      return { k: 'neg', a: unary(depth + 1) };
    }
    if (isOp('+')) {
      p += 1;
      return unary(depth + 1);
    }
    return power(depth);
  };
  const power = (depth: number): Node => {
    const base = primary(depth);
    if (isOp('^')) {
      p += 1;
      return { k: 'bin', op: '^', a: base, b: unary(depth + 1) };
    }
    return base;
  };
  const primary = (depth: number): Node => {
    const tk = peek();
    let node: Node;
    if (tk.t === 'num') {
      p += 1;
      node = { k: 'num', v: tk.v };
    } else if (tk.t === 'name') {
      p += 1;
      const key = nameKey(tk.v);
      if (isOp('(')) {
        const fn = fnOf(key);
        if (!fn) throw new Stop(`There is no function called ${tk.v}. The functions are ${Object.keys(FUNCTIONS).join(', ')}.`, tk.at);
        p += 1;
        const args: Node[] = [];
        if (!isOp(')')) {
          args.push(expr(depth + 1));
          while (isOp(',')) {
            p += 1;
            args.push(expr(depth + 1));
          }
        }
        if (!isOp(')')) throw new Stop(`The ( after ${tk.v} is not closed.`, peek().at);
        p += 1;
        if (args.length < fn.min || args.length > fn.max)
          throw new Stop(fn.min === fn.max ? `${key} takes ${fn.min} value${fn.min === 1 ? '' : 's'}.` : `${key} takes ${fn.min} to ${fn.max} values.`, tk.at);
        node = { k: 'call', fn: key, args };
      } else if (fnOf(key)) {
        throw new Stop(`${tk.v} is a function: give it its value in brackets, ${key}(x).`, tk.at);
      } else if (own(CONSTANTS, key)) {
        node = { k: 'num', v: CONSTANTS[key]! };
      } else {
        if (!vars.has(key)) vars.set(key, tk.v);
        node = { k: 'var', name: key };
      }
    } else if (isOp('(')) {
      p += 1;
      node = expr(depth + 1);
      if (!isOp(')')) throw new Stop('A ( is not closed.', peek().at);
      p += 1;
    } else if (tk.t === 'end') {
      throw new Stop(p === 0 ? 'Type the formula: pi * OD * RPM.' : 'The formula stops short: something is missing at the end.', tk.at);
    } else {
      throw new Stop(`"${tk.v}" cannot go there.`, tk.at);
    }
    // A number or a name straight after another: 2 OD, OD RPM, (a)(b).
    const next = peek();
    if (next.t === 'num' || next.t === 'name' || (next.t === 'op' && next.v === '(')) {
      throw new Stop(`Put an operator between them: * to multiply.`, next.at);
    }
    return node;
  };

  try {
    const node = expr(0);
    if (peek().t !== 'end') {
      const tk = peek() as { v: string; at: number };
      if (tk.v === ')') throw new Stop('There is a ) with no ( to close.', tk.at);
      missing('that');
    }
    return { ok: true, node, vars: [...vars.values()] };
  } catch (e) {
    if (e instanceof Stop) return { ok: false, why: e.why, at: e.at };
    throw e;
  }
}

export type Worked = { ok: true; value: number } | { ok: false; why: string };

/** Work a read formula out with the values given, by name in any case. */
export function evaluate(node: Node, values: Readonly<Record<string, number | null | undefined>>): Worked {
  const scope = new Map<string, number | null | undefined>();
  for (const [k, v] of Object.entries(values)) scope.set(nameKey(k), v);
  const missing: string[] = [];
  const run = (n: Node): number => {
    switch (n.k) {
      case 'num':
        return n.v;
      case 'var': {
        const v = scope.get(n.name);
        if (typeof v !== 'number' || !Number.isFinite(v)) {
          if (!missing.includes(n.name)) missing.push(n.name);
          return NaN;
        }
        return v;
      }
      case 'neg':
        return -run(n.a);
      case 'bin': {
        const a = run(n.a);
        const b = run(n.b);
        if (n.op === '+') return a + b;
        if (n.op === '-') return a - b;
        if (n.op === '*') return a * b;
        if (n.op === '/') return a / b;
        return a ** b;
      }
      case 'call':
        return fnOf(n.fn)!.f(...n.args.map(run));
    }
  };
  const v = run(node);
  if (missing.length) return { ok: false, why: `${missing.join(', ')} ${missing.length === 1 ? 'has' : 'have'} no value.` };
  if (!Number.isFinite(v)) return { ok: false, why: 'The answer is not a number: a divide by zero, or the root of a negative.' };
  return { ok: true, value: Object.is(v, -0) ? 0 : v };
}

/** Read and work out in one: for a test with sample values. */
export function workOut(src: string, values: Readonly<Record<string, number | null | undefined>>): Worked {
  const p = parseFormula(src);
  if (!p.ok) return { ok: false, why: p.why };
  return evaluate(p.node, values);
}
