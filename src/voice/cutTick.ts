// Ticking cuts off by voice, at the saw
// -------------------------------------
// "4 done", "mark 7 is cut", "SP-12-1 done", "undo 4", "4 not cut", and
// "next". A mark is matched letters and digits only, so "S P twelve one"
// finds SP-12-1. Saying a cut is done sets it done — it never flips — so
// hearing the phone's own "Mark 4 cut" back does nothing a second time; and
// nothing the phone says is a command on its own, because anything heard
// that is not a mark, a done word or filler means it was not a tick.
//
// A word a letter or two off a tick word is heard as it (hear.ts): "4 down"
// is "4 done", "text" is "next", "under 4" is "undo 4". Every word the phone
// says back is in the vocabulary, so none of them is ever bent into one.

import { snapWords, splitGlued } from './hear';
import { applyLearned } from './learned';
import { NUMBER_WORDS, numberAt, tokens } from './words';

export type Tick = { kind: 'set'; key: string; done: boolean } | { kind: 'next' };

const DONE = new Set(['done', 'cut', 'finished', 'off', 'tick', 'ticked', 'check', 'checked', 'complete']);
const UNDO = new Set(['undo', 'uncut', 'not', 'untick', 'reopen']);
const FILLER = new Set(['mark', 'number', 'no', 'piece', 'the', 'is', 'has', 'been', 'that', 'its', 'ok', 'okay', 'please', 'and', 'was', 'got', 'just', 'cuts', 'it', 'one', 'now', 'with', 'for']);
const NEXT = [['next'], ['whats', 'next'], ['what', 'is', 'next'], ['next', 'one'], ['next', 'cut'], ['next', 'piece']];

/** What the phone says back at the saw, and words said round a mark: known, so never heard as something else. */
const SAID_BACK = [
  'all', 'nothing', 'left', 'on', 'list', 'this', 'there', 'are', 'tap', 'you', 'mean', 'already', 'hadnt', 'yet', 'to', 'again', 'thats', 'last',
  'inch', 'inches', 'hands', 'free', 'say', 'then', 'or', 'mic', 'stopped', 'turn', 'line', 'pipe', 'of', 'a', 'in', 'at',
];
const VOCAB: ReadonlySet<string> = new Set([...DONE, ...UNDO, ...FILLER, ...NEXT.flat(), ...NUMBER_WORDS, ...SAID_BACK]);
/** The words a tick turns on, heard from a little further off. */
const PREFER: ReadonlySet<string> = new Set([...DONE, ...UNDO, 'next']);

/** A mark as it is matched: letters and digits only, lower case. "SP-12-1" is "sp121". */
export const markKey = (mark: string): string => mark.toLowerCase().replace(/[^a-z0-9]/g, '');

export function readTick(text: string): Tick | null {
  const ws = snapWords(
    splitGlued(
      applyLearned(
        tokens(text).map((w) => w.replace(/'/g, '')),
        VOCAB,
      ),
      VOCAB,
    ),
    VOCAB,
    PREFER,
  );
  if (!ws.length || ws.length > 10) return null;
  if (NEXT.some((p) => p.length === ws.length && p.every((w, i) => ws[i] === w))) return { kind: 'next' };

  let done: boolean | null = null;
  const key: string[] = [];
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i]!;
    if (UNDO.has(w)) {
      done = false;
      continue;
    }
    if (DONE.has(w)) {
      if (done === null) done = true;
      continue;
    }
    // "one" is a number in a mark ("mark one done"), filler anywhere else.
    const n = numberAt(ws, i);
    if (n && Number.isInteger(n.value) && n.value >= 0 && (n.next === i + 1 || !/^\d+$/.test(w))) {
      key.push(String(n.value));
      i = n.next - 1;
      continue;
    }
    if (FILLER.has(w)) continue;
    // Letters in a mark are short (SP, L) or run with digits (L12); a word is chatter.
    if ((/^[a-z]{1,2}$/.test(w) || (/^[a-z0-9]+$/.test(w) && /\d/.test(w))) && w.length <= 8) {
      key.push(w);
      continue;
    }
    return null;
  }
  if (done === null || !key.length) return null;
  return { kind: 'set', key: key.join(''), done };
}
