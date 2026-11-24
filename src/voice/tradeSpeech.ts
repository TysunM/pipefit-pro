// The trade keys, by voice
// ------------------------
// What the trade calculator does beyond a sum, said the way a fitter says it:
//
//   The triangle. "Offset 12, run 30, what's the travel?" — two of offset,
//   run, travel and angle keyed into their registers, the one asked for
//   solved by the calculator's own triangle, and the other two read out with
//   it. "Travel for a 12 inch offset at 45 degrees" works the same.
//   Memory. "Store that in 3", "recall 3", "memory plus", "recall memory",
//   "clear memory".
//   The readout. "In feet", "show it in millimetres".
//   Elbows. "Takeout on a 6 inch 45", "screwed 2 inch 90 takeout", "flanged
//   300 class 4 inch 90 takeout", "cut a 6 inch 90 to 30 degrees" (where to
//   mark the heel and the throat, and the takeout of what is left). Answered
//   from the same handbook figures and bend arithmetic Cut Length and the
//   offset screens use, never a new sum.
//
// The keys go to the trade engine (calc/engine.ts); the elbows to
// calc/takeoffCatalog.ts and calc/pipe.ts. A sentence with a word that is not
// one of these is not this file's.

import { numberAt, tokens } from './words';
import { quantity, tradeSteps, type Item } from './calcSpeech';
import { spoken } from './records';
import type { KeyAction } from '../calc/keys';
import type { TriField } from '../calc/triangle';
import { PIPE_SIZES, backArc, centerlineArc, findSize, throatArc, type ElbowRadius } from '../calc/pipe';
import { elbowTakeout, endTakeout, takeoffOption, DEFAULT_TAKEOFF_OPTIONS, LIBRARY_FAMILY, type JointKind } from '../calc/takeoffCatalog';
import type { FlangeClass } from '../calc/flangedFitting';
import { formatInches } from '../calc/ftin';
import type { FractionDenominator } from '../calc/format';
import { spokenLength } from '../calc/spoken';
import type { UnitSystem } from '../calc/units';

type Step = [KeyAction, string?];
type Given = { field: TriField; item: Extract<Item, { k: 'num' }> };

export type TradeSpeech =
  | { kind: 'triangle'; given: Given[]; ask: TriField | null }
  | { kind: 'memory'; op: 'store' | 'recall' | 'plus' | 'minus' | 'clear' | 'recallMemory'; register?: string }
  | { kind: 'show'; unit: 'feet' | 'inch' | 'mm' | 'metre' }
  | { kind: 'elbow'; nps: number; angle: number; from: number | null; cut: boolean; radius: ElbowRadius | null; family: JointKind | 'street' | null; flangeClass: FlangeClass | null };

// ------------------------------------------------------------ the triangle

const FIELDS: [string[], TriField][] = [
  [['offset'], 'offset'],
  [['set'], 'offset'],
  [['rise'], 'offset'],
  [['drop'], 'offset'],
  [['run'], 'run'],
  [['travel'], 'travel'],
  [['angle'], 'angle'],
  [['slope'], 'angle'],
  [['degree', 'angle'], 'angle'],
];
const TRI_FILLER = new Set(['whats', 'what', 'is', 'the', 'find', 'solve', 'for', 'and', 'with', 'a', 'an', 'of', 'give', 'me', 'work', 'out', 'calculate', 'question', 'please', 'my', 'i', 'have', 'got', 'need', 'to', 'it', 'at', 'by', 'inch', 'inches']);
const DEG = new Set(['degree', 'degrees', 'deg']);

const fieldAt = (ws: readonly string[], i: number): { field: TriField; next: number } | null => {
  for (const [p, field] of FIELDS) if (p.every((w, j) => ws[i + j] === w)) return { field, next: i + p.length };
  return null;
};

/** A value for a triangle field at `i`: a length, or degrees for the angle. Joining words ("of", "is") are stepped over. */
function valueAt(ws: readonly string[], i: number): { item: Extract<Item, { k: 'num' }>; next: number; degrees: boolean } | null {
  let j = i;
  while (['of', 'is', 'at', 'equals', 'equal', 'to'].includes(ws[j] ?? '')) j += 1;
  const q = quantity(ws, j);
  if (!q) return null;
  const degrees = DEG.has(ws[q.next] ?? '');
  return { item: q.item, next: degrees ? q.next + 1 : q.next, degrees };
}

export function readTriangle(said: string): Extract<TradeSpeech, { kind: 'triangle' }> | null {
  const ws = tokens(said.replace(/['’]/g, '').replace(/\?/g, ' '));
  const given: Given[] = [];
  let ask: TriField | null = null;
  let loose: { item: Extract<Item, { k: 'num' }>; degrees: boolean } | null = null;
  let named = false;
  const put = (field: TriField, item: Extract<Item, { k: 'num' }>, degrees: boolean): boolean => {
    // An angle is a plain figure in degrees; a length is never one.
    if (field === 'angle' && item.unit !== null) return false;
    if (field !== 'angle' && degrees) return false;
    if (given.some((g) => g.field === field)) return false;
    given.push({ field, item });
    return true;
  };
  for (let i = 0; i < ws.length; ) {
    const f = fieldAt(ws, i);
    if (f) {
      named = true;
      const v = valueAt(ws, f.next);
      // "12 inch offset at 45 degrees": the degrees after a length field are the angle's, not the field's.
      if (v && !(v.degrees && f.field !== 'angle' && loose)) {
        if (!put(f.field, v.item, v.degrees)) return null;
        i = v.next;
        continue;
      }
      // "12 inch offset": the figure said before the name.
      if (loose) {
        if (!put(f.field, loose.item, loose.degrees)) return null;
        loose = null;
        i = f.next;
        continue;
      }
      if (ask && ask !== f.field) return null;
      ask = f.field;
      i = f.next;
      continue;
    }
    const v = valueAt(ws, i);
    if (v) {
      if (loose) return null;
      // "At 45 degrees": a figure in degrees is the angle, named or not.
      if (v.degrees) {
        if (!put('angle', v.item, true)) return null;
      } else loose = { item: v.item, degrees: false };
      i = v.next;
      continue;
    }
    if (TRI_FILLER.has(ws[i]!) || DEG.has(ws[i]!)) {
      i += 1;
      continue;
    }
    return null;
  }
  if (!named || loose || given.length !== 2 || (ask && given.some((g) => g.field === ask))) return null;
  return { kind: 'triangle', given, ask };
}

const REGISTER: Record<TriField, KeyAction> = { offset: 'offset', run: 'run', travel: 'travel', angle: 'angleSlope' };
export const FIELD_NAME: Record<TriField, string> = { offset: 'Offset', run: 'Run', travel: 'Travel', angle: 'Angle' };

/**
 * The keys that hold the two figures given in their registers, after Clear
 * Clear, as a new triangle is started by hand: a register still holding the
 * last triangle's answer would be read back instead of solved.
 */
export function triangleSteps(t: Extract<TradeSpeech, { kind: 'triangle' }>): Step[] {
  const out: Step[] = [['clear'], ['clear']];
  for (const g of t.given) {
    const keys = g.field === 'angle' ? tradeSteps([{ ...g.item, unit: null }]) : tradeSteps([{ ...g.item, unit: g.item.unit ?? 'in' }]);
    out.push(...(keys ?? []), [REGISTER[g.field]]);
  }
  return out;
}

/** The register key that reads a field back, or solves it from the two held. */
export const registerKey = (f: TriField): KeyAction => REGISTER[f];

/** The fields not given, the one asked for first. */
export function unknowns(t: Extract<TradeSpeech, { kind: 'triangle' }>): TriField[] {
  const rest = (['travel', 'run', 'offset', 'angle'] as TriField[]).filter((f) => !t.given.some((g) => g.field === f));
  return t.ask ? [t.ask, ...rest.filter((f) => f !== t.ask)] : rest;
}

// ------------------------------------------------------------ memory and readout

export function readMemory(said: string): Extract<TradeSpeech, { kind: 'memory' }> | null {
  const s = spoken(said).replace(/\b(that|it|this|the answer|answer)\b/g, '').replace(/\s+/g, ' ').trim();
  let m = s.match(/^(?:store|save|keep|put)(?: (?:in|to|into|on))?(?: (?:register|memory|m|slot))? ([1-9])$/);
  if (m) return { kind: 'memory', op: 'store', register: m[1] };
  m = s.match(/^(?:recall|get|bring back|pull up|use)(?: (?:register|memory|m|slot))? ([1-9])$/);
  if (m) return { kind: 'memory', op: 'recall', register: m[1] };
  if (/^(?:memory plus|m plus|add to memory|plus to memory|memory add)$/.test(s)) return { kind: 'memory', op: 'plus' };
  if (/^(?:memory minus|m minus|take off memory|subtract from memory|minus from memory)$/.test(s)) return { kind: 'memory', op: 'minus' };
  if (/^(?:recall memory|memory recall|whats in memory|what is in memory|recall the memory)$/.test(s)) return { kind: 'memory', op: 'recallMemory' };
  if (/^(?:clear memory|memory clear|clear the memory|wipe memory)$/.test(s)) return { kind: 'memory', op: 'clear' };
  return null;
}

/** The memory keys: Store or Rcl and the register; Rcl M+ for the accumulator. */
export function memorySteps(m: Extract<TradeSpeech, { kind: 'memory' }>): Step[] {
  switch (m.op) {
    case 'store':
      return [['store'], ['digit', m.register!]];
    case 'recall':
      return [['recall'], ['digit', m.register!]];
    case 'plus':
      return [['memoryPlus']];
    case 'minus':
      return [['memoryMinus']];
    case 'recallMemory':
      return [['recall'], ['memoryPlus']];
    case 'clear':
      return [['memoryClear']];
  }
}

export function readShow(said: string): Extract<TradeSpeech, { kind: 'show' }> | null {
  const s = tokens(said.replace(/['’]/g, '')).join(' ').replace(/^(?:show|read|give|put|convert|change|make)(?: me)?(?: (?:it|that|the answer|this))?\s*/, '');
  const m = s.match(/^(?:in|to|as|into) (feet(?: and inches)?|foot|inches|inch|millimeters|millimetres|mm|meters|metres|m)$/);
  if (!m) return null;
  const u = m[1]!;
  return { kind: 'show', unit: u.startsWith('f') ? 'feet' : u.startsWith('inch') ? 'inch' : u === 'mm' || u.startsWith('milli') ? 'mm' : 'metre' };
}

// ------------------------------------------------------------ elbows

const SIZES = new Set(PIPE_SIZES.map((p) => p.nps));
const ELBOW_FILLER = new Set(['whats', 'what', 'is', 'the', 'on', 'of', 'for', 'a', 'an', 'at', 'to', 'in', 'elbow', 'ell', 'el', 'fitting', 'degree', 'degrees', 'give', 'me', 'find', 'please', 'and', 'it', 'pipe', 'my', 'i', 'need', 'how', 'much', 'does', 'take', 'out', 'class', 'lb', 'pound']);

/**
 * "Takeout on a 6 inch 45", "screwed 2 inch 90 takeout", "flanged 300 4 inch
 * 90 takeout", "6 inch short radius 90 takeout", "cut a 6 inch 90 to 30
 * degrees", "cutback 6 inch 30".
 */
export function readElbow(said: string): Extract<TradeSpeech, { kind: 'elbow' }> | null {
  const s = ` ${said.toLowerCase().replace(/['’]/g, '')} `
    .replace(/\btake ?offs?\b|\btake ?outs?\b/g, ' takeout ')
    .replace(/\bcut ?backs?\b/g, ' cutback ')
    .replace(/\bbutt ?weld(?:ed)?\b/g, ' welded ')
    .replace(/\blong radius\b|\blr\b/g, ' lr ')
    .replace(/\bshort radius\b|\bsr\b/g, ' sr ');
  const ws = tokens(spoken(s));
  const takeout = ws.includes('takeout');
  const cut = ws.includes('cutback') || ws.includes('cut') || ws.includes('trim');
  if (!takeout && !cut) return null;
  let nps: number | null = null;
  const angles: number[] = [];
  let radius: ElbowRadius | null = null;
  let family: Extract<TradeSpeech, { kind: 'elbow' }>['family'] = null;
  let flangeClass: FlangeClass | null = null;
  let toAngle: number | null = null;
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i]!;
    const n = numberAt(ws, i);
    if (n) {
      const unit = ws[n.next];
      if (unit === 'inch' || unit === 'in' || unit === 'inches') {
        if (nps !== null) return null;
        nps = n.value;
        i = n.next;
        continue;
      }
      // A pressure class said with a flange: 150 to 2500.
      if (family === 'flanged' && !flangeClass && ['150', '300', '400', '600', '900', '1500', '2500'].includes(String(n.value))) {
        flangeClass = String(n.value) as FlangeClass;
        i = n.next - 1;
        continue;
      }
      if (ws[i - 1] === 'to') toAngle = n.value;
      else angles.push(n.value);
      i = n.next - 1;
      continue;
    }
    if (w === 'takeout' || w === 'cutback' || w === 'cut' || w === 'trim') continue;
    if (w === 'lr' || w === 'sr') {
      radius = w === 'lr' ? 'LR' : 'SR';
      continue;
    }
    if (['screwed', 'threaded', 'thread', 'screw'].includes(w)) family = 'screwed';
    else if (['welded', 'weld'].includes(w)) family = 'welded';
    else if (['flanged', 'flange'].includes(w)) family = 'flanged';
    else if (['solder', 'soldered', 'sweat', 'copper'].includes(w)) family = 'soldered';
    else if (w === 'street') family = 'street';
    else if (!ELBOW_FILLER.has(w)) return null;
  }
  if (nps === null || !SIZES.has(nps)) return null;
  if (cut) {
    // "Cut a 6 inch 90 to 30": cut the 90 down to 30. "Cutback 6 inch 30": the same, from a 90.
    const from = toAngle !== null ? (angles[0] ?? 90) : 90;
    const angle = toAngle ?? angles[0] ?? null;
    if (angle === null || !(angle > 0 && angle < from) || !(from === 90 || from === 45)) return null;
    return { kind: 'elbow', nps, angle, from, cut: true, radius, family: family ?? 'welded', flangeClass };
  }
  const angle = angles.length ? angles[0]! : 90;
  if (angles.length > 1 || !(angle > 0 && angle <= 90)) return null;
  return { kind: 'elbow', nps, angle, from: null, cut: false, radius, family, flangeClass };
}

export type ElbowAnswer = { ok: true; reply: string; say: string; takeout: number } | { ok: false; reply: string; say: string };

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const angleText = (a: number) => `${Number(a.toFixed(2))}°`;

/**
 * The answer to an elbow question, from the figures the rest of the app uses.
 * `jobFamily` is the joint the job is in when none was said: screwed for
 * galvanised, a library fitting for plastic and soil pipe, welded otherwise.
 */
export function elbowAnswer(
  e: Extract<TradeSpeech, { kind: 'elbow' }>,
  o: { radius: ElbowRadius; jobFamily: JointKind | 'library'; den: FractionDenominator; system: UnitSystem },
): ElbowAnswer {
  // Read to the fraction the settings read to; with fractions off, to the sixteenth.
  const len = (v: number) => (o.system === 'metric' ? `${Math.round(v * 25.4)} mm` : formatInches(v, o.den || 16));
  const say = (v: number) => spokenLength(v, o.system, o.den);
  const radius = e.radius ?? o.radius;
  const family = e.family ?? (o.jobFamily === 'library' ? 'library' : o.jobFamily);
  // "6" from the size's label 6", for "6 inch" and "6\" LR 90".
  const size = findSize(e.nps).label.replace(/"$/, '');
  const no = (why: string): ElbowAnswer => ({ ok: false, reply: why, say: why });

  if (family === 'library')
    return no('Plastic and soil pipe fittings are the maker\'s: set the takeout once in the fitting library (say "fitting library"), or say "butt weld" or "screwed" for the steel figure.');

  if (e.cut) {
    if (family !== 'welded') return no('Only a butt weld elbow is cut to an odd angle. Say it as a butt weld elbow.');
    const od = findSize(e.nps).od;
    const heel = backArc(e.nps, radius, e.angle, od);
    const throat = throatArc(e.nps, radius, e.angle, od);
    const centre = centerlineArc(e.nps, radius, e.angle);
    const takeout = elbowTakeout(e.nps, radius, e.angle).value;
    const what = `${size}" ${radius} ${e.from} cut to ${angleText(e.angle)}`;
    return {
      ok: true,
      takeout,
      reply: `${what}: mark the heel at ${len(heel)}, the centre line at ${len(centre)} and the throat at ${len(throat)} from one end. Takeout of the ${angleText(e.angle)} piece ${len(takeout)}.`,
      say: `To cut a ${size} inch ${radius === 'LR' ? 'long' : 'short'} radius ${e.from} to ${Number(e.angle.toFixed(2))} degrees: heel ${say(heel)}, throat ${say(throat)}. Takeout ${say(takeout)}.`,
    };
  }

  const angleName = near(e.angle, 90) ? 90 : near(e.angle, 45) ? 45 : null;
  const radiusWord = radius === 'LR' ? 'long radius' : 'short radius';
  if (family === 'welded' || family === null) {
    const r = elbowTakeout(e.nps, radius, e.angle);
    if (!Number.isFinite(r.value)) return no(`No ${size} inch ${radiusWord} ${angleText(e.angle)} butt weld figure: the handbook does not print one.`);
    const from = r.fromTable ? 'handbook 2-42' : 'from the bend radius, as a cut elbow';
    return {
      ok: true,
      takeout: r.value,
      reply: `${size}" ${radius} ${angleText(e.angle)} butt weld elbow: takeout ${len(r.value)} (${from}).`,
      say: `${size} inch ${radiusWord} ${Number(e.angle.toFixed(2))}: takeout ${say(r.value)}.`,
    };
  }
  if (angleName === null) return no(`A ${family === 'street' ? 'street' : family} elbow is made at 90 and 45 only. For an odd angle, say it as a butt weld elbow.`);
  const id =
    family === 'screwed' ? `screwed${angleName}` : family === 'street' ? `street${angleName}` : family === 'flanged' ? `flanged${angleName}` : `solder${angleName}`;
  const opt = takeoffOption(id);
  const opts = { ...DEFAULT_TAKEOFF_OPTIONS, radius, flangeClass: e.flangeClass ?? DEFAULT_TAKEOFF_OPTIONS.flangeClass };
  const v = endTakeout(id, e.nps, opts);
  const name = family === 'flanged' ? `class ${opts.flangeClass} flanged` : family;
  if (!opt || !Number.isFinite(v)) return no(`No ${size} inch ${name} ${angleName} in the handbook.`);
  return {
    ok: true,
    takeout: v,
    reply: `${size}" ${name} ${angleName}° elbow: takeout ${len(v)} (${opt.source}).`,
    say: `${size} inch ${name} ${angleName}: takeout ${say(v)}.`,
  };
}

/** The joint a job's pipe is made up with, when an elbow is asked about without one: plastic and soil pipe are the fitting library's, galvanised is screwed, the rest butt welded. */
export const jobFamilyOf = (material: string): JointKind | 'library' => (LIBRARY_FAMILY[material] ? 'library' : material === 'galv' ? 'screwed' : 'welded');

/** What the trade calculator, or any screen for an elbow, makes of a thing said. */
export function readTrade(said: string): TradeSpeech | null {
  return readElbow(said) ?? readMemory(said) ?? readShow(said) ?? readTriangle(said);
}
