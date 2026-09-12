import {
  Dim, DimError, add, arcCosine, arcSine, arcTangent, cosine, dim, divide, fromBase,
  multiply, negate, power, reciprocal, sine, square, squareRoot, subtract, tangent,
  toBase, findUnit, kindLabel, type UnitKind,
} from './dim';
import {
  Entry, emptyEntry, entryDisplay, entryExponent, entryUnit, entryUnitWord, entryValue,
  formatFeetInch, isEntryEmpty, pressBackspace, pressDigit, pressDot, pressFeet, pressInch,
  pressMetre, pressMillimetre, pressSign, pressSlash, type FracDen,
} from './ftin';
import type { KeyAction } from './keys';

export type BinaryOp = 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'nthRoot';

const PRECEDENCE: Record<BinaryOp, number> = {
  add: 1,
  subtract: 1,
  multiply: 2,
  divide: 2,
  power: 3,
  nthRoot: 3,
};

type Frame = { operands: Dim[]; operators: BinaryOp[] };

export type CalcState = {
  entry: Entry;
  acc: Dim | null;
  operands: Dim[];
  operators: BinaryOp[];
  frames: Frame[];
  memory: Dim;
  registers: Record<string, Dim>;
  pending: 'store' | 'recall' | null;
  shift: boolean;
  error: string | null;
  displayUnit: Partial<Record<UnitKind, string>>;
  dmsMode: boolean;
  den: FracDen;
};

export const initialState = (den: FracDen = 16): CalcState => ({
  entry: emptyEntry(),
  acc: null,
  operands: [],
  operators: [],
  frames: [],
  memory: dim(0, 'scalar'),
  registers: {},
  pending: null,
  shift: false,
  error: null,
  displayUnit: {},
  dmsMode: false,
  den,
});

const UNIT_KEY: Partial<Record<KeyAction, string>> = {
  pound: 'lb',
  kilogram: 'kg',
  gallon: 'gal',
  litre: 'l',
  cubicFeetPerMinute: 'cfm',
  cubicFeetPerSecond: 'cfs',
  fahrenheit: 'f',
  celsius: 'c',
  gpm: 'gpm',
  litrePerSecond: 'lps',
};

const EXPONENT_KIND: Record<1 | 2 | 3, UnitKind> = { 1: 'linear', 2: 'area', 3: 'volume' };

const LINEAR_KEY: Partial<Record<KeyAction, string>> = { feet: 'ft', inch: 'in', mm: 'mm', metre: 'm' };

const AREA_OF: Record<string, string> = { in: 'in2', ft: 'ft2', mm: 'mm2', m: 'm2' };
const VOLUME_OF: Record<string, string> = { in: 'in3', ft: 'ft3', mm: 'mm3', m: 'm3' };

const UNARY: Partial<Record<KeyAction, (d: Dim) => Dim>> = {
  square,
  squareRoot,
  sine,
  cosine,
  tangent,
  arcSine,
  arcCosine,
  arcTangent,
  reciprocal,
};

function current(s: CalcState): Dim | null {
  if (!isEntryEmpty(s.entry)) {
    const v = entryValue(s.entry);
    if (!Number.isFinite(v)) return null;

    const unit = entryUnit(s.entry);
    if (!unit) return dim(v, 'scalar');

    const exp = entryExponent(s.entry);
    if (exp === 1) return toBase(v, unit);
    const id = exp === 2 ? AREA_OF[unit] : VOLUME_OF[unit];
    if (!id) return null;
    return toBase(v, id);
  }
  return s.acc;
}

function applyOp(op: BinaryOp, a: Dim, b: Dim): Dim {
  if (op === 'add') return add(a, b);
  if (op === 'subtract') return subtract(a, b);
  if (op === 'multiply') return multiply(a, b);
  if (op === 'divide') return divide(a, b);
  if (op === 'power') return power(a, b);
  if (b.value === 0) throw new DimError('Cannot take a zeroth root.');
  return power(a, dim(1 / b.value, 'scalar'));
}

function reduceWhile(operands: Dim[], operators: BinaryOp[], minPrecedence: number): void {
  while (operators.length && PRECEDENCE[operators[operators.length - 1]!] >= minPrecedence) {
    const op = operators.pop()!;
    const b = operands.pop();
    const a = operands.pop();
    if (a === undefined || b === undefined) throw new DimError('Incomplete expression.');
    operands.push(applyOp(op, a, b));
  }
}

const cleared = (s: CalcState, all = false): CalcState => ({
  ...s,
  entry: emptyEntry(),
  acc: null,
  operands: [],
  operators: [],
  frames: [],
  pending: null,
  shift: false,
  error: null,
  ...(all ? { memory: dim(0, 'scalar'), registers: {} } : {}),
});

function withValue(s: CalcState, value: Dim): CalcState {
  return { ...s, entry: emptyEntry(), acc: value, shift: false, error: null };
}

function fail(s: CalcState, message: string): CalcState {
  return { ...s, shift: false, error: message };
}

export function press(state: CalcState, action: KeyAction, arg?: string): CalcState {
  const shifted = state.shift;
  const s: CalcState = state.error && action !== 'clear' && action !== 'clearAll'
    ? { ...state, error: null }
    : state;

  try {
    switch (action) {
      case 'conv':
        return { ...s, shift: !s.shift, error: null };

      case 'digit': {
        const d = arg ?? '0';
        if (s.pending && d >= '1' && d <= '9') {
          if (s.pending === 'store') {
            const v = current(s);
            if (!v) return fail(s, 'Enter a value first.');
            return {
              ...s,
              registers: { ...s.registers, [d]: v },
              pending: null,
              entry: emptyEntry(),
              acc: v,
              shift: false,
              error: null,
            };
          }
          const held = s.registers[d];
          if (!held) return { ...fail(s, `Memory register ${d} is empty.`), pending: null };
          return { ...withValue(s, held), pending: null };
        }
        return { ...s, entry: pressDigit(s.entry, d), acc: null, pending: null, shift: false, error: null };
      }

      case 'dot':
        return { ...s, entry: pressDot(s.entry), acc: null, shift: false, error: null };

      case 'slash':
        return { ...s, entry: pressSlash(s.entry), shift: false, error: null };

      case 'feet':
      case 'inch':
      case 'mm':
      case 'metre': {
        const base = LINEAR_KEY[action]!;

        // With nothing being typed, a dimension key restates the value on
        // display in that unit rather than starting a new entry.
        if (isEntryEmpty(s.entry) && s.acc) {
          const kind = s.acc.kind;
          const id =
            kind === 'linear' ? base : kind === 'area' ? AREA_OF[base] : kind === 'volume' ? VOLUME_OF[base] : undefined;
          if (!id) return fail(s, `Cannot read ${kindLabel(kind)} in ${findUnit(base).label}.`);
          return { ...s, displayUnit: { ...s.displayUnit, [kind]: id }, shift: false, error: null };
        }

        const entry =
          action === 'feet'
            ? pressFeet(s.entry)
            : action === 'inch'
              ? pressInch(s.entry)
              : action === 'mm'
                ? pressMillimetre(s.entry)
                : pressMetre(s.entry);
        return { ...s, entry, shift: false, error: null };
      }

      case 'sign': {
        if (!isEntryEmpty(s.entry)) return { ...s, entry: pressSign(s.entry), shift: false, error: null };
        const v = current(s);
        return v ? withValue(s, negate(v)) : { ...s, shift: false };
      }

      case 'backspace':
        return { ...s, entry: pressBackspace(s.entry), shift: false, error: null };

      case 'clear':
        if (shifted) {
          const v = current(s);
          if (!v) return fail(s, 'Enter a value first.');
          const base = s.operands[s.operands.length - 1];
          const op = s.operators[s.operators.length - 1];
          if (base && (op === 'add' || op === 'subtract')) {
            return withValue(s, multiply(base, dim(v.value / 100, 'scalar')));
          }
          return withValue(s, dim(v.value / 100, v.kind));
        }
        if (!isEntryEmpty(s.entry)) return { ...s, entry: emptyEntry(), shift: false, error: null };
        return cleared(s);

      case 'clearAll':
        return cleared(s, true);

      case 'pi':
        return withValue(s, dim(Math.PI, 'scalar'));

      case 'add':
      case 'subtract':
      case 'multiply':
      case 'divide':
      case 'power':
      case 'nthRoot': {
        const v = current(s);
        if (!v) return fail(s, 'Enter a value first.');
        const operands = [...s.operands, v];
        const operators = [...s.operators];
        reduceWhile(operands, operators, PRECEDENCE[action]);
        operators.push(action);
        const top = operands[operands.length - 1]!;
        return { ...s, entry: emptyEntry(), acc: top, operands, operators, shift: false, error: null };
      }

      case 'equals': {
        const v = current(s);
        if (!v) return fail(s, 'Enter a value first.');
        if (s.frames.length) return fail(s, 'Close the open bracket first.');
        const operands = [...s.operands, v];
        const operators = [...s.operators];
        reduceWhile(operands, operators, 0);
        const result = operands.pop();
        if (!result) return fail(s, 'Incomplete expression.');
        return { ...s, entry: emptyEntry(), acc: result, operands: [], operators: [], shift: false, error: null };
      }

      case 'openParen':
        return {
          ...s,
          frames: [...s.frames, { operands: s.operands, operators: s.operators }],
          operands: [],
          operators: [],
          entry: emptyEntry(),
          acc: null,
          shift: false,
          error: null,
        };

      case 'closeParen': {
        if (!s.frames.length) return fail(s, 'No open bracket.');
        const v = current(s);
        if (!v) return fail(s, 'Enter a value first.');
        const operands = [...s.operands, v];
        const operators = [...s.operators];
        reduceWhile(operands, operators, 0);
        const inner = operands.pop();
        if (!inner) return fail(s, 'Incomplete expression.');
        const frames = [...s.frames];
        const frame = frames.pop()!;
        return {
          ...s,
          entry: emptyEntry(),
          acc: inner,
          operands: frame.operands,
          operators: frame.operators,
          frames,
          shift: false,
          error: null,
        };
      }

      case 'store': {
        const v = current(s);
        if (!v) return fail(s, 'Enter a value first.');
        return { ...s, pending: 'store', shift: false, error: null };
      }

      case 'recall':
        if (shifted) return { ...s, memory: dim(0, 'scalar'), pending: null, shift: false, error: null };
        if (s.pending === 'recall') {
          return { ...s, memory: dim(0, 'scalar'), pending: null, shift: false, error: null };
        }
        return { ...s, pending: 'recall', shift: false, error: null };

      case 'memoryPlus': {
        if (s.pending === 'recall') return { ...withValue(s, s.memory), pending: null };
        const v = current(s);
        if (!v) return fail(s, 'Enter a value first.');
        return { ...s, memory: add(s.memory, v), pending: null, shift: false, error: null };
      }

      case 'memoryMinus': {
        const v = current(s);
        if (!v) return fail(s, 'Enter a value first.');
        return { ...s, memory: subtract(s.memory, v), pending: null, shift: false, error: null };
      }

      case 'memoryClear':
        return { ...s, memory: dim(0, 'scalar'), pending: null, shift: false, error: null };

      case 'dms':
        return { ...s, dmsMode: !s.dmsMode, shift: false, error: null };

      default: {
        const unary = UNARY[action];
        if (unary) {
          const v = current(s);
          if (!v) return fail(s, 'Enter a value first.');
          return withValue(s, unary(v));
        }

        const unitId = UNIT_KEY[action];
        if (unitId) {
          const def = findUnit(unitId);
          const v = current(s);
          if (!v) return fail(s, 'Enter a value first.');
          if (v.kind === 'scalar') {
            return {
              ...withValue(s, toBase(v.value, unitId)),
              displayUnit: { ...s.displayUnit, [def.kind]: unitId },
            };
          }
          if (v.kind !== def.kind) return fail(s, `Cannot read that as ${def.label}.`);
          return { ...withValue(s, v), displayUnit: { ...s.displayUnit, [def.kind]: unitId } };
        }

        return { ...s, shift: false };
      }
    }
  } catch (e) {
    if (e instanceof DimError) return fail(s, e.message);
    throw e;
  }
}

export function formatDms(degrees: number): string {
  if (!Number.isFinite(degrees)) return '—';
  const sign = degrees < 0 ? '-' : '';
  const abs = Math.abs(degrees);
  let d = Math.floor(abs);
  let m = Math.floor((abs - d) * 60);
  let sec = Math.round(((abs - d) * 60 - m) * 60 * 10) / 10;
  if (sec >= 60) {
    sec -= 60;
    m += 1;
  }
  if (m >= 60) {
    m -= 60;
    d += 1;
  }
  return `${sign}${d}° ${m}' ${sec.toFixed(1)}"`;
}

export function formatDim(d: Dim, state: CalcState): string {
  if (!Number.isFinite(d.value)) return '—';

  if (d.kind === 'linear') {
    const unitId = state.displayUnit.linear;
    if (unitId && unitId !== 'in') {
      const def = findUnit(unitId);
      return `${fromBase(d, unitId).toFixed(4).replace(/0+$/, '').replace(/\.$/, '')} ${def.label}`;
    }
    return formatFeetInch(d.value, state.den);
  }

  if (d.kind === 'angle') {
    return state.dmsMode ? formatDms(d.value) : `${d.value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}°`;
  }

  // The device carries seven decimal places and trims trailing zeros, which
  // is why its manual prints pi as 3.1415927 rather than 3.141592654.
  if (d.kind === 'scalar') {
    return `${Number(d.value.toFixed(7))}`;
  }

  const unitId = state.displayUnit[d.kind];
  const def = unitId ? findUnit(unitId) : undefined;
  const value = def ? fromBase(d, def.id) : d.value;
  const label = def ? def.label : DEFAULT_LABEL[d.kind];
  return `${Number(value.toFixed(6))} ${label}`;
}

const DEFAULT_LABEL: Record<UnitKind, string> = {
  scalar: '',
  linear: 'inch',
  area: 'sq inch',
  volume: 'cu inch',
  angle: 'deg',
  weight: 'lb',
  flow: 'gal/min',
  velocity: 'ft/sec',
  pressure: 'psi',
  force: 'lbf',
  temperature: '°F',
};

export function displayText(state: CalcState): string {
  if (state.error) return state.error;
  if (!isEntryEmpty(state.entry)) return entryDisplay(state.entry, state.den);
  if (state.acc) return formatDim(state.acc, state);
  return '0';
}

export function pressMany(state: CalcState, steps: [KeyAction, string?][]): CalcState {
  return steps.reduce((acc, [a, v]) => press(acc, a, v), state);
}
