// What is on the screen, by voice
// -------------------------------
// Every button, chip, switch and field the app draws tells this registry its
// label while it is on screen (useVoiceTargets.ts), so whatever can be seen
// can be said: "save", "SMAW", "process SMAW", "amperage 180", "WPS is
// WPS-101", "clear the note", "send the history". No screen has to be taught
// its words: a new screen built from the same buttons and fields hears them.
//
// Matched on the phone, at once, with no signal and at no cost. A label said
// whole wins; part of a label counts only when it can mean one thing, else
// the app asks which. A field takes what is said after its name.
//
// Pure: the components register, VoiceProvider asks, this decides.

import { normalise } from './words';
import { editDistance, soundKey } from './hear';

export type TargetKind = 'press' | 'pick' | 'field';
/** A number box, a one-line text box, or a note that runs to lines (said words are added to it). */
export type FieldType = 'number' | 'text' | 'note';

export type Target = {
  kind: TargetKind;
  /** As shown: "Save", "SMAW", "Amperage". */
  label: string;
  /** The row a chip or a segment stands in: "Process", "Heat input in". */
  group?: string;
  field?: FieldType;
  /** Whether this chip or segment is the one chosen now. */
  on?: boolean;
  /**
   * Do it. A field gets what was said for it ("" to clear it). Returns what to
   * say back, or null when the value would not go in.
   */
  run: (value: string) => string | null;
};

export type Entry = Target & { id: number; seq: number; screen: string | null };

const entries = new Map<number, Entry>();
let nextId = 1;
let seq = 0;

/** Put a target on a screen (a route key; null for one drawn outside any screen). */
export function addTarget(t: Target, screen: string | null): number {
  const id = nextId++;
  entries.set(id, { ...t, id, seq: ++seq, screen });
  return id;
}

export function removeTarget(id: number): void {
  entries.delete(id);
}

/** What can be said on a screen: its own targets and any drawn outside one, the newest first (a sheet over its page). */
export function targetsOn(screen: string | null): Entry[] {
  return [...entries.values()].filter((e) => e.screen === null || e.screen === screen).sort((a, b) => b.seq - a.seq);
}

/** For tests. */
export function clearTargets(): void {
  entries.clear();
}

// ------------------------------------------------------------ matching

/** Words said round a command that are not part of what it names. */
const LEAD = new Set(['tap', 'press', 'hit', 'push', 'click', 'select', 'choose', 'pick', 'touch', 'use', 'set', 'make', 'put', 'the', 'a', 'an', 'please', 'ok', 'okay', 'now', 'go', 'with']);
const TAIL = new Set(['please', 'button', 'now', 'thanks', 'tab', 'chip', 'option']);
/** Between a field's name and its value. */
const JOIN = new Set(['is', 'to', 'at', 'of', 'equals', 'as', 'be', 'equal']);
const CLEAR = new Set(['clear', 'erase', 'blank', 'empty', 'reset', 'wipe']);
/** Words too small to pick a label out on their own. */
const SMALL = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'it', 'of', 'in', 'on', 'for', 'with', 'by', 'at', 'is', 'as', 'this', 'that', 'its', 'new', 'all', 'my']);

/** A label or a thing said as words: "Volts & amps" is said "volts and amps". */
const words = (s: string): string[] => (s ? normalise(s.replace(/&/g, ' and ')).split(' ').filter(Boolean) : []);

function trim(ws: string[]): string[] {
  let a = 0;
  let b = ws.length;
  while (a < b && LEAD.has(ws[a]!)) a++;
  while (b > a && TAIL.has(ws[b - 1]!)) b--;
  return ws.slice(a, b);
}

/** Words a label is printed with and the shorter ones said for them. */
const SAID_FOR: ReadonlyMap<string, readonly string[]> = new Map([
  ['amperage', ['amps', 'amp', 'current']],
  ['voltage', ['volts', 'volt']],
  ['temperature', ['temp']],
  ['diameter', ['od']],
]);

/** One word heard as another: the same, one letter off in a long word, the same sound, or the short word said for it. Numbers only ever match exactly. */
export function sameWord(heard: string, shown: string): boolean {
  if (heard === shown) return true;
  if (SAID_FOR.get(shown)?.includes(heard)) return true;
  if (/\d/.test(heard) || /\d/.test(shown)) return false;
  if (heard.length >= 4 && shown.length >= 4 && editDistance(heard, shown) <= 1) return true;
  return heard.length >= 3 && shown.length >= 3 && soundKey(heard) === soundKey(shown);
}

/** How many of `ws`, from `at`, are `label` word for word; -1 when they are not. */
function startsWith(ws: readonly string[], at: number, label: readonly string[]): number {
  if (!label.length || ws.length - at < label.length) return -1;
  for (let i = 0; i < label.length; i++) if (!sameWord(ws[at + i]!, label[i]!)) return -1;
  return label.length;
}

const exactly = (ws: readonly string[], label: readonly string[]) => ws.length === label.length && startsWith(ws, 0, label) === label.length;

/** Every word said is in the label, in order, and at least one of them is not a small word. */
function within(ws: readonly string[], label: readonly string[]): boolean {
  if (!ws.length || ws.length >= label.length) return false;
  let j = 0;
  for (const w of ws) {
    while (j < label.length && !sameWord(w, label[j]!)) j++;
    if (j === label.length) return false;
    j++;
  }
  return ws.some((w) => !SMALL.has(w) && w.length >= 3);
}

export type ScreenMatch =
  | { kind: 'run'; target: Entry; value: string }
  /** Several number fields said in one breath: "amperage 180 voltage 24 arc time 1 minute". */
  | { kind: 'many'; items: { target: Entry; value: string }[] }
  | { kind: 'which'; targets: Entry[] }
  | { kind: 'help' };

const HELP: string[][] = [['what', 'can', 'i', 'say'], ['help'], ['what', 'can', 'i', 'do'], ['options'], ['what', 'is', 'on', 'the', 'screen'], ['what', 's', 'on', 'the', 'screen']];

/**
 * What a thing said does on the screen in front, if anything.
 * `whole`: only a label said whole, or a field with its value (tried before
 * the app-wide commands). Without it, part of a label too (tried after them).
 * `said` keeps its own capitals and punctuation for a text field's value.
 */
export function matchScreen(
  said: string,
  targets: readonly Entry[],
  opts: {
    whole: boolean;
    fields?: boolean;
    /** What said whole is a command of its own, never a field's name and value: "heat book" is the heat book, not "BOOK" in Heats. */
    reserved?: (said: string) => boolean;
  },
): ScreenMatch | null {
  const ws = trim(words(said));
  if (!ws.length || !targets.length) return null;
  if (opts.whole && HELP.some((h) => exactly(ws, h))) return { kind: 'help' };

  // A label said whole: a button, a chip, or a chip with its row ("process SMAW", "units to metric").
  const whole: Entry[] = [];
  for (const t of targets) {
    if (t.kind === 'field') continue;
    const label = words(t.label);
    if (exactly(ws, label)) whole.push(t);
    else if (t.group) {
      const g = words(t.group);
      const at = startsWith(ws, 0, g);
      if (at > 0) {
        const rest = JOIN.has(ws[at]!) ? ws.slice(at + 1) : ws.slice(at);
        if (exactly(rest, label)) whole.push(t);
      }
    }
  }
  if (whole.length) {
    // A chip already chosen loses to one that is not, then the newest wins: a sheet's Cancel over its page's.
    const best = whole.find((t) => !t.on) ?? whole[0]!;
    return { kind: 'run', target: best, value: '' };
  }

  // A field: its name, then what goes in it. "Clear the note" empties one.
  // (Not on a tool whose figures the app-wide matcher fills, with its own checks, until that has had its turn.)
  const fields = opts.fields === false || opts.reserved?.(said) ? [] : targets.filter((t) => t.kind === 'field');
  if (CLEAR.has(ws[0]!) || CLEAR.has(ws[ws.length - 1]!)) {
    const named = CLEAR.has(ws[0]!) ? trim(ws.slice(1)) : ws.slice(0, -1);
    const hit = fields.find((t) => exactly(named, words(t.label)));
    if (hit) return { kind: 'run', target: hit, value: '' };
  }
  const named = fields.map((t) => ({ t, w: words(t.label) })).sort((a, b) => b.w.length - a.w.length);
  const fieldAt = (i: number, numbersOnly: boolean) => named.find((f) => (!numbersOnly || f.t.field === 'number') && startsWith(ws, i, f.w) > 0);
  const first = fieldAt(0, false);
  if (first && first.w.length < ws.length) {
    const valueFrom = (i: number) => (JOIN.has(ws[i]!) && i + 1 < ws.length ? i + 1 : i);
    // Words go into a text field or a note whole, whatever they say.
    if (first.t.field !== 'number') return { kind: 'run', target: first.t, value: valueOf(said.trim(), ws.slice(valueFrom(first.w.length))) };
    // Number fields may follow one another: each value runs to the next field's name.
    const items: { target: Entry; value: string }[] = [];
    let cur = first;
    let from = valueFrom(first.w.length);
    for (let i = from + 1; i <= ws.length; i++) {
      const next = i < ws.length ? fieldAt(i, true) : undefined;
      if (i < ws.length && !next) continue;
      if (i === from) return null;
      items.push({ target: cur.t, value: ws.slice(from, i).join(' ') });
      if (!next) break;
      cur = next;
      from = valueFrom(i + next.w.length);
      i = from;
      if (from >= ws.length) return null;
    }
    if (!items.length) return null;
    return items.length === 1 ? { kind: 'run', target: items[0]!.target, value: items[0]!.value } : { kind: 'many', items };
  }
  if (opts.whole) return null;

  // Part of a label, when it can only mean one thing.
  const part = targets.filter((t) => t.kind !== 'field' && within(ws, words(t.label)));
  if (part.length === 1) return { kind: 'run', target: part[0]!, value: '' };
  if (part.length > 1) {
    const labels = new Set(part.map((t) => t.label));
    return labels.size === 1 ? { kind: 'run', target: part[0]!, value: '' } : { kind: 'which', targets: part.slice(0, 4) };
  }
  return null;
}

/**
 * What was said for a field, as it was said: the tail of the raw transcript
 * that the value's words came from, so "WPS-101" stays "WPS-101" and a note
 * keeps its capitals. Falls back to the normalised words.
 */
function valueOf(raw: string, valueWords: readonly string[]): string {
  if (!valueWords.length) return '';
  const first = valueWords[0]!;
  const lower = raw.toLowerCase();
  // Find the last place the value's first word starts, such that the rest of the raw text normalises to the value's words.
  for (let i = 0; i < raw.length; i++) {
    if (!lower.startsWith(first, i) || (i > 0 && /[a-z0-9]/i.test(raw[i - 1]!))) continue;
    const tail = raw.slice(i);
    if (words(tail).join(' ') === valueWords.join(' ')) return tail.trim();
  }
  return valueWords.join(' ');
}

/** What the screen can be told, said back when asked: its labels, buttons first. */
export function screenHelp(targets: readonly Entry[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (s: string) => {
    const k = s.toLowerCase();
    if (!seen.has(k) && s.trim()) {
      seen.add(k);
      out.push(s);
    }
  };
  for (const t of targets) if (t.kind === 'press') add(t.label);
  for (const t of targets) if (t.kind === 'field') add(`${t.label} and a figure`);
  for (const t of targets) if (t.kind === 'pick') add(t.label);
  if (!out.length) return 'Say a tool by name, like "rolling offset" or "heat input".';
  const shown = out.slice(0, 10);
  return `On this screen you can say: ${shown.join(', ')}${out.length > shown.length ? `, and ${out.length - shown.length} more` : ''}. Or any tool by name.`;
}

/** The labels on a screen, for the recogniser to listen for. */
export function screenPhrases(targets: readonly Entry[], max = 60): string[] {
  const out = new Set<string>();
  for (const t of targets) {
    if (out.size >= max) break;
    if (t.label.trim()) out.add(t.label.trim());
    if (t.group && out.size < max) out.add(`${t.group} ${t.label}`.trim());
  }
  return [...out];
}
