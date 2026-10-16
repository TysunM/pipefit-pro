// Hearing a word the app knows in a word the recogniser wrote
// -----------------------------------------------------------
// A phone's recogniser is trained on everyday speech, not on a pipe job. It
// writes "12 volt" for "12 bolt", "bold cup" for "bolt up", "hydra" for
// "hydro", "rice 12, role 8" for "rise 12, roll 8". A person hearing those on
// a job would not pause: there is nothing in the trade called a volt, and the
// man just said "flange". The app should hear the same way.
//
// So a word that is not one the app knows is taken as the nearest one it
// does know, when it is near enough: a letter or two off, or the same
// consonants said with a different mouth (volt and bolt, rice and rise),
// and nearer still when the word belongs to the tool already named or the
// screen already open. A run of words that is nearly a phrase the app knows
// is taken as that phrase ("bold cup", "i so", "cut lift"). A word that is
// not near anything is left as it was, and a word that is as near to two
// different things as to each other is left too: a guess between "cut" and
// "cal" is not hearing, it is making things up.
//
// Only the local matcher sees the snapped words. What goes to Claude is what
// was said, as it was heard, because Claude can read round a mishearing on
// its own and should not be told the app's guess as fact.

/** The consonants of a word, with the ones a recogniser swaps for each other folded together. Vowels, h, w and y are dropped. */
export function soundKey(word: string): string {
  const fold: Record<string, string> = {
    b: 'B', p: 'B', v: 'B', f: 'B',
    c: 'K', k: 'K', q: 'K', g: 'K', j: 'K',
    d: 'T', t: 'T',
    s: 'S', z: 'S', x: 'S',
    m: 'N', n: 'N',
    l: 'L', r: 'R',
  };
  let out = '';
  const w = word.toLowerCase();
  for (let i = 0; i < w.length; i += 1) {
    // A soft c (rice, cent) is an s sound, not a k.
    const k = w[i] === 'c' && /[eiy]/.test(w[i + 1] ?? '') ? 'S' : fold[w[i]!];
    if (k && out[out.length - 1] !== k) out += k;
  }
  return out;
}

/** Edits between two words: a letter changed, dropped, added, or two swapped. */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d: number[][] = [];
  for (let i = 0; i <= m; i += 1) d.push(new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) d[i]![0] = i;
  for (let j = 0; j <= n; j += 1) d[0]![j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2]![j - 2]! + 1);
      d[i]![j] = v;
    }
  }
  return d[m]![n]!;
}

const isNumeric = (w: string): boolean => /^\d/.test(w);

/**
 * The known word nearest to `w`, or null when none is near enough or two are
 * as near as each other. `prefer` holds the words that belong to what is
 * already in play, the open tool's figures or the tool just named, and they
 * are heard from a little further off.
 */
export function snapWord(w: string, vocab: ReadonlySet<string>, prefer: ReadonlySet<string> = new Set()): string | null {
  if (w.length < 3 || isNumeric(w) || vocab.has(w)) return null;
  const key = soundKey(w);
  let best: { word: string; score: number } | null = null;
  let tie = false;
  for (const c of vocab) {
    if (Math.abs(c.length - w.length) > 3 || c.length < 3) continue;
    const d = editDistance(w, c);
    if (d > 3) continue;
    const same = key.length > 0 && soundKey(c) === key;
    const near = prefer.has(c);
    // How far off a word may be and still be heard: a letter for any word
    // (a short one only when it sounds the same: "hot" is not "not"); two
    // for one that sounds the same or belongs to the tool in play; three for
    // a long word that does both.
    const allowed = d <= 1 ? w.length >= 4 || same : d === 2 ? (same || near) && w.length >= 4 : same && near && w.length >= 6;
    if (!allowed) continue;
    const score = d * 10 - (same ? 3 : 0) - (near ? 4 : 0);
    if (!best || score < best.score) {
      best = { word: c, score };
      tie = false;
    } else if (score === best.score && c !== best.word) tie = true;
  }
  return best && !tie ? best.word : null;
}

/** A number run into a word ("12volt", "350mm", "3ft") split off it. "40s" and a word the app knows are left alone. */
export function splitGlued(ws: readonly string[], vocab: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const w of ws) {
    const glued = /^(\d+(?:\.\d+)?)([a-z]{2,})$/.exec(w);
    if (glued && !vocab.has(w)) out.push(glued[1]!, glued[2]!);
    else out.push(w);
  }
  return out;
}

/**
 * The words as the app hears them: each unknown one taken as the nearest
 * known one. Words the app knows, and numbers, are never touched, and the
 * words come back one for one.
 */
export function snapWords(ws: readonly string[], vocab: ReadonlySet<string>, prefer: ReadonlySet<string> = new Set()): string[] {
  return ws.map((w) => snapWord(w, vocab, prefer) ?? w);
}

/**
 * A run of two or three words that is nearly a phrase the app knows, taken
 * as that phrase: "bold cup" is "bolt up", "i so" is "iso", "cut lift" is
 * "cut list", "heat books" is "heat book". The run is compared to the
 * phrase with the spaces out, so a word broken in two or two run together
 * still match. A run of words the app knows may be a letter off; one with a
 * word it does not know may be two off for each such word, three at most.
 * A run that already is a phrase is left alone, whatever else it is near.
 */
export function snapPhrases(ws: readonly string[], phrases: readonly (readonly string[])[], vocab: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (let i = 0; i < ws.length; ) {
    let best: { words: readonly string[]; d: number; n: number } | null = null;
    let tie = false;
    for (let n = Math.min(3, ws.length - i); n >= 2; n -= 1) {
      const win = ws.slice(i, i + n);
      if (win.some(isNumeric)) continue;
      if (phrases.some((p) => p.length === n && p.every((w, k) => w === win[k]))) {
        best = null;
        tie = false;
        break;
      }
      const joined = win.join('');
      const unknown = win.filter((w) => !vocab.has(w)).length;
      const allow = unknown ? Math.min(3, 2 * unknown) : 1;
      for (const p of phrases) {
        const pj = p.join('');
        if (pj.length < 3 || Math.abs(pj.length - joined.length) > allow) continue;
        const d = editDistance(joined, pj);
        if (d > allow || (d > 0 && pj.length < 4)) continue;
        if (!best || d < best.d || (d === best.d && n > best.n) || (d === best.d && n === best.n && pj.length > best.words.join('').length)) {
          best = { words: p, d, n };
          tie = false;
        } else if (d === best.d && n === best.n && pj.length === best.words.join('').length && pj !== best.words.join('')) tie = true;
      }
    }
    if (best && !tie) {
      out.push(...best.words);
      i += best.n;
    } else {
      out.push(ws[i]!);
      i += 1;
    }
  }
  return out;
}
