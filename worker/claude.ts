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

/**
 * How long Claude gets. A summary usually comes back in seconds; this is for
 * a slow day, and stays inside the minute the app waits.
 */
const UPSTREAM_MS = 50_000;

/** How long a spoken command waits: inside the twenty seconds the app gives it. */
const VOICE_MS = 15_000;

export type Reply = { status: number; body: unknown };

/** What a model id looks like. Anything else in the variable is a typo, and is said to be one. */
export const MODEL_ID = /^[a-z0-9][a-z0-9.-]{2,80}$/i;

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
      max_tokens: 16000,
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
    // A timeout is a connection error to the SDK: either way Claude was not reached.
    if (e instanceof Anthropic.APIConnectionError) return { status: 504, body: { error: 'upstream_unreachable' } };
    if (e instanceof Anthropic.APIError) return { status: 502, body: { error: 'upstream', status: e.status ?? null } };
    return { status: 502, body: { error: 'upstream' } };
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
    if (e instanceof Anthropic.APIConnectionError) return { status: 504, body: { error: 'upstream_unreachable' } };
    if (e instanceof Anthropic.APIError) return { status: 502, body: { error: 'upstream', status: e.status ?? null } };
    return { status: 502, body: { error: 'upstream' } };
  }
}
