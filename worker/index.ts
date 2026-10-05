// The one piece of the app that runs on a server
// ------------------------------------------------
// Everything else in PipeFit Pro runs on the phone. This Worker exists for one
// reason: an API key cannot live in the app, because anyone can pull a key out
// of an APK or a web bundle. So the keys are Worker secrets — TypeSafe's for
// Jev, set with `npx wrangler secret put TYPESAFE_API_KEY`, and Anthropic's for
// the shift report summary, spoken commands and fitting sheets (see
// claude.ts) — and the app calls here.
//
// It is not a general relay. Each route takes one small, fixed shape of input
// and builds the question Jev is asked itself, from the same code the app
// uses, so a copied URL can do nothing but fill a heat entry or pick a
// handbook table — capped in size, and cheap. Everything that is not /api/* is
// the web app, served as it was.

import { HEAT_FILL_PATH, MAX_TEXT, heatRequest } from '../src/ai/heatFill';
import { HANDBOOK_PICK_PATH, MAX_QUERY, cleanQuery, handbookRequest, readHandbookAnswer } from '../src/ai/handbookPick';
import { SHIFT_POLISH_PATH } from '../src/ai/shiftPolish';
import { MODEL_ID, fittingSheet, shiftPolish, voiceCommand, type Reply } from './claude';
import { VOICE_PATH } from '../src/ai/voice';
import { FITTING_SHEET_PATH, MAX_SHEET_BODY } from '../src/ai/fittingSheet';

export interface Env {
  /** Set with `npx wrangler secret put TYPESAFE_API_KEY`. Never in the repo. */
  TYPESAFE_API_KEY?: string;
  /** TypeSafe's API root; defaults to https://api.typesafe.ai. */
  TYPESAFE_BASE_URL?: string;
  /** Set with `npx wrangler secret put ANTHROPIC_API_KEY`. Never in the repo. */
  ANTHROPIC_API_KEY?: string;
  /** The Claude model that writes shift report summaries. A plain variable, set in the dashboard. */
  CLAUDE_MODEL?: string;
  /** The web app's static files. */
  ASSETS?: { fetch: (req: Request) => Promise<Response> };
}

/** How long Jev gets. It usually answers in well under a second; this is for a bad network day. */
const UPSTREAM_MS = 8000;

type JevReply = { answers?: Record<string, unknown>; model?: unknown };

type Route = {
  /** Largest body accepted, in bytes. */
  maxBody: number;
  /** The request for Jev, built here from a checked body — or why the body is refused. */
  build: (body: Record<string, unknown>) => { payload: unknown } | { error: string };
  /** What goes back to the app: only what it needs, nothing about the key, the account or the usage. */
  reply: (data: JevReply) => unknown;
};

const modelOf = (d: JevReply) => (typeof d.model === 'string' ? d.model : undefined);

const ROUTES: Record<string, Route> = {
  [HEAT_FILL_PATH]: {
    // The text cap plus room for candidates and JSON.
    maxBody: MAX_TEXT * 2 + 2048,
    build: (b) =>
      typeof b.text === 'string' && b.text.trim()
        ? { payload: heatRequest(b.text, (Array.isArray(b.candidates) ? b.candidates : []) as string[]) }
        : { error: 'no_text' },
    reply: (d) => ({ answers: d.answers ?? {}, model: modelOf(d) }),
  },
  [HANDBOOK_PICK_PATH]: {
    maxBody: MAX_QUERY * 4 + 256,
    build: (b) => (cleanQuery(b.query) ? { payload: handbookRequest(b.query as string) } : { error: 'no_query' }),
    // Table ids, not Jev's option keys: the app checks them against its own handbook.
    reply: (d) => ({ pick: readHandbookAnswer(d.answers?.table), model: modelOf(d) }),
  },
};

/** Claude's routes: each its own fixed question, its own cap on what it takes. */
type ClaudeRoute = (raw: string, apiKey: string, model: string, fetchImpl: typeof fetch) => Promise<Reply>;
const CLAUDE: Record<string, { run: ClaudeRoute; maxBody: number }> = {
  [SHIFT_POLISH_PATH]: { run: shiftPolish, maxBody: Infinity },
  [VOICE_PATH]: { run: voiceCommand, maxBody: Infinity },
  // A photograph: refused on its stated length before a byte of it is read.
  [FITTING_SHEET_PATH]: { run: fittingSheet, maxBody: MAX_SHEET_BODY },
};

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...CORS } });

export async function handle(req: Request, env: Env, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const url = new URL(req.url);
  if (!url.pathname.startsWith('/api/')) {
    return env.ASSETS ? env.ASSETS.fetch(req) : new Response('Not found', { status: 404 });
  }
  const claude = CLAUDE[url.pathname];
  const route = ROUTES[url.pathname];
  if (!route && !claude) return json(404, { error: 'not_found' });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  // Claude's route has its own key and model, and never needs TypeSafe's.
  if (claude) {
    const apiKey = env.ANTHROPIC_API_KEY?.trim();
    const model = env.CLAUDE_MODEL?.trim() ?? '';
    const missing = [!apiKey && 'ANTHROPIC_API_KEY', !MODEL_ID.test(model) && 'CLAUDE_MODEL'].filter(Boolean);
    if (!apiKey || missing.length) return json(503, { error: 'not_configured', missing });
    if (Number(req.headers.get('content-length') ?? 0) > claude.maxBody) return json(413, { error: 'too_large' });
    const raw = await req.text();
    const out = await claude.run(raw, apiKey, model, fetchImpl);
    return json(out.status, out.body);
  }
  if (!route) return json(404, { error: 'not_found' });

  const key = env.TYPESAFE_API_KEY?.trim();
  if (!key) return json(503, { error: 'not_configured' });

  const raw = await req.text();
  if (raw.length > route.maxBody) return json(413, { error: 'too_large' });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: 'bad_json' });
  }
  const built = route.build(body && typeof body === 'object' ? (body as Record<string, unknown>) : {});
  if ('error' in built) return json(400, { error: built.error });

  const base = (env.TYPESAFE_BASE_URL?.trim() || 'https://api.typesafe.ai').replace(/\/+$/, '');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_MS);
  try {
    const res = await fetchImpl(`${base}/v1/systemone`, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify(built.payload),
      signal: ctrl.signal,
    });
    if (!res.ok) return json(502, { error: 'upstream', status: res.status });
    const data = (await res.json()) as JevReply | null;
    return json(200, route.reply(data ?? {}));
  } catch {
    return json(504, { error: 'upstream_unreachable' });
  } finally {
    clearTimeout(timer);
  }
}

export default {
  fetch: (req: Request, env: Env) => handle(req, env),
};
