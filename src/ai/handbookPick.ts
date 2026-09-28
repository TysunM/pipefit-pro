// Smart handbook search
// ---------------------
// The handbook's own search matches words: every word typed has to appear in
// a table's title, group, page, note or column names. A fitter types "how far
// does a 90 take out" or "center to face 90 ell", and it finds nothing. In the
// lab (tools/jev-lab.mjs, 33 plain queries) it found a right table for 7.
//
// Jev choosing among the tables — each described by its title, group, columns
// and printed note — picked a right table first for all 33, and said "none"
// for the three nothing here answers. So code describes the tables, Jev picks
// one, and the word search stays as the instant answer with no signal.
//
// Shared by the Worker (which builds the question, so the endpoint can be asked
// nothing else, and turns Jev's answer into table ids) and by the app (which
// checks those ids against its own tables). Ids, not positions, go over the
// wire: a Worker deployed with a newer handbook can never point an older app
// at the wrong table.

import { REFERENCE_TABLES } from '../calc/reference';
import { JEV_MODEL, type ChoiceQuestionJson } from './heatFill';

/** The Worker route the app calls. */
export const HANDBOOK_PICK_PATH = '/api/handbook-pick';

/** Longest query sent. A search is a few words. */
export const MAX_QUERY = 200;

/** How sure Jev has to be for its pick to be shown as the answer rather than as a maybe. */
export const BEST_AT = 0.5;

/** How likely a table has to be to be shown at all. */
const LIST_AT = 0.1;

/** Printable, squeezed, capped. */
export function cleanQuery(q: unknown): string {
  return typeof q === 'string' ? q.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY) : '';
}

/** A table as Jev is shown it: title, group, columns and anything printed with it. */
const describe = (t: (typeof REFERENCE_TABLES)[number]): string =>
  `${t.title} (${t.group}). Columns: ${t.columns.map((c) => c.label).filter(Boolean).join(', ')}.${t.note ? ' ' + t.note : ''}`;

/** What `POST /v1/systemone` is sent for one search. */
export function handbookRequest(query: string): {
  model: string;
  state: { query: string };
  questions: { table: ChoiceQuestionJson };
} {
  const criteria: Record<string, string> = {};
  REFERENCE_TABLES.forEach((t, i) => {
    criteria[`t${i}`] = describe(t);
  });
  criteria.none = 'None of these tables answers it';
  return {
    model: JEV_MODEL,
    state: { query: cleanQuery(query) },
    questions: {
      table: {
        type: 'choice',
        instructions:
          'A pipefitter typed `query` into the search box of a pipefitting handbook. Which table would answer it? ' +
          'Choose none if no table here holds the answer.',
        criteria,
      },
    },
  };
}

/** Jev's pick, as table ids, most likely first. `best` is null when Jev says no table answers it. */
export type HandbookPick = { best: string | null; confidence: number; ranked: string[] };

const idAt = (key: string): string | undefined => (/^t\d+$/.test(key) ? REFERENCE_TABLES[Number(key.slice(1))]?.id : undefined);

/**
 * Jev's answer to the table question, as ids. Run on the Worker, against the
 * same tables the question was built from. Anything malformed reads as no
 * pick at all.
 */
export function readHandbookAnswer(answer: unknown): HandbookPick | null {
  if (!answer || typeof answer !== 'object') return null;
  const a = answer as Record<string, unknown>;
  if (a.type !== 'choice' || typeof a.choice !== 'string' || typeof a.confidence !== 'number' || !Number.isFinite(a.confidence)) return null;
  const best = a.choice === 'none' ? null : idAt(a.choice) ?? null;
  if (a.choice !== 'none' && !best) return null;
  const probs = a.probabilities && typeof a.probabilities === 'object' ? (a.probabilities as Record<string, unknown>) : {};
  const ranked = Object.entries(probs)
    .filter((e): e is [string, number] => typeof e[1] === 'number' && e[1] >= LIST_AT && e[0] !== 'none')
    .sort((x, y) => y[1] - x[1])
    .map(([k]) => idAt(k))
    .filter((id): id is string => !!id);
  if (best && !ranked.includes(best)) ranked.unshift(best);
  return { best, confidence: a.confidence, ranked: ranked.slice(0, 3) };
}

/**
 * The Worker's reply, checked by the app against its own handbook: an id this
 * build does not have is dropped rather than shown.
 */
export function checkHandbookPick(data: unknown): HandbookPick | null {
  const p = data && typeof data === 'object' ? (data as { pick?: unknown }).pick : null;
  if (!p || typeof p !== 'object') return null;
  const { best, confidence, ranked } = p as Record<string, unknown>;
  const known = (id: unknown): id is string => typeof id === 'string' && REFERENCE_TABLES.some((t) => t.id === id);
  if (typeof confidence !== 'number' || !Number.isFinite(confidence) || !Array.isArray(ranked)) return null;
  if (best !== null && !known(best)) return null;
  return { best, confidence, ranked: ranked.filter(known).slice(0, 3) };
}

/**
 * Ask the Worker which table answers `query`. Resolves null on anything short
 * of a clean answer — no signal, a timeout, the key not set — because then the
 * word search is the answer, as it always was.
 */
export async function fetchHandbookPick(
  base: string,
  query: string,
  opts: { fetchImpl?: typeof fetch; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<HandbookPick | null> {
  const q = cleanQuery(query);
  if (!q) return null;
  const f = opts.fetchImpl ?? fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 5000);
  const stop = () => ctrl.abort();
  opts.signal?.addEventListener('abort', stop);
  try {
    const res = await f(`${base}${HANDBOOK_PICK_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: q }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return checkHandbookPick(await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', stop);
  }
}
