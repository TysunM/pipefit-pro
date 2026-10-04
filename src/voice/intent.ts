// What a spoken command means, worked out on the phone
// ---------------------------------------------------
// Most of what is said to the app is a tool's name: "bolt up", "rolling
// offset, rise 12, roll 8, run 30", "hydro". Those are matched here, at once,
// with no signal and at no cost. Anything with more in it than a tool and its
// figures — "weld 14 rejected for porosity", "what's the takeout on a 2 inch
// 90" — comes back null and goes to Claude (ai/voice.ts).
//
// The rule that keeps this honest: a command is only taken here when every
// word of it is accounted for — the tool's name, the figures, and the words
// people put round a command ("open", "bring up", "please"). One word left
// over and Claude hears it instead, so nothing said is quietly half-done.

import type { ToolRoute } from '../navigation/groups';
import { hasPhrase, namedLengths, numberAt, tokens } from './words';

export type OpenRoute = ToolRoute | 'Home' | 'Settings';

export type VoiceCommand =
  | { kind: 'open'; route: OpenRoute; params?: { rise?: number; roll?: number; run?: number } }
  /** On the bolt-up screen: the bolt asked for is torqued, take the last one back, or say it again. */
  | { kind: 'bolt'; act: 'done' | 'undo' | 'repeat' }
  | { kind: 'back' }
  | { kind: 'cancel' };

/**
 * What each tool is called on a job. Longer names first within a tool; across
 * tools the longest match wins, so "heat book" is never the handbook and
 * "rolling offset" is never the simple one.
 */
export const TOOL_WORDS: Record<OpenRoute, readonly string[]> = {
  Home: ['home', 'home screen', 'main menu', 'start screen'],
  Settings: ['settings', 'setting', 'preferences'],
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
};

/** The words people put round a command. They are allowed to be left over. */
const FILLER = new Set([
  'open', 'opening', 'go', 'goto', 'to', 'the', 'a', 'an', 'my', 'me', 'show', 'bring', 'up', 'pull', 'start', 'new', 'please',
  'take', 'get', 'app', 'tool', 'screen', 'page', 'can', 'you', 'i', 'want', 'need', 'let', 's', 'lets', "let's", 'hey', 'ok', 'okay',
  'pipefit', 'pro', 'now', 'just', 'on', 'into', 'in', 'for', 'and', 'with', 'of', 'is', 'at', 'launch', 'switch', 'over', 'there',
  'inch', 'inches', 'foot', 'feet', 'point', 'half', 'quarter', 'quarters', 'eighth', 'eighths', 'sixteenth', 'sixteenths', 'thirds',
]);

/** The figures a rolling offset takes when they are said with it. */
const OFFSET_NAMES = { rise: ['rise', 'set', 'drop', 'height'], roll: ['roll', 'spread'], run: ['run', 'advance', 'travel'] } as const;

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
  const ws = tokens(text);
  if (!ws.length) return null;

  if (ws.length <= 3 && sayingOnly(ws, CANCEL)) return { kind: 'cancel' };

  if (screen === 'FlangeBoltUp' && ws.length <= 4) {
    for (const act of ['undo', 'repeat', 'done'] as const) if (sayingOnly(ws, BOLT[act])) return { kind: 'bolt', act };
  }

  if (ws.length <= 3 && sayingOnly(ws, [['back'], ['go', 'back']])) return { kind: 'back' };

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
  const rest = without(ws, best.at, best.len);

  if (best.route === 'RollingOffset') {
    const names = new Set(Object.values(OFFSET_NAMES).flat());
    if (!onlyFillerAndFigures(rest, names)) return null;
    const f = namedLengths(rest.join(' '), OFFSET_NAMES);
    const params = Object.fromEntries(Object.entries(f).filter(([, v]) => typeof v === 'number' && v > 0 && v < 100_000));
    return Object.keys(params).length ? { kind: 'open', route: 'RollingOffset', params } : { kind: 'open', route: 'RollingOffset' };
  }
  // A number left with any other tool is something to be done with it: Claude's.
  if (rest.some((w, i) => !FILLER.has(w) || numberAt(rest, i))) return null;
  return { kind: 'open', route: best.route };
}

/** What the recogniser is told to listen for: every tool name and the bolt-up words. */
export const LISTEN_FOR: string[] = [
  ...new Set([...Object.values(TOOL_WORDS).flat(), 'done', 'undo', 'repeat', 'rise', 'roll', 'run', 'psi', 'weld', 'rejected', 'porosity']),
];
