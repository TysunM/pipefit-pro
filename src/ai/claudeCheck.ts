// Is Claude answering?
// --------------------
// One tap under Settings → Smart help asks the Worker to ask Claude the
// smallest question there is, in the same shape every real route uses: the
// same betas, the same structured output, the same output cap. If this comes
// back, a course, a summary and a spoken command will too. If it does not,
// the answer carries what Anthropic said in its own words, so a wrong model
// name, a model that cannot take the request, a refused key or an empty
// account each read as what they are, on the phone, with no dashboard open.
//
// Shared by the Worker (which builds the question) and the app (which reads
// the answer). No React Native, no SDK.

export const CLAUDE_CHECK_PATH = '/api/claude-check';
/** The body is ignored; this is room for an empty object and nothing more. */
export const MAX_CHECK_BODY = 1024;

export const CHECK_SYSTEM = 'Answer with ok set to true. Nothing else.';
export const CHECK_MESSAGE = 'Are you there?';

export const CHECK_SCHEMA = {
  type: 'object',
  properties: { ok: { type: 'boolean' } },
  required: ['ok'],
  additionalProperties: false,
} as const;

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** The answer, read again: true only for the one answer asked for. */
export const readCheck = (v: unknown): boolean => isRec(v) && v.ok === true;

/** How much of what Anthropic said is passed on. Its messages run to a sentence or two. */
export const DETAIL_MAX = 240;

/** What Anthropic said when it said no, if the Worker passed it on. */
export const detailOf = (body: unknown): string => (isRec(body) && typeof body.detail === 'string' ? body.detail.slice(0, DETAIL_MAX) : '');

export type ClaudeCheck =
  /** Which model answered, and which was asked for: the same unless Anthropic fell back. */
  | { ok: true; model: string; asked: string; ms: number }
  | { ok: false; why: string };

/** The reply off the wire turned into one line a man can act on. */
export function checkWords(status: number, body: unknown): string {
  const e = isRec(body) ? body : {};
  const detail = detailOf(e);
  const said = detail ? ` Anthropic said: "${detail}"` : '';
  if (e.error === 'not_configured') {
    const missing = Array.isArray(e.missing) ? e.missing.filter((m): m is string => typeof m === 'string') : [];
    return `Not set up on the server: ${missing.length ? missing.join(' and ') : 'the key and the model'} ${missing.length === 1 ? 'is' : 'are'} missing. Set ${missing.length === 1 ? 'it' : 'them'} under the Worker's Settings → Variables and Secrets.`;
  }
  if (e.error === 'upstream' && (e.status === 401 || e.status === 403)) return `Anthropic turned the key down. Check the ANTHROPIC_API_KEY secret, and that the account has credit.${said}`;
  if (e.error === 'upstream' && e.status === 404) return `Anthropic has no model by the name in CLAUDE_MODEL. Set it to a current model id.${said}`;
  if (e.error === 'upstream' && e.status === 400) return `The model in CLAUDE_MODEL would not take the request. Set CLAUDE_MODEL to a current model.${said}`;
  if (e.error === 'upstream' && e.status === 429) return `Anthropic is rate-limiting the key, or the account is out of credit.${said}`;
  if (e.error === 'upstream') return `Anthropic answered with an error${typeof e.status === 'number' ? ` (${e.status})` : ''}.${said}`;
  if (e.error === 'upstream_unreachable') return 'The server could not reach Anthropic. Try again in a minute.';
  if (e.error === 'declined') return 'Claude declined to answer. Try again.';
  if (e.error === 'bad_answer') return 'Claude answered, but not with what was asked for. Try again.';
  if (e.error === 'not_found') return 'The server is running an older Worker without this check. Push the latest to deploy it.';
  return `The server answered ${status} and did not say why.`;
}

/** Ask the Worker to ask Claude. Quick: the question is one word and the answer one line. */
export async function askClaudeCheck(base: string, opts: { fetchImpl?: typeof fetch; timeoutMs?: number; now?: () => number } = {}): Promise<ClaudeCheck> {
  const f = opts.fetchImpl ?? fetch;
  const now = opts.now ?? Date.now;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30_000);
  const started = now();
  let res: Response;
  try {
    res = await f(`${base}${CLAUDE_CHECK_PATH}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}', signal: ctrl.signal });
  } catch {
    clearTimeout(timer);
    return { ok: false, why: 'No signal to reach the server.' };
  }
  try {
    const data = (await res.json()) as unknown;
    if (!res.ok) return { ok: false, why: checkWords(res.status, data) };
    const d = isRec(data) ? data : {};
    if (d.ok !== true) return { ok: false, why: checkWords(res.status, d) };
    return { ok: true, model: typeof d.model === 'string' ? d.model : '', asked: typeof d.asked === 'string' ? d.asked : '', ms: now() - started };
  } catch {
    return { ok: false, why: `The server answered ${res.status} with something that was not an answer.` };
  } finally {
    clearTimeout(timer);
  }
}
