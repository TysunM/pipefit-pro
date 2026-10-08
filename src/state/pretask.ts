// The pre-task plan
// -----------------
// The paper a foreman does every morning before the crew touches a tool: what
// the job is today, where, who is on it, what can hurt them, what is done
// about each of those, which permits are needed, what PPE past the basics,
// where the muster point and the eyewash are, the toolbox talk given, and
// the crew's signatures that they heard it. A JSA, a JHA, a tailgate, a
// pre-task plan: one sheet by any of those names, and the one an auditor
// asks for first after an injury.
//
// One plan per job per day, the way the shift report works. Hazards come off
// a library with the control a journeyman would name for each, so a foreman
// with gloves on taps the hazard and edits the control, rather than typing
// the same sentence every morning. The plan is closed by the foreman's
// signature; a closed plan is a record in the skills passport.
//
// Pure; pretasks.tsx binds it to the shared persistence.

import { dayKey, isDay } from '../calc/days';
import { cleanProject, sameProject } from './project';
import { cleanSig } from '../calc/signature';
import { BUILTIN } from './orientation';

export const PRETASK_VERSION = 1;
export const MAX_PLANS = 180;
const MAX_HAZARDS = 20;
const MAX_CREW = 40;
const TEXT_MAX = 400;
const NAME_MAX = 40;

export type Hazard = { id: string; label: string; control: string };

/** What can hurt a pipefitting crew, with the control named the way a journeyman names it. */
export const HAZARDS: readonly Hazard[] = [
  { id: 'pinch', label: 'Pinch points and hands', control: 'Hands out of the line of fire; drift pins for bolt holes, never fingers; gloves for the task.' },
  { id: 'falls', label: 'Working at height', control: 'Harness and 100% tie-off at six feet and above; anchor inspected; scaffold tag read before stepping on.' },
  { id: 'dropped', label: 'Dropped objects', control: 'Tools tethered or in a bag; barricade and signs below; nobody works under the work.' },
  { id: 'hotwork', label: 'Hot work', control: 'Permit in hand; combustibles 35 ft clear or covered; fire watch through the work and 30 minutes after; extinguisher at hand.' },
  { id: 'energy', label: 'Stored energy and line break', control: 'Isolated, locked, tagged and tried; line bled, drained and blinded; far-side bolts cracked first so it opens away from you.' },
  { id: 'lifting', label: 'Lifting and rigging', control: 'Trained rigger rigs; one signal person; tag lines; nobody under the load; two-man lift or a machine over 50 lb.' },
  { id: 'confined', label: 'Confined space', control: 'Permit; atmosphere tested and monitored; attendant at the hole; rescue team named; nobody goes in after a man down.' },
  { id: 'excavation', label: 'Excavation', control: 'Protective system at five feet; ladder within 25 ft; spoil two feet back; competent person inspected this shift.' },
  { id: 'chemical', label: 'Chemicals, dust and fumes', control: 'SDS read; gloves and face shield per the SDS; eyewash located; wet methods or a fitted respirator for silica; weld fume extraction or respirator.' },
  { id: 'heat', label: 'Heat or cold stress', control: 'Water every 15 to 20 minutes; shade or warm-up breaks on the schedule; watch each other for the signs.' },
  { id: 'traffic', label: 'Mobile equipment and traffic', control: 'Hi-vis on; eye contact with the operator before approaching; spotter for reversing; stay out of the swing radius.' },
  { id: 'noise', label: 'Noise', control: 'Hearing protection where posted and around grinders, impacts and blowers.' },
  { id: 'electrical', label: 'Electrical', control: 'GFCI on every cord; cords inspected; clear of live panels; qualified person only inside a cabinet.' },
  { id: 'lineoffire', label: 'Line of fire', control: 'Stand clear of pressurised lines, loads under tension and anything that can swing; crack a flange so it opens away from you.' },
  { id: 'slips', label: 'Slips, trips and housekeeping', control: 'Walkways clear; cords and hoses off the walkway or bridged; spills cleaned at once.' },
  { id: 'grinding', label: 'Grinding and cutting', control: 'Guard on; face shield over safety glasses; wheel rated at or above the tool; FR clothing; sparks shielded from others.' },
  { id: 'simops', label: 'Other crews alongside', control: 'Who is working above, below and beside us named; barricades up; permit-to-work checked with the other foreman.' },
];
export const hazard = (id: string): Hazard | undefined => HAZARDS.find((h) => h.id === id);

export const PERMITS = ['Hot work', 'Confined space', 'Lockout/tagout', 'Excavation', 'Critical lift', 'Line break', 'Working at height', 'Electrical'] as const;
export const PPE_EXTRA = ['Face shield', 'FR clothing', 'Hearing protection', 'Respirator', 'Harness', 'Chemical gloves', 'Welding hood', 'Cut gloves'] as const;

/** A hazard on the plan: one off the library, or one typed in, with the control for it. */
export type PlanHazard = { id: string; label: string; control: string };
export type Attendee = { name: string; sig: string; at: number };
export type Signer = { name: string; sig: string; signedAt: number | null };

export type Plan = {
  id: string;
  day: string;
  project: string;
  /** What the crew is doing today, in a line. */
  task: string;
  /** Where: unit, elevation, line. */
  area: string;
  hazards: PlanHazard[];
  permits: string[];
  ppe: string[];
  muster: string;
  /** Nearest eyewash, extinguisher, first aid; the rescue plan where one is needed. */
  emergency: string;
  talk: { topic: string; notes: string };
  crew: Attendee[];
  foreman: Signer;
  createdAt: number;
  updatedAt: number;
};

export type PlanLog = { plans: Plan[]; foreign: boolean; dropped: number };
export const emptyPlans = (): PlanLog => ({ plans: [], foreign: false, dropped: 0 });

// ------------------------------------------------------------ checking what is stored

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const line = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').trim().slice(0, max) : '');
const strings = (v: unknown, max: number, n: number): string[] => [...new Set((Array.isArray(v) ? v : []).map((x) => line(x, max)).filter(Boolean))].slice(0, n);

function validHazard(v: unknown): PlanHazard | null {
  if (!isRec(v)) return null;
  const id = line(v.id, 40);
  const lib = hazard(id);
  const label = lib ? lib.label : line(v.label, 80);
  if (!id || !label) return null;
  return { id, label, control: text(v.control, TEXT_MAX) };
}

function validAttendee(v: unknown): Attendee | null {
  if (!isRec(v)) return null;
  const name = line(v.name, NAME_MAX);
  if (!name) return null;
  return { name, sig: cleanSig(v.sig), at: isNum(v.at) ? v.at : 0 };
}

export function validPlan(v: unknown): Plan | null {
  if (!isRec(v) || typeof v.id !== 'string' || !v.id || !isDay(v.day) || !isNum(v.createdAt) || v.createdAt <= 0) return null;
  const talk = isRec(v.talk) ? v.talk : {};
  const fm = isRec(v.foreman) ? v.foreman : {};
  const sig = cleanSig(fm.sig);
  const hazards: PlanHazard[] = [];
  const seen = new Set<string>();
  for (const h of Array.isArray(v.hazards) ? v.hazards : []) {
    const ok = validHazard(h);
    if (ok && !seen.has(ok.id)) {
      seen.add(ok.id);
      hazards.push(ok);
    }
  }
  return {
    id: v.id,
    day: v.day as string,
    project: cleanProject(v.project),
    task: text(v.task, TEXT_MAX),
    area: line(v.area, 120),
    hazards: hazards.slice(0, MAX_HAZARDS),
    permits: strings(v.permits, 40, 12),
    ppe: strings(v.ppe, 40, 12),
    muster: line(v.muster, 120),
    emergency: text(v.emergency, TEXT_MAX),
    talk: { topic: line(talk.topic, 80), notes: text(talk.notes, 1000) },
    crew: (Array.isArray(v.crew) ? v.crew : []).map(validAttendee).filter((a): a is Attendee => a !== null).slice(0, MAX_CREW),
    foreman: { name: line(fm.name, NAME_MAX), sig, signedAt: sig && isNum(fm.signedAt) ? fm.signedAt : null },
    createdAt: v.createdAt,
    updatedAt: isNum(v.updatedAt) ? v.updatedAt : v.createdAt,
  };
}

export const serialisePlans = (l: PlanLog): string => JSON.stringify({ v: PRETASK_VERSION, plans: l.plans });

export function parsePlans(raw: string | null | undefined): PlanLog {
  if (!raw) return emptyPlans();
  let p: unknown;
  try {
    p = JSON.parse(raw);
  } catch {
    return { ...emptyPlans(), dropped: 1 };
  }
  if (!isRec(p) || typeof p.v !== 'number' || !Array.isArray(p.plans)) return { ...emptyPlans(), dropped: 1 };
  if (p.v > PRETASK_VERSION) return { ...emptyPlans(), foreign: true };
  const out: Plan[] = [];
  const ids = new Set<string>();
  const slots = new Set<string>();
  let dropped = 0;
  for (const x of p.plans) {
    const ok = validPlan(x);
    const slot = ok ? slotKey(ok.day, ok.project) : '';
    if (!ok || ids.has(ok.id) || slots.has(slot)) {
      dropped += 1;
      continue;
    }
    ids.add(ok.id);
    slots.add(slot);
    out.push(ok);
  }
  return { plans: sortPlans(out).slice(0, MAX_PLANS), foreign: false, dropped };
}

const sortPlans = (xs: Plan[]) => xs.sort((a, b) => b.day.localeCompare(a.day) || b.updatedAt - a.updatedAt);
const slotKey = (day: string, project: string) => `${day}|${cleanProject(project).toUpperCase()}`;

// ------------------------------------------------------------ changes

export const planFor = (l: PlanLog, day: string, project: string): Plan | undefined => l.plans.find((p) => p.day === day && sameProject(p.project, project));

export function newPlan(day: string, project: string, now: number): Plan {
  return {
    id: `pt${now.toString(36)}`,
    day,
    project: cleanProject(project),
    task: '',
    area: '',
    hazards: [],
    permits: [],
    ppe: [],
    muster: '',
    emergency: '',
    talk: { topic: '', notes: '' },
    crew: [],
    foreman: { name: '', sig: '', signedAt: null },
    createdAt: now,
    updatedAt: now,
  };
}

/** One plan per job per day: a plan for a slot that has one replaces it. Past the cap the oldest day goes. */
export function putPlan(l: PlanLog, plan: Plan, now: number): PlanLog {
  const clean = validPlan({ ...plan, updatedAt: now });
  if (!clean) return l;
  const slot = slotKey(clean.day, clean.project);
  const others = l.plans.filter((p) => p.id !== clean.id && slotKey(p.day, p.project) !== slot);
  let id = clean.id;
  for (let n = 2; others.some((p) => p.id === id); n++) id = `${clean.id}-${n}`;
  const kept = { ...clean, id };
  let plans = sortPlans([kept, ...others]);
  while (plans.length > MAX_PLANS) {
    const oldest = plans.reduce<Plan | null>((o, p) => (p.id !== id ? p : o), null);
    if (!oldest) break;
    plans = plans.filter((p) => p.id !== oldest.id);
  }
  return { ...l, plans };
}

export const deletePlan = (l: PlanLog, id: string): PlanLog => ({ ...l, plans: l.plans.filter((p) => p.id !== id) });

/** A hazard added with the library's control, or taken off. A hazard already on stays as edited. */
export function toggleHazard(p: Plan, id: string, label = ''): Plan {
  if (p.hazards.some((h) => h.id === id)) return { ...p, hazards: p.hazards.filter((h) => h.id !== id) };
  const lib = hazard(id);
  const h: PlanHazard = lib ? { id, label: lib.label, control: lib.control } : { id, label: line(label, 80), control: '' };
  return h.label ? { ...p, hazards: [...p.hazards, h].slice(0, MAX_HAZARDS) } : p;
}

export const setControl = (p: Plan, id: string, control: string): Plan => ({ ...p, hazards: p.hazards.map((h) => (h.id === id ? { ...h, control } : h)) });

const toggleIn = (xs: string[], x: string) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);
export const togglePermit = (p: Plan, x: string): Plan => ({ ...p, permits: toggleIn(p.permits, x) });
export const togglePpe = (p: Plan, x: string): Plan => ({ ...p, ppe: toggleIn(p.ppe, x) });

/** Somebody on the crew, added by name; a name already on is left as it is. */
export function addCrew(p: Plan, name: string): Plan {
  const n = line(name, NAME_MAX);
  if (!n || p.crew.some((c) => c.name.toUpperCase() === n.toUpperCase())) return p;
  return { ...p, crew: [...p.crew, { name: n, sig: '', at: 0 }].slice(0, MAX_CREW) };
}
export const removeCrew = (p: Plan, name: string): Plan => ({ ...p, crew: p.crew.filter((c) => c.name !== name) });
export const signCrew = (p: Plan, name: string, sig: string, now: number): Plan => ({ ...p, crew: p.crew.map((c) => (c.name === name ? { ...c, sig: cleanSig(sig), at: now } : c)) });

/** The foreman's signature closes the plan. Any change after reopens it, so what was signed is what was read. */
export const signForeman = (p: Plan, name: string, sig: string, now: number): Plan => ({ ...p, foreman: { name: line(name, NAME_MAX), sig: cleanSig(sig), signedAt: now } });
export const reopen = (p: Plan): Plan => (p.foreman.signedAt === null ? p : { ...p, foreman: { ...p.foreman, sig: '', signedAt: null } });
export const isClosed = (p: Plan): boolean => p.foreman.signedAt !== null && p.foreman.sig !== '';

/** What a plan still wants before it is closed, said plainly. */
export function planGaps(p: Plan): string[] {
  const out: string[] = [];
  if (!p.task.trim()) out.push('What the task is');
  if (!p.hazards.length) out.push('At least one hazard, with its control');
  for (const h of p.hazards) if (!h.control.trim()) out.push(`A control for ${h.label}`);
  if (!p.muster.trim()) out.push('The muster point');
  if (!p.crew.length) out.push('Who is on the crew');
  const unsigned = p.crew.filter((c) => !c.sig).length;
  if (p.crew.length && unsigned) out.push(`${unsigned} of the crew to sign`);
  return out;
}

/** The toolbox talk the day suggests: the built-in modules, in turn, so a crew hears every one over a fortnight. */
export function talkFor(day: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const n = Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86_400_000);
  return BUILTIN[n % BUILTIN.length]!.title;
}

export const todayPlanKey = (now: number) => dayKey(now);
