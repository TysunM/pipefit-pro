// What a spoken command means, worked out on the phone
// ---------------------------------------------------
// Most of what is said to the app is a tool's name, with or without its
// figures: "bolt up", "rolling offset, rise 12, roll 8, run 30", "simple
// offset 14 and a half at 22 and a half degrees", "hydro" — or, with a tool
// already open, just its figures: "rise 12", "leg b 3 foot 6". Those are
// matched here, at once,
// with no signal and at no cost. Anything with more in it than a tool and its
// figures — "weld 14 rejected for porosity", "what's the takeout on a 2 inch
// 90" — comes back null and goes to Claude (ai/voice.ts).
//
// The rule that keeps this honest: a command is only taken here when every
// word of it is accounted for — the tool's name, the figures, and the words
// people put round a command ("open", "bring up", "please"). One word left
// over and Claude hears it instead, so nothing said is quietly half-done.

import type { ToolRoute } from '../navigation/groups';
import { MATERIALS } from '../calc/materials';
import { NUMBER_WORDS, hasPhrase, lengthAt, numberAt, tokens } from './words';
import { SPEC_WORDS, readSpecs, type SpecCommand } from './specs';
import { Figure, FigureRoute, FigureSpec, Figures, TOOL_FIGURES, figureNames, isFigureRoute, plausible, primaryFigure } from './toolFigures';
import { snapPhrases, snapWords, splitGlued } from './hear';
import { applyLearned } from './learned';

/** Somewhere a voice can open: a tool, or one of the tabs along the bottom, Settings or Backup. */
export type OpenRoute = ToolRoute | 'Home' | 'Settings' | 'Backup' | 'Projects' | 'Tools' | 'Logs' | 'Edu';

export type VoiceCommand =
  /** Open a screen; for a tool that takes figures, with what was said for them. `ignored` is what was said that the app could not place, when it opened the tool anyway. */
  | { kind: 'open'; route: OpenRoute; figures?: Figures; ignored?: string[] }
  /** On the bolt-up screen: the bolt asked for is torqued, take the last one back, or say it again. */
  | { kind: 'bolt'; act: 'done' | 'undo' | 'repeat' }
  | { kind: 'addCut' }
  | { kind: 'readBox' }
  /** The job's pipe: "half inch stainless 40S", "6 inch P22 schedule 80". */
  | ({ kind: 'specs' } & SpecCommand)
  | { kind: 'back' }
  | { kind: 'cancel' };

/**
 * What each tool is called on a job. Longer names first within a tool; across
 * tools the longest match wins, so "heat book" is never the handbook and
 * "rolling offset" is never the simple one.
 */
export const TOOL_WORDS: Record<OpenRoute, readonly string[]> = {
  Home: ['home', 'home screen', 'main menu', 'start screen', 'home tab'],
  Projects: ['projects', 'project', 'projects tab', 'my projects', 'jobs', 'turnover', 'turnover package'],
  Tools: ['tools', 'tools tab', 'tool tab', 'all tools', 'tool box', 'toolbox'],
  Logs: ['logs', 'logs tab', 'log tab', 'log book', 'records', 'the books'],
  Edu: ['edu', 'edu tab', 'education', 'education tab', 'learning', 'learn', 'training tab', 'school'],
  Settings: ['settings', 'setting', 'preferences'],
  Backup: ['backup', 'back up', 'backups', 'restore', 'back up my phone', 'back up the phone'],
  Calculator: ['calculator', 'calc', 'trade calculator', 'fraction calculator'],
  Reference: ['handbook', 'reference', 'reference tables', 'tables', 'look up tables', 'pipe book'],
  Level: ['level', 'digital level', 'inclinometer', 'angle finder', 'slope'],
  Measure: ['measure', 'ar measure', 'ar', 'laser', 'laser meter', 'tape', 'measuring'],
  OrderSheet: ['order sheet', 'order', 'material list', 'materials list', 'takeoff', 'take off', 'bill of materials'],
  SpoolBuilder: ['spool', 'spools', '3d spool', 'spool builder', 'three d spool'],
  Joints: ['joint log', 'joints', 'joint register', 'bolt up log', 'flange log'],
  FlangeBoltUp: ['bolt up', 'flange bolt up', 'flange', 'flanges', 'bolting', 'torque pattern', 'torque sequence', 'star pattern', 'cross pattern', 'bolt pattern'],
  Heats: ['heat book', 'heats', 'heat numbers', 'heat number', 'mtr', 'mtrs', 'mill cert', 'mill certs'],
  PressureTests: ['pressure test', 'pressure tests', 'hydro', 'hydro test', 'hydrostatic test', 'pneumatic test', 'pneumatic', 'test log', 'test package'],
  ShiftReport: ['shift report', 'daily report', 'daily', 'report', 'end of shift', 'shift log'],
  IsoSketch: ['iso sketch', 'iso', 'isometric', 'isometrics', 'sketch', 'iso paper', 'drawing'],
  SimpleOffset: ['simple offset', 'offset', 'two plane offset'],
  RollingOffset: ['rolling offset', 'roll offset', 'rolling'],
  CutLength: ['cut length', 'cut', 'center to center', 'centre to centre', 'takeouts'],
  SaddleBend: ['saddle bend', 'saddle', 'saddles'],
  MiterBend: ['miter bend', 'miter', 'mitre', 'segmented elbow', 'lobster back'],
  HandBender: ['pipe bend', 'bend', 'bender', 'hand bender', 'setback'],
  Calibration: ['calibration', 'calibration register', 'cal register', 'calibrations', 'torque wrenches', 'test gauges', 'gauge register', 'instruments'],
  Passport: ['passport', 'skills passport', 'skill passport', 'my skills', 'skills', 'competencies', 'sign off', 'sign offs', 'training record', 'my record'],
  Orientation: ['orientation', 'site orientation', 'training', 'site rules', 'safety training', 'induction', 'onboarding', 'new hire training', 'orientation course'],
  PreTask: ['pre-task plan', 'pretask plan', 'pre task plan', 'pre-task', 'pretask', 'jsa', 'jha', 'job hazard analysis', 'job safety analysis', 'toolbox talk', 'tailgate', 'tailboard', 'safety meeting', 'morning meeting', 'task plan'],
  WeldLog: ['weld log', 'welds', 'weld map', 'welders', 'welder log', 'nde', 'x ray', 'x-ray', 'radiography', 'rt log', 'continuity'],
  CutList: ['cut list', 'cut sheet', 'saw list', 'cutting list', 'cuts list'],
  FittingLibrary: ['fitting library', 'fittings library', 'takeout library', 'saved takeouts', 'fitting takeouts', 'library'],
};

/** The words people put round a command. They are allowed to be left over. */
const FILLER = new Set([
  'open', 'opening', 'go', 'goto', 'to', 'the', 'a', 'an', 'my', 'me', 'show', 'bring', 'up', 'pull', 'start', 'new', 'please',
  'take', 'get', 'app', 'tool', 'screen', 'page', 'can', 'you', 'i', 'want', 'need', 'let', 's', 'lets', "let's", 'hey', 'ok', 'okay',
  'pipefit', 'pro', 'now', 'just', 'on', 'into', 'in', 'for', 'and', 'with', 'of', 'is', 'at', 'launch', 'switch', 'over', 'there',
  'inch', 'inches', 'foot', 'feet', 'point', 'half', 'quarter', 'quarters', 'eighth', 'eighths', 'sixteenth', 'sixteenths', 'thirds',
  'by', 'make', 'it', 'put', 'set', 'enter', 'type', 'fill', 'use', 'change', 'than', 'about',
]);


const BOLT: Record<'done' | 'undo' | 'repeat', readonly string[][]> = {
  done: [['done'], ['next'], ['torqued'], ['good'], ['got', 'it'], ['check'], ['tight'], ['yep'], ['yes'], ['ok'], ['okay'], ['go'], ['complete'], ['finished'], ['set']],
  undo: [['undo'], ['back', 'up'], ['go', 'back'], ['oops'], ['wrong'], ['take', 'back'], ['previous'], ['back']],
  repeat: [['repeat'], ['again'], ['say', 'again'], ['what'], ['which', 'bolt'], ['where'], ['huh']],
};

const CANCEL = [['cancel'], ['never', 'mind'], ['nevermind'], ['stop'], ['forget', 'it'], ['nothing'], ['quit']];

/** Words of `ws`, minus the span [at, at+len). */
const without = (ws: readonly string[], at: number, len: number) => [...ws.slice(0, at), ...ws.slice(at + len)];

/** True when everything left is filler or figures. */
function onlyFillerAndFigures(ws: readonly string[], figureWords: ReadonlySet<string> = new Set()): boolean {
  for (let i = 0; i < ws.length; ) {
    const w = ws[i]!;
    if (FILLER.has(w) || figureWords.has(w)) {
      i += 1;
      continue;
    }
    const n = numberAt(ws, i);
    if (n) {
      i = n.next;
      continue;
    }
    return false;
  }
  return true;
}

/** “Read this box”: a verb and a thing to read, beside the filler. */
const READ_VERBS = new Set(['read', 'scan', 'photograph', 'photo', 'shoot']);
const READ_THINGS = new Set(['box', 'label', 'labels', 'sheet', 'sheets', 'tag', 'carton', 'fitting', 'fittings', 'this', 'that', 'maker', 'makers', 'dimension', 'dimensions']);

/** The words of “add it to the cut list”, beside the filler. */
const ADD_CUT = new Set(['add', 'save', 'cut', 'list', 'this', 'that', 'one', 'piece']);

const splitWords = (phrases: readonly string[]): string[] => phrases.flatMap((p) => p.split(' '));

/** Every word the app can take by voice: the matcher's vocabulary, for hearing a misheard word as the nearest known one (hear.ts). */
export const VOCAB: ReadonlySet<string> = new Set([
  ...splitWords(Object.values(TOOL_WORDS).flat()),
  ...splitWords(Object.values(TOOL_FIGURES).flatMap((t) => Object.values(t as Record<string, FigureSpec>).flatMap((f) => f.words))),
  ...FILLER,
  ...Object.values(BOLT).flat().flat(),
  ...CANCEL.flat(),
  ...READ_VERBS,
  ...READ_THINGS,
  ...ADD_CUT,
  ...NUMBER_WORDS,
  ...SPEC_WORDS,
  ...splitWords(MATERIALS.flatMap((m) => m.words)),
  'degree', 'degrees', 'of', 'is', 'at', 'to', 'equals', 'about', 'back', 'done', 'undo', 'repeat',
]);

/** Every phrase the app can take by voice, for hearing a run of words as the phrase it nearly is (hear.ts). */
const PHRASES: readonly (readonly string[])[] = [
  ...Object.values(TOOL_WORDS).flat(),
  ...Object.values(TOOL_FIGURES).flatMap((t) => Object.values(t as Record<string, FigureSpec>).flatMap((f) => f.words)),
  ...MATERIALS.flatMap((m) => m.words),
].map((p) => p.split(' ')).concat(Object.values(BOLT).flat(), CANCEL);

/** The words of a tool's figures, heard from a little further off once the tool is in play. */
const figureWords = (route: string | null): ReadonlySet<string> =>
  new Set(isFigureRoute(route) ? splitWords(Object.values(TOOL_FIGURES[route] as Record<string, FigureSpec>).flatMap((f) => f.words)) : []);

/** What was said, with the words this phone has been taught read as meant, a number split off a word run into it, and a run of words that is nearly a phrase the app knows taken as it. */
const phrased = (text: string): string[] => snapPhrases(splitGlued(applyLearned(tokens(text), VOCAB), VOCAB), PHRASES, VOCAB);

/** The recogniser's other transcripts, for the panel's "Not that?": the ones after the first, blanks and repeats dropped, three at most. */
export const othersOf = (alternatives: readonly string[]): string[] => [...new Set(alternatives.slice(1).map((t) => t.trim()).filter(Boolean))].slice(0, 3);

/** The words a screen is called and takes by voice: what a mishearing in a sentence that opened it would have been (learned.ts). */
export const routeWords = (route: string): string[] => [
  ...(TOOL_WORDS[route as OpenRoute] ?? []),
  ...(isFigureRoute(route) ? Object.values(TOOL_FIGURES[route] as Record<string, FigureSpec>).flatMap((f) => f.words) : []),
];

/** What was said, each word heard as the nearest one the app knows, with the open screen's figures in play. */
export const heardWords = (text: string, screen: string | null): string[] => snapWords(phrased(text), VOCAB, figureWords(screen));

const sayingOnly = (ws: readonly string[], phrases: readonly (readonly string[])[]): boolean =>
  phrases.some((p) => {
    const at = hasPhrase(ws, p);
    return at >= 0 && onlyFillerAndFigures(without(ws, at, p.length));
  });

/**
 * The command in what was said, or null when it needs Claude. `screen` is the
 * route on top: on the bolt-up screen, "done" is a bolt.
 */
export function localIntent(text: string, screen: string | null): VoiceCommand | null {
  return intentOf(text, screen, false);
}

/**
 * The command in what was said when it is nearly one: the tool named and
 * its figures taken, with one word the app could not place let go and
 * handed back as `ignored`. For when Claude is not there to hear the rest,
 * or has not: "bolt up, 12 giraffe" opens the bolt-up at 12 bolts and says
 * what it did not catch, rather than doing nothing. Null when more than one
 * word is unplaced, or no tool is named: that is a sentence, not a slip.
 */
export function lenientIntent(text: string, screen: string | null): VoiceCommand | null {
  return intentOf(text, screen, true);
}

/**
 * The first of what the recogniser offered that is a command: the top
 * transcript first, then its alternatives, each heard the app's way; then
 * the same again, leniently. The recogniser's second guess is often the
 * right word ("bolt" behind "volt"), and it costs nothing to look.
 */
export function bestLocal(alternatives: readonly string[], screen: string | null): { cmd: VoiceCommand; heard: string } | null {
  const texts = alternatives.filter((t) => t.trim());
  for (const t of texts) {
    const cmd = localIntent(t, screen);
    if (cmd) return { cmd, heard: t };
  }
  for (const t of texts) {
    const cmd = lenientIntent(t, screen);
    if (cmd) return { cmd, heard: t };
  }
  return null;
}

function intentOf(text: string, screen: string | null, lenient: boolean): VoiceCommand | null {
  // The phrases as said, and every word heard as the nearest known one; the
  // two line up word for word, so a tool found in the one can be cut from
  // the other.
  const said = phrased(text);
  const ws = snapWords(said, VOCAB, figureWords(screen));
  if (!ws.length) return null;

  if (ws.length <= 3 && sayingOnly(ws, CANCEL)) return { kind: 'cancel' };

  if (screen === 'FlangeBoltUp' && ws.length <= 4) {
    for (const act of ['undo', 'repeat', 'done'] as const) if (sayingOnly(ws, BOLT[act])) return { kind: 'bolt', act };
  }

  // "Read this box", "scan the label", "photograph the sheet": the fitting sheet reader, camera up.
  if (ws.length <= 8 && ws.some((w) => READ_VERBS.has(w)) && ws.some((w) => READ_THINGS.has(w) && w !== 'this' && w !== 'that') && ws.every((w) => READ_VERBS.has(w) || READ_THINGS.has(w) || FILLER.has(w)))
    return { kind: 'readBox' };

  // On Cut Length, a 3D spool or an iso's cuts, "add it", "add to the cut list", "save that cut": what is on screen goes on the list.
  if ((screen === 'CutLength' || screen === 'SpoolBuilder' || screen === 'IsoCuts') && ws.length <= 8 && (ws.includes('add') || ws.includes('save')) && ws.every((w) => ADD_CUT.has(w) || FILLER.has(w)))
    return { kind: 'addCut' };

  if (ws.length <= 3 && sayingOnly(ws, [['back'], ['go', 'back']])) return { kind: 'back' };

  const specs = readSpecs(ws.join(' '));
  if (specs) return { kind: 'specs', ...specs };

  // With a tool open, its own figures come first: on the saddle, "bend 45"
  // is the saddle's angle, not the pipe bend tool.
  if (isFigureRoute(screen)) {
    const f = readFigures(ws, screen, lenient);
    if (f && Object.keys(f.figures).length) return { kind: 'open', route: screen, figures: f.figures, ...(f.ignored.length ? { ignored: f.ignored } : {}) };
  }

  // The longest tool name in it.
  let best: { route: OpenRoute; at: number; len: number } | null = null;
  for (const route of Object.keys(TOOL_WORDS) as OpenRoute[]) {
    for (const name of TOOL_WORDS[route]) {
      const phrase = name.split(' ');
      const at = hasPhrase(ws, phrase);
      if (at >= 0 && (!best || phrase.length > best.len)) best = { route, at, len: phrase.length };
    }
  }
  if (!best) return null;
  // With the tool named, the rest is heard in its light: its own figure
  // words come from a little further off, so "12 bowl" on the bolt-up is 12
  // bolts and not the bill of materials it was as near to with no tool known.
  const rest = snapWords(without(said, best.at, best.len), VOCAB, figureWords(best.route));

  if (isFigureRoute(best.route)) {
    const f = readFigures(rest, best.route, lenient);
    if (!f) return null;
    const open: VoiceCommand = { kind: 'open', route: best.route };
    if (Object.keys(f.figures).length) open.figures = f.figures;
    if (f.ignored.length) open.ignored = f.ignored;
    return open;
  }
  // A number left with any other tool is something to be done with it: Claude's. Leniently, one word or number is let go.
  const left = rest.filter((w, i) => !FILLER.has(w) || numberAt(rest, i));
  if (left.length > (lenient ? 1 : 0)) return null;
  return left.length ? { kind: 'open', route: best.route, ignored: left } : { kind: 'open', route: best.route };
}

/** A value for a field of this kind at `i`. */
function valueAt(ws: readonly string[], i: number, kind: FigureSpec['kind']): { f: Figure; next: number } | null {
  if (kind === 'length') {
    const l = lengthAt(ws, i);
    return l ? { f: { n: l.inches, inches: l.explicit }, next: l.next } : null;
  }
  const n = numberAt(ws, i);
  if (!n) return null;
  // "45 degrees" carries its own unit word; it belongs to the value.
  const next = kind === 'angle' && (ws[n.next] === 'degree' || ws[n.next] === 'degrees') ? n.next + 1 : n.next;
  return { f: { n: n.value, inches: false }, next };
}

const LEAD = new Set(['of', 'is', 'at', 'to', 'equals', 'about']);

/**
 * The figures in `ws` for a tool, or null when anything is left over that is
 * neither a figure, a figure's name nor the words round a command. Each name
 * takes the value after it ("rise 12", "rise of 12") or failing that the one
 * before ("12 inch rise", "45 degrees"); a single bare value with no name
 * fills the tool's first field. Leniently, one word left over is let go and
 * handed back as `ignored`; a value no field could hold is never let go.
 */
export function readFigures(ws: readonly string[], route: FigureRoute, lenient = false): { figures: Figures; ignored: string[] } | null {
  const specs = TOOL_FIGURES[route] as Record<string, FigureSpec>;
  const names = figureNames(route);
  const used = new Array<boolean>(ws.length).fill(false);
  const out: Figures = {};
  const take = (from: number, to: number) => {
    for (let k = from; k < to; k++) used[k] = true;
  };

  for (let i = 0; i < ws.length; i++) {
    if (used[i]) continue;
    const name = names.find((n) => n.words.every((w, k) => ws[i + k] === w));
    if (!name) continue;
    const spec = specs[name.key]!;
    const end = i + name.words.length;
    if (out[name.key] !== undefined) {
      take(i, end);
      continue;
    }
    // A value just before the name comes first ("4 inch depth, 30 to obstruction",
    // "45 degrees"); the value may have taken the name with it as its unit.
    let found = false;
    for (let s = Math.max(0, i - 7); s < i && !found; s++) {
      if (used.slice(s, i).some(Boolean)) continue;
      const before = valueAt(ws, s, spec.kind);
      if (!before || (before.next !== i && before.next !== end)) continue;
      if (!plausible(spec, before.f)) return null;
      out[name.key] = before.f;
      take(s, end);
      found = true;
    }
    if (found) continue;
    // Then the value after it: "rise 12", "rise of 12".
    let j = end;
    while (LEAD.has(ws[j] ?? '')) j += 1;
    const after = valueAt(ws, j, spec.kind);
    // A value said against a name that no field could hold is a mishearing: let Claude have it.
    if (after && !plausible(spec, after.f)) return null;
    if (after) {
      out[name.key] = after.f;
      take(i, after.next);
      i = after.next - 1;
      continue;
    }
    take(i, end); // a name with no value is just a word
  }

  // A value with no name: the tool's first field, if nothing else filled it.
  // "Simple offset, 14 at 45 degrees" is an offset of 14.
  {
    const key = primaryFigure(route);
    const spec = specs[key]!;
    for (let i = 0; i < ws.length && out[key] === undefined; i++) {
      if (used[i]) continue;
      const v = valueAt(ws, i, spec.kind);
      if (!v) continue;
      if (!plausible(spec, v.f)) return null;
      out[key] = v.f;
      take(i, v.next);
    }
  }

  // Everything else has to be the words round a command; leniently, one word that is not.
  const ignored: string[] = [];
  for (let i = 0; i < ws.length; i++) if (!used[i] && !FILLER.has(ws[i]!)) ignored.push(ws[i]!);
  if (ignored.length > (lenient ? 1 : 0)) return null;
  return { figures: out, ignored };
}

/**
 * The first value of a kind in what was said, for a single field: "3 foot 6
 * and a quarter", "twenty two and a half", "350 millimetres". Null when there
 * is none a field of that kind could hold.
 */
export function spokenValue(text: string, kind: FigureSpec['kind']): Figure | null {
  const ws = snapWords(applyLearned(tokens(text), VOCAB), VOCAB);
  for (let i = 0; i < ws.length; i++) {
    const v = valueAt(ws, i, kind);
    if (v) return plausible({ kind }, v.f) ? v.f : null;
  }
  return null;
}

/**
 * What the recogniser is told to listen for: every tool name, every figure
 * name, the materials and walls a spec is said with, the bolt-up, camera and
 * saw words. A recogniser biased to "bolt" writes "bolt" where it would have
 * written "volt", so this cuts the mishearing at the source; hear.ts catches
 * what still gets through.
 */
export const LISTEN_FOR: string[] = [
  ...new Set([
    ...Object.values(TOOL_WORDS).flat(),
    ...Object.values(TOOL_FIGURES).flatMap((t) => Object.values(t as Record<string, FigureSpec>).flatMap((s) => s.words)),
    ...MATERIALS.flatMap((m) => m.words),
    'schedule 10', 'schedule 40', 'schedule 80', 'schedule 160', 'standard weight', 'extra strong', 'double extra strong', '10s', '40s', '80s',
    'long radius', 'short radius', 'dr 11', 'dr 17', 'class 52', 'pressure class', 'no hub', 'socket weld', 'butt weld',
    'done', 'undo', 'repeat', 'next', 'torqued', 'tight', 'psi', 'weld', 'rejected', 'porosity', 'root gap', 'foot pounds',
    'take it', 'snap', 'retake', 'save', 'cancel', 'read this box', 'scan the label', 'mark', 'is cut', 'add it', 'cut list',
    'hold started', 'hold ended', 'reading', 'test passed', 'test failed', 'safety note', 'toolbox talk',
  ]),
];
