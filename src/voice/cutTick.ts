// Ticking cuts off by voice, at the saw
// -------------------------------------
// "4 done", "mark 7 is cut", "SP-12-1 done", "undo 4", "4 not cut", and
// "next". A mark is matched letters and digits only, so "S P twelve one"
// finds SP-12-1. Saying a cut is done sets it done — it never flips — so
// hearing the phone's own "Mark 4 cut" back does nothing a second time; and
// nothing the phone says is a command on its own, because anything heard
// that is not a mark, a done word or filler means it was not a tick.

import { numberAt, tokens } from './words';

export type Tick = { kind: 'set'; key: string; done: boolean } | { kind: 'next' };

const DONE = new Set(['done', 'cut', 'finished', 'off', 'tick', 'ticked', 'check', 'checked', 'complete']);
const UNDO = new Set(['undo', 'uncut', 'not', 'untick', 'reopen']);
const FILLER = new Set(['mark', 'number', 'no', 'piece', 'the', 'is', 'has', 'been', 'that', 'its', 'ok', 'okay', 'please', 'and', 'was', 'got', 'just', 'cuts', 'it', 'one', 'now', 'with', 'for']);
const NEXT = [['next'], ['whats', 'next'], ['what', 'is', 'next'], ['next', 'one'], ['next', 'cut'], ['next', 'piece']];

/** A mark as it is matched: letters and digits only, lower case. "SP-12-1" is "sp121". */
export const markKey = (mark: string): string => mark.toLowerCase().replace(/[^a-z0-9]/g, '');

export function readTick(text: string): Tick | null {
  const ws = tokens(text).map((w) => w.replace(/'/g, ''));
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
