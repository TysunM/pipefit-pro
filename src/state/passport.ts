// The skills passport
// -------------------
// What a hand can do, proved two ways. The work saved on this phone is the
// evidence: every flange pulled up to pattern, every hydro held and signed,
// every iso drawn, every cut listed, counted against the skill it shows. A
// foreman's signature on the hand's phone is the sign-off: somebody who was
// there says it was done right. Together they are a record a new hire builds
// on the job from day one and carries to the next job, instead of starting
// as a stranger every time.
//
// The catalogue follows the NCCER Pipefitting curriculum's module titles,
// level by level, because that is the list a contractor's training office
// already keeps. Module numbers change between editions, so the titles are
// what is kept here.
//
// Pure; passports.tsx binds the sign-offs to the shared persistence. The
// evidence is never stored twice: it is read off the records every time.

import type { Joint } from './register';
import type { PressureTest } from './pressureLog';
import type { Weld } from './weldLog';
import type { Cut } from './cutLog';
import type { SavedSketch } from './sketchStore';
import type { SavedSpool } from './spoolStore';
import type { Reading } from './levelLog';
import type { Heat } from '../calc/heat';
import type { Instrument } from './calibration';
import type { ShiftReport } from './shiftLog';
import type { FittingEntry } from './fittingLibrary';
import { isSigned } from './pressureLog';
import { cleanSig, hasSig } from '../calc/signature';
import { cleanProject } from './project';

export const PASSPORT_VERSION = 1;
export const MAX_ATTESTATIONS = 500;
const NAME_MAX = 40;
const NOTE_MAX = 200;

export type SkillArea = 'site' | 'math' | 'drawings' | 'fabrication' | 'install' | 'testing' | 'records';
export const AREA_TITLES: Record<SkillArea, string> = {
  site: 'Site and safety',
  math: 'Trade math',
  drawings: 'Drawings',
  fabrication: 'Fabrication',
  install: 'Installation',
  testing: 'Testing and QC',
  records: 'Records and leadership',
};
export const AREAS: readonly SkillArea[] = ['site', 'math', 'drawings', 'fabrication', 'install', 'testing', 'records'];

export type SkillId =
  | 'orientation'
  | 'handtools'
  | 'oxyfuel'
  | 'rigging'
  | 'offsets'
  | 'isos'
  | 'spools'
  | 'threaded'
  | 'socket'
  | 'fitup'
  | 'valves'
  | 'hangers'
  | 'level'
  | 'boltup'
  | 'retorque'
  | 'hydro'
  | 'heats'
  | 'calibration'
  | 'shift';

export type Skill = {
  id: SkillId;
  area: SkillArea;
  title: string;
  /** The NCCER Pipefitting module it maps to, by title, and its level. */
  nccer: string;
  level: 1 | 2 | 3 | 4;
  /** Records that count as practised. Zero: nothing on the phone shows it, only a sign-off can. */
  needs: number;
  /** What the phone counts, said plainly. */
  what: string;
};

export const SKILLS: readonly Skill[] = [
  { id: 'orientation', area: 'site', title: 'Site orientation', nccer: 'Orientation to the Trade', level: 1, needs: 0, what: 'Signed off after the site orientation.' },
  { id: 'handtools', area: 'site', title: 'Hand and power tools', nccer: 'Pipefitting Hand Tools; Pipefitting Power Tools', level: 1, needs: 0, what: 'Signed off by whoever watched the tools used right.' },
  { id: 'oxyfuel', area: 'site', title: 'Oxyfuel cutting', nccer: 'Oxyfuel Cutting', level: 1, needs: 0, what: 'Signed off at the torch.' },
  { id: 'rigging', area: 'site', title: 'Rigging and signalling', nccer: 'Rigging Equipment; Rigging Practices', level: 3, needs: 0, what: 'Signed off on a lift.' },
  { id: 'offsets', area: 'math', title: 'Offsets and cut lengths', nccer: 'Pipefitting Trade Math', level: 2, needs: 10, what: 'Cuts worked in Cut Length and put on the cut list.' },
  { id: 'isos', area: 'drawings', title: 'Read and draw isometrics', nccer: 'Drawings and Detail Sheets', level: 2, needs: 5, what: 'Isos drawn on the sketch pad, three lines or more.' },
  { id: 'spools', area: 'fabrication', title: 'Spool fabrication from drawings', nccer: 'Butt Weld Pipe Fabrication', level: 2, needs: 5, what: 'Spools built and saved by their mark.' },
  { id: 'threaded', area: 'fabrication', title: 'Threaded pipe fabrication', nccer: 'Threaded Pipe Fabrication', level: 2, needs: 0, what: 'Signed off on a threaded run.' },
  { id: 'socket', area: 'fabrication', title: 'Socket weld and no-hub takeouts', nccer: 'Socket Weld Pipe Fabrication', level: 2, needs: 5, what: 'Takeouts measured and saved to the fitting library.' },
  { id: 'fitup', area: 'fabrication', title: 'Fit-up for welding', nccer: 'Butt Weld Pipe Fabrication', level: 2, needs: 10, what: 'Welds logged as made, with the fit-up behind them.' },
  { id: 'valves', area: 'install', title: 'Identify and install valves', nccer: 'Identifying and Installing Valves', level: 2, needs: 0, what: 'Signed off on a valve set in.' },
  { id: 'hangers', area: 'install', title: 'Pipe hangers and supports', nccer: 'Pipe Hangers and Supports', level: 3, needs: 0, what: 'Signed off on supports set to the drawing.' },
  { id: 'level', area: 'install', title: 'Level and grade', nccer: 'Introduction to Aboveground Pipe Installation', level: 3, needs: 10, what: 'Level readings saved against a pipe tag.' },
  { id: 'boltup', area: 'install', title: 'Flange bolt-up to pattern and torque', nccer: 'Introduction to Aboveground Pipe Installation', level: 3, needs: 10, what: 'Joints bolted up to the cross pattern and finished.' },
  { id: 'retorque', area: 'install', title: 'Re-torque after heat-up', nccer: 'Introduction to Aboveground Pipe Installation', level: 3, needs: 5, what: 'Re-torque checks recorded on finished joints.' },
  { id: 'hydro', area: 'testing', title: 'Hydrostatic and pneumatic testing', nccer: 'Testing Piping Systems and Equipment', level: 3, needs: 3, what: 'Tests held, passed or failed, and signed as the tester.' },
  { id: 'heats', area: 'testing', title: 'Material traceability', nccer: 'Standards and Specifications', level: 3, needs: 10, what: 'Heat numbers entered in the heat book.' },
  { id: 'calibration', area: 'testing', title: 'Instrument calibration control', nccer: 'Testing Piping Systems and Equipment', level: 3, needs: 3, what: 'Calibrations recorded against instruments.' },
  { id: 'shift', area: 'records', title: 'Shift reporting', nccer: 'Introduction to Supervisory Roles', level: 4, needs: 5, what: 'Shift reports written up with something in them.' },
];

export const skill = (id: string): Skill | undefined => SKILLS.find((s) => s.id === id);

// ------------------------------------------------------------ evidence off the records

/** One record that shows a skill: what it was, when, and on which job. */
export type Evidence = { skill: SkillId; at: number; what: string; project: string };

export type Records = {
  joints?: readonly Joint[];
  tests?: readonly PressureTest[];
  welds?: readonly Weld[];
  cuts?: readonly Cut[];
  sketches?: readonly SavedSketch[];
  spools?: readonly SavedSpool[];
  readings?: readonly Reading[];
  heats?: readonly Heat[];
  instruments?: readonly Instrument[];
  reports?: readonly ShiftReport[];
  fittings?: readonly FittingEntry[];
};

const utc = (d: string) => {
  const [y, m, dd] = d.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, dd, 12);
};

/** Every record on the phone that shows a skill, newest first. */
export function evidence(r: Records): Evidence[] {
  const out: Evidence[] = [];
  const put = (skill: SkillId, at: number, what: string, project = '') => {
    if (Number.isFinite(at) && at > 0) out.push({ skill, at, what, project: cleanProject(project) });
  };
  for (const c of r.cuts ?? []) put('offsets', c.createdAt, `Mark ${c.mark}, ${c.pipe}`, c.project);
  for (const s of r.sketches ?? []) if (s.strokes.length >= 3) put('isos', s.updatedAt, s.name, s.project);
  for (const s of r.spools ?? []) if (s.legs.length >= 2) put('spools', s.updatedAt, s.name, s.project);
  for (const e of r.fittings ?? []) put('socket', e.setAt, e.key.split('|').slice(0, 2).join(' ').trim());
  for (const w of r.welds ?? []) if (w.day) put('fitup', utc(w.day), `${w.line ? `${w.line} ` : ''}weld ${w.number}`, w.project);
  for (const x of r.readings ?? []) put('level', x.createdAt, x.tag, x.project);
  for (const j of r.joints ?? []) {
    if (j.completedAt !== null && j.tag.trim()) put('boltup', j.completedAt, `${j.tag}${j.witnessedBy.trim() ? `, witnessed by ${j.witnessedBy.trim()}` : ''}`, j.project);
    for (const c of j.checks) put('retorque', c.at, `${j.tag}${c.moved ? ', took up' : ', held'}`, j.project);
  }
  for (const t of r.tests ?? []) if (t.result !== 'open' && isSigned(t.people.tester)) put('hydro', t.updatedAt, `${t.pkg || 'test'} ${t.result === 'pass' ? 'passed' : 'failed'}, ${t.testPsi ?? '—'} psi`, t.project);
  for (const h of r.heats ?? []) put('heats', h.createdAt, `${h.heat}${h.material ? ` ${h.material}` : ''}`);
  for (const i of r.instruments ?? []) for (const c of i.history) put('calibration', utc(c.on), `${i.tag}${c.cert ? ` cert ${c.cert}` : ''}`);
  for (const s of r.reports ?? []) if (s.text.trim() || s.welds.length || s.spools.length) put('shift', s.updatedAt, `${s.day}${s.project ? ` ${s.project}` : ''}`, s.project);
  return out.sort((a, b) => b.at - a.at);
}

// ------------------------------------------------------------ sign-offs

export const ROLES = ['Foreman', 'General foreman', 'QC', 'Superintendent', 'Instructor'] as const;
export type Role = (typeof ROLES)[number];

/** A foreman's word that a skill was done right, signed on the hand's phone. */
export type Attestation = {
  id: string;
  skill: SkillId;
  /** Who signed, and what they are on the job. */
  by: string;
  role: Role;
  sig: string;
  at: number;
  project: string;
  note: string;
};

export type Passport = { attestations: Attestation[]; foreign: boolean; dropped: number };
export const emptyPassport = (): Passport => ({ attestations: [], foreign: false, dropped: 0 });

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

export function validAttestation(v: unknown): Attestation | null {
  if (!isRec(v) || typeof v.id !== 'string' || !v.id) return null;
  if (!skill(String(v.skill))) return null;
  const by = text(v.by, NAME_MAX);
  const sig = cleanSig(v.sig);
  if (!by || !hasSig(sig) || !isNum(v.at) || v.at <= 0) return null;
  return {
    id: v.id,
    skill: v.skill as SkillId,
    by,
    role: ROLES.includes(v.role as Role) ? (v.role as Role) : 'Foreman',
    sig,
    at: v.at,
    project: cleanProject(v.project),
    note: text(v.note, NOTE_MAX),
  };
}

export const serialisePassport = (p: Passport): string => JSON.stringify({ v: PASSPORT_VERSION, attestations: p.attestations });

export function parsePassport(raw: string | null | undefined): Passport {
  if (!raw) return emptyPassport();
  let p: unknown;
  try {
    p = JSON.parse(raw);
  } catch {
    return { ...emptyPassport(), dropped: 1 };
  }
  if (!isRec(p) || typeof p.v !== 'number' || !Array.isArray(p.attestations)) return { ...emptyPassport(), dropped: 1 };
  if (p.v > PASSPORT_VERSION) return { ...emptyPassport(), foreign: true };
  const out: Attestation[] = [];
  const seen = new Set<string>();
  let dropped = 0;
  for (const x of p.attestations) {
    const ok = validAttestation(x);
    if (!ok || seen.has(ok.id)) {
      dropped += 1;
      continue;
    }
    seen.add(ok.id);
    out.push(ok);
  }
  return { attestations: out.sort((a, b) => b.at - a.at).slice(0, MAX_ATTESTATIONS), foreign: false, dropped };
}

export type NewAttestation = { skill: SkillId; by: string; role: Role; sig: string; project: string; note: string };

/** A sign-off added. Nothing without a name and a signature. */
export function attest(p: Passport, a: NewAttestation, now: number): { passport: Passport; ok: true; id: string } | { passport: Passport; ok: false; why: string } {
  if (!text(a.by, NAME_MAX)) return { passport: p, ok: false, why: 'Give the name of who is signing.' };
  if (!hasSig(cleanSig(a.sig))) return { passport: p, ok: false, why: 'It needs a signature.' };
  if (p.attestations.length >= MAX_ATTESTATIONS) return { passport: p, ok: false, why: 'The passport is full.' };
  let id = `at${now.toString(36)}`;
  for (let n = 2; p.attestations.some((x) => x.id === id); n++) id = `at${now.toString(36)}-${n}`;
  const next = validAttestation({ ...a, id, at: now });
  if (!next) return { passport: p, ok: false, why: 'That sign-off does not read.' };
  return { passport: { ...p, attestations: [next, ...p.attestations].sort((x, y) => y.at - x.at) }, ok: true, id };
}

export const revoke = (p: Passport, id: string): Passport => ({ ...p, attestations: p.attestations.filter((a) => a.id !== id) });

/**
 * The record code printed beside a sign-off: eight hex digits worked from the
 * holder, the skill, the signer, the time and the signature itself. The same
 * sign-off on the phone gives the same code, so a printed passport can be
 * checked against the phone it came from. It is a checksum, not a seal.
 */
export function recordCode(a: Attestation, holder: string): string {
  const s = `${holder.trim().toUpperCase()}|${a.skill}|${a.by.toUpperCase()}|${a.at}|${a.sig}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const hex = h.toString(16).padStart(8, '0').toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
}

// ------------------------------------------------------------ where each skill stands

export type Standing = 'competent' | 'practised' | 'started' | 'none';
export const STANDING_WORDS: Record<Standing, string> = { competent: 'Signed off', practised: 'Practised', started: 'Started', none: 'Not yet' };

export type SkillStanding = {
  skill: Skill;
  standing: Standing;
  /** Records on the phone that show it, newest first. */
  evidence: Evidence[];
  /** Sign-offs, newest first. */
  attestations: Attestation[];
};

/**
 * A skill stands on the sign-off first: whoever watched it done is the
 * authority. Without one, the phone's own count says practised (enough
 * records to show it is routine), started, or not yet.
 */
export function standingOf(s: Skill, ev: readonly Evidence[], at: readonly Attestation[]): Standing {
  if (at.length) return 'competent';
  if (!s.needs) return 'none';
  if (ev.length >= s.needs) return 'practised';
  return ev.length ? 'started' : 'none';
}

export function standings(r: Records, p: Passport): SkillStanding[] {
  const ev = evidence(r);
  return SKILLS.map((s) => {
    const mine = ev.filter((e) => e.skill === s.id);
    const signed = p.attestations.filter((a) => a.skill === s.id);
    return { skill: s, standing: standingOf(s, mine, signed), evidence: mine, attestations: signed };
  });
}

/** "6 signed off · 4 practised · 3 started of 19". */
export function standingSummary(xs: readonly SkillStanding[]): string {
  const n = (st: Standing) => xs.filter((x) => x.standing === st).length;
  const parts = [n('competent') && `${n('competent')} signed off`, n('practised') && `${n('practised')} practised`, n('started') && `${n('started')} started`].filter(Boolean);
  return parts.length ? `${parts.join(' · ')} of ${xs.length}` : `Nothing yet of ${xs.length} skills`;
}
