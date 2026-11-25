// The free cloud helpers: Cloudflare Workers AI
// --------------------------------------------
// What the phone cannot do on its own goes here first: models Cloudflare runs
// inside this Worker's own account, through the AI binding in wrangler.jsonc,
// with no key and no bill. Claude is the last resort, asked only when these
// cannot be reached or used: not set up, the day's allowance spent, an error,
// no answer in time, or an answer the app's own checks turn down (index.ts).
// The account's free allowance is 10,000 Neurons a day, reset at 00:00 UTC;
// past it a call fails and nothing is charged.
//
// Each route uses the same rules, schema and reader as Claude's (ai/voice.ts,
// ai/fittingSheet.ts, ai/shiftPolish.ts, ai/orientation.ts), so the app
// cannot tell which answered and writes nothing it has not checked. For voice
// the handbook goes as an index of its tables, not the tables: the free model
// points to the table and the app opens it, rather than spend the day's
// allowance reading the book on every question.
//
// The models are the WORKERS_AI_MODEL and WORKERS_AI_VISION_MODEL variables,
// set in the dashboard, so they can be changed without a release.

import { MAX_VOICE_BODY, VOICE_SCHEMA, VOICE_SYSTEM_LITE, cleanVoiceBody, readVoice, voiceMessage } from '../src/ai/voice';
import { MAX_SHEET_BODY, SHEET_SCHEMA, SHEET_SYSTEM, cleanSheetBody, readSheet, sheetPrompt } from '../src/ai/fittingSheet';
import { MAX_POLISH_BODY, POLISH_SCHEMA, POLISH_SYSTEM, checkPolish, cleanPolishBody, polishMessage, readPolish } from '../src/ai/shiftPolish';
import { MAX_ORIENTATION_BODY, ORIENTATION_SCHEMA, ORIENTATION_SYSTEM, cleanOrientationBody, orientationMessage, readCourse } from '../src/ai/orientation';
import { MAX_MILL_BODY, MILL_PROMPT, MILL_SCHEMA, MILL_SYSTEM, cleanMillBody, readMill } from '../src/ai/millCert';
import type { Reply } from './claude';

/** The Workers AI binding, as far as these routes use it. */
export type Ai = { run: (model: string, inputs: Record<string, unknown>) => Promise<unknown> };

/** Llama 3.3 70B, Cloudflare's fast build: on the free plan, takes a JSON schema, and reads a command well. */
export const DEFAULT_AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
/**
 * Llama 4 Scout: Cloudflare's model that reads pictures, for a box label or a
 * maker's sheet. WORKERS_AI_VISION_MODEL changes it.
 */
export const DEFAULT_AI_VISION_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';
/** A Workers AI model id: "@cf/maker/model-name". */
export const AI_MODEL_ID = /^@(cf|hf)\/[a-z0-9._-]+\/[a-z0-9._-]{2,80}$/i;

/**
 * How long each free route waits, short enough that Claude, the last resort,
 * still has time after it inside what the phone waits for the whole answer.
 */
export const FREE_MS = { voice: 8_000, sheet: 30_000, polish: 20_000, course: 40_000 } as const;

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** The answer object out of what the binding gave back: an object, or a string holding one. */
export function aiJson(r: unknown): unknown {
  const v = isRec(r) && 'response' in r ? r.response : r;
  if (isRec(v)) return v;
  if (typeof v !== 'string') return undefined;
  const m = v.match(/\{[\s\S]*\}/);
  if (!m) return undefined;
  try {
    return JSON.parse(m[0]);
  } catch {
    return undefined;
  }
}

/** Cloudflare's own words for what went wrong, cut to a line: no key or account in it, there being none. */
const detail = (e: unknown): string => (e instanceof Error ? e.message : String(e)).replace(/\s+/g, ' ').trim().slice(0, 240);

/** The day's free allowance spent: Cloudflare says so in the error, as code 4006 or in words. */
const spent = (e: unknown): boolean => /4006|neurons?|daily free allocation|allocation/i.test(e instanceof Error ? e.message : String(e));

function timeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    );
  });
}

/** A request read off the wire, or the reply that refuses it. */
function parseBody<T>(raw: string, max: number, clean: (v: unknown) => T | null, refused: string): T | Reply {
  if (raw.length > max) return { status: 413, body: { error: 'too_large' } };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 400, body: { error: 'bad_json' } };
  }
  return clean(parsed) ?? { status: 400, body: { error: refused } };
}
const isReply = (v: unknown): v is Reply => isRec(v) && typeof v.status === 'number' && 'body' in v && Object.keys(v).length === 2;

type Job<T> = {
  messages: unknown[];
  schema: unknown;
  /** The app's own reader: the answer held to shape, or null. */
  read: (v: unknown) => T | null;
  /** The answer's key in the reply: "answer", "sheet", "polish", "course". */
  key: string;
  tokens: number;
  ms: number;
  /** Why an answer in shape still will not do (a summary with a figure not in the facts), or null. */
  refuse?: (v: T) => string | null;
};

/**
 * One question to a free model: held to the schema first, and if the model
 * cannot meet it ("JSON Mode couldn't be met"), asked once more for plain
 * JSON. The reader checks either; an answer out of shape is a bad answer.
 */
async function ask<T>(ai: Ai, model: string, job: Job<T>): Promise<Reply> {
  let out: unknown;
  let lastError: unknown = null;
  for (const inputs of [
    { messages: job.messages, response_format: { type: 'json_schema', json_schema: job.schema }, max_tokens: job.tokens, temperature: 0 },
    { messages: [...job.messages, { role: 'user', content: 'Reply with the one JSON object only, in the schema above, and nothing else.' }], max_tokens: job.tokens, temperature: 0 },
  ]) {
    try {
      out = aiJson(await timeout(ai.run(model, inputs), job.ms));
      if (out !== undefined) break;
    } catch (e) {
      lastError = e;
      if (spent(e)) return { status: 429, body: { error: 'daily_limit', engine: 'workers-ai', detail: detail(e) } };
      if (e instanceof Error && e.message === 'timeout') return { status: 504, body: { error: 'upstream_unreachable', engine: 'workers-ai', detail: `${model} gave no answer in ${job.ms / 1000} s` } };
    }
  }
  if (out === undefined)
    return { status: 502, body: lastError ? { error: 'upstream', engine: 'workers-ai', detail: `${model}: ${detail(lastError)}` } : { error: 'bad_answer', engine: 'workers-ai', detail: `${model} answered with no JSON` } };
  const value = job.read(out);
  if (value === null) return { status: 502, body: { error: 'bad_answer', engine: 'workers-ai', detail: `${model} answered out of shape` } };
  const why = job.refuse?.(value) ?? null;
  if (why) return { status: 502, body: { error: 'bad_answer', engine: 'workers-ai', detail: `${model}: ${why}` } };
  return { status: 200, body: { [job.key]: value, engine: 'workers-ai' } };
}

/** A spoken command the phone could not place on its own. */
export async function voiceByWorkersAi(raw: string, ai: Ai, model: string): Promise<Reply> {
  const body = parseBody(raw, MAX_VOICE_BODY, cleanVoiceBody, 'nothing_said');
  if (isReply(body)) return body;
  return ask(ai, model, {
    messages: [
      { role: 'system', content: VOICE_SYSTEM_LITE },
      { role: 'user', content: voiceMessage(body) },
    ],
    schema: VOICE_SCHEMA,
    read: readVoice,
    key: 'answer',
    tokens: 500,
    ms: FREE_MS.voice,
  });
}

/**
 * A box label or a maker's sheet. The picture goes as the chat format's image
 * part. The rows come back to the phone to be ticked against the paper, and
 * nothing is saved until the fitter taps Save, whichever model read them. A
 * read with no rows at all is no read: Claude is asked instead (index.ts).
 */
export async function sheetByWorkersAi(raw: string, ai: Ai, model: string): Promise<Reply> {
  const body = parseBody(raw, MAX_SHEET_BODY, cleanSheetBody, 'not_image');
  if (isReply(body)) return body;
  return ask(ai, model, {
    messages: [
      { role: 'system', content: SHEET_SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: sheetPrompt(body.family) },
          { type: 'image_url', image_url: { url: `data:${body.media};base64,${body.image}` } },
        ],
      },
    ],
    schema: SHEET_SCHEMA,
    read: (v) => readSheet(v, body.family),
    key: 'sheet',
    tokens: 2_500,
    ms: FREE_MS.sheet,
    refuse: (s) => (s.rows.length ? null : `read nothing off the picture${s.unread ? ` (${s.unread})` : ''}`),
  });
}

/**
 * A mill cert's heats and their sulphur, read by the vision model. A cert
 * with no heat read is no read: Claude is asked instead (index.ts).
 */
export async function millByWorkersAi(raw: string, ai: Ai, model: string): Promise<Reply> {
  const body = parseBody(raw, MAX_MILL_BODY, cleanMillBody, 'not_image');
  if (isReply(body)) return body;
  return ask(ai, model, {
    messages: [
      { role: 'system', content: MILL_SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: MILL_PROMPT },
          { type: 'image_url', image_url: { url: `data:${body.media};base64,${body.image}` } },
        ],
      },
    ],
    schema: MILL_SCHEMA,
    read: readMill,
    key: 'cert',
    tokens: 2_000,
    ms: FREE_MS.sheet,
    refuse: (c) => (c.heats.length ? null : `read no heat off the picture${c.unread ? ` (${c.unread})` : ''}`),
  });
}

/**
 * The shift report's facts and notes written up. A summary with a figure or a
 * name in it that the facts do not hold is turned down here, the same check
 * the phone makes (checkPolish), so Claude is asked instead.
 */
export async function polishByWorkersAi(raw: string, ai: Ai, model: string): Promise<Reply> {
  const body = parseBody(raw, MAX_POLISH_BODY, cleanPolishBody, 'no_facts');
  if (isReply(body)) return body;
  return ask(ai, model, {
    messages: [
      { role: 'system', content: POLISH_SYSTEM },
      { role: 'user', content: polishMessage(body) },
    ],
    schema: POLISH_SCHEMA,
    read: readPolish,
    key: 'polish',
    tokens: 1_500,
    ms: FREE_MS.polish,
    refuse: (p) => {
      const c = checkPolish(body, p);
      return c.ok ? null : c.why;
    },
  });
}

/** A site orientation module turned into a course, read and checked as Claude's is. */
export async function courseByWorkersAi(raw: string, ai: Ai, model: string): Promise<Reply> {
  const body = parseBody(raw, MAX_ORIENTATION_BODY, cleanOrientationBody, 'no_text');
  if (isReply(body)) return body;
  return ask(ai, model, {
    messages: [
      { role: 'system', content: ORIENTATION_SYSTEM },
      { role: 'user', content: orientationMessage(body) },
    ],
    schema: ORIENTATION_SCHEMA,
    read: readCourse,
    key: 'course',
    tokens: 4_000,
    ms: FREE_MS.course,
  });
}
