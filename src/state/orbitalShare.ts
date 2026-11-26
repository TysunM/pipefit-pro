// A program passed phone to phone
// -------------------------------
// The QC phone holds the qualified programs; the crew's phones need them.
// With no server, a program travels as a code: shown as a QR on one phone and
// scanned by the other, or sent as text and pasted in. The code carries the
// program, the head and power supply it names, and the crew's own equations
// that work on it, and nothing else.
//
// The code is "PFP1:" then a checksum then the records: a scan that misreads
// a character, or text cut short in a message, is refused rather than half
// taken. Blank fields are left out to keep the QR small enough to read off a
// screen, and filled back in on the way in. Every record then goes through
// the same checks the phone makes on its own store, so a code can add
// nothing the phone would not have accepted from itself.
//
// Taking one in: a program not on the phone is added; one on it at an older
// version is updated, the phone's own kept in its history; one the same, or
// newer here, is left alone. Equipment and equations already on the phone
// are kept as they are: the crew's own edits are never written over.

import { equationSet, validEquation, newEquation, type Equation } from '../calc/orbitalEquations';
import { programFigures } from '../calc/orbitalProgram';
import {
  FAMILIES,
  MAX_HISTORY,
  newGear,
  newProgram,
  putEquation,
  putGear,
  putProgram,
  validGear,
  validProgram,
  type EquationBook,
  type Family,
  type Gear,
  type GearBook,
  type Program,
  type ProgramBody,
  type ProgramBook,
} from './orbitalBook';

export const SHARE_PREFIX = 'PFP1';
/** Past this many characters a QR is too dense to read off a phone's screen: the code goes as text only. */
export const MAX_QR_CODE = 2300;
/** The most a pasted code may be. */
export const MAX_SHARE_CODE = 12_000;

export type Share = { program: Program; gear: Gear[]; equations: Equation[] };

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

// ------------------------------------------------------------ the wire
//
// Short names for every field, a level as its six figures in a row, the
// head and supply as their place in the code's equipment list, and nothing
// that is blank, false, or worked out again on the way in (a record's
// created time, a piece of equipment's kind): a qualified program with its
// head, supply and an equation of the crew's own comes to under a thousand
// characters, a QR read easily off a phone's screen.

const ALIAS: Readonly<Record<string, string>> = {
  id: 'i', name: 'n', material: 'm', od: 'o', wall: 'w', supplyId: 'S', headId: 'H', tungsten: 't', dia: 'd', kind: 'k', gap: 'g',
  gas: 'a', shield: 's', shieldCfh: 'sc', purge: 'p', purgeCfh: 'pc', o2Max: 'x', seq: 'q', prepurge: 'pp', upslope: 'us', delay: 'dl',
  downslope: 'ds', postpurge: 'po', overlap: 'ov', volts: 'V', levels: 'L', extras: 'X', status: 'st', wps: 'W', coupon: 'C', version: 'v',
  qualifiedAt: 'qa', note: 'N', updatedAt: 'ua', family: 'f', make: 'mk', model: 'md', serial: 'sn', ampsMax: 'am', levelsMax: 'lm',
  odMin: 'o1', odMax: 'o2', rpmMax: 'rm', ipmMax: 'im', constant: 'cn', clearance: 'cl', wire: 'wi', osc: 'os', avc: 'av', cooled: 'co',
  calDue: 'cd', expr: 'e', out: 'O', inputs: 'I', key: 'K', label: 'l', unit: 'u', sample: 'sa', builtIn: 'b', value: 'va',
};
const FIELD: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(ALIAS).map(([k, a]) => [a, k]));
const LEVEL = ['deg', 'rpm', 'ip', 'ib', 'tp', 'tb'] as const;
const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/**
 * A record onto the wire: short names, and blank, false and derived fields
 * left out. A list's rows (an equation's inputs, a program's own figures)
 * keep every field: each row is checked whole on the way in.
 */
function toWire(v: unknown, prune = true): unknown {
  if (Array.isArray(v)) return v.map((x) => toWire(x, false));
  if (!isRec(v)) return v;
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v)) {
    if (k === 'createdAt' || k === 'history') continue;
    if (prune && (x === null || x === '' || x === false || (Array.isArray(x) && !x.length))) continue;
    const name = own(ALIAS, k) ? ALIAS[k]! : k;
    out[name] = k === 'levels' && Array.isArray(x) ? x.map((l) => (isRec(l) ? LEVEL.map((f) => l[f]) : l)) : toWire(x, prune);
  }
  return out;
}

/** A record off the wire: full names back, a level's row made a level again. */
function fromWire(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(fromWire);
  if (!isRec(v)) return v;
  const out: Record<string, unknown> = {};
  for (const [a, x] of Object.entries(v)) {
    // JSON.parse keeps a "__proto__" key as data; set here it would swap the record's prototype.
    if (a === '__proto__') continue;
    const k = own(FIELD, a) ? FIELD[a]! : a;
    out[k] = k === 'levels' && Array.isArray(x) ? x.map((row) => (Array.isArray(row) ? Object.fromEntries(LEVEL.map((f, i) => [f, row[i]])) : row)) : fromWire(x);
  }
  return out;
}

/** A pruned record laid back over its blank form: every field there, the record's own where it has one. Created is updated. */
function fill<T>(blank: T, v: unknown): unknown {
  if (!isRec(v) || !isRec(blank)) return v;
  const out: Record<string, unknown> = { ...(blank as Record<string, unknown>) };
  for (const [k, x] of Object.entries(v)) out[k] = isRec(x) && isRec(out[k]) ? fill(out[k], x) : x;
  if ('createdAt' in out && !('createdAt' in v) && typeof out.updatedAt === 'number') out.createdAt = out.updatedAt;
  return out;
}

/** Plain ASCII, so every scanner reads the bytes the same: ° and ³ go as \u escapes inside the JSON. */
const ascii = (s: string) => s.replace(/[\u0080-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);

/** FNV-1a, 32 bits, as eight hex digits: enough to catch a misread character, not a seal. */
export function checksum(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** The crew's own equations that give a figure on this program: they travel with it. */
export function ownEquationsFor(p: ProgramBody, head: Gear | undefined, saved: readonly Equation[]): Equation[] {
  const f = programFigures(p, head, equationSet(saved));
  const used = new Set([...f.program, ...f.levels.flat()].map((x) => x.id));
  return saved.filter((e) => !e.builtIn && used.has(e.id));
}

/** The code for a program, with the equipment it names and the equations of the crew's own that work on it. */
export function packShare(p: Program, gear: readonly Gear[], equations: readonly Equation[]): string {
  const named = gear.filter((g) => g.id === p.headId || g.id === p.supplyId);
  const head = named.find((g) => g.id === p.headId);
  // The head and supply by their place in the list, not their ids twice over.
  const at = (id: string | null) => (id === null ? null : named.findIndex((g) => g.id === id));
  const program = { ...p, headId: at(p.headId), supplyId: at(p.supplyId) };
  const body = { p: toWire(program), g: named.map(({ kind: _k, ...g }) => (void _k, toWire(g))), e: ownEquationsFor(p, head, equations).map((e) => toWire(e)) };
  const json = ascii(JSON.stringify(body));
  return `${SHARE_PREFIX}:${checksum(json)}:${json}`;
}

/** A code read off a QR or pasted from a message, checked and every record made whole, or why not. */
export function unpackShare(text: string): { ok: true; share: Share } | { ok: false; why: string } {
  if (text.length > MAX_SHARE_CODE) return { ok: false, why: 'That is too long to be a program code.' };
  const m = /PFP1:([0-9a-f]{8}):(\{[\s\S]*\})/.exec(text);
  if (!m) return { ok: false, why: /PFP\d/.test(text) ? 'That code is from a newer PipeFit Pro. Update the app, then read it again.' : 'That is not a PipeFit Pro program code.' };
  const json = m[2]!.trim();
  if (checksum(json) !== m[1]) return { ok: false, why: 'That code did not come through whole. Scan it again, or send it again as text.' };
  let body: unknown;
  try {
    body = JSON.parse(json);
  } catch {
    return { ok: false, why: 'That code did not come through whole. Scan it again, or send it again as text.' };
  }
  if (!isRec(body)) return { ok: false, why: 'That code holds no program.' };
  // Each part off the wire on its own: the parts' own names (p, g, e) are not field names.
  body = { p: fromWire(body.p), g: fromWire(body.g), e: fromWire(body.e) };
  if (!isRec(body)) return { ok: false, why: 'That code holds no program.' };
  // Blank, not the new program's defaults: a field the sender left empty comes in empty.
  const blank = { ...newProgram(0), material: '', tungsten: { dia: null, kind: '', gap: null }, gas: { shield: '', shieldCfh: null, purge: '', purgeCfh: null, o2Max: null }, history: [] };
  const gearIn = (Array.isArray(body.g) ? body.g : []).map((g) => {
    const family = isRec(g) && FAMILIES.some((f) => f.id === g.family) ? (g.family as Family) : null;
    return family ? validGear(fill(newGear(family, 0), g)) : null;
  });
  // The head and supply back from their place in the list to their ids.
  const idAt = (n: unknown) => (typeof n === 'number' && Number.isInteger(n) ? gearIn[n]?.id ?? null : null);
  const p = isRec(body.p) ? { ...body.p, headId: idAt(body.p.headId), supplyId: idAt(body.p.supplyId) } : body.p;
  const program = validProgram(fill(blank, p));
  if (!program) return { ok: false, why: 'That code holds a program this phone cannot take: it does not hold together.' };
  const gear = gearIn.filter((g): g is Gear => g !== null);
  const equations: Equation[] = [];
  for (const e of Array.isArray(body.e) ? body.e : []) {
    const ok = validEquation(fill(newEquation(0), e));
    if (ok && !ok.builtIn) equations.push(ok);
  }
  return { ok: true, share: { program, gear, equations } };
}

export type ImportPlan = {
  program: { state: 'new' | 'update' | 'same' | 'older'; have: number | null };
  gear: { id: string; name: string; state: 'new' | 'have' }[];
  equations: { id: string; name: string; state: 'new' | 'have' }[];
};

/** A record as text with its fields in name order: the same record reads the same whichever order its fields came in. */
const stable = (v: unknown): string =>
  Array.isArray(v) ? `[${v.map(stable).join(',')}]` : isRec(v) ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}` : JSON.stringify(v) ?? 'null';

/** What taking a code in would do, before it is done. */
export function planImport(s: Share, books: { programs: ProgramBook; gear: GearBook; equations: EquationBook }): ImportPlan {
  const have = books.programs.programs.find((p) => p.id === s.program.id);
  // The created time does not travel (it is the updated time on the phone it lands on), so it is no difference.
  const same = have && stable({ ...have, history: [], createdAt: 0 }) === stable({ ...s.program, history: [], createdAt: 0 });
  const state = !have ? 'new' : same ? 'same' : s.program.version > have.version || (s.program.version === have.version && s.program.updatedAt > have.updatedAt) ? 'update' : 'older';
  return {
    program: { state, have: have?.version ?? null },
    gear: s.gear.map((g) => ({ id: g.id, name: [g.make, g.model].filter(Boolean).join(' '), state: books.gear.gear.some((x) => x.id === g.id) ? 'have' : 'new' })),
    equations: s.equations.map((e) => ({ id: e.id, name: e.name, state: books.equations.equations.some((x) => x.id === e.id) ? 'have' : 'new' })),
  };
}

/** The code taken in, as planImport says. The phone's own version of an updated program goes into its history. */
export function applyImport(s: Share, books: { programs: ProgramBook; gear: GearBook; equations: EquationBook }): { programs: ProgramBook; gear: GearBook; equations: EquationBook } {
  const plan = planImport(s, books);
  let programs = books.programs;
  if (plan.program.state === 'new' || plan.program.state === 'update') {
    const had = books.programs.programs.find((p) => p.id === s.program.id);
    const history = had ? [(({ history: _h, ...body }) => (void _h, body))(had), ...had.history].slice(0, MAX_HISTORY) : [];
    programs = putProgram(programs, { ...s.program, history }).book;
  }
  let gear = books.gear;
  for (const g of s.gear) if (!gear.gear.some((x) => x.id === g.id)) gear = putGear(gear, g).book;
  let equations = books.equations;
  for (const e of s.equations) if (!equations.equations.some((x) => x.id === e.id)) equations = putEquation(equations, e).book;
  return { programs, gear, equations };
}
