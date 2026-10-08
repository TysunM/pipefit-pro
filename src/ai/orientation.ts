// An orientation course, written by Claude
// ----------------------------------------
// A module's rules go in; a short course comes back: sections to be read or
// spoken, a few points each, and questions that test the rules as written.
// In English or in Spanish, because half the crews in the trade think in
// Spanish and an orientation they half understood is one they did not have.
//
// Claude is held to the text. It may shorten, order and translate; it may not
// add a rule, drop one or soften one, and the course says the site's rules
// govern. The answer is held to a schema by the API and read again on both
// sides, the same as every other route.
//
// Shared by the Worker (which builds the prompt, so the endpoint can be used
// for nothing else) and the app (which sends the text and checks the answer).
// No React Native, no SDK.

import { Course, Lang, TEXT_MAX, TITLE_MAX, validCourse } from '../state/orientation';

export const ORIENTATION_PATH = '/api/orientation';
/** The text at its cap, the title, and room for JSON. */
export const MAX_ORIENTATION_BODY = TEXT_MAX + 2048;

export type OrientationBody = { title: string; text: string; lang: Lang };

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** The request off the wire, rebuilt field by field: only these, only this much. */
export function cleanOrientationBody(v: unknown): OrientationBody | null {
  if (!isRec(v)) return null;
  const title = typeof v.title === 'string' ? v.title.replace(/\s+/g, ' ').trim().slice(0, TITLE_MAX) : '';
  const text = typeof v.text === 'string' ? v.text.replace(/\r\n?/g, '\n').trim().slice(0, TEXT_MAX) : '';
  const lang: Lang = v.lang === 'es' ? 'es' : 'en';
  return title && text ? { title, text, lang } : null;
}

export const ORIENTATION_SYSTEM = [
  'You write site orientation courses for construction and industrial crews, to be read or spoken on a phone before the shift.',
  'You are given the title and the text of one module: the rules as the company wrote them. Build the course from that text and nothing else.',
  'Keep every rule in the text. Add no rule, drop no rule, and soften none: a "never" stays a "never", a figure stays the same figure.',
  'Sections: four to eight, each a short heading and two to five points. A point is one plain sentence a hand can take in while it is read aloud. Simple words. No jargon that is not in the text.',
  'Questions: five to eight, each with four choices and one right answer, testing what the text says. The wrong choices are things a new hire might believe. "why" says in one sentence what the text says and where it applies.',
  'Write the whole course in the language asked for. For Spanish, write natural Latin American Spanish as spoken on job sites, not a word-for-word translation; keep technical terms a crew would know in English (PPE, SDS, lockout) where they are commonly used that way.',
  'Return only the JSON asked for.',
].join(' ');

export const ORIENTATION_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: { heading: { type: 'string' }, points: { type: 'array', items: { type: 'string' } } },
        required: ['heading', 'points'],
        additionalProperties: false,
      },
    },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: { q: { type: 'string' }, choices: { type: 'array', items: { type: 'string' } }, answer: { type: 'integer' }, why: { type: 'string' } },
        required: ['q', 'choices', 'answer', 'why'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'sections', 'questions'],
  additionalProperties: false,
} as const;

export function orientationMessage(b: OrientationBody): string {
  return `Language: ${b.lang === 'es' ? 'Spanish' : 'English'}\nModule title: ${b.title}\n\nModule text:\n${b.text}`;
}

/** The answer, read again: a course or nothing. */
export const readCourse = (v: unknown): Course | null => validCourse(v);

export type CourseMiss = 'not_set' | 'key_refused' | 'bad_model' | 'declined' | 'down' | 'offline';

export function courseMissWords(m: CourseMiss): string {
  switch (m) {
    case 'not_set':
      return 'Claude is not switched on: the server needs the ANTHROPIC_API_KEY secret and the CLAUDE_MODEL variable. The rules can still be read as written.';
    case 'key_refused':
      return 'Anthropic turned the key down. Settings → Smart help → Test Claude shows why. The rules can still be read as written.';
    case 'bad_model':
      return 'The model in CLAUDE_MODEL would not take this. Settings → Smart help → Test Claude shows what Anthropic said. The rules can still be read as written.';
    case 'declined':
      return 'Claude declined to write this course. The rules can still be read as written.';
    case 'down':
      return 'Claude is not answering right now. Try again in a minute, or read the rules as written.';
    case 'offline':
      return 'No signal to reach Claude. A course built once is kept on the phone; build it where there is signal.';
  }
}

export function courseMissOf(body: unknown): CourseMiss {
  const e = isRec(body) ? body : {};
  if (e.error === 'not_configured') return 'not_set';
  if (e.error === 'upstream' && (e.status === 401 || e.status === 403)) return 'key_refused';
  if (e.error === 'upstream' && (e.status === 400 || e.status === 404)) return 'bad_model';
  if (e.error === 'declined') return 'declined';
  return 'down';
}

/** Ask the Worker for the course. A whole module is read and written: give it a minute. */
export async function askOrientation(base: string, body: OrientationBody, opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}): Promise<Course | CourseMiss> {
  const f = opts.fetchImpl ?? fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 75_000);
  let res: Response;
  try {
    res = await f(`${base}${ORIENTATION_PATH}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
  } catch {
    clearTimeout(timer);
    return 'offline';
  }
  try {
    const data = (await res.json()) as unknown;
    if (!res.ok) return courseMissOf(data);
    return readCourse(isRec(data) ? data.course : null) ?? 'down';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}
