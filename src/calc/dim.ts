import { MM_PER_INCH, rad, deg } from './units';

export type UnitKind =
  | 'scalar'
  | 'linear'
  | 'area'
  | 'volume'
  | 'angle'
  | 'weight'
  | 'flow'
  | 'velocity'
  | 'pressure'
  | 'force'
  | 'temperature';

export type Dim = { value: number; kind: UnitKind };

export const dim = (value: number, kind: UnitKind = 'scalar'): Dim => ({ value, kind });

export class DimError extends Error {}

const MM3_PER_IN3 = 16387.064;
const IN3_PER_LITRE = 1e6 / MM3_PER_IN3;
const IN3_PER_GALLON = 231;
const IN_PER_METRE = 1000 / MM_PER_INCH;

export type UnitDef = { id: string; kind: UnitKind; label: string; perBase: number };

export const UNITS: UnitDef[] = [
  { id: 'in', kind: 'linear', label: 'inch', perBase: 1 },
  { id: 'ft', kind: 'linear', label: 'feet', perBase: 12 },
  { id: 'yd', kind: 'linear', label: 'yard', perBase: 36 },
  { id: 'mm', kind: 'linear', label: 'mm', perBase: 1 / MM_PER_INCH },
  { id: 'cm', kind: 'linear', label: 'cm', perBase: 10 / MM_PER_INCH },
  { id: 'm', kind: 'linear', label: 'm', perBase: IN_PER_METRE },

  { id: 'in2', kind: 'area', label: 'sq inch', perBase: 1 },
  { id: 'ft2', kind: 'area', label: 'sq feet', perBase: 144 },
  { id: 'yd2', kind: 'area', label: 'sq yard', perBase: 1296 },
  { id: 'mm2', kind: 'area', label: 'sq mm', perBase: 1 / (MM_PER_INCH * MM_PER_INCH) },
  { id: 'm2', kind: 'area', label: 'sq m', perBase: IN_PER_METRE * IN_PER_METRE },

  { id: 'in3', kind: 'volume', label: 'cu inch', perBase: 1 },
  { id: 'ft3', kind: 'volume', label: 'cu feet', perBase: 1728 },
  { id: 'yd3', kind: 'volume', label: 'cu yard', perBase: 46656 },
  { id: 'gal', kind: 'volume', label: 'gallon', perBase: IN3_PER_GALLON },
  { id: 'l', kind: 'volume', label: 'litre', perBase: IN3_PER_LITRE },
  { id: 'mm3', kind: 'volume', label: 'cu mm', perBase: 1 / MM3_PER_IN3 },
  { id: 'm3', kind: 'volume', label: 'cu m', perBase: IN_PER_METRE ** 3 },
  { id: 'bbl', kind: 'volume', label: 'barrel', perBase: IN3_PER_GALLON * 42 },

  { id: 'deg', kind: 'angle', label: 'deg', perBase: 1 },
  { id: 'rad', kind: 'angle', label: 'rad', perBase: deg(1) },

  { id: 'lb', kind: 'weight', label: 'lb', perBase: 1 },
  { id: 'kg', kind: 'weight', label: 'kg', perBase: 2.2046226218 },
  { id: 'ton', kind: 'weight', label: 'ton', perBase: 2000 },
  { id: 'tonne', kind: 'weight', label: 'tonne', perBase: 2204.6226218 },

  { id: 'gpm', kind: 'flow', label: 'gal/min', perBase: 1 },
  { id: 'gph', kind: 'flow', label: 'gal/hr', perBase: 1 / 60 },
  { id: 'lpm', kind: 'flow', label: 'l/min', perBase: IN3_PER_LITRE / IN3_PER_GALLON },
  { id: 'lps', kind: 'flow', label: 'l/sec', perBase: (IN3_PER_LITRE / IN3_PER_GALLON) * 60 },
  { id: 'cfm', kind: 'flow', label: 'cu ft/min', perBase: 1728 / IN3_PER_GALLON },
  { id: 'cfs', kind: 'flow', label: 'cu ft/sec', perBase: (1728 / IN3_PER_GALLON) * 60 },

  { id: 'fps', kind: 'velocity', label: 'ft/sec', perBase: 1 },
  { id: 'fpm', kind: 'velocity', label: 'ft/min', perBase: 1 / 60 },
  { id: 'mps', kind: 'velocity', label: 'm/sec', perBase: IN_PER_METRE / 12 },

  { id: 'psi', kind: 'pressure', label: 'psi', perBase: 1 },
  { id: 'kpa', kind: 'pressure', label: 'kPa', perBase: 0.1450377377 },
  { id: 'bar', kind: 'pressure', label: 'bar', perBase: 14.503773773 },
  { id: 'fthd', kind: 'pressure', label: 'ft head', perBase: 0.4335275 },
  { id: 'inhg', kind: 'pressure', label: 'inHg', perBase: 0.4911541 },

  { id: 'lbf', kind: 'force', label: 'lbf', perBase: 1 },
  { id: 'n', kind: 'force', label: 'N', perBase: 0.2248089431 },
  { id: 'kn', kind: 'force', label: 'kN', perBase: 224.8089431 },

  { id: 'f', kind: 'temperature', label: '°F', perBase: 1 },
  { id: 'c', kind: 'temperature', label: '°C', perBase: 1 },
];

const BY_ID = new Map(UNITS.map((u) => [u.id, u]));

export function findUnit(id: string): UnitDef {
  const u = BY_ID.get(id);
  if (!u) throw new DimError(`Unknown unit ${id}.`);
  return u;
}

export function unitsFor(kind: UnitKind): UnitDef[] {
  return UNITS.filter((u) => u.kind === kind);
}

export function toBase(value: number, unitId: string): Dim {
  const u = findUnit(unitId);
  if (u.kind === 'temperature') return dim(unitId === 'c' ? value * 1.8 + 32 : value, 'temperature');
  return dim(value * u.perBase, u.kind);
}

export function fromBase(d: Dim, unitId: string): number {
  const u = findUnit(unitId);
  if (u.kind !== d.kind) throw new DimError(`Cannot read ${d.kind} as ${u.label}.`);
  if (u.kind === 'temperature') return unitId === 'c' ? (d.value - 32) / 1.8 : d.value;
  return d.value / u.perBase;
}

const KIND_LABEL: Record<UnitKind, string> = {
  scalar: 'a number',
  linear: 'a length',
  area: 'an area',
  volume: 'a volume',
  angle: 'an angle',
  weight: 'a weight',
  flow: 'a flow',
  velocity: 'a velocity',
  pressure: 'a pressure',
  force: 'a force',
  temperature: 'a temperature',
};

export const kindLabel = (kind: UnitKind): string => KIND_LABEL[kind];

function requireFinite(d: Dim): Dim {
  if (!Number.isFinite(d.value)) throw new DimError('Not a number.');
  return d;
}

export function add(a: Dim, b: Dim): Dim {
  if (a.kind === b.kind) return requireFinite(dim(a.value + b.value, a.kind));
  if (a.kind === 'scalar') return requireFinite(dim(a.value + b.value, b.kind));
  if (b.kind === 'scalar') return requireFinite(dim(a.value + b.value, a.kind));
  throw new DimError(`Cannot add ${kindLabel(b.kind)} to ${kindLabel(a.kind)}.`);
}

export function subtract(a: Dim, b: Dim): Dim {
  if (a.kind === b.kind) return requireFinite(dim(a.value - b.value, a.kind));
  if (a.kind === 'scalar') return requireFinite(dim(a.value - b.value, b.kind));
  if (b.kind === 'scalar') return requireFinite(dim(a.value - b.value, a.kind));
  throw new DimError(`Cannot subtract ${kindLabel(b.kind)} from ${kindLabel(a.kind)}.`);
}

function productKind(a: UnitKind, b: UnitKind): UnitKind {
  if (a === 'scalar') return b;
  if (b === 'scalar') return a;
  if (a === 'linear' && b === 'linear') return 'area';
  if ((a === 'linear' && b === 'area') || (a === 'area' && b === 'linear')) return 'volume';
  throw new DimError(`Cannot multiply ${kindLabel(a)} by ${kindLabel(b)}.`);
}

export function multiply(a: Dim, b: Dim): Dim {
  if (a.kind === 'temperature' || b.kind === 'temperature') {
    if (a.kind !== 'scalar' && b.kind !== 'scalar') throw new DimError('Cannot multiply temperatures.');
  }
  return requireFinite(dim(a.value * b.value, productKind(a.kind, b.kind)));
}

function quotientKind(a: UnitKind, b: UnitKind): UnitKind {
  if (b === 'scalar') return a;
  if (a === b) return 'scalar';
  if (a === 'area' && b === 'linear') return 'linear';
  if (a === 'volume' && b === 'area') return 'linear';
  if (a === 'volume' && b === 'linear') return 'area';
  throw new DimError(`Cannot divide ${kindLabel(a)} by ${kindLabel(b)}.`);
}

export function divide(a: Dim, b: Dim): Dim {
  if (b.value === 0) throw new DimError('Cannot divide by zero.');
  return requireFinite(dim(a.value / b.value, quotientKind(a.kind, b.kind)));
}

export function square(a: Dim): Dim {
  return multiply(a, a);
}

export function squareRoot(a: Dim): Dim {
  if (a.value < 0) throw new DimError('Cannot take the root of a negative.');
  if (a.kind === 'scalar') return dim(Math.sqrt(a.value), 'scalar');
  if (a.kind === 'area') return dim(Math.sqrt(a.value), 'linear');
  throw new DimError(`Cannot take the root of ${kindLabel(a.kind)}.`);
}

export function power(a: Dim, b: Dim): Dim {
  if (a.kind !== 'scalar' || b.kind !== 'scalar') throw new DimError('Powers take plain numbers.');
  return requireFinite(dim(a.value ** b.value, 'scalar'));
}

export function negate(a: Dim): Dim {
  return dim(-a.value, a.kind);
}

export function reciprocal(a: Dim): Dim {
  return divide(dim(1, 'scalar'), a);
}

export function percentOf(a: Dim, b: Dim): Dim {
  return multiply(a, dim(b.value / 100, 'scalar'));
}

function requireAngle(a: Dim): number {
  if (a.kind === 'angle' || a.kind === 'scalar') return a.value;
  throw new DimError(`${kindLabel(a.kind)} is not an angle.`);
}

export const sine = (a: Dim): Dim => dim(Math.sin(rad(requireAngle(a))), 'scalar');
export const cosine = (a: Dim): Dim => dim(Math.cos(rad(requireAngle(a))), 'scalar');

export function tangent(a: Dim): Dim {
  const d = requireAngle(a);
  if (Math.abs(((d % 180) + 180) % 180 - 90) < 1e-9) throw new DimError('Tangent is undefined at 90°.');
  return dim(Math.tan(rad(d)), 'scalar');
}

function requireRatio(a: Dim, name: string): number {
  if (a.kind !== 'scalar') throw new DimError(`${name} takes a plain ratio.`);
  return a.value;
}

export function arcSine(a: Dim): Dim {
  const v = requireRatio(a, 'Arcsine');
  if (v < -1 || v > 1) throw new DimError('Arcsine needs a ratio between -1 and 1.');
  return dim(deg(Math.asin(v)), 'angle');
}

export function arcCosine(a: Dim): Dim {
  const v = requireRatio(a, 'Arccosine');
  if (v < -1 || v > 1) throw new DimError('Arccosine needs a ratio between -1 and 1.');
  return dim(deg(Math.acos(v)), 'angle');
}

export const arcTangent = (a: Dim): Dim => dim(deg(Math.atan(requireRatio(a, 'Arctangent'))), 'angle');
