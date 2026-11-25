import {
  Dim, DimError, add, arcCosine, arcSine, arcTangent, cosine, dim, divide, fromBase,
  multiply, negate, power, reciprocal, sine, square, squareRoot, subtract, tangent,
  toBase, findUnit, kindLabel, type UnitKind,
} from './dim';
import {
  Entry, emptyEntry, entryDisplay, entryExponent, entryUnit, entryUnitWord, entryValue,
  formatFeetInch, formatInches, isEntryEmpty, pressBackspace, pressDigit, pressDot, pressFeet, pressInch,
  pressMetre, pressMillimetre, pressSign, pressSlash, type FracDen,
} from './ftin';
import type { KeyAction } from './keys';
import { CLEAR_ALL_DEFAULTS } from './defaults';
import { deg } from './units';
import { solveTriangle, type TriField, type TriSolution } from './triangle';
import { equalSpreadAdvance } from './offsetBend';
import {
  DEFAULT_PIPE, arcsAt, boreArea, cutBetween, elbowName, jointOf, materialName, nextMaterial, pipeFacts, pipeName,
  takeoutAt, withSize, withWall, type PipeContext,
} from './pipeKeys';
import { sizeLabel, wallLabel } from './materials';

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
  unitCost: number;
  tape: string[];
  costTotal: number | null;
  tri: Partial<Record<TriField, number>>;
  triOrder: TriField[];
  accFromTrade: boolean;
  /** The pipe the take-outs, arcs and cut lengths are worked for (calc/pipeKeys.ts). */
  pipe: PipeContext;
  /** The roll of a rolling offset, held by Roll; the Offset register is then its rise. */
  roll: number | null;
  /** Flow or velocity, and two of pressure, force and area, as typed into their keys. */
  hyd: Partial<Record<HydField, number>>;
  hydOrder: HydField[];
  /** What the figure on the readout is ("T.O.", "OD", "TRUE OFFSET"), shown under it. */
  label: string | null;
  /** A readout that is words, not a figure: a material, an elbow, a tape line. */
  text: string | null;
  /** A key pressed again steps through what it shows: T.O. then the arcs, OD then ID. */
  cycle: { key: KeyAction; step: number; arg?: number } | null;
};

export type HydField = 'flow' | 'velocity' | 'pressure' | 'force' | 'area';

/** Linear readout the calculator opens on. Inches, unless it is asked otherwise. */
export type LinearReadout = 'in' | 'ft';

export const initialState = (den: FracDen = 16, linear: LinearReadout = 'in', pipe: PipeContext = DEFAULT_PIPE): CalcState => ({
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
  displayUnit: { linear },
  dmsMode: false,
  den,
  unitCost: CLEAR_ALL_DEFAULTS.unitCost,
  tape: [],
  costTotal: null,
  tri: {},
  triOrder: [],
  accFromTrade: false,
  pipe,
  roll: null,
  hyd: {},
  hydOrder: [],
  label: null,
  text: null,
  cycle: null,
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
  ...(all
    ? {
        memory: dim(0, 'scalar'),
        registers: {},
        unitCost: CLEAR_ALL_DEFAULTS.unitCost,
        tape: [],
        costTotal: null,
        tri: {},
        triOrder: [],
        accFromTrade: false,
        // The pipe is the job's, set in Settings as much as here: Clear All
        // leaves it. The roll and the hydraulic figures go with the sum.
        roll: null,
        hyd: {},
        hydOrder: [],
      }
    : {}),
});

function withValue(s: CalcState, value: Dim): CalcState {
  return { ...s, entry: emptyEntry(), acc: value, shift: false, error: null, accFromTrade: false };
}

function fail(s: CalcState, message: string): CalcState {
  return { ...s, shift: false, error: message };
}

/** A figure on the readout from a trade key: read back, not typed, so a register key after it reads its own. */
function readout(s: CalcState, value: Dim | null, label: string, more: Partial<CalcState> = {}): CalcState {
  return { ...s, entry: emptyEntry(), acc: value, accFromTrade: true, shift: false, error: null, label, text: null, cycle: null, ...more };
}

/** What was keyed for a trade key: a figure being typed, or the answer to a sum. Null when nothing was. */
function typedValue(s: CalcState): Dim | null {
  const typed = !isEntryEmpty(s.entry) || (s.acc !== null && !s.accFromTrade);
  return typed ? current(s) : null;
}

/** The triangle's registers with only the two typed in kept. */
function typedOnly(s: CalcState): Partial<Record<TriField, number>> {
  const tri: Partial<Record<TriField, number>> = {};
  for (const f of s.triOrder) tri[f] = s.tri[f];
  return tri;
}

/**
 * The triangle from the two held. With a roll held, the offset typed is the
 * rise: the triangle is worked on the true offset over rise and roll, and
 * the offset it gives back is the rise again.
 */
function solvePair(s: CalcState): TriSolution | string {
  const [a, b] = s.triOrder;
  if (!a || !b) return 'Enter two of offset, run, travel or angle.';
  const roll = s.roll ?? 0;
  const known = (f: TriField) => (f === 'offset' && roll ? Math.hypot(s.tri.offset!, roll) : s.tri[f]!);
  const sol = solveTriangle({ field: a, value: known(a) }, { field: b, value: known(b) });
  if (!sol.valid) return sol.error ?? 'Cannot solve.';
  if (!roll) return sol;
  if (a === 'offset' || b === 'offset') return { ...sol, offset: s.tri.offset! };
  if (sol.offset < roll) return 'The roll is more than the true offset: there is no rise under it.';
  return { ...sol, offset: Math.sqrt(sol.offset * sol.offset - roll * roll) };
}

/** The triangle's angle: held, or worked from the pair. Null when there is none. */
function triangleAngle(s: CalcState): number | null {
  if (s.tri.angle !== undefined) return s.tri.angle;
  const sol = solvePair(s);
  return typeof sol === 'string' ? null : sol.angle;
}

const triLabel = (f: TriField, s: CalcState): string =>
  f === 'offset' ? (s.roll !== null ? 'RISE' : 'OFFSET') : f === 'angle' ? 'ANGLE' : f.toUpperCase();

const angleWord = (a: number): string => `${Number(a.toFixed(2))}°`;

/** "2\" LR 45°", "1\" SCREWED 90°": the elbow a figure is for. */
function elbowWords(p: PipeContext, angle: number): string {
  const j = jointOf(p.material);
  return `${sizeLabel(p.nps)} ${j === 'welded' ? p.radius : j === 'screwed' ? 'SCREWED' : 'LIBRARY'} ${angleWord(angle)}`;
}

/** US gallons a minute in a cubic foot a second. */
const GPM_PER_CFS = (1728 / 231) * 60;

/** The fractions Prefs steps through, as Settings offers them. */
const FRACTIONS: FracDen[] = [16, 32, 64, 8];

export function press(state: CalcState, action: KeyAction, arg?: string): CalcState {
  const shifted = state.shift;
  // Conv only arms the next key: what is on the readout stays as it is.
  if (action === 'conv') return { ...state, shift: !state.shift, error: null };
  // Any other key takes the readout's words with it; only the key that showed
  // them steps on through what it shows.
  const s: CalcState = {
    ...state,
    error: state.error && action !== 'clear' && action !== 'clearAll' ? null : state.error,
    label: null,
    text: null,
    cycle: state.cycle && state.cycle.key === action ? state.cycle : null,
  };

  try {
    switch (action) {
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
        // display in that unit rather than starting a new entry. With nothing
        // on display either it still sets the unit the next answer is read in,
        // so pressing IN always means inches and never silently does nothing.
        if (isEntryEmpty(s.entry)) {
          const kind = s.acc ? s.acc.kind : 'linear';
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

      // The keypad sends % as its own key (Conv Clear); Clear pressed with
      // Conv armed is the same key.
      case 'percent':
      case 'clear':
        if (shifted || action === 'percent') {
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
        const next: CalcState = {
          ...s, entry: emptyEntry(), acc: result, operands: [], operators: [], shift: false, error: null,
        };
        return { ...next, tape: [...s.tape, formatDim(result, next)].slice(-30) };
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

      case 'cost': {
        const v = current(s);
        if (!v) return fail(s, 'Enter a value first.');

        // Store, rather than spend, when Store armed the keypress.
        if (s.pending === 'store') {
          return { ...s, unitCost: v.value, pending: null, entry: emptyEntry(), acc: v, shift: false, error: null };
        }

        // A pending multiply means a cost was keyed inline; settle that
        // instead of reaching for the stored one.
        if (s.operators.length) {
          const settled = press({ ...s, shift: false }, 'equals');
          if (settled.error) return settled;
          return { ...settled, costTotal: settled.acc ? settled.acc.value : null };
        }

        if (!(s.unitCost > 0)) return fail(s, 'Store a unit cost first.');
        const total = v.value * s.unitCost;
        return { ...withValue(s, dim(total, 'scalar')), costTotal: total };
      }

      // The four keys along the top are registers, not functions. Enter a
      // value and press one to hold it; press one with nothing entered and it
      // solves from the two most recently held.
      case 'angleSlope':
      case 'offset':
      case 'run':
      case 'travel': {
        const field: TriField = action === 'angleSlope' ? 'angle' : action;
        const kind: UnitKind = field === 'angle' ? 'angle' : 'linear';
        const typed = !isEntryEmpty(s.entry) || (s.acc !== null && !s.accFromTrade);

        if (typed) {
          const v = current(s);
          if (!v) return fail(s, 'Enter a value first.');
          if (field === 'angle' && v.kind !== 'angle' && v.kind !== 'scalar') {
            return fail(s, `${kindLabel(v.kind)} is not an angle.`);
          }
          const order = [...s.triOrder.filter((f) => f !== field), field].slice(-2);
          // Only the two typed in last are kept. Whatever was worked out from
          // the pair before goes: a travel solved from offset and run is not
          // the travel of the offset and angle typed in after it, and reading
          // it back would give the old answer as the new one.
          const tri: Partial<Record<TriField, number>> = {};
          for (const f of order) tri[f] = f === field ? v.value : s.tri[f];
          return readout({ ...s, tri, triOrder: order }, dim(v.value, kind), triLabel(field, s));
        }

        // Pressed again on its own answer, Travel gives the pipe to cut
        // between the two elbows: a take-out off each end and a gap at each weld.
        if (field === 'travel' && s.cycle?.step === 0) {
          const sol = solvePair(s);
          if (typeof sol === 'string') return fail(s, sol);
          const c = cutBetween(s.pipe, sol.travel, sol.angle);
          if (typeof c === 'string') return fail(s, c);
          return readout(s, dim(c.cut, 'linear'), `CUT · ${elbowWords(s.pipe, sol.angle)}`, { cycle: { key: 'travel', step: 1 } });
        }
        const again = field === 'travel' ? { cycle: { key: 'travel' as const, step: 0 } } : {};

        const held = s.tri[field];
        if (held !== undefined) return readout(s, dim(held, kind), triLabel(field, s), again);

        const solved = solvePair(s);
        if (typeof solved === 'string') return fail(s, solved);
        return readout({ ...s, tri: { ...s.tri, [field]: solved[field] } }, dim(solved[field], kind), triLabel(field, s), again);
      }

      // Roll holds the roll of a rolling offset; Offset is then its rise, and
      // the triangle is worked on the true offset over the two. With nothing
      // keyed it reads the true offset, then the roll angle. 0 Roll lets it go.
      case 'roll': {
        const v = typedValue(s);
        if (v) {
          if (v.kind !== 'scalar' && v.kind !== 'linear') return fail(s, `${kindLabel(v.kind)} is not a roll.`);
          if (!(v.value >= 0)) return fail(s, 'A roll is zero or more.');
          // What was worked out without the roll is not the rolling offset's.
          const tri = typedOnly(s);
          if (v.value === 0) return readout({ ...s, roll: null, tri }, null, 'ROLL', { text: 'Roll off' });
          return readout({ ...s, roll: v.value, tri }, dim(v.value, 'linear'), 'ROLL');
        }
        if (s.roll === null) return fail(s, 'Key the roll, then Roll.');
        const sol = s.tri.offset === undefined ? solvePair(s) : null;
        const rise = s.tri.offset ?? (sol && typeof sol !== 'string' ? sol.offset : undefined);
        if (rise === undefined) return readout(s, dim(s.roll, 'linear'), 'ROLL');
        const rows: [string, Dim][] = [
          ['TRUE OFFSET', dim(Math.hypot(rise, s.roll), 'linear')],
          ['ROLL ANGLE', dim(deg(Math.atan2(s.roll, rise)), 'angle')],
        ];
        const k = s.cycle ? (s.cycle.step + 1) % rows.length : 0;
        return readout(s, rows[k]![1], rows[k]![0], { cycle: { key: 'roll', step: k } });
      }

      // T.O./Arc: the take-out of the pipe's elbow at the angle keyed, or the
      // triangle's angle, or a 90; again for where to mark the throat, the
      // centre line and the heel when it is cut to that angle.
      case 'takeoutArc': {
        const v = typedValue(s);
        let angle: number;
        let step = 0;
        if (v) {
          if (v.kind !== 'scalar' && v.kind !== 'angle') return fail(s, `${kindLabel(v.kind)} is not an angle.`);
          angle = v.value;
        } else if (s.cycle?.arg !== undefined) {
          angle = s.cycle.arg;
          step = s.cycle.step + 1;
        } else angle = triangleAngle(s) ?? 90;
        const t = takeoutAt(s.pipe, angle);
        if (typeof t === 'string') return fail(s, t);
        const arcs = arcsAt(s.pipe, angle);
        const rows: [string, number][] = [['T.O.', t.value]];
        if (typeof arcs !== 'string') rows.push(['ARC IN', arcs.inner], ['ARC CTR', arcs.centre], ['ARC OUT', arcs.outer]);
        const k = step % rows.length;
        return readout(s, dim(rows[k]![1], 'linear'), `${rows[k]![0]} · ${elbowWords(s.pipe, angle)}`, { cycle: { key: 'takeoutArc', step: k, arg: angle } });
      }

      // Cutback: pipes running together at a spread, turning through the
      // triangle's angle (a 90 with none): how far along each next pipe's
      // bend or elbow is set from the one inside it.
      case 'cutback': {
        const v = typedValue(s);
        if (!v) return fail(s, 'Key the spread between the pipes, then Cutback.');
        if (v.kind !== 'scalar' && v.kind !== 'linear') return fail(s, `${kindLabel(v.kind)} is not a spread.`);
        const angle = triangleAngle(s) ?? 90;
        const c = equalSpreadAdvance(v.value, angle);
        if (!Number.isFinite(c)) return fail(s, 'Key a spread of zero or more.');
        return readout(s, dim(c, 'linear'), `CUTBACK · ${angleWord(angle)}`);
      }

      case 'welders': {
        const v = typedValue(s);
        if (v) {
          if (v.kind !== 'scalar' && v.kind !== 'linear') return fail(s, `${kindLabel(v.kind)} is not a gap.`);
          if (!(v.value >= 0 && v.value <= 0.5)) return fail(s, "A welder's gap is 0 to 1/2 inch.");
          const pipe = { ...s.pipe, gap: v.value };
          return readout({ ...s, pipe }, dim(v.value, 'linear'), "WELDER'S GAP", { text: formatInches(v.value, 64) });
        }
        return readout(s, dim(s.pipe.gap, 'linear'), "WELDER'S GAP", { text: formatInches(s.pipe.gap, 64) });
      }

      case 'pipeSize': {
        const v = typedValue(s);
        let pipe = s.pipe;
        if (v) {
          if (v.kind !== 'scalar' && v.kind !== 'linear') return fail(s, `${kindLabel(v.kind)} is not a pipe size.`);
          const next = withSize(s.pipe, v.value);
          if (typeof next === 'string') return fail(s, next);
          pipe = next;
        }
        return readout({ ...s, pipe }, null, `PIPE SIZE · ${wallLabel(pipe.wall)}`, { text: sizeLabel(pipe.nps) });
      }

      // Pipe: the figures of the pipe set, a press at a time.
      case 'pipe': {
        const facts = pipeFacts(s.pipe);
        if (typeof facts === 'string') return fail(s, facts);
        const k = s.cycle ? (s.cycle.step + 1) % facts.length : 0;
        const f = facts[k]!;
        // OD, ID and wall as the tables print them, in thousandths; the figure stays an inch to work with.
        const value = f.unit === 'in' ? dim(f.value, 'linear') : dim(Number(f.value.toFixed(f.unit === 'galft' ? 4 : 3)), 'scalar');
        const text = f.unit === 'in' ? `${Number(f.value.toFixed(3))}"` : null;
        return readout(s, value, `${f.label} · ${pipeName(s.pipe)}`, { text, cycle: { key: 'pipe', step: k } });
      }

      // Pipe Mat'l: the material, and the next at each press. A number keyed
      // first is the wall: 80 for SCH 80, 40 on stainless for 40S.
      case 'pipeMaterial': {
        const v = typedValue(s);
        if (v) {
          if (v.kind !== 'scalar') return fail(s, 'Key the wall as its number: 80 for SCH 80.');
          const next = withWall(s.pipe, v.value);
          if (typeof next === 'string') return fail(s, next);
          return readout({ ...s, pipe: next }, null, `MATERIAL · ${pipeName(next)}`, { text: materialName(next) });
        }
        const pipe = s.cycle ? nextMaterial(s.pipe) : s.pipe;
        return readout({ ...s, pipe }, null, `MATERIAL · ${pipeName(pipe)}`, { text: materialName(pipe), cycle: { key: 'pipeMaterial', step: 1 } });
      }

      // Elbow: long or short radius, changed at each press after the first.
      // A screwed or plastic pipe's elbows are set by the material.
      case 'elbow': {
        const welded = jointOf(s.pipe.material) === 'welded';
        const pipe: PipeContext = s.cycle && welded ? { ...s.pipe, radius: s.pipe.radius === 'LR' ? 'SR' : 'LR' } : s.pipe;
        const label = welded ? `ELBOW · AGAIN FOR ${pipe.radius === 'LR' ? 'SHORT' : 'LONG'}` : 'ELBOW · SET BY THE MATERIAL';
        return readout({ ...s, pipe }, null, label, { text: elbowName(pipe), cycle: { key: 'elbow', step: 1 } });
      }

      // Circle: area of the diameter keyed (or on the readout), then its circumference.
      case 'circle': {
        let d: number;
        let step = 0;
        if (isEntryEmpty(s.entry) && s.cycle?.arg !== undefined) {
          d = s.cycle.arg;
          step = s.cycle.step + 1;
        } else {
          const v = current(s);
          if (!v) return fail(s, 'Key a diameter, then Circle.');
          if (v.kind !== 'scalar' && v.kind !== 'linear') return fail(s, `${kindLabel(v.kind)} is not a diameter.`);
          d = v.value;
        }
        if (!(d > 0)) return fail(s, 'A diameter is more than zero.');
        const rows: [string, Dim][] = [
          ['AREA', dim((Math.PI * d * d) / 4, 'area')],
          ['CIRCUMFERENCE', dim(Math.PI * d, 'linear')],
        ];
        const k = step % rows.length;
        return readout(s, rows[k]![1], `${rows[k]![0]} · ${Number(d.toFixed(4))}" DIA`, { cycle: { key: 'circle', step: k, arg: d } });
      }

      // Flow and Velocity: one keyed, the other through the bore of the pipe set.
      case 'flow':
      case 'velocity': {
        const kind: UnitKind = action;
        const other: HydField = action === 'flow' ? 'velocity' : 'flow';
        const name = action === 'flow' ? 'FLOW' : 'VELOCITY';
        const v = typedValue(s);
        if (v) {
          if (v.kind !== 'scalar' && v.kind !== kind) return fail(s, `${kindLabel(v.kind)} is not a ${action}.`);
          if (!(v.value > 0)) return fail(s, `A ${action} is more than zero.`);
          const hyd = { ...s.hyd, [action]: v.value };
          delete hyd[other];
          return readout({ ...s, hyd }, dim(v.value, kind), name);
        }
        const held = s.hyd[action];
        if (held !== undefined) return readout(s, dim(held, kind), name);
        const o = s.hyd[other];
        if (o === undefined) return fail(s, action === 'flow' ? 'Key a velocity and press Velocity first.' : 'Key a flow and press Flow first.');
        const a = boreArea(s.pipe);
        if (!Number.isFinite(a)) return fail(s, `No ${pipeName(s.pipe)} in the tables.`);
        // Gallons a minute through a square foot at a foot a second.
        const perFps = (a / 144) * GPM_PER_CFS;
        return readout(s, dim(action === 'flow' ? o * perFps : o / perFps, kind), `${name} · ${pipeName(s.pipe)} BORE`);
      }

      // Pressure, Force and Area: any two keyed give the third. With no area
      // keyed it is the bore of the pipe set: the push on a cap or a blind.
      case 'pressure':
      case 'force':
      case 'area': {
        const kind: UnitKind = action;
        const v = typedValue(s);
        if (v) {
          if (v.kind !== 'scalar' && v.kind !== kind) return fail(s, `${kindLabel(v.kind)} is not ${action === 'area' ? 'an area' : `a ${action}`}.`);
          if (!(v.value > 0)) return fail(s, `${action === 'area' ? 'An area' : `A ${action}`} is more than zero.`);
          const order = [...s.hydOrder.filter((f) => f !== action), action].slice(-2);
          const hyd: Partial<Record<HydField, number>> = { flow: s.hyd.flow, velocity: s.hyd.velocity };
          for (const f of order) hyd[f] = f === action ? v.value : s.hyd[f];
          return readout({ ...s, hyd, hydOrder: order }, dim(v.value, kind), action.toUpperCase());
        }
        const has = (f: HydField) => s.hydOrder.includes(f) && s.hyd[f] !== undefined;
        if (has(action)) return readout(s, dim(s.hyd[action]!, kind), action.toUpperCase());
        const onBore = !has('area');
        const area = has('area') ? s.hyd.area! : boreArea(s.pipe);
        const where = onBore ? ` · ON ${sizeLabel(s.pipe.nps)} BORE` : '';
        if (action === 'force') {
          if (!has('pressure')) return fail(s, 'Key a pressure and press Pressure first.');
          if (!Number.isFinite(area)) return fail(s, `No ${pipeName(s.pipe)} in the tables.`);
          return readout(s, dim(s.hyd.pressure! * area, 'force'), `FORCE${where}`);
        }
        if (action === 'pressure') {
          if (!has('force')) return fail(s, 'Key a force and press Force first.');
          if (!Number.isFinite(area)) return fail(s, `No ${pipeName(s.pipe)} in the tables.`);
          return readout(s, dim(s.hyd.force! / area, 'pressure'), `PRESSURE${where}`);
        }
        if (!has('force') || !has('pressure')) return fail(s, 'Key a force and a pressure first.');
        return readout(s, dim(s.hyd.force! / s.hyd.pressure!, 'area'), 'AREA');
      }

      // Prefs: the fraction answers are read to, a step at each press after the first.
      case 'prefs': {
        const den = s.cycle ? FRACTIONS[(Math.max(0, FRACTIONS.indexOf(s.den)) + 1) % FRACTIONS.length]! : s.den;
        return readout({ ...s, den }, null, 'FRACTION · AGAIN TO CHANGE', { text: `1/${den}`, cycle: { key: 'prefs', step: 1 } });
      }

      // Tape: the answers before, newest first, a press at a time.
      case 'tape': {
        if (!s.tape.length) return fail(s, 'The tape is empty. It keeps the last 30 answers.');
        const k = s.cycle ? (s.cycle.step + 1) % s.tape.length : 0;
        return readout(s, null, `TAPE ${k + 1} OF ${s.tape.length}`, { text: s.tape[s.tape.length - 1 - k]!, cycle: { key: 'tape', step: k } });
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
    // Feet is the one conversion a fitter calls out in feet AND inches rather
    // than as a decimal, so the FT key gives 2' 6-1/2" and not 2.5417 ft.
    if (unitId === 'ft') return formatFeetInch(d.value, state.den);
    if (unitId && unitId !== 'in') {
      const def = findUnit(unitId);
      return `${fromBase(d, unitId).toFixed(4).replace(/0+$/, '').replace(/\.$/, '')} ${def.label}`;
    }
    return formatInches(d.value, state.den);
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
  if (state.text !== null) return state.text;
  if (state.acc) return formatDim(state.acc, state);
  return '0';
}

/** What the figure on the readout is, for the line under it: "T.O. · 2\" LR 45°". Empty while a figure is typed. */
export function displayLabel(state: CalcState): string {
  if (state.error || !isEntryEmpty(state.entry)) return '';
  return state.label ?? '';
}

export function pressMany(state: CalcState, steps: [KeyAction, string?][]): CalcState {
  return steps.reduce((acc, [a, v]) => press(acc, a, v), state);
}
