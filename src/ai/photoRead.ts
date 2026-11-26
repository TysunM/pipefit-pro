// A picture read on the server
// ----------------------------
// What every photo reader shares (the mill cert, the weld report): the
// request is a picture and nothing else, its type taken from its bytes; what
// went wrong comes back as one of a few words the phone can say plainly; and
// the answer is held to shape on the phone as well as on the server.
//
// The box reader (fittingSheet.ts) came first and keeps its own copy, with
// its own words for a takeout.

import { CREDIT_WORDS, outOfCredit } from './claudeCheck';
import { MAX_IMAGE_B64, bareBase64, mediaOf, type SheetMedia } from './fittingSheet';

export const MAX_PHOTO_BODY = MAX_IMAGE_B64 + 1024;

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
/** A string off a reply, its whitespace folded, cut to size; anything else is blank. */
export const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

export type PhotoBody = { image: string; media: SheetMedia };

/** A request off the wire, or null: a picture, and nothing else, so there is no way in for a question of its own. */
export function cleanPhotoBody(v: unknown): PhotoBody | null {
  if (!isRec(v) || typeof v.image !== 'string') return null;
  const image = bareBase64(v.image);
  if (!image || image.length > MAX_IMAGE_B64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) return null;
  const media = mediaOf(image);
  return media ? { image, media } : null;
}

export type PhotoMiss = 'not_set' | 'key_refused' | 'no_credit' | 'bad_model' | 'declined' | 'too_big' | 'not_image' | 'down' | 'offline' | 'daily_limit' | 'unread';

/** Why a picture was not read, in words: `then` is what to do instead, `frame` how to take it again. */
export function photoMissWords(m: PhotoMiss, then: string, frame: string): string {
  switch (m) {
    case 'not_set':
      return `The reader is not set up on the server. ${then}`;
    case 'key_refused':
      return `Anthropic turned the key down. Settings → Smart help → Test Claude shows why. ${then}`;
    case 'no_credit':
      return `${CREDIT_WORDS} ${then}`;
    case 'bad_model':
      return `The model in CLAUDE_MODEL would not take this. ${then}`;
    case 'declined':
      return `The reader declined that picture. ${then}`;
    case 'too_big':
      return 'That picture is too big to send. Step back a little, or photograph half of it at a time.';
    case 'not_image':
      return 'That picture could not be sent as a JPEG or PNG. Try again.';
    case 'down':
      return `The reader is not answering right now. ${then}`;
    case 'offline':
      return `No signal to reach the reader. ${then}`;
    case 'daily_limit':
      return `Today's free reading allowance is used up; it comes back at midnight UTC. ${then}`;
    case 'unread':
      return `That picture could not be read. ${frame}`;
  }
}

export function photoMissOf(status: number, body: unknown): PhotoMiss {
  const e = isRec(body) ? body : {};
  if (status === 413 || e.error === 'too_large') return 'too_big';
  if (e.error === 'not_image') return 'not_image';
  if (e.error === 'not_configured') return 'not_set';
  if (e.error === 'upstream' && (e.status === 401 || e.status === 403)) return 'key_refused';
  if (outOfCredit(e)) return 'no_credit';
  if (e.error === 'upstream' && e.status === 404) return 'bad_model';
  if (e.error === 'declined') return 'declined';
  // The free reader (Workers AI): its day's allowance spent, or an answer it could not shape.
  if (status === 429 || e.error === 'daily_limit') return 'daily_limit';
  if (e.error === 'bad_answer') return 'unread';
  return 'down';
}

/**
 * Send a picture to a reader's route and hold its answer to shape: the reply
 * carries it under `key`, and `read` is the same check the server made.
 */
export async function askPhoto<T>(
  base: string,
  path: string,
  image: string,
  key: string,
  read: (v: unknown) => T | null,
  opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<T | PhotoMiss> {
  const b64 = bareBase64(image);
  if (b64.length > MAX_IMAGE_B64) return 'too_big';
  if (!mediaOf(b64)) return 'not_image';
  const f = opts.fetchImpl ?? fetch;
  const ctrl = new AbortController();
  // The free reader first (30 s at most), then Claude as the last resort (45 s): inside this.
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 85_000);
  let res: Response;
  try {
    res = await f(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image: b64 }), signal: ctrl.signal });
  } catch {
    clearTimeout(timer);
    return 'offline';
  }
  try {
    const data = (await res.json()) as unknown;
    if (!res.ok) return photoMissOf(res.status, data);
    return read(isRec(data) ? data[key] : null) ?? 'down';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}
