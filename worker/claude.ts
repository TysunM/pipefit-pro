// Claude, for the shift report
// ----------------------------
// The second key the Worker holds, for the same reason as the first: a key in
// an APK is a key anyone can have. ANTHROPIC_API_KEY is a Worker secret, set
// once with `npx wrangler secret put ANTHROPIC_API_KEY`.
//
// Which Claude model writes the summary is the CLAUDE_MODEL variable, set in
// the same place, so the model can be changed — a cheaper one, a newer one —
// from the Cloudflare dashboard on a phone, with no build and no deploy.
//
// The route takes the facts of one shift and the crew's notes, cleaned to a
// fixed shape and capped in size, and asks one fixed question about them. The
// prompt is built here from src/ai/shiftPolish.ts, the same code the app
// checks the answer with, so a copied URL can do nothing but summarise a shift
// report.
//
// What comes back is held to a schema of five strings by the API, then read
// again here before it is passed on. Whether it is true to the record is the
// app's to check, because the app is where the crew can be told why not.

import Anthropic from '@anthropic-ai/sdk';
import { MAX_POLISH_BODY, POLISH_SCHEMA, POLISH_SYSTEM, cleanPolishBody, polishMessage, readPolish } from '../src/ai/shiftPolish';
import { MAX_VOICE_BODY, VOICE_SCHEMA, VOICE_SYSTEM, cleanVoiceBody, readVoice, voiceMessage } from '../src/ai/voice';
import { MAX_IMAGE_B64, MAX_SHEET_BODY, SHEET_SCHEMA, SHEET_SYSTEM, bareBase64, cleanSheetBody, readSheet, sheetPrompt } from '../src/ai/fittingSheet';
import { MAX_ORIENTATION_BODY, ORIENTATION_SCHEMA, ORIENTATION_SYSTEM, cleanOrientationBody, orientationMessage, readCourse } from '../src/ai/orientation';
import { CHECK_MESSAGE, CHECK_SCHEMA, CHECK_SYSTEM, DETAIL_MAX, readCheck } from '../src/ai/claudeCheck';
import { MAX_MILL_BODY, MILL_PROMPT, MILL_SCHEMA, MILL_SYSTEM, readMill, type MillRead } from '../src/ai/millCert';
import { MAX_PHOTO_BODY, cleanPhotoBody } from '../src/ai/photoRead';
import { REPORT_PROMPT, REPORT_SCHEMA, REPORT_SYSTEM, readReport, type WeldReportRead } from '../src/ai/weldReport';

/**
 * How long Claude gets. A summary usually comes back in seconds; this is for
 * a slow day, and with the free model's 20 s before it stays inside the
 * minute the app waits.
 */
const UPSTREAM_MS = 35_000;

/** How long a spoken command waits: after the free model's 8 s, inside the 25 seconds the app gives it. */
const VOICE_MS = 15_000;

/** How long a sheet read gets: a page of small print is read carefully, after the free reader's 30 s, inside the app's 85 seconds. */
const SHEET_MS = 45_000;

/** How long a course gets: a few pages read and written in another language, after the free model's 40 s, inside the app's 115 seconds. */
const COURSE_MS = 65_000;

export type Reply = { status: number; body: unknown };

/** What a model id looks like. Anything else in the variable is a typo, and is said to be one. */
export const MODEL_ID = /^[a-z0-9][a-z0-9.-]{2,80}$/i;

/**
 * The most any route lets Claude write. A course or a summary is a fraction
 * of it, and it is inside the output window of every current model, so a
 * route is never refused for asking for more room than the model has.
 */
export const OUTPUT_CAP = 8000;

/**
 * What Anthropic said when it said no: the error's kind and its message, in
 * its words, cut to a line. Nothing of ours is in it — not the key, not the
 * request — and the app shows it as it is, so a wrong model name reads as a
 * wrong model name on the phone.
 */
export function detailOf(e: InstanceType<typeof Anthropic.APIError>): string {
  // The SDK keeps the whole reply body: { type: 'error', error: { type, message } }.
  const body = e.error as { error?: { message?: unknown } } | undefined;
  const said = body?.error?.message;
  const msg = typeof said === 'string' && said ? said : e.message;
  return `${e.type ? `${e.type}: ` : ''}${msg}`.replace(/\s+/g, ' ').trim().slice(0, DETAIL_MAX);
}

/** Why a call to Claude came back empty: not reached, or reached and refused, with what it said. */
export function failed(e: unknown): Reply {
  // A timeout is a connection error to the SDK: either way Claude was not reached.
  if (e instanceof Anthropic.APIConnectionError) return { status: 504, body: { error: 'upstream_unreachable' } };
  if (e instanceof Anthropic.APIError) return { status: 502, body: { error: 'upstream', status: e.status ?? null, detail: detailOf(e) } };
  return { status: 502, body: { error: 'upstream' } };
}

export async function shiftPolish(raw: string, apiKey: string, model: string, fetchImpl: typeof fetch): Promise<Reply> {
  if (raw.length > MAX_POLISH_BODY) return { status: 413, body: { error: 'too_large' } };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 400, body: { error: 'bad_json' } };
  }
  const body = cleanPolishBody(parsed);
  if (!body) return { status: 400, body: { error: 'no_facts' } };

  // One retry, for a dropped connection or an overloaded moment; any more
  // and the app's minute runs out before the answer does.
  const client = new Anthropic({ apiKey, fetch: fetchImpl, maxRetries: 1, timeout: UPSTREAM_MS });
  try {
    const msg = await client.beta.messages.create({
      model,
      max_tokens: OUTPUT_CAP,
      // A request a safety classifier declines is run again on the model
      // Anthropic picks for that kind of decline, inside the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // A summary of facts it is handed needs little deliberation.
      output_config: { effort: 'low', format: { type: 'json_schema', schema: POLISH_SCHEMA } },
      system: POLISH_SYSTEM,
      messages: [{ role: 'user', content: polishMessage(body) }],
    });
    if (msg.stop_reason === 'refusal') return { status: 502, body: { error: 'declined' } };
    let out: unknown;
    try {
      out = JSON.parse(msg.content.map((b) => (b.type === 'text' ? b.text : '')).join(''));
    } catch {
      return { status: 502, body: { error: 'bad_answer' } };
    }
    const polish = readPolish(out);
    return polish ? { status: 200, body: { polish } } : { status: 502, body: { error: 'bad_answer' } };
  } catch (e) {
    return failed(e);
  }
}

/**
 * A spoken command the phone could not place on its own. The handbook rides
 * in the system prompt, the same bytes every time, so it is cached: after the
 * first question in five minutes each one reads it from the cache.
 */
export async function voiceCommand(raw: string, apiKey: string, model: string, fetchImpl: typeof fetch): Promise<Reply> {
  if (raw.length > MAX_VOICE_BODY) return { status: 413, body: { error: 'too_large' } };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 400, body: { error: 'bad_json' } };
  }
  const body = cleanVoiceBody(parsed);
  if (!body) return { status: 400, body: { error: 'nothing_said' } };

  // A man is standing waiting for this: no retry past one, and a short wait.
  const client = new Anthropic({ apiKey, fetch: fetchImpl, maxRetries: 1, timeout: VOICE_MS });
  try {
    const msg = await client.beta.messages.create({
      model,
      max_tokens: 2000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: VOICE_SCHEMA } },
      system: [{ type: 'text', text: VOICE_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: voiceMessage(body) }],
    });
    if (msg.stop_reason === 'refusal') return { status: 502, body: { error: 'declined' } };
    let out: unknown;
    try {
      out = JSON.parse(msg.content.map((b) => (b.type === 'text' ? b.text : '')).join(''));
    } catch {
      return { status: 502, body: { error: 'bad_answer' } };
    }
    const answer = readVoice(out);
    return answer ? { status: 200, body: { answer } } : { status: 502, body: { error: 'bad_answer' } };
  } catch (e) {
    return failed(e);
  }
}

/**
 * A photographed dimension sheet, read into takeouts. The route takes a
 * picture and which family to look for, nothing else; the question is fixed
 * here and the answer is held to the schema, then read again before it goes.
 */
export async function fittingSheet(raw: string, apiKey: string, model: string, fetchImpl: typeof fetch): Promise<Reply> {
  if (raw.length > MAX_SHEET_BODY) return { status: 413, body: { error: 'too_large' } };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 400, body: { error: 'bad_json' } };
  }
  const image = typeof (parsed as { image?: unknown } | null)?.image === 'string' ? bareBase64((parsed as { image: string }).image) : '';
  if (image.length > MAX_IMAGE_B64) return { status: 413, body: { error: 'too_large' } };
  const body = cleanSheetBody(parsed);
  if (!body) return { status: 400, body: { error: 'not_image' } };

  const client = new Anthropic({ apiKey, fetch: fetchImpl, maxRetries: 1, timeout: SHEET_MS });
  try {
    const msg = await client.beta.messages.create({
      model,
      max_tokens: OUTPUT_CAP,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // Small print photographed at an angle: worth reading with care.
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SHEET_SCHEMA } },
      system: SHEET_SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: body.media, data: body.image } },
            { type: 'text', text: sheetPrompt(body.family) },
          ],
        },
      ],
    });
    if (msg.stop_reason === 'refusal') return { status: 502, body: { error: 'declined' } };
    let out: unknown;
    try {
      out = JSON.parse(msg.content.map((b) => (b.type === 'text' ? b.text : '')).join(''));
    } catch {
      return { status: 502, body: { error: 'bad_answer' } };
    }
    const sheet = readSheet(out, body.family);
    return sheet ? { status: 200, body: { sheet } } : { status: 502, body: { error: 'bad_answer' } };
  } catch (e) {
    return failed(e);
  }
}

/** A photo reader's fixed question: its rules, its schema, what it asks, how its answer is held to shape and keyed. */
export type PhotoSpec<T> = { system: string; schema: unknown; prompt: string; read: (v: unknown) => T | null; key: string; maxBody: number; empty: (v: T) => boolean };

/**
 * A picture read for a photo reader. The route takes a picture and nothing
 * else; the question is fixed by the spec and the answer held to its schema,
 * then read again before it goes. An answer with nothing in it is no read.
 */
export async function photoWithClaude<T>(spec: PhotoSpec<T>, raw: string, apiKey: string, model: string, fetchImpl: typeof fetch): Promise<Reply> {
  if (raw.length > spec.maxBody) return { status: 413, body: { error: 'too_large' } };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 400, body: { error: 'bad_json' } };
  }
  const image = typeof (parsed as { image?: unknown } | null)?.image === 'string' ? bareBase64((parsed as { image: string }).image) : '';
  if (image.length > MAX_IMAGE_B64) return { status: 413, body: { error: 'too_large' } };
  const body = cleanPhotoBody(parsed);
  if (!body) return { status: 400, body: { error: 'not_image' } };

  const client = new Anthropic({ apiKey, fetch: fetchImpl, maxRetries: 1, timeout: SHEET_MS });
  try {
    const msg = await client.beta.messages.create({
      model,
      max_tokens: OUTPUT_CAP,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // Small print in tight columns, photographed on a job: worth reading with care.
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: spec.schema as Record<string, unknown> } },
      system: spec.system,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: body.media, data: body.image } },
            { type: 'text', text: spec.prompt },
          ],
        },
      ],
    });
    if (msg.stop_reason === 'refusal') return { status: 502, body: { error: 'declined' } };
    let out: unknown;
    try {
      out = JSON.parse(msg.content.map((b) => (b.type === 'text' ? b.text : '')).join(''));
    } catch {
      return { status: 502, body: { error: 'bad_answer' } };
    }
    const value = spec.read(out);
    return value && !spec.empty(value) ? { status: 200, body: { [spec.key]: value } } : { status: 502, body: { error: 'bad_answer' } };
  } catch (e) {
    return failed(e);
  }
}

export const MILL_SPEC: PhotoSpec<MillRead> = { system: MILL_SYSTEM, schema: MILL_SCHEMA, prompt: MILL_PROMPT, read: readMill, key: 'cert', maxBody: MAX_MILL_BODY, empty: (c) => !c.heats.length };
export const REPORT_SPEC: PhotoSpec<WeldReportRead> = { system: REPORT_SYSTEM, schema: REPORT_SCHEMA, prompt: REPORT_PROMPT, read: readReport, key: 'report', maxBody: MAX_PHOTO_BODY, empty: (r) => !r.levels.length && !r.faults.length };

/** A mill cert's heats and their sulphur. */
export const millCert = (raw: string, apiKey: string, model: string, fetchImpl: typeof fetch) => photoWithClaude(MILL_SPEC, raw, apiKey, model, fetchImpl);
/** An orbital power supply's weld report: its levels as welded, and any fault. */
export const weldReport = (raw: string, apiKey: string, model: string, fetchImpl: typeof fetch) => photoWithClaude(REPORT_SPEC, raw, apiKey, model, fetchImpl);

/**
 * A site orientation module turned into a course: sections to be read aloud
 * and questions on them, in English or Spanish. The route takes a title, the
 * rules and a language; the question is fixed here and the answer is held to
 * the schema, then read again before it goes.
 */
export async function orientationCourse(raw: string, apiKey: string, model: string, fetchImpl: typeof fetch): Promise<Reply> {
  if (raw.length > MAX_ORIENTATION_BODY) return { status: 413, body: { error: 'too_large' } };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 400, body: { error: 'bad_json' } };
  }
  const body = cleanOrientationBody(parsed);
  if (!body) return { status: 400, body: { error: 'no_text' } };

  const client = new Anthropic({ apiKey, fetch: fetchImpl, maxRetries: 1, timeout: COURSE_MS });
  try {
    const msg = await client.beta.messages.create({
      model,
      max_tokens: OUTPUT_CAP,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // Rules a man's safety rides on, and a translation: worth some care.
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: ORIENTATION_SCHEMA } },
      system: ORIENTATION_SYSTEM,
      messages: [{ role: 'user', content: orientationMessage(body) }],
    });
    if (msg.stop_reason === 'refusal') return { status: 502, body: { error: 'declined' } };
    let out: unknown;
    try {
      out = JSON.parse(msg.content.map((b) => (b.type === 'text' ? b.text : '')).join(''));
    } catch {
      return { status: 502, body: { error: 'bad_answer' } };
    }
    const course = readCourse(out);
    return course ? { status: 200, body: { course } } : { status: 502, body: { error: 'bad_answer' } };
  } catch (e) {
    return failed(e);
  }
}

/** How long the check waits: one word asked, one line back, inside the app's thirty seconds. */
const CHECK_MS = 25_000;

/**
 * The smallest question there is, asked in the shape every route uses: the
 * same betas, the same structured output, the same output cap. If this comes
 * back, the routes will. If not, the reply carries what Anthropic said, so
 * Settings can show it. The body is ignored: there is nothing to ask for.
 */
export async function claudeCheck(_raw: string, apiKey: string, model: string, fetchImpl: typeof fetch): Promise<Reply> {
  const client = new Anthropic({ apiKey, fetch: fetchImpl, maxRetries: 0, timeout: CHECK_MS });
  try {
    const msg = await client.beta.messages.create({
      model,
      max_tokens: OUTPUT_CAP,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: CHECK_SCHEMA } },
      system: CHECK_SYSTEM,
      messages: [{ role: 'user', content: CHECK_MESSAGE }],
    });
    if (msg.stop_reason === 'refusal') return { status: 502, body: { error: 'declined' } };
    let out: unknown;
    try {
      out = JSON.parse(msg.content.map((b) => (b.type === 'text' ? b.text : '')).join(''));
    } catch {
      return { status: 502, body: { error: 'bad_answer' } };
    }
    return readCheck(out) ? { status: 200, body: { ok: true, model: msg.model, asked: model } } : { status: 502, body: { error: 'bad_answer' } };
  } catch (e) {
    return failed(e);
  }
}
