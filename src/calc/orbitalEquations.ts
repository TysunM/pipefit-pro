// The orbital equations
// ---------------------
// Every figure the orbital section works out is an equation kept as a record:
// its name, the formula as typed (orbitalFormula.ts reads it), the answer it
// gives and the boxes it needs, each with a label, a unit and a sample value
// it was last tested with. The ones the app ships with are plain records too,
// so anyone can open one, see exactly how it is worked, change it, or write
// a new one beside it. An edited built-in can always be put back as shipped.
//
// The names are the glue. A program offers its figures by name (OD, wall,
// gap, C for the head's electrode constant, and per level RPM, Ip, Ib, tp,
// tb, deg), and an equation whose boxes are all offered is worked out on it.
// An answer is offered on by its own name, so equations chain: the travel
// speed's IPM feeds the heat input. A figure the program holds is never
// overwritten by an equation's answer.
//
// The built-ins are the arithmetic of the job, not a maker's chart: the
// geometry of a tube going round, the average of a pulsed current, the
// volume of a purge. Two are starting points for a development weld and say
// so: the amps for a wall and the step down by level. A qualified program's
// figures come off its WPS and its coupon, never off these.

import { NAME, nameKey, parseFormula, reservedName, evaluate, MAX_FORMULA, type Node } from './orbitalFormula';

export const EQUATION_NAME_MAX = 40;
export const EQUATION_NOTE_MAX = 400;
export const UNIT_MAX = 12;
export const LABEL_MAX = 32;
export const MAX_EQUATIONS = 80;

export type EqInput = { key: string; label: string; unit: string; sample: number | null };
export type Equation = {
  id: string;
  name: string;
  expr: string;
  out: { key: string; label: string; unit: string };
  inputs: EqInput[];
  note: string;
  /** Shipped with the app. An edited one keeps its id, and can be put back as shipped. */
  builtIn: boolean;
  createdAt: number;
  updatedAt: number;
};

const eq = (id: string, name: string, out: [string, string, string], expr: string, inputs: [string, string, string, number][], note: string): Equation => ({
  id,
  name,
  expr,
  out: { key: out[0], label: out[1], unit: out[2] },
  inputs: inputs.map(([key, label, unit, sample]) => ({ key, label, unit, sample })),
  note,
  builtIn: true,
  createdAt: 0,
  updatedAt: 0,
});

/** What ships. Ids never change once shipped: an edited copy is kept under the same id. */
export const BUILT_IN: readonly Equation[] = [
  eq('travel-speed', 'Travel speed', ['IPM', 'Travel speed', 'in/min'], 'pi * OD * RPM', [['OD', 'Tube OD', 'in', 0.5], ['RPM', 'Rotor speed', 'rev/min', 4]], 'The distance the arc travels round the tube in a minute. Works the same in millimetres: mm in, mm/min out.'),
  eq('rotor-speed', 'Rotor speed for a travel speed', ['RPM', 'Rotor speed', 'rev/min'], 'IPM / (pi * OD)', [['IPM', 'Travel speed', 'in/min', 6], ['OD', 'Tube OD', 'in', 0.5]], 'The RPM to set for a travel speed you want.'),
  eq('id', 'Tube ID', ['ID', 'Tube ID', 'in'], 'OD - 2 * wall', [['OD', 'Tube OD', 'in', 0.5], ['wall', 'Wall', 'in', 0.065]], ''),
  eq('level-time', 'Level time', ['secs', 'Level time', 's'], 'deg / 360 * 60 / RPM', [['deg', 'Level degrees', '°', 90], ['RPM', 'Rotor speed', 'rev/min', 4]], 'How long a level runs: its share of the turn at its rotor speed.'),
  eq('weld-time', 'Time round with the overlap', ['turn', 'Time round', 's'], '60 / RPM * (360 + overlap) / 360', [['RPM', 'Rotor speed', 'rev/min', 4], ['overlap', 'Overlap past the start', '°', 15]], 'One turn and the overlap at one rotor speed. A program whose levels run at different speeds adds its level times instead.'),
  eq('average-amps', 'Average of a pulsed current', ['Iavg', 'Average current', 'A'], '(Ip * tp + Ib * tb) / (tp + tb)', [['Ip', 'Peak (primary) current', 'A', 70], ['tp', 'Time at peak', 's', 0.1], ['Ib', 'Background current', 'A', 20], ['tb', 'Time at background', 's', 0.1]], 'The current the joint feels over a whole pulse. A program with no pulsing has its background equal to its peak.'),
  eq('peak-share', 'Time at peak', ['peakPct', 'Time at peak', '%'], 'tp / (tp + tb) * 100', [['tp', 'Time at peak', 's', 0.1], ['tb', 'Time at background', 's', 0.1]], 'The pulse width, as most power supplies show it.'),
  eq('pulse-rate', 'Pulse rate', ['Hz', 'Pulse rate', 'pulses/s'], '1 / (tp + tb)', [['tp', 'Time at peak', 's', 0.1], ['tb', 'Time at background', 's', 0.1]], ''),
  eq('spot-spacing', 'Distance between pulses', ['spot', 'Travel per pulse', 'in'], 'IPM / 60 * (tp + tb)', [['IPM', 'Travel speed', 'in/min', 6], ['tp', 'Time at peak', 's', 0.1], ['tb', 'Time at background', 's', 0.1]], 'How far the arc moves between one peak and the next. Each spot should overlap the last; set it against the spot width your coupons show.'),
  eq('heat-input', 'Heat input', ['HI', 'Heat input', 'J/in'], 'V * Iavg * 60 / IPM', [['V', 'Arc volts', 'V', 9.5], ['Iavg', 'Average current', 'A', 45], ['IPM', 'Travel speed', 'in/min', 6]], 'Volts × amps × 60 ÷ travel speed, ASME IX QW-409.1(a), with the pulse averaged. A power supply that reads out energy is worked by QW-409.1(c) on the Heat input screen.'),
  eq('tungsten-length', 'Tungsten length', ['L', 'Electrode length', 'in'], 'C - OD / 2 - gap', [['C', "Head's electrode constant", 'in', 0.75], ['OD', 'Tube OD', 'in', 0.5], ['gap', 'Arc gap', 'in', 0.035]], "C is the head's own figure from its manual, or measured once: a good electrode's length + OD ÷ 2 + its gap."),
  eq('purge-time', 'Purge time', ['purgeMin', 'Purge time', 'min'], 'N * (pi / 4 * ID ^ 2 * len / 1728) * 60 / CFH', [['N', 'Volume changes', '', 7], ['ID', 'Tube ID', 'in', 0.37], ['len', 'Length purged', 'in', 240], ['CFH', 'Purge flow', 'ft³/h', 20]], 'The time to change the gas in the run N times at a flow. Your procedure sets N and the oxygen reading to reach; the meter, not the clock, says when it is clean.'),
  eq('start-amps', 'Starting amps for a wall (development)', ['Istart', 'Starting average current', 'A'], '1000 * wall', [['wall', 'Wall', 'in', 0.065]], 'The rule of thumb for a first fusion coupon on stainless tube: about 1 A of average current for each thousandth of wall. A starting point to weld a coupon with, never a production figure.'),
  eq('step-down', 'Amps for the next level (development)', ['Inext', 'Next level current', 'A'], 'Ip * (1 - drop / 100)', [['Ip', 'This level current', 'A', 70], ['drop', 'Step down', '%', 5]], 'The tube heats up as the weld goes round, so each level usually runs a little cooler than the last. Set the step off your coupons.'),
];

export const builtInById = (id: string): Equation | undefined => BUILT_IN.find((e) => e.id === id);

/** The equations in use: the shipped ones, each replaced by its edited copy where there is one, then the crew's own. */
export function equationSet(saved: readonly Equation[]): Equation[] {
  const byId = new Map(saved.map((e) => [e.id, e]));
  const shipped = BUILT_IN.map((b) => byId.get(b.id) ?? b);
  const own = saved.filter((e) => !builtInById(e.id)).sort((a, b) => a.name.localeCompare(b.name));
  return [...shipped, ...own];
}

/** Whether a built-in has been changed from how it shipped. */
export function editedFromShipped(e: Equation): boolean {
  const b = builtInById(e.id);
  if (!b) return false;
  return b.expr !== e.expr || b.out.key !== e.out.key || b.name !== e.name || JSON.stringify(b.inputs.map((i) => [i.key, i.unit])) !== JSON.stringify(e.inputs.map((i) => [i.key, i.unit]));
}

export function equationId(name: string, now: number): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'equation';
  return `own-${slug}-${now.toString(36)}`;
}

export function newEquation(now: number): Equation {
  return { id: 'new', name: '', expr: '', out: { key: '', label: '', unit: '' }, inputs: [], note: '', builtIn: false, createdAt: now, updatedAt: now };
}

/** The names a program and a run offer, and what each is: a new equation that uses one is labelled from here. */
export const OFFERED: Readonly<Record<string, { label: string; unit: string }>> = {
  od: { label: 'Tube OD', unit: 'in' },
  wall: { label: 'Wall', unit: 'in' },
  id: { label: 'Tube ID', unit: 'in' },
  gap: { label: 'Arc gap', unit: 'in' },
  c: { label: "Head's electrode constant", unit: 'in' },
  overlap: { label: 'Overlap past the start', unit: '°' },
  v: { label: 'Arc volts', unit: 'V' },
  cfh: { label: 'Purge flow', unit: 'ft³/h' },
  deg: { label: 'Level degrees', unit: '°' },
  rpm: { label: 'Rotor speed', unit: 'rev/min' },
  ip: { label: 'Peak current', unit: 'A' },
  ib: { label: 'Background current', unit: 'A' },
  tp: { label: 'Time at peak', unit: 's' },
  tb: { label: 'Time at background', unit: 's' },
  iavg: { label: 'Average current', unit: 'A' },
  ipm: { label: 'Travel speed', unit: 'in/min' },
  len: { label: 'Length purged', unit: 'in' },
  n: { label: 'Volume changes', unit: '' },
};
const offeredOf = (name: string) => (Object.prototype.hasOwnProperty.call(OFFERED, nameKey(name)) ? OFFERED[nameKey(name)] : undefined);

/**
 * The input boxes for a formula as typed: one per name it uses, in the order
 * it uses them, keeping what was already filled in for a name still there.
 * A name a program offers comes labelled, with its unit.
 */
export function inputsFor(expr: string, had: readonly EqInput[]): EqInput[] {
  const p = parseFormula(expr);
  if (!p.ok) return had.slice();
  const old = new Map(had.map((i) => [nameKey(i.key), i]));
  return p.vars.map((v) => {
    const o = old.get(nameKey(v));
    const known = offeredOf(v);
    return o ? { ...o, key: v } : { key: v, label: known?.label ?? '', unit: known?.unit ?? '', sample: null };
  });
}

/** Why an equation cannot be saved as it stands, or null when it can. Its sample values must work it out. */
export function equationProblem(e: Equation, others: readonly Equation[]): string | null {
  if (!e.name.trim()) return 'Give it a name: Tungsten length.';
  const p = parseFormula(e.expr);
  if (!p.ok) return p.why;
  const k = e.out.key.trim();
  if (!k) return 'Name the answer: a short name like IPM, the way other equations will ask for it.';
  if (!NAME.test(k)) return 'The answer\'s name starts with a letter and holds only letters, digits and _, 16 at most.';
  if (reservedName(k)) return `${k} is a function or a constant; give the answer another name.`;
  if (p.vars.some((v) => nameKey(v) === nameKey(k))) return `The answer, ${k}, cannot also be one of its own inputs.`;
  for (const v of p.vars) if (!NAME.test(v)) return `${v} is too long for a name: 16 characters at most.`;
  const sameName = others.find((o) => o.id !== e.id && o.name.trim().toLowerCase() === e.name.trim().toLowerCase());
  if (sameName) return `There is already an equation called ${sameName.name}.`;
  const inputs = inputsFor(e.expr, e.inputs);
  const missing = inputs.filter((i) => i.sample === null).map((i) => i.key);
  if (missing.length) return `Test it before saving: put a sample value in ${missing.join(', ')}.`;
  const r = evaluate(p.node, Object.fromEntries(inputs.map((i) => [i.key, i.sample])));
  if (!r.ok) return `With the sample values: ${r.why}`;
  return null;
}

/** An equation made fit to keep: trimmed, cut to size, its inputs matching its formula. */
export function tidyEquation(e: Equation, now: number): Equation {
  return {
    ...e,
    name: e.name.trim().slice(0, EQUATION_NAME_MAX),
    expr: e.expr.trim().slice(0, MAX_FORMULA),
    out: { key: e.out.key.trim(), label: e.out.label.trim().slice(0, LABEL_MAX), unit: e.out.unit.trim().slice(0, UNIT_MAX) },
    inputs: inputsFor(e.expr, e.inputs).map((i) => ({ ...i, label: i.label.trim().slice(0, LABEL_MAX), unit: i.unit.trim().slice(0, UNIT_MAX) })),
    note: e.note.trim().slice(0, EQUATION_NOTE_MAX),
    updatedAt: now,
  };
}

// ------------------------------------------------------------ keeping them

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isTime = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;

export function validEquation(v: unknown): Equation | null {
  if (!isRec(v)) return null;
  const { id, name, expr, out, inputs, note, builtIn, createdAt, updatedAt } = v;
  if (!isStr(id) || !id || !isStr(name) || !name.trim() || !isStr(expr) || !isStr(note) || typeof builtIn !== 'boolean') return null;
  if (!isTime(createdAt) || !isTime(updatedAt)) return null;
  if (builtIn && !builtInById(id)) return null;
  if (!isRec(out) || !isStr(out.key) || !NAME.test(out.key) || reservedName(out.key) || !isStr(out.label) || !isStr(out.unit)) return null;
  if (!Array.isArray(inputs)) return null;
  const ins: EqInput[] = [];
  for (const i of inputs) {
    if (!isRec(i) || !isStr(i.key) || !NAME.test(i.key) || !isStr(i.label) || !isStr(i.unit)) return null;
    if (i.sample !== null && (typeof i.sample !== 'number' || !Number.isFinite(i.sample))) return null;
    ins.push({ key: i.key, label: i.label.slice(0, LABEL_MAX), unit: i.unit.slice(0, UNIT_MAX), sample: i.sample as number | null });
  }
  const p = parseFormula(expr);
  if (!p.ok) return null;
  const want = p.vars.map(nameKey);
  if (want.length !== ins.length || want.some((k, n) => nameKey(ins[n]!.key) !== k)) return null;
  if (want.includes(nameKey(out.key))) return null;
  return {
    id,
    name: name.trim().slice(0, EQUATION_NAME_MAX),
    expr,
    out: { key: out.key, label: out.label.slice(0, LABEL_MAX), unit: out.unit.slice(0, UNIT_MAX) },
    inputs: ins,
    note: note.slice(0, EQUATION_NOTE_MAX),
    builtIn,
    createdAt: createdAt as number,
    updatedAt: updatedAt as number,
  };
}

// ------------------------------------------------------------ working them

export type Figure = { id: string; name: string; key: string; label: string; unit: string; value: number };
/** An equation that gave no answer: the boxes it still wants, or why its figures would not work. */
export type Unworked = { id: string; name: string; needs: string[]; why?: string };
type Ready = { e: Equation; node: Node; keys: string[] };

const readied = new WeakMap<Equation, Ready | null>();
function ready(e: Equation): Ready | null {
  if (readied.has(e)) return readied.get(e)!;
  const p = parseFormula(e.expr);
  const r = p.ok ? { e, node: p.node, keys: p.vars.map(nameKey) } : null;
  readied.set(e, r);
  return r;
}

/**
 * Every answer the equations give on the figures offered, chained: an answer
 * becomes a figure the next equation can use. A figure offered is never
 * replaced, and each answer's name is taken by the first equation that gives
 * it. What could not be worked is listed with the boxes it still wants.
 */
export function solveAll(equations: readonly Equation[], offered: Readonly<Record<string, number | null | undefined>>): { figures: Figure[]; unworked: Unworked[]; values: Record<string, number> } {
  // No prototype: a box named constructor or toString is only ever a box.
  const values: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const [k, v] of Object.entries(offered)) if (typeof v === 'number' && Number.isFinite(v)) values[nameKey(k)] = v;
  const figures: Figure[] = [];
  const done = new Set<string>();
  const failed = new Map<string, string>();
  const pending = equations.map(ready).filter((r): r is Ready => r !== null);
  for (let pass = 0; pass <= pending.length; pass += 1) {
    let moved = false;
    for (const r of pending) {
      if (done.has(r.e.id)) continue;
      const outKey = nameKey(r.e.out.key);
      if (outKey in values) continue;
      if (!r.keys.every((k) => k in values)) continue;
      const w = evaluate(r.node, values);
      done.add(r.e.id);
      if (!w.ok) {
        failed.set(r.e.id, w.why);
        continue;
      }
      values[outKey] = w.value;
      figures.push({ id: r.e.id, name: r.e.name, key: r.e.out.key, label: r.e.out.label || r.e.name, unit: r.e.out.unit, value: w.value });
      moved = true;
    }
    if (!moved) break;
  }
  const unworked: Unworked[] = [];
  for (const r of pending) {
    const why = failed.get(r.e.id);
    if (why) unworked.push({ id: r.e.id, name: r.e.name, needs: [], why });
    else if (!done.has(r.e.id) && !(nameKey(r.e.out.key) in values))
      unworked.push({ id: r.e.id, name: r.e.name, needs: r.e.inputs.filter((i) => !(nameKey(i.key) in values)).map((i) => i.key) });
  }
  return { figures, unworked, values };
}
