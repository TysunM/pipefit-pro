// The calculator, by voice
// ------------------------
// A sum said the way a fitter says it, turned into the keys he would press:
// "12 and a half plus 3 foot 2", "10 foot minus 3 and a quarter", "350 mil
// plus 2 inches", "what's 2 to the power of 10", "square root of 144", "200
// plus 10 percent", "times 3" (carrying on from the answer), "clear". And a
// conversion: "convert 3 feet to millimetres", "how many psi in 10 bar".
//
// The keys go to the calculator's own engine (calc/engine.ts for the trade
// one, calc/basic.ts for the phone one), so a spoken sum is worked exactly as
// a typed one, and shows on the same display. Nothing here does arithmetic.
//
// A sentence with any word that is not a number, a unit, an operation or the
// words round a sum ("what's", "equals") is not a sum, and is left for the
// rest of the voice to hear.

import { numberAt, tokens } from './words';
import type { KeyAction } from '../calc/keys';
import type { BasicKey } from '../calc/basic';
import { CATEGORIES, convert, type ConvCategory, type ConvUnit } from '../calc/convert';

export type LenUnit = 'in' | 'ftin' | 'mm' | 'm';
export type Item =
  | { k: 'num'; value: number; unit: LenUnit | null; feet?: number; inches?: number }
  | { k: 'op'; op: '+' | '-' | '*' | '/' | '^' }
  | { k: 'fn'; fn: 'sqrt' | 'sin' | 'cos' | 'tan' }
  | { k: 'post'; p: 'sq' | 'cube' | 'pct' | 'recip' | 'fact' }
  | { k: 'open' }
  | { k: 'close' }
  | { k: 'pi' };

export type CalcSpeech =
  | { kind: 'sum'; items: Item[]; carry: boolean }
  | { kind: 'clear' }
  | { kind: 'back' }
  | { kind: 'equals' }
  | { kind: 'convert'; value: number; cat: ConvCategory; from: ConvUnit; to: ConvUnit };

const FOOT = new Set(['foot', 'feet', 'ft', 'foots']);
const INCH = new Set(['inch', 'inches', 'in', 'inchs']);
const MM = new Set(['mm', 'millimeter', 'millimeters', 'millimetre', 'millimetres', 'mil', 'mils', 'mill', 'mills']);
const CM = new Set(['cm', 'centimeter', 'centimeters', 'centimetre', 'centimetres']);
const METRE = new Set(['meter', 'meters', 'metre', 'metres']);

/** Words round a sum that say nothing about it. */
const LEAD = ['whats', 'what is', 'what', 'how much is', 'how much', 'calculate', 'work out', 'figure out', 'compute', 'tell me', 'give me', 'ok', 'okay', 'please', 'hey'];
const TAIL = ['equals', 'equal', 'is what', 'is', 'please', 'what', 'equal to', 'is equal to'];

/** Operations as said, longest first. */
const OPS: [string[], Item][] = [
  [['to', 'the', 'power', 'of'], { k: 'op', op: '^' }],
  [['raised', 'to', 'the'], { k: 'op', op: '^' }],
  [['raised', 'to'], { k: 'op', op: '^' }],
  [['to', 'the', 'power'], { k: 'op', op: '^' }],
  [['to', 'the'], { k: 'op', op: '^' }],
  [['multiplied', 'by'], { k: 'op', op: '*' }],
  [['divided', 'by'], { k: 'op', op: '/' }],
  [['divide', 'by'], { k: 'op', op: '/' }],
  [['times', 'by'], { k: 'op', op: '*' }],
  [['take', 'away'], { k: 'op', op: '-' }],
  [['plus'], { k: 'op', op: '+' }],
  [['add'], { k: 'op', op: '+' }],
  [['minus'], { k: 'op', op: '-' }],
  [['less'], { k: 'op', op: '-' }],
  [['subtract'], { k: 'op', op: '-' }],
  [['times'], { k: 'op', op: '*' }],
  [['x'], { k: 'op', op: '*' }],
  [['multiply'], { k: 'op', op: '*' }],
  [['over'], { k: 'op', op: '/' }],
  [['divide'], { k: 'op', op: '/' }],
  [['power'], { k: 'op', op: '^' }],
  [['the', 'square', 'root', 'of'], { k: 'fn', fn: 'sqrt' }],
  [['square', 'root', 'of'], { k: 'fn', fn: 'sqrt' }],
  [['square', 'root'], { k: 'fn', fn: 'sqrt' }],
  [['root', 'of'], { k: 'fn', fn: 'sqrt' }],
  [['the', 'sine', 'of'], { k: 'fn', fn: 'sin' }],
  [['sine', 'of'], { k: 'fn', fn: 'sin' }],
  [['sine'], { k: 'fn', fn: 'sin' }],
  [['sin'], { k: 'fn', fn: 'sin' }],
  [['the', 'cosine', 'of'], { k: 'fn', fn: 'cos' }],
  [['cosine', 'of'], { k: 'fn', fn: 'cos' }],
  [['cosine'], { k: 'fn', fn: 'cos' }],
  [['cos'], { k: 'fn', fn: 'cos' }],
  [['the', 'tangent', 'of'], { k: 'fn', fn: 'tan' }],
  [['tangent', 'of'], { k: 'fn', fn: 'tan' }],
  [['tangent'], { k: 'fn', fn: 'tan' }],
  [['tan'], { k: 'fn', fn: 'tan' }],
  [['squared'], { k: 'post', p: 'sq' }],
  [['cubed'], { k: 'post', p: 'cube' }],
  [['percent'], { k: 'post', p: 'pct' }],
  [['per', 'cent'], { k: 'post', p: 'pct' }],
  [['factorial'], { k: 'post', p: 'fact' }],
  [['open', 'bracket'], { k: 'open' }],
  [['open', 'brackets'], { k: 'open' }],
  [['open', 'parenthesis'], { k: 'open' }],
  [['open', 'paren'], { k: 'open' }],
  [['close', 'bracket'], { k: 'close' }],
  [['close', 'brackets'], { k: 'close' }],
  [['close', 'parenthesis'], { k: 'close' }],
  [['close', 'paren'], { k: 'close' }],
  [['pi'], { k: 'pi' }],
  [['pie'], { k: 'pi' }],
];

/** What the recogniser types as a symbol, said as a word, so the words below can read it. */
function wordsOf(said: string): string[] {
  const s = ` ${said} `
    .replace(/[×✕✖]|\*/g, ' times ')
    .replace(/÷/g, ' divided by ')
    .replace(/\+/g, ' plus ')
    .replace(/\s[−–-]\s/g, ' minus ')
    .replace(/(\d)\s*[−–]\s*(\d)/g, '$1 minus $2')
    .replace(/\s\/\s/g, ' divided by ')
    .replace(/=/g, ' equals ')
    .replace(/\^/g, ' to the power of ')
    .replace(/%/g, ' percent ')
    .replace(/\(/g, ' open bracket ')
    .replace(/\)/g, ' close bracket ')
    .replace(/['’](?=s\b)/g, '')
    .replace(/\b(?:an? )?inch and a half\b/gi, '1.5 inch')
    .replace(/\b(?:an? )?inch and a quarter\b/gi, '1.25 inch');
  return tokens(s);
}

const at = (ws: readonly string[], i: number, phrase: readonly string[]) => phrase.every((w, j) => ws[i + j] === w);

function strip(ws: string[]): string[] {
  let out = ws;
  for (let changed = true; changed; ) {
    changed = false;
    for (const l of LEAD) {
      const p = l.split(' ');
      if (out.length > p.length && at(out, 0, p)) {
        out = out.slice(p.length);
        changed = true;
      }
    }
    for (const t of TAIL) {
      const p = t.split(' ');
      if (out.length > p.length && at(out, out.length - p.length, p)) {
        out = out.slice(0, out.length - p.length);
        changed = true;
      }
    }
  }
  return out;
}

/** A figure and its unit at `i`: "12", "12 and a half", "3 foot 2", "3 foot 2 and 3/8", "350 mil", "2.5 metres". */
export function quantity(ws: readonly string[], i: number): { item: Extract<Item, { k: 'num' }>; next: number } | null {
  const a = numberAt(ws, i);
  if (!a) return null;
  let next = a.next;
  const u = ws[next] ?? '';
  if (FOOT.has(u)) {
    next += 1;
    const b = numberAt(ws, next);
    let inches = 0;
    if (b) {
      inches = b.value;
      next = b.next;
      if (INCH.has(ws[next] ?? '')) next += 1;
    }
    return { item: { k: 'num', value: a.value * 12 + inches, unit: 'ftin', feet: a.value, inches }, next };
  }
  if (INCH.has(u)) return { item: { k: 'num', value: a.value, unit: 'in', inches: a.value }, next: next + 1 };
  if (MM.has(u)) return { item: { k: 'num', value: a.value, unit: 'mm' }, next: next + 1 };
  if (CM.has(u)) return { item: { k: 'num', value: a.value * 10, unit: 'mm' }, next: next + 1 };
  if (METRE.has(u)) return { item: { k: 'num', value: a.value, unit: 'm' }, next: next + 1 };
  return { item: { k: 'num', value: a.value, unit: null }, next };
}

/** The items of a sum, or null at the first word that is not one. */
function items(ws: readonly string[]): Item[] | null {
  const out: Item[] = [];
  for (let i = 0; i < ws.length; ) {
    const q = quantity(ws, i);
    if (q) {
      // "Two by four": by between two figures is times.
      out.push(q.item);
      i = q.next;
      continue;
    }
    if ((ws[i] === 'by' || ws[i] === 'and') && out.length && out[out.length - 1]!.k === 'num' && numberAt(ws, i + 1)) {
      out.push({ k: 'op', op: ws[i] === 'by' ? '*' : '+' });
      i += 1;
      continue;
    }
    const hit = OPS.find(([p]) => at(ws, i, p));
    if (!hit) return null;
    out.push(hit[1]);
    i += hit[0].length;
  }
  return out;
}

/** "Add A and B", "subtract A from B", "multiply A by B", "divide A by B": the verb first, the way it is often said. */
function verbFirst(ws: readonly string[]): Item[] | null {
  const verb = ws[0];
  const split = (sep: string[]): [string[], string[]] | null => {
    for (let i = 1; i < ws.length; i++) if (sep.includes(ws[i]!)) return [ws.slice(1, i), ws.slice(i + 1)];
    return null;
  };
  const both = (pair: [string[], string[]] | null, op: Extract<Item, { k: 'op' }>['op'], swap = false): Item[] | null => {
    if (!pair) return null;
    const [a, b] = pair.map(items);
    if (!a?.length || !b?.length) return null;
    const wrap = (x: Item[]): Item[] => (x.length > 1 ? [{ k: 'open' }, ...x, { k: 'close' }] : x);
    return swap ? [...wrap(b), { k: 'op', op }, ...wrap(a)] : [...wrap(a), { k: 'op', op }, ...wrap(b)];
  };
  if (verb === 'add') return both(split(['and', 'to']), '+');
  if (verb === 'subtract' || verb === 'take') return both(split(['from']), '-', true);
  if (verb === 'multiply') return both(split(['by', 'and', 'times']), '*');
  if (verb === 'divide') return both(split(['by', 'into']), '/');
  return null;
}

/** A unit as said, for a conversion: its name, plural, symbol or id. */
function unitPhrases(): { cat: ConvCategory; unit: ConvUnit; words: string[] }[] {
  const out: { cat: ConvCategory; unit: ConvUnit; words: string[] }[] = [];
  const extra: Record<string, string[]> = {
    in: ['inches', 'inch', 'in'],
    ft: ['feet', 'foot', 'ft'],
    mm: ['mm', 'millimeters', 'millimetres', 'millimeter', 'millimetre', 'mil', 'mils'],
    mil: ['thou', 'thous'],
    lb: ['pounds', 'lbs', 'lb', 'pound'],
    kg: ['kilos', 'kilo', 'kilograms', 'kgs'],
    l: ['liters', 'litres', 'liter', 'litre'],
    gal: ['gallons', 'gallon', 'us gallons'],
    c: ['degrees celsius', 'degrees c', 'celsius', 'centigrade'],
    f: ['degrees fahrenheit', 'degrees f', 'fahrenheit'],
    psi: ['psi', 'pounds per square inch'],
    gpm: ['gpm', 'gallons per minute', 'gallons a minute'],
    lpm: ['liters per minute', 'litres per minute', 'liters a minute', 'litres a minute'],
    ftlb: ['foot pounds', 'foot pound', 'ft lbs', 'ft lb'],
    inlb: ['inch pounds', 'inch pound', 'in lbs'],
    nm: ['newton meters', 'newton metres', 'newton meter', 'newton metre'],
    deg: ['degrees'],
    m: ['meters', 'metres', 'meter', 'metre'],
    btuh: ['btu per hour', 'btus per hour', 'btu an hour'],
  };
  for (const cat of CATEGORIES)
    for (const unit of cat.units) {
      const name = unit.name.toLowerCase().replace(/\(.*?\)/g, '').trim();
      const plural = name.replace(/^(\w+)(.*)$/, (_, a: string, b: string) => `${/(s|x|ch|sh)$/.test(a) ? `${a}es` : a.endsWith('y') ? `${a.slice(0, -1)}ies` : `${a}s`}${b}`);
      const said = [name, plural, unit.sym.toLowerCase(), unit.id, ...(extra[unit.id] ?? [])].map((w) => tokens(w).join(' ')).filter(Boolean);
      out.push({ cat, unit, words: [...new Set(said)] });
    }
  return out;
}
let UNITS: ReturnType<typeof unitPhrases> | null = null;

/** The unit said at `i`, longest name first; the category to stay in, when there is one. */
function unitAt(ws: readonly string[], i: number, cat?: ConvCategory): { cat: ConvCategory; unit: ConvUnit; next: number } | null {
  UNITS ??= unitPhrases();
  let best: { cat: ConvCategory; unit: ConvUnit; next: number; len: number } | null = null;
  for (const u of UNITS) {
    if (cat && u.cat.id !== cat.id) continue;
    for (const w of u.words) {
      const p = w.split(' ');
      if (at(ws, i, p) && (!best || p.length > best.len)) best = { cat: u.cat, unit: u.unit, next: i + p.length, len: p.length };
    }
  }
  return best;
}

/** "Convert 3 feet to millimetres", "3 feet in mm", "how many psi in 10 bar". */
function conversion(ws: string[]): Extract<CalcSpeech, { kind: 'convert' }> | null {
  const s = ws[0] === 'convert' ? ws.slice(1) : ws;
  // How many TO in VALUE FROM.
  if (s[0] === 'how' && s[1] === 'many') {
    const to = unitAt(s, 2);
    if (!to) return null;
    let i = to.next;
    if (s[i] === 'are' || s[i] === 'is') i += 1;
    if (s[i] !== 'in') return null;
    // "How many inches in a foot".
    const v = ['a', 'an', 'one'].includes(s[i + 1] ?? '') && !numberAt(s, i + 1) ? { value: 1, next: i + 2 } : numberAt(s, i + 1);
    if (!v) return null;
    const from = unitAt(s, v.next, to.cat);
    if (!from || from.next !== s.length) return null;
    return { kind: 'convert', value: v.value, cat: to.cat, from: from.unit, to: to.unit };
  }
  // VALUE FROM to|in|into TO: the unit by name first ("50 foot pounds"), else a length in feet and inches, taken in inches.
  const JOIN = ['to', 'in', 'into', 'as'];
  const n = numberAt(s, 0);
  if (!n) return null;
  let value = n.value;
  let from = unitAt(s, n.next);
  if (!from || !JOIN.includes(s[from.next] ?? '')) {
    const q = quantity(s, 0);
    if (!q || (q.item.unit !== 'ftin' && q.item.unit !== 'in') || !JOIN.includes(s[q.next] ?? '')) return null;
    const cat = CATEGORIES.find((c) => c.id === 'length')!;
    value = q.item.value;
    from = { cat, unit: cat.units.find((u) => u.id === 'in')!, next: q.next };
  }
  const to = unitAt(s, from.next + 1, from.cat);
  if (!to || to.next !== s.length) return null;
  return { kind: 'convert', value, cat: from.cat, from: from.unit, to: to.unit };
}

/** What a thing said means to the calculator, or null when it is not for the calculator. */
export function readCalc(said: string): CalcSpeech | null {
  const raw = wordsOf(said);
  if (!raw.length) return null;
  const whole = raw.join(' ');
  if (/^(clear|clear all|all clear|ac|clear it|clear that|start again|reset)$/.test(whole)) return { kind: 'clear' };
  if (/^(backspace|delete|delete that|back space|rub out)$/.test(whole)) return { kind: 'back' };
  if (/^(equals|equal|whats the answer|what is the answer|answer|total)$/.test(whole)) return { kind: 'equals' };
  const ws = strip(raw);
  const conv = conversion(ws);
  if (conv) return conv;
  const list = verbFirst(ws) ?? items(ws);
  if (!list || !list.some((x) => x.k === 'num' || x.k === 'pi')) return null;
  // Said starting with an operation, it carries on from the answer: "times 3", "plus 2 foot".
  const first = list[0]!;
  const carry = first.k === 'op' || first.k === 'post';
  return { kind: 'sum', items: list, carry };
}

/** Whether a sum has anything to work out, or is only a figure. */
export const worksOut = (list: readonly Item[]): boolean => list.some((x) => x.k !== 'num');
/** Whether a sum is in feet, inches or millimetres: the trade calculator's work. */
export const hasLengths = (list: readonly Item[]): boolean => list.some((x) => x.k === 'num' && x.unit !== null);

// ------------------------------------------------------------ keys

type Step = [KeyAction, string?];

const digits = (v: number): Step[] => {
  const s = String(Number(v.toFixed(6)));
  return s.split('').map((c) => (c === '.' ? ['dot'] : ['digit', c]) as Step);
};

/** A fraction of an inch as the tape reads it: halves to sixty-fourths, exact; null when it is not one. */
export function tapeFraction(x: number): { n: number; d: number } | null {
  for (const d of [2, 4, 8, 16, 32, 64]) {
    const n = Math.round(x * d);
    if (n > 0 && n < d && Math.abs(n / d - x) < 1e-9) return n % 2 === 0 && d > 2 ? tapeFraction(n / d) : { n, d };
  }
  return null;
}

/** Inches keyed the way they are typed: whole, Inch, then the fraction; a decimal where there is no tape fraction. */
function inchSteps(inches: number, afterFeet: boolean): Step[] {
  const whole = Math.floor(inches + 1e-9);
  const rest = inches - whole;
  if (rest < 1e-9) return whole || !afterFeet ? [...digits(whole), ['inch']] : [];
  const f = tapeFraction(rest);
  if (!f) return [...digits(inches), ['inch']];
  const frac: Step[] = [...digits(f.n), ['slash'], ...digits(f.d)];
  if (whole) return [...digits(whole), ['inch'], ...frac];
  return afterFeet ? frac : [...frac, ['inch']];
}

/**
 * The trade calculator's keys for a sum. A bare figure next to a plus or a
 * minus in a sum of lengths is inches ("12 and a half plus 3 foot 2"); next
 * to times or divide it stays a plain number ("2 foot times 3").
 */
export function tradeSteps(list: readonly Item[]): Step[] | null {
  const lengths = hasLengths(list);
  const out: Step[] = [];
  // A function said before its figure is pressed after it, the way this calculator takes it: after the figure,
  // or after the bracket it was said before closes.
  const pending: { depth: number; key: Step }[] = [];
  let depth = 0;
  const settle = () => {
    while (pending.length && pending[pending.length - 1]!.depth === depth) out.push(pending.pop()!.key);
  };
  const opNear = (i: number, ops: string[]) => [list[i - 1], list[i + 1]].some((x) => x?.k === 'op' && ops.includes(x.op));
  for (let i = 0; i < list.length; i++) {
    const x = list[i]!;
    switch (x.k) {
      case 'num': {
        const unit = x.unit ?? (lengths && opNear(i, ['+', '-']) && !opNear(i, ['*', '/', '^']) ? 'in' : null);
        if (unit === 'ftin') out.push(...digits(x.feet!), ['feet'], ...inchSteps(x.inches ?? 0, true));
        else if (unit === 'in') out.push(...inchSteps(x.value, false));
        else if (unit === 'mm') out.push(...digits(x.value), ['mm']);
        else if (unit === 'm') out.push(...digits(x.value), ['metre']);
        else {
          const whole = Math.floor(x.value);
          const f = x.value - whole > 1e-9 ? tapeFraction(x.value - whole) : null;
          // A plain half stays exact as a fraction; anything else goes in as a decimal.
          if (f && !whole) out.push(...digits(f.n), ['slash'], ...digits(f.d));
          else out.push(...digits(x.value));
        }
        settle();
        break;
      }
      case 'pi':
        out.push(['pi']);
        settle();
        break;
      case 'op':
        out.push([x.op === '+' ? 'add' : x.op === '-' ? 'subtract' : x.op === '*' ? 'multiply' : x.op === '/' ? 'divide' : 'power']);
        break;
      case 'open':
        out.push(['openParen']);
        depth += 1;
        break;
      case 'close':
        out.push(['closeParen']);
        depth -= 1;
        settle();
        break;
      case 'fn':
        pending.push({ depth, key: [x.fn === 'sqrt' ? 'squareRoot' : x.fn === 'sin' ? 'sine' : x.fn === 'cos' ? 'cosine' : 'tangent'] });
        break;
      case 'post':
        if (x.p === 'fact') return null;
        out.push(...(x.p === 'sq' ? [['square']] : x.p === 'cube' ? [['power'], ['digit', '3']] : x.p === 'pct' ? [['percent']] : [['reciprocal']]) as Step[]);
        break;
    }
  }
  if (pending.length) return null;
  return out;
}

/** The phone calculator's keys for a sum. Figures go in whole, as the history puts them in; a function closes after its figure. */
export function standardKeys(list: readonly Item[]): BasicKey[] | null {
  const out: BasicKey[] = [];
  // Each function opens a bracket; it is shut once its figure, or the bracket said after it, is done.
  const fns: number[] = [];
  let depth = 0;
  for (let i = 0; i < list.length; i++) {
    const x = list[i]!;
    switch (x.k) {
      case 'num':
        out.push({ t: 'insert', value: x.value });
        break;
      case 'pi':
        out.push({ t: 'const', c: 'π' });
        break;
      case 'op':
        out.push({ t: 'op', op: x.op === '+' ? '+' : x.op === '-' ? '−' : x.op === '*' ? '×' : x.op === '/' ? '÷' : '^' });
        break;
      case 'open':
        out.push({ t: 'paren' });
        depth += 1;
        break;
      case 'close':
        out.push({ t: 'paren' });
        depth -= 1;
        break;
      case 'fn':
        out.push({ t: 'fn', fn: x.fn });
        fns.push(depth);
        break;
      case 'post':
        out.push({ t: 'post', p: x.p === 'sq' ? '²' : x.p === 'cube' ? '³' : x.p === 'pct' ? '%' : x.p === 'recip' ? '⁻¹' : '!' });
        break;
    }
    // "Square root of 16 plus 2" is √(16) + 2: the function's bracket shuts after its figure.
    while (fns.length && fns[fns.length - 1] === depth && (x.k === 'num' || x.k === 'pi' || x.k === 'close') && list[i + 1]?.k !== 'post') {
      out.push({ t: 'paren' });
      fns.pop();
    }
  }
  return out;
}

/** An answer as the trade display shows it, in words for speaking: 50-1/2" is "50 and 1/2 inches". */
export function speakDisplay(text: string): string {
  return text
    .replace(/(\d+)-(\d+\/\d+)"/g, '$1 and $2 inches')
    .replace(/(\d+)'\s*/g, '$1 foot ')
    .replace(/"/g, ' inches')
    .replace(/\bsq\b/g, 'square')
    .replace(/°/g, ' degrees')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A conversion worked: the figure in the unit asked for. */
export const converted = (c: Extract<CalcSpeech, { kind: 'convert' }>): number => convert(c.value, c.from, c.to);
