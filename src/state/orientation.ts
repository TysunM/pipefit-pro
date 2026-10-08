// Site orientation
// ----------------
// The course a new hire takes before the gate, on the phone, in the language
// they think in. It is plug and play for any company: nine modules of general
// industrial practice ship in the app and work with no signal, and the
// company's own rules go in beside them, pasted, typed or photographed off
// the posted sheet. Claude turns each module into a short spoken course with
// a check at the end; a pass goes into the skills passport as a record.
//
// Three stores: the company's modules (shared between phones as a pack, read
// in through Backup → Restore), the courses Claude built (a cache that is
// kept, so a course built once is there with no signal), and the passes.
//
// The built-in modules say general practice, as OSHA and the trade hold it,
// in plain words. They never override a site's rules; the first module says
// so, and a company's own module beats a built-in one where they differ.
//
// Pure; orientations.tsx binds the stores to the shared persistence.

import { cleanProject } from './project';

export const ORIENTATION_VERSION = 1;
export const MAX_MODULES = 60;
export const MAX_COMPLETIONS = 400;
export const MAX_COURSES = 200;
/** Longest a module's text may be: a few pages of rules. Claude reads it all. */
export const TEXT_MAX = 12_000;
export const TITLE_MAX = 60;
/** Questions a company may write for one of its own modules. */
export const MAX_QUESTIONS = 12;
/** The pass mark, as a fraction of the questions. */
export const PASS_MARK = 0.8;

export type Lang = 'en' | 'es';
export const LANGS: readonly { id: Lang; label: string; speech: string }[] = [
  { id: 'en', label: 'English', speech: 'en-US' },
  { id: 'es', label: 'Español', speech: 'es-US' },
];

export type Question = { q: string; choices: string[]; answer: number; why: string };
export type Section = { heading: string; points: string[] };
/** A module as it is taught: short sections to be read or spoken, then the check. */
export type Course = { title: string; sections: Section[]; questions: Question[] };

export type Module = {
  id: string;
  title: string;
  /** The rules as given: what the course is built from, and what is shown when no course is built. */
  text: string;
  required: boolean;
  createdAt: number;
  updatedAt: number;
  /** The language the rules are written in. A Spanish module is read aloud in Spanish and counts as a Spanish pass. */
  lang: Lang;
  /**
   * The company's own check, written by the company. With three or more, the
   * check is these questions whether or not Claude wrote a course; with
   * fewer and no course, a read-through is the pass.
   */
  questions: Question[];
};

/** A course built from a module's text, in one language, kept against that text. */
export type BuiltCourse = { id: string; moduleId: string; lang: Lang; textKey: string; course: Course; builtAt: number };

/** A pass or a fail, as it happened. */
export type Completion = {
  id: string;
  moduleId: string;
  title: string;
  lang: Lang;
  score: number;
  of: number;
  at: number;
  project: string;
  /** The text the course was built from, so a changed rule shows as not yet passed. */
  textKey: string;
  /** A read-through signed off, on a module with no check: one of one. */
  acknowledged?: boolean;
};

export type ModuleStore = { modules: Module[]; off: string[]; foreign: boolean; dropped: number };
export type CourseStore = { courses: BuiltCourse[]; foreign: boolean; dropped: number };
export type CompletionStore = { completions: Completion[]; foreign: boolean; dropped: number };

export const emptyModules = (): ModuleStore => ({ modules: [], off: [], foreign: false, dropped: 0 });
export const emptyCourses = (): CourseStore => ({ courses: [], foreign: false, dropped: 0 });
export const emptyCompletions = (): CompletionStore => ({ completions: [], foreign: false, dropped: 0 });

// ------------------------------------------------------------ checking what is stored

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const line = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
/** Paragraphs kept, runs of blank lines squeezed, the rest of the whitespace tidied. */
export const cleanText = (v: unknown): string =>
  typeof v === 'string'
    ? v
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((l) => l.replace(/[ \t]+/g, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, TEXT_MAX)
    : '';

/** Eight hex digits over the text, so a course and a pass are tied to the words they were built from. */
export function textKey(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function validQuestion(v: unknown): Question | null {
  if (!isRec(v)) return null;
  const q = line(v.q, 300);
  const choices = (Array.isArray(v.choices) ? v.choices : []).map((c) => line(c, 160)).filter(Boolean).slice(0, 4);
  if (!q || choices.length < 2 || !isNum(v.answer) || v.answer < 0 || v.answer >= choices.length || v.answer !== Math.floor(v.answer)) return null;
  return { q, choices, answer: v.answer, why: line(v.why, 300) };
}

export function validSection(v: unknown): Section | null {
  if (!isRec(v)) return null;
  const heading = line(v.heading, 80);
  const points = (Array.isArray(v.points) ? v.points : []).map((p) => line(p, 300)).filter(Boolean).slice(0, 8);
  return heading && points.length ? { heading, points } : null;
}

export function validCourse(v: unknown): Course | null {
  if (!isRec(v)) return null;
  const title = line(v.title, TITLE_MAX);
  const sections = (Array.isArray(v.sections) ? v.sections : []).map(validSection).filter((s): s is Section => s !== null).slice(0, 12);
  const questions = (Array.isArray(v.questions) ? v.questions : []).map(validQuestion).filter((q): q is Question => q !== null).slice(0, 12);
  if (!title || !sections.length || questions.length < 3) return null;
  return { title, sections, questions };
}

const isLang = (v: unknown): v is Lang => v === 'en' || v === 'es';

export function validModule(v: unknown): Module | null {
  if (!isRec(v) || typeof v.id !== 'string' || !v.id) return null;
  const title = line(v.title, TITLE_MAX);
  const text = cleanText(v.text);
  if (!title || !text || !isNum(v.createdAt) || v.createdAt <= 0) return null;
  // Stores written before these existed have neither: English, no questions.
  const questions = (Array.isArray(v.questions) ? v.questions : []).map(validQuestion).filter((x): x is Question => x !== null).slice(0, MAX_QUESTIONS);
  return {
    id: v.id,
    title,
    text,
    required: v.required !== false,
    createdAt: v.createdAt,
    updatedAt: isNum(v.updatedAt) ? v.updatedAt : v.createdAt,
    lang: isLang(v.lang) ? v.lang : 'en',
    questions,
  };
}

export function validBuilt(v: unknown): BuiltCourse | null {
  if (!isRec(v) || typeof v.id !== 'string' || !v.id || typeof v.moduleId !== 'string' || !v.moduleId || !isLang(v.lang)) return null;
  const course = validCourse(v.course);
  const key = line(v.textKey, 8);
  if (!course || !/^[0-9a-f]{8}$/.test(key) || !isNum(v.builtAt)) return null;
  return { id: v.id, moduleId: v.moduleId, lang: v.lang, textKey: key, course, builtAt: v.builtAt };
}

export function validCompletion(v: unknown): Completion | null {
  if (!isRec(v) || typeof v.id !== 'string' || !v.id || typeof v.moduleId !== 'string' || !v.moduleId || !isLang(v.lang)) return null;
  if (!isNum(v.score) || !isNum(v.of) || v.of < 1 || v.score < 0 || v.score > v.of || !isNum(v.at) || v.at <= 0) return null;
  const key = line(v.textKey, 8);
  if (!/^[0-9a-f]{8}$/.test(key)) return null;
  const out: Completion = { id: v.id, moduleId: v.moduleId, title: line(v.title, TITLE_MAX) || v.moduleId, lang: v.lang, score: Math.floor(v.score), of: Math.floor(v.of), at: v.at, project: cleanProject(v.project), textKey: key };
  return v.acknowledged === true ? { ...out, acknowledged: true } : out;
}

function parseStore<T, S>(raw: string | null | undefined, field: string, empty: () => S, valid: (v: unknown) => T | null, idOf: (x: T) => string, max: number, extra?: (p: Record<string, unknown>, s: S) => void): S {
  if (!raw) return empty();
  let p: unknown;
  try {
    p = JSON.parse(raw);
  } catch {
    return { ...empty(), dropped: 1 };
  }
  if (!isRec(p) || typeof p.v !== 'number' || !Array.isArray(p[field])) return { ...empty(), dropped: 1 };
  if (p.v > ORIENTATION_VERSION) return { ...empty(), foreign: true };
  const out: T[] = [];
  const seen = new Set<string>();
  let dropped = 0;
  for (const x of p[field] as unknown[]) {
    const ok = valid(x);
    if (!ok || seen.has(idOf(ok))) {
      dropped += 1;
      continue;
    }
    seen.add(idOf(ok));
    out.push(ok);
  }
  const s = { ...empty(), [field]: out.slice(0, max), dropped } as S;
  extra?.(p, s);
  return s;
}

export const serialiseModules = (s: ModuleStore): string => JSON.stringify({ v: ORIENTATION_VERSION, modules: s.modules, off: s.off });
export const parseModules = (raw: string | null | undefined): ModuleStore =>
  parseStore<Module, ModuleStore>(raw, 'modules', emptyModules, validModule, (m) => m.id, MAX_MODULES, (p, s) => {
    s.off = (Array.isArray(p.off) ? p.off : []).filter((x): x is string => typeof x === 'string').slice(0, 100);
  });

export const serialiseCourses = (s: CourseStore): string => JSON.stringify({ v: ORIENTATION_VERSION, courses: s.courses });
export const parseCourses = (raw: string | null | undefined): CourseStore => parseStore<BuiltCourse, CourseStore>(raw, 'courses', emptyCourses, validBuilt, (c) => c.id, MAX_COURSES);

export const serialiseCompletions = (s: CompletionStore): string => JSON.stringify({ v: ORIENTATION_VERSION, completions: s.completions });
export const parseCompletions = (raw: string | null | undefined): CompletionStore =>
  parseStore<Completion, CompletionStore>(raw, 'completions', emptyCompletions, validCompletion, (c) => c.id, MAX_COMPLETIONS);

// ------------------------------------------------------------ changes

export function putModule(
  s: ModuleStore,
  m: { id?: string; title: string; text: string; required?: boolean; lang?: Lang; questions?: readonly Question[] },
  now: number,
): { store: ModuleStore; ok: true; id: string } | { store: ModuleStore; ok: false; why: string } {
  const had = m.id ? s.modules.find((x) => x.id === m.id) : undefined;
  if (!had && s.modules.length >= MAX_MODULES) return { store: s, ok: false, why: 'No room for another module.' };
  if (!line(m.title, TITLE_MAX)) return { store: s, ok: false, why: 'Give the module a title.' };
  if (!cleanText(m.text)) return { store: s, ok: false, why: 'Put the rules in: paste them, type them, or read them off a page.' };
  if ((m.questions ?? []).length > MAX_QUESTIONS) return { store: s, ok: false, why: `Twelve questions at most.` };
  let id = had?.id ?? `om${now.toString(36)}`;
  for (let n = 2; !had && s.modules.some((x) => x.id === id); n++) id = `om${now.toString(36)}-${n}`;
  const next = validModule({
    ...had,
    ...m,
    id,
    required: m.required ?? had?.required ?? true,
    lang: m.lang ?? had?.lang ?? 'en',
    questions: m.questions ?? had?.questions ?? [],
    createdAt: had?.createdAt ?? now,
    updatedAt: now,
  });
  if (!next) return { store: s, ok: false, why: 'That module does not read.' };
  return { store: { ...s, modules: had ? s.modules.map((x) => (x.id === had.id ? next : x)) : [...s.modules, next] }, ok: true, id };
}

export const deleteModule = (s: ModuleStore, id: string): ModuleStore => ({ ...s, modules: s.modules.filter((m) => m.id !== id) });

/** A built-in module turned off for this company, or back on. */
export const setOff = (s: ModuleStore, id: string, off: boolean): ModuleStore => ({ ...s, off: off ? [...new Set([...s.off, id])] : s.off.filter((x) => x !== id) });

export function keepCourse(s: CourseStore, b: Omit<BuiltCourse, 'id'>): CourseStore {
  const id = `${b.moduleId}|${b.lang}`;
  const next: BuiltCourse = { ...b, id };
  return { ...s, courses: [next, ...s.courses.filter((c) => c.id !== id)].slice(0, MAX_COURSES) };
}

export const courseFor = (s: CourseStore, moduleId: string, lang: Lang, key: string): Course | undefined => s.courses.find((c) => c.moduleId === moduleId && c.lang === lang && c.textKey === key)?.course;

export function record(s: CompletionStore, c: Omit<Completion, 'id'>): CompletionStore {
  let id = `oc${c.at.toString(36)}`;
  for (let n = 2; s.completions.some((x) => x.id === id); n++) id = `oc${c.at.toString(36)}-${n}`;
  return { ...s, completions: [{ ...c, id }, ...s.completions].sort((a, b) => b.at - a.at).slice(0, MAX_COMPLETIONS) };
}

// ------------------------------------------------------------ a course with no Claude

/** The first words of a sentence, as a heading. */
function headingOf(sentence: string): string {
  const bare = sentence.replace(/[.!?:;,]+$/, '').trim();
  if (bare.length <= 60) return bare;
  const words = bare.split(' ');
  let out = '';
  for (const w of words) {
    if ((out + ' ' + w).trim().length > 56) break;
    out = (out + ' ' + w).trim();
  }
  return `${out || bare.slice(0, 56)}…`;
}

const sentencesOf = (para: string): string[] => (para.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) ?? [para]).map((x) => x.trim()).filter(Boolean);

/**
 * The rules as written, cut into sections a hand can read or hear: one per
 * paragraph, headed by its first words, or by the short line above it when
 * the company wrote one. A long text is folded into twelve.
 */
export function sectionsFromText(text: string): Section[] {
  const isHeading = (l: string) => l.length <= 60 && !/[.!?]/.test(l);
  const out: Section[] = [];
  let pending: string | null = null;
  for (const block of cleanText(text).split(/\n{2,}/)) {
    // A short line with no sentence in it, on its own or above its paragraph, is a heading.
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines.length === 1 && isHeading(lines[0]!)) {
      pending = lines[0]!;
      continue;
    }
    const own = lines.length > 1 && isHeading(lines[0]!) ? lines.shift()! : null;
    const para = lines.join(' ');
    const sentences = sentencesOf(para);
    const heading = own ?? pending ?? headingOf(sentences[0] ?? para);
    pending = null;
    out.push({ heading: heading.slice(0, 80), points: sentences.slice(0, 8).map((x) => x.slice(0, 300)) });
  }
  if (pending && !out.length) out.push({ heading: pending.slice(0, 80), points: [pending] });
  if (out.length <= 12) return out;
  // Fold into twelve runs, as even as they go, keeping the heading of the first of each run.
  const folded: Section[] = [];
  for (let k = 0; k < 12; k++) {
    const run = out.slice(Math.floor((k * out.length) / 12), Math.floor(((k + 1) * out.length) / 12));
    if (run.length) folded.push({ heading: run[0]!.heading, points: run.flatMap((x) => x.points).slice(0, 8) });
  }
  return folded;
}

/** The rules as sections, to read through when no check exists. */
export const readingCourse = (m: Module): { title: string; sections: Section[] } => ({ title: m.title, sections: sectionsFromText(m.text) });

/** The company's own course: the rules in sections and the company's questions. Three questions or it is a read-through. */
export const manualCourse = (m: Module): Course | null => validCourse({ title: m.title, sections: sectionsFromText(m.text), questions: m.questions });

/** A course with the company's questions in place of the written ones, when the company wrote enough. */
export const withOwnQuestions = (course: Course, m: Module): Course => (m.questions.length >= 3 ? { ...course, questions: m.questions } : course);

// ------------------------------------------------------------ the check

export const passed = (c: { score: number; of: number }): boolean => c.of > 0 && c.score / c.of >= PASS_MARK;

/** The pass that stands for a module as its text is now; a pass on older words does not. */
export const passFor = (s: CompletionStore, moduleId: string, key: string): Completion | undefined => s.completions.find((c) => c.moduleId === moduleId && c.textKey === key && passed(c));

export function score(course: Course, answers: readonly (number | null)[]): { score: number; of: number; wrong: number[] } {
  const wrong: number[] = [];
  course.questions.forEach((q, i) => {
    if (answers[i] !== q.answer) wrong.push(i);
  });
  return { score: course.questions.length - wrong.length, of: course.questions.length, wrong };
}

// ------------------------------------------------------------ the modules together

export type ModuleView = { module: Module; builtin: boolean; off: boolean; key: string; pass: Completion | undefined };

/** Every module a hand is to take: the built-in ones first, then the company's own. */
export function modulesOf(s: ModuleStore, done: CompletionStore): ModuleView[] {
  const view = (m: Module, builtin: boolean): ModuleView => {
    const key = textKey(m.text);
    return { module: m, builtin, off: builtin && s.off.includes(m.id), key, pass: passFor(done, m.id, key) };
  };
  return [...BUILTIN.map((m) => view(m, true)), ...s.modules.map((m) => view(m, false))];
}

/** "4 of 9 passed · 2 not required". */
export function orientationSummary(xs: readonly ModuleView[]): string {
  const on = xs.filter((x) => !x.off && x.module.required);
  const done = on.filter((x) => x.pass).length;
  const off = xs.length - on.length;
  return `${done} of ${on.length} passed${off ? ` · ${off} not required` : ''}`;
}

/**
 * The company's modules as a file another phone reads in through Backup →
 * Restore: a backup that holds only this store, so nothing else on the phone
 * is touched and the modules are added by id.
 */
export function orientationPack(s: ModuleStore, now: Date): string {
  return JSON.stringify({ app: 'PipeFit Pro', backup: 1, made: now.toISOString(), settings: null, stores: { 'pipefit.orientation.v1': JSON.parse(serialiseModules(s)) } }, null, 1);
}

// ------------------------------------------------------------ what ships in the app

const at = Date.UTC(2026, 0, 1);
const builtin = (id: string, title: string, text: string): Module => ({ id: `b:${id}`, title, text: cleanText(text), required: true, createdAt: at, updatedAt: at, lang: 'en', questions: [] });

/**
 * General industrial practice, in the plain words a hand needs on day one.
 * Each is a few paragraphs of rules; the course and its questions are built
 * from exactly these words, so what is taught is what is written here.
 */
export const BUILTIN: readonly Module[] = [
  builtin(
    'welcome',
    'Your first day on site',
    `Every site has its own rules, and they come first. What is here is the general practice that holds on industrial sites across the trade. Where your site's orientation says something different, your site is right.

You have stop-work authority. If you see something unsafe, you stop the work, and nobody can hold it against you. You do not need to be sure. A near miss is reported the same day, the same as an injury, because the next one hits somebody.

Before you start: sign in or badge in every time you come through the gate, so the site knows who is inside if there is an emergency. Know where the muster point is and which way the wind is blowing, because a gas release means walking upwind to the muster point and counting heads. Know the site alarm: a steady tone and a whooping tone usually mean different things, and the orientation will tell you which.

Ask. A journeyman would rather answer a question than fill in an incident report. Your foreman is the first person you ask; the safety officer is the second. Nobody on a good site thinks less of a man who asks.

Phones stay off the work floor unless the site allows them for work. No alcohol, no drugs, and some prescriptions need telling the foreman. Fit for duty means rested, sober and able to do the task.`,
  ),
  builtin(
    'ppe',
    'Personal protective equipment',
    `The basics are worn everywhere past the gate: hard hat, safety glasses with side shields, steel or composite toe boots with a defined heel, high-visibility vest or shirt, and long trousers. Shorts, tennis shoes and sleeveless shirts do not come on site.

Gloves are chosen for the task: cut-resistant for handling steel and sheet metal, leather for rigging and rough work, chemical gloves when the SDS says so. Take gloves off around rotating equipment: a drill, a lathe, a pipe threading machine can wind a glove in and the hand with it.

A face shield goes over the safety glasses for grinding, chipping, cutting with a wheel and pouring chemicals. Safety glasses alone are not enough against a bursting wheel.

Hearing protection is worn where it is posted, and anywhere you have to raise your voice to be heard at arm's length. Eight hours at 85 decibels is the level the law acts on; a grinder or an impact wrench is louder than that.

Flame-resistant clothing is worn where the site requires it: around live electrical work, near process units with flammable product, and for hot work. Synthetic clothing melts to skin in a flash fire; FR clothing does not.

Inspect PPE before each use. A cracked hard hat, scratched lenses, a harness with a frayed strap or a cut glove is replaced, not used. A hard hat that has taken a hit is replaced even if it looks fine.`,
  ),
  builtin(
    'fall',
    'Working at height',
    `On a construction site, fall protection is required at six feet or more above a lower level. Fall protection means guardrails, a safety net, or a personal fall arrest system: a full-body harness, a lanyard or self-retracting lifeline, and an anchor point. Some sites and some owners require it lower; the site rules say.

One hundred percent tie-off means you are connected the whole time you are at height, including while you move. A double lanyard lets you connect the second hook before you release the first.

An anchor point must hold 5,000 pounds for each person attached, or be designed and marked by a competent person. A handrail, a conduit, a small-bore pipe or a cable tray is not an anchor point.

Inspect your harness before each use: webbing, stitching, D-ring, buckles and the lanyard's hooks. A harness that has arrested a fall is taken out of service.

Ladders: three points of contact, face the ladder, do not stand on the top two rungs, and set an extension ladder at one foot out for every four feet up with the top secured and extending three feet above the landing. Carry tools in a belt or hoist them, not in your hand.

Scaffolds carry a tag. Green means complete and inspected; yellow means a hazard is present and a harness is required; red means do not use. Never change a scaffold yourself: scaffold builders do that.

Floor holes are covered with something that holds twice the load, secured, and marked HOLE. Leading edges have guardrails or warning lines. Nothing is dropped or thrown from height; tools at height are tethered where the site requires it.`,
  ),
  builtin(
    'loto',
    'Lockout, tagout and stored energy',
    `Before anyone works on equipment or a line that could start, move, energise, pressurise or release, it is isolated and locked. Electrical breakers are opened and locked; valves are closed, locked and tagged; lines are blinded or disconnected where the site requires it.

Your own lock, your own key. You put your lock on every isolation point for the job you are working, and only you take it off. Never remove another person's lock. If somebody's lock is on and they have gone home, the site has a procedure for it that involves a supervisor and a search; it never involves bolt cutters by a man in a hurry.

Try it before you trust it. After the lock goes on, test that the energy is gone: push the start button, check for voltage with a tester, open a vent valve. A lock proves nothing until you have tried the start.

Stored energy is the one that hurts pipefitters. A line that is locked out can still hold pressure, hot product or a vacuum. Springs, counterweights, capacitors, a raised load and a charged accumulator all hold energy with everything switched off. Bleed, vent, drain and block before you break a flange, and crack the bolts on the far side first so the flange opens away from you.

A tag says who, what and when, and a tag alone is not a lock: it is used only where a lock cannot be fitted, and then with extra protection. When the work is done, the people who put locks on are the people who take them off, and the area is checked clear before anything is re-energised.`,
  ),
  builtin(
    'hotwork',
    'Hot work and fire',
    `Hot work is anything that makes a flame, a spark or enough heat to light something: welding, cutting, grinding, torching, soldering. On most sites it needs a permit, issued for a time and a place, with the atmosphere tested where there may be flammable vapour.

Clear the area. Combustibles are moved at least thirty-five feet away or covered with fire blankets; floor openings and drains within that distance are covered; sparks travel further than you think and roll downhill.

A fire watch stays through the work and for at least thirty minutes after the last spark, longer where the site requires it, with an extinguisher in hand and no other job. The fire watch is not the welder.

Check the extinguisher before the work starts: the pin in, the gauge in the green, the right class for what could burn. Know where the nearest fire alarm pull is.

Compressed gas cylinders stand upright and chained, with caps on when not connected. Oxygen and fuel gas are stored twenty feet apart or behind a fire-rated barrier. Hoses, regulators and flashback arrestors are checked for leaks before lighting up, and the torch is lit with a striker, never a lighter.

Welding screens protect everyone else's eyes. Never look at an arc without a shield, and never weld near a solvent, a degreaser or an open container of product.`,
  ),
  builtin(
    'confined',
    'Confined spaces and excavations',
    `A confined space is big enough to enter, not meant to be occupied, and limited in the ways in and out: a tank, a vessel, a pit, a large pipe, a vault, a trench. A permit-required confined space also holds a hazard: a dangerous atmosphere, something that can engulf you, walls that slope to a point, or anything else that can hurt you inside.

Nobody enters a permit space without a permit, an attendant at the opening, a tested atmosphere and a way out. The atmosphere is tested before entry and kept monitored: oxygen between 19.5 and 23.5 percent, flammable gas below ten percent of its lower explosive limit, and toxic gases under their limits. Nitrogen has no smell and kills in two breaths; a vessel that was purged is a vessel to test.

The attendant stays outside, keeps count, keeps contact and calls for help. The attendant never goes in. Most of the dead in confined spaces are the people who went in to rescue the first one. Rescue is done by the trained team with the equipment, and the permit names them before anyone enters.

Excavations: a trench five feet deep or more needs a protective system, sloping, benching, shoring or a trench box, unless it is in stable rock. Four feet or deeper needs a ladder or ramp within twenty-five feet of every worker. Spoil piles and equipment stay two feet back from the edge. A competent person inspects before every shift and after rain. Never work under a suspended load or a bucket, and never enter a trench that has not been inspected.`,
  ),
  builtin(
    'hazcom',
    'Chemicals, dust and the SDS',
    `Every chemical on site has a label and a safety data sheet. The label carries the pictograms: a flame for flammable, a skull for acutely toxic, an exclamation mark for an irritant, a corroding hand for corrosive, a health hazard figure for long-term harm. The SDS has sixteen sections; the ones that matter in the field are the hazards, the PPE, the first aid and what to do in a spill. Read the SDS before you use something for the first time, and know where the sheets are kept.

Never mix chemicals, never put a chemical into an unlabelled container, and never use a food container for one. Keep the lid on. Wash before you eat, drink or smoke.

Know where the nearest eyewash and safety shower are and how to get there with your eyes closed. Fifteen minutes of flushing is the rule for a splash in the eyes, and somebody else calls for help while you flush.

Silica: cutting, grinding or drilling concrete, block, stone and some refractory makes dust that scars the lungs for life. Wet methods, a vacuum shroud or a respirator with a fit test are required; a paper dust mask is not a respirator.

Older plants: pipe insulation, gaskets, floor tile and old paint can hold asbestos or lead. If you find material you are not sure of, stop and ask. Do not disturb it.

Hydrogen sulphide, carbon monoxide, chlorine, ammonia and nitrogen are the gases that kill on process sites. Where they are present you wear a personal monitor, you know the alarm levels, and you walk upwind and uphill when it goes off.`,
  ),
  builtin(
    'hands',
    'Hands, tools, lifting and rigging',
    `Hands go where the pinch points are not. Before you move something, look for where it could pinch, crush or trap: between a flange and a pipe, under a load, between a wrench and a wall. Keep your fingers out of a bolt hole; use a drift pin to line up a flange.

Use the right tool, and the tool the right way. A wrench is pulled, not pushed, so your knuckles do not go into the steel when it slips. A cheater bar on a wrench is a broken wrench waiting to happen. A screwdriver is not a chisel; a wrench is not a hammer.

Inspect tools before use. Mushroomed chisel heads, cracked handles, frayed cords, missing guards and dead ground pins take the tool out of service. Grinder guards stay on, and the wheel's speed rating must be at or above the grinder's.

Power on site runs through a ground-fault circuit interrupter, and cords are kept out of water and off sharp edges. A damaged cord is not taped; it is replaced.

Lifting: bend your knees, keep the load close, do not twist, and get help or a machine for anything heavy or awkward. Fifty pounds is a common site limit for one person; a length of six-inch pipe is more than that.

Rigging: only trained riggers rig, and only the designated signal person signals the crane. Nobody walks or stands under a suspended load, ever. Tag lines control the load; hands do not. Inspect slings and shackles before each lift, and know the load's weight before it leaves the ground.`,
  ),
  builtin(
    'heat',
    'Heat, cold, weather and fatigue',
    `Heat illness kills field workers every summer, and it starts with somebody who stopped sweating. Drink water every fifteen to twenty minutes whether or not you are thirsty, a cup at a time. Rest in shade on the schedule the site sets. Watch your partner: confusion, a headache, nausea, dizziness, cramps or hot dry skin are the signs, and a man showing them is taken into shade, cooled and reported now.

The first week in heat is the dangerous one. Acclimatise: shorter spells in the heat and more breaks until your body catches up. Caffeine and energy drinks do not count as water.

Cold: layers, dry gloves and dry socks, and a warm place to break. Shivering, clumsiness and slurred words are the signs. Steel at freezing temperature takes skin off; wear gloves to touch it.

Lightning: when thunder is heard, work at height and outdoor work stops and everyone goes to shelter. Thirty minutes after the last thunder, work starts again. Scaffolds, cranes and steel are not shelter.

Wind: a crane has a wind limit and so does a man on a scaffold. High wind stops lifts and work at height.

Fatigue is a hazard like any other. A man on his fourteenth hour makes the mistakes a rested man does not. If you are too tired to work safely, say so; it is the same as stopping unsafe work.`,
  ),
];

export const builtinModule = (id: string): Module | undefined => BUILTIN.find((m) => m.id === id);
