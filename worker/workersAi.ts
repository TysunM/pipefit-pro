// The free cloud helper: Cloudflare Workers AI
// ------------------------------------------
// What the phone cannot make sense of on its own goes to Claude when Claude is
// paid for. When it is not (no key, a key turned down, an account out of
// credit) the same question goes here instead: a model Cloudflare runs inside
// this Worker's own account, through the AI binding in wrangler.jsonc, with no
// key and no bill. The account's free allowance is 10,000 Neurons a day,
// reset at 00:00 UTC; past it the call fails and nothing is charged.
//
// Same rules, same schema, same reader as Claude's route (ai/voice.ts), so the
// app cannot tell which answered and writes nothing it has not checked. The
// handbook goes as an index of its tables, not the tables: the free model
// points to the table and the app opens it, rather than spend the day's
// allowance reading the book on every question.
//
// The model is the WORKERS_AI_MODEL variable, set in the dashboard, so it can
// be changed without a release; DEFAULT_AI_MODEL otherwise.

import { MAX_VOICE_BODY, VOICE_SCHEMA, VOICE_SYSTEM_LITE, cleanVoiceBody, readVoice, voiceMessage } from '../src/ai/voice';
import { MAX_SHEET_BODY, SHEET_SCHEMA, SHEET_SYSTEM, cleanSheetBody, readSheet, sheetPrompt } from '../src/ai/fittingSheet';
import type { Reply } from './claude';

/** The Workers AI binding, as far as this route uses it. */
export type Ai = { run: (model: string, inputs: Record<string, unknown>) => Promise<unknown> };

/** Llama 3.3 70B, Cloudflare's fast build: on the free plan, takes a JSON schema, and reads a command well. */
export const DEFAULT_AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
/**
 * Llama 4 Scout: Cloudflare's model that reads pictures, for a box label or a
 * maker's sheet when Claude is not paid for. WORKERS_AI_VISION_MODEL changes it.
 */
export const DEFAULT_AI_VISION_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';
/** A Workers AI model id: "@cf/maker/model-name". */
export const AI_MODEL_ID = /^@(cf|hf)\/[a-z0-9._-]+\/[a-z0-9._-]{2,80}$/i;

/** A man is standing waiting. */
const AI_MS = 15_000;
/** An answer is a sentence and a few fields. */
const MAX_TOKENS = 500;

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

export async function voiceByWorkersAi(raw: string, ai: Ai, model: string): Promise<Reply> {
  if (raw.length > MAX_VOICE_BODY) return { status: 413, body: { error: 'too_large' } };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 400, body: { error: 'bad_json' } };
  }
  const body = cleanVoiceBody(parsed);
  if (!body) return { status: 400, body: { error: 'nothing_said' } };

  const messages = [
    { role: 'system', content: VOICE_SYSTEM_LITE },
    { role: 'user', content: voiceMessage(body) },
  ];
  let out: unknown;
  let lastError: unknown = null;
  // Held to the schema first. A model that cannot meet it ("JSON Mode couldn't be met") is asked once more for plain JSON; the reader checks either.
  for (const inputs of [
    { messages, response_format: { type: 'json_schema', json_schema: VOICE_SCHEMA }, max_tokens: MAX_TOKENS, temperature: 0 },
    { messages: [...messages, { role: 'user', content: 'Reply with the one JSON object only, in the schema above, and nothing else.' }], max_tokens: MAX_TOKENS, temperature: 0 },
  ]) {
    try {
      out = aiJson(await timeout(ai.run(model, inputs), AI_MS));
      if (out !== undefined) break;
    } catch (e) {
      lastError = e;
      if (spent(e)) return { status: 429, body: { error: 'daily_limit', engine: 'workers-ai', detail: detail(e) } };
      if (e instanceof Error && e.message === 'timeout') return { status: 504, body: { error: 'upstream_unreachable', engine: 'workers-ai', detail: `${model} gave no answer in ${AI_MS / 1000} s` } };
    }
  }
  if (out === undefined)
    return { status: 502, body: lastError ? { error: 'upstream', engine: 'workers-ai', detail: `${model}: ${detail(lastError)}` } : { error: 'bad_answer', engine: 'workers-ai', detail: `${model} answered with no JSON` } };
  const answer = readVoice(out);
  return answer ? { status: 200, body: { answer, engine: 'workers-ai' } } : { status: 502, body: { error: 'bad_answer', engine: 'workers-ai', detail: `${model} answered out of shape` } };
}

/** Small print photographed at an angle: worth the wait, inside the phone's own 75 seconds. */
const SHEET_AI_MS = 45_000;
/** A sheet is a few dozen rows. */
const SHEET_TOKENS = 2_500;

/**
 * A box label or a maker's sheet read by the free model, when Claude is not
 * paid for. The same rules, schema and reader as Claude's route
 * (ai/fittingSheet.ts): the rows come back to the phone to be ticked against
 * the paper, and nothing is saved until the fitter taps Save, whichever read
 * it. The picture goes as the chat format's image part; a model that will not
 * hold to the schema is asked once more for plain JSON.
 */
export async function sheetByWorkersAi(raw: string, ai: Ai, model: string): Promise<Reply> {
  if (raw.length > MAX_SHEET_BODY) return { status: 413, body: { error: 'too_large' } };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 400, body: { error: 'bad_json' } };
  }
  const body = cleanSheetBody(parsed);
  if (!body) return { status: 400, body: { error: 'not_image' } };

  const messages = [
    { role: 'system', content: SHEET_SYSTEM },
    {
      role: 'user',
      content: [
        { type: 'text', text: sheetPrompt(body.family) },
        { type: 'image_url', image_url: { url: `data:${body.media};base64,${body.image}` } },
      ],
    },
  ];
  let out: unknown;
  let lastError: unknown = null;
  for (const inputs of [
    { messages, response_format: { type: 'json_schema', json_schema: SHEET_SCHEMA }, max_tokens: SHEET_TOKENS, temperature: 0 },
    { messages: [...messages, { role: 'user', content: 'Reply with the one JSON object only, in the schema above, and nothing else.' }], max_tokens: SHEET_TOKENS, temperature: 0 },
  ]) {
    try {
      out = aiJson(await timeout(ai.run(model, inputs), SHEET_AI_MS));
      if (out !== undefined) break;
    } catch (e) {
      lastError = e;
      if (spent(e)) return { status: 429, body: { error: 'daily_limit', engine: 'workers-ai', detail: detail(e) } };
      if (e instanceof Error && e.message === 'timeout') return { status: 504, body: { error: 'upstream_unreachable', engine: 'workers-ai', detail: `${model} gave no answer in ${SHEET_AI_MS / 1000} s` } };
    }
  }
  if (out === undefined)
    return { status: 502, body: lastError ? { error: 'upstream', engine: 'workers-ai', detail: `${model}: ${detail(lastError)}` } : { error: 'bad_answer', engine: 'workers-ai', detail: `${model} answered with no JSON` } };
  const sheet = readSheet(out, body.family);
  return sheet ? { status: 200, body: { sheet, engine: 'workers-ai' } } : { status: 502, body: { error: 'bad_answer', engine: 'workers-ai', detail: `${model} answered out of shape` } };
}
