// What this phone's recogniser gets wrong, and what was meant
// -----------------------------------------------------------
// hear.ts takes a misheard word as the nearest one the app knows, by the
// shape of the word. That covers "volt" for "bolt". It cannot cover a
// recogniser that writes "tork" for "torque" every time, because "tork" is
// too far off by the rules, and the rules are kept tight so the app does not
// make things up. But a phone's recogniser is consistent in its mistakes:
// what it wrote wrongly today it will write wrongly tomorrow, in the same
// words, for the same voice.
//
// So the pairs are kept. When a transcript further down the recogniser's
// list made sense of a command the top one did not, the words that differ
// are the mishearing and what was meant ("12 volt" against "12 bolt"). When
// Claude opened a tool from a sentence the phone could not place, the words
// in it the app did not know, if near enough that tool's names, are taken
// as mishearings of them ("tork pattern": tork, torque). Next time that word
// comes back from the recogniser it is read as what it meant, before any
// matching, with no signal and no Claude.
//
// A pair only ever fires on the exact word it was learned from, and only
// where that word is not one the app knows, so nothing learned can bend a
// real word. The list is capped, newest kept, and Settings can forget it.
// It goes into the backup like any record.

import { editDistance, soundKey } from './hear';
import { tokens } from './words';

export const LEARNED_VERSION = 1;
export const MAX_LEARNED = 200;

export type Learned = {
  /** What the recogniser wrote, as a token. */
  said: string;
  /** The word the app knows that it meant. */
  meant: string;
  /** When it was last taught. */
  at: number;
  /** How many times it has been taught. */
  times: number;
};

export type LearnedBook = { pairs: Learned[]; foreign: boolean; dropped: number };

export const emptyLearned = (): LearnedBook => ({ pairs: [], foreign: false, dropped: 0 });

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const word = (v: unknown): string | null => (typeof v === 'string' && /^[a-z][a-z0-9']{1,23}$/.test(v) ? v : null);

export function validPair(v: unknown): Learned | null {
  if (!isRec(v)) return null;
  const said = word(v.said);
  const meant = word(v.meant);
  if (!said || !meant || said === meant) return null;
  const at = Number.isInteger(v.at) && (v.at as number) >= 0 ? (v.at as number) : 0;
  const times = Number.isInteger(v.times) && (v.times as number) >= 1 ? (v.times as number) : 1;
  return { said, meant, at, times };
}

export function serialiseLearned(b: LearnedBook): string {
  return JSON.stringify({ v: LEARNED_VERSION, pairs: b.pairs });
}

export function parseLearned(raw: string | null | undefined): LearnedBook {
  if (!raw) return emptyLearned();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...emptyLearned(), dropped: 1 };
  }
  if (!isRec(parsed) || !Number.isInteger(parsed.v) || (parsed.v as number) < 1) return { ...emptyLearned(), dropped: 1 };
  if ((parsed.v as number) > LEARNED_VERSION) return { ...emptyLearned(), foreign: true };
  if (!Array.isArray(parsed.pairs)) return { ...emptyLearned(), dropped: 1 };
  const pairs: Learned[] = [];
  const seen = new Set<string>();
  let dropped = 0;
  for (const p of parsed.pairs) {
    const v = validPair(p);
    if (!v || seen.has(v.said)) {
      dropped += 1;
      continue;
    }
    seen.add(v.said);
    pairs.push(v);
  }
  return { pairs, foreign: false, dropped };
}

/** The pairs taught: one said again is counted again and moves to now; past MAX_LEARNED the oldest go. */
export function learn(book: LearnedBook, pairs: readonly { said: string; meant: string }[], now: number): LearnedBook {
  let out = book.pairs;
  for (const p of pairs) {
    const v = validPair({ said: p.said, meant: p.meant, at: now, times: 1 });
    if (!v) continue;
    const had = out.find((x) => x.said === v.said);
    out = had ? out.map((x) => (x === had ? { ...x, meant: v.meant, at: now, times: x.times + 1 } : x)) : [...out, v];
  }
  if (out.length > MAX_LEARNED) out = [...out].sort((a, b) => b.at - a.at).slice(0, MAX_LEARNED);
  return out === book.pairs ? book : { ...book, pairs: out };
}

export const forgetAll = (book: LearnedBook): LearnedBook => (book.pairs.length ? { ...book, pairs: [] } : book);

export const learnedMap = (book: LearnedBook): ReadonlyMap<string, string> => new Map(book.pairs.map((p) => [p.said, p.meant]));

// ------------------------------------------------------------ hearing with it

let current: ReadonlyMap<string, string> = new Map();

/** The pairs the matchers hear with, set by the voice provider as the store changes. */
export const setLearnedWords = (m: ReadonlyMap<string, string>): void => {
  current = m;
};

export const learnedWords = (): ReadonlyMap<string, string> => current;

/** `ws` with every word this phone has been taught read as what it meant. A word the app knows is never touched. */
export function applyLearned(ws: readonly string[], vocab: ReadonlySet<string>, map: ReadonlyMap<string, string> = current): string[] {
  return ws.map((w) => (vocab.has(w) ? w : (map.get(w) ?? w)));
}

// ------------------------------------------------------------ what to learn

const learnable = (w: string, vocab: ReadonlySet<string>): boolean => w.length >= 3 && !/^\d/.test(w) && !vocab.has(w);

/**
 * The mishearings in what was heard first, against the transcript that made
 * sense of it: "flange bolt up 12 volt" against "flange bolt up 12 bolt" is
 * volt, meant bolt. Only word for word the same shape, only an unknown word
 * against a known one, and at most two of them: more than that is a
 * different sentence, not a slip.
 */
export function alignTranscripts(heard: string, meant: string, vocab: ReadonlySet<string>): { said: string; meant: string }[] {
  const a = tokens(heard);
  const b = tokens(meant);
  if (!a.length || a.length !== b.length) return [];
  const out: { said: string; meant: string }[] = [];
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] === b[i]) continue;
    if (learnable(a[i]!, vocab) && vocab.has(b[i]!)) out.push({ said: a[i]!, meant: b[i]! });
  }
  return out.length <= 2 ? out : [];
}

/**
 * The unknown words of what was heard, each taken as the nearest of `words`
 * when it is near: the names of the tool Claude opened from it, or the
 * materials it set. Further off than hear.ts would go on its own, because
 * Claude's reading of the whole sentence vouches for it; still never a tie.
 */
export function alignToWords(heard: string, words: readonly string[], vocab: ReadonlySet<string>): { said: string; meant: string }[] {
  const targets = new Set(words.flatMap((w) => w.split(' ')).filter((w) => w.length >= 3 && !/^\d/.test(w)));
  const out: { said: string; meant: string }[] = [];
  for (const w of new Set(tokens(heard))) {
    if (!learnable(w, vocab)) continue;
    const key = soundKey(w);
    let best: { t: string; score: number } | null = null;
    let tie = false;
    for (const t of targets) {
      if (Math.abs(t.length - w.length) > 3) continue;
      const d = editDistance(w, t);
      const same = key.length > 0 && soundKey(t) === key;
      const allowed = d <= 2 || (d === 3 && w.length >= 5) || (d <= 4 && same && w.length >= 4);
      if (!allowed) continue;
      const score = d * 10 - (same ? 5 : 0);
      if (!best || score < best.score) {
        best = { t, score };
        tie = false;
      } else if (score === best.score && t !== best.t) tie = true;
    }
    if (best && !tie) out.push({ said: w, meant: best.t });
  }
  return out;
}
