// The mill cert reader
// --------------------
// A photo of a mill test report (MTR, mill cert, material test certificate)
// read for each heat it covers and that heat's sulphur, so two heats welded
// together can be checked against each other (calc/sulphur.ts) without the
// figure being typed. It goes the way every picture does: through the app's
// server to Cloudflare's free vision model first, Claude only when that
// cannot read it (worker/index.ts), and is not kept.
//
// Nothing read is saved on its own. Each heat comes back to the phone set
// against the heat book: a heat not in it, one in it with no sulphur yet,
// one whose sulphur the cert would change, the same heat read twice with two
// figures, a figure no stainless cert prints. The fitter checks each against
// the paper and ticks it; Save writes only what is ticked.
//
// Certs print chemistry in weight per cent, or scaled (×1000, ×100, ppm)
// under a column heading. The reader is asked for weight per cent and for
// the figure as printed, so the fitter can see what it converted.

import { CREDIT_WORDS, outOfCredit } from './claudeCheck';
import { MAX_IMAGE_B64, bareBase64, mediaOf, type SheetMedia } from './fittingSheet';
import { newHeat, normaliseHeat, type Heat } from '../calc/heat';
import { findHeat, putHeat, type HeatBook } from '../state/heatBook';
import { MAX_SULPHUR, pct } from '../calc/sulphur';

export const MILL_CERT_PATH = '/api/mill-cert';
export const MAX_MILL_BODY = MAX_IMAGE_B64 + 1024;
export const MAX_CERT_HEATS = 40;
/** A sulphur no stainless or carbon steel pipe cert prints: past this, the scale was likely misread. Free-machining grades (303) run higher and say so. */
export const SULPHUR_CHECK_ABOVE = 0.1;

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

// ------------------------------------------------------------ the request

export type MillBody = { image: string; media: SheetMedia };

/** A request off the wire, or null: a picture, and nothing else, so there is no way in for a question of its own. */
export function cleanMillBody(v: unknown): MillBody | null {
  if (!isRec(v) || typeof v.image !== 'string') return null;
  const image = bareBase64(v.image);
  if (!image || image.length > MAX_IMAGE_B64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) return null;
  const media = mediaOf(image);
  return media ? { image, media } : null;
}

// ------------------------------------------------------------ the question

export const MILL_SYSTEM = [
  'You read mill test reports (MTRs, mill certs, material test certificates) for a pipefitter, photographed on a job.',
  'Read each heat number on the cert and, for each, the sulphur (S) in its chemical analysis. The fitter checks two heats welded together against each other by their sulphur, so read only what is printed. Never estimate, never fill a figure in from what such steel usually holds, and never carry a figure from one heat to another. A figure you cannot read clearly is left out and named in `unread`.',
  '',
  'Rules for each heat:',
  '- heat: the heat number exactly as printed, characters and dashes as they are. One row per heat. A cert may cover several heats or several lots of one heat: one row per heat number.',
  '- s: the sulphur in weight per cent, as a decimal: 0.012 for 0.012%. Some certs print the chemistry scaled, with a heading such as x1000, x100, 1/1000 or ppm: convert to weight per cent (S 12 under x1000 is 0.012; 120 ppm is 0.012). A figure printed as less than ("<0.001") is given as that number. If S is not printed for the heat, or cannot be read, s is 0 and sPrinted is "".',
  '- sPrinted: the sulphur exactly as printed, with any scale from the column heading: "0.012", "12 (x1000)", "<0.001".',
  '- analysis: "product" if the figure is from a product (check) analysis, "heat" if from the heat (ladle) analysis, "" if the cert does not say. If both are printed for a heat, use the product analysis.',
  '- spec: the material specification and grade for that heat as printed ("ASTM A270 TP316L", "A312 TP304L"), else "".',
  'mill: the mill or maker if printed, else "". certNo: the certificate number if printed, else "".',
  'If the picture is not a mill cert, return no heats and say what it is in `unread`. Keep `unread` to one or two plain sentences.',
].join('\n');

export const MILL_SCHEMA = {
  type: 'object',
  properties: {
    mill: { type: 'string' },
    certNo: { type: 'string' },
    heats: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          heat: { type: 'string' },
          s: { type: 'number' },
          sPrinted: { type: 'string' },
          analysis: { type: 'string', enum: ['product', 'heat', ''] },
          spec: { type: 'string' },
        },
        required: ['heat', 's', 'sPrinted', 'analysis', 'spec'],
        additionalProperties: false,
      },
    },
    unread: { type: 'string' },
  },
  required: ['mill', 'certNo', 'heats', 'unread'],
  additionalProperties: false,
} as const;

export const MILL_PROMPT = 'Read every heat number on this mill cert and the sulphur (S) for each, in weight per cent.';

// ------------------------------------------------------------ the answer

export type CertHeat = { heat: string; s: number | null; sPrinted: string; analysis: 'product' | 'heat' | ''; spec: string };
export type MillRead = { mill: string; certNo: string; heats: CertHeat[]; unread: string };

/** A reply held to shape, or null. A heat with no number is no heat; a sulphur nobody could print is no figure. */
export function readMill(v: unknown): MillRead | null {
  if (!isRec(v) || !Array.isArray(v.heats)) return null;
  const heats: CertHeat[] = [];
  for (const h of v.heats.slice(0, MAX_CERT_HEATS)) {
    if (!isRec(h)) continue;
    const heat = str(h.heat, 30);
    if (!heat || !normaliseHeat(heat)) continue;
    const printed = str(h.sPrinted, 30);
    const s = typeof h.s === 'number' && Number.isFinite(h.s) && h.s > 0 && h.s <= MAX_SULPHUR && printed ? h.s : null;
    const analysis = h.analysis === 'product' || h.analysis === 'heat' ? h.analysis : '';
    heats.push({ heat, s, sPrinted: s === null ? '' : printed, analysis, spec: str(h.spec, 60) });
  }
  return { mill: str(v.mill, 60), certNo: str(v.certNo, 40), heats, unread: str(v.unread, 300) };
}

// ------------------------------------------------------------ the review

export type CertStatus = 'new' | 'adds' | 'same' | 'changes' | 'twice' | 'check' | 'no-figure';
export type CertRow = CertHeat & { id: string; status: CertStatus; saved: number | null; pick: boolean };

/**
 * Each heat read, set against the heat book: what saving it would do, and
 * whether it starts ticked. Only a heat new to the book, or one in it with no
 * sulphur yet, starts ticked; a change to a figure already kept, a heat read
 * twice with two figures, or a figure past what a cert prints wait for a tick.
 */
export function certRows(read: MillRead, book: HeatBook): CertRow[] {
  const figures = new Map<string, Set<number>>();
  for (const h of read.heats) if (h.s !== null) figures.set(normaliseHeat(h.heat), (figures.get(normaliseHeat(h.heat)) ?? new Set()).add(h.s));
  return read.heats.map((h, i) => {
    const kept = findHeat(book, h.heat);
    const saved = kept?.sulphur ?? null;
    const twice = (figures.get(normaliseHeat(h.heat))?.size ?? 0) > 1;
    const status: CertStatus =
      h.s === null ? 'no-figure' : twice ? 'twice' : h.s > SULPHUR_CHECK_ABOVE && !/303/.test(h.spec) ? 'check' : !kept ? 'new' : saved === null ? 'adds' : Math.abs(saved - h.s) < 1e-9 ? 'same' : 'changes';
    return { ...h, id: `${i}`, status, saved, pick: status === 'new' || status === 'adds' };
  });
}

export const canKeep = (r: CertRow): boolean => r.s !== null && r.status !== 'same';

/** Tick or untick one; a heat read twice keeps only the one ticked. */
export function toggleCert(rows: readonly CertRow[], id: string): CertRow[] {
  const hit = rows.find((r) => r.id === id);
  if (!hit || !canKeep(hit)) return rows.slice();
  const key = normaliseHeat(hit.heat);
  return rows.map((r) => (r.id === id ? { ...r, pick: !r.pick } : !hit.pick && normaliseHeat(r.heat) === key ? { ...r, pick: false } : r));
}

/**
 * The ticked heats written into the book: the sulphur always, and the spec,
 * the mill and the cert number only into boxes still empty, so nothing the
 * fitter typed is written over by a reading.
 */
export function keepCert(book: HeatBook, read: MillRead, rows: readonly CertRow[], now: number): { book: HeatBook; added: number; updated: number } {
  let b = book;
  let added = 0;
  let updated = 0;
  for (const r of rows) {
    if (!r.pick || !canKeep(r)) continue;
    const kept = findHeat(b, r.heat);
    const base: Heat = kept ?? newHeat(r.heat, now);
    const next: Heat = {
      ...base,
      sulphur: r.s,
      material: base.material || r.spec,
      mill: base.mill || read.mill,
      mtr: base.mtr || read.certNo,
      updatedAt: now,
    };
    b = putHeat(b, next);
    if (kept) updated += 1;
    else added += 1;
  }
  return { book: b, added, updated };
}

/** What a row's status says on screen. */
export function certStatusWords(r: CertRow): { text: string; warn: boolean } {
  switch (r.status) {
    case 'new':
      return { text: 'Not in the heat book: added with its sulphur', warn: false };
    case 'adds':
      return { text: 'In the book with no sulphur: this fills it in', warn: false };
    case 'same':
      return { text: 'In the book already, the same', warn: false };
    case 'changes':
      return { text: `Replaces ${r.saved !== null ? `${pct(r.saved)}%` : 'the saved figure'}`, warn: true };
    case 'twice':
      return { text: 'Read twice with two figures: tick the right one', warn: true };
    case 'check':
      return { text: `${pct(r.s ?? 0)}% is more than a pipe or tube cert prints: check the scale on the cert`, warn: true };
    case 'no-figure':
      return { text: 'No sulphur read for this heat', warn: true };
  }
}

// ------------------------------------------------------------ asking

export type MillMiss = 'not_set' | 'key_refused' | 'no_credit' | 'bad_model' | 'declined' | 'too_big' | 'not_image' | 'down' | 'offline' | 'daily_limit' | 'unread';

export function millMissWords(m: MillMiss): string {
  const then = 'Type the sulphur in on the heat instead.';
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
      return 'That picture is too big to send. Step back a little, or photograph the chemistry block on its own.';
    case 'not_image':
      return 'That picture could not be sent as a JPEG or PNG. Try again.';
    case 'down':
      return `The reader is not answering right now. ${then}`;
    case 'offline':
      return `No signal to reach the reader. ${then}`;
    case 'daily_limit':
      return `Today's free reading allowance is used up; it comes back at midnight UTC. ${then}`;
    case 'unread':
      return 'That picture could not be read. Fill the frame with the heat numbers and the chemistry, square on and in good light, and try again.';
  }
}

export function millMissOf(status: number, body: unknown): MillMiss {
  const e = isRec(body) ? body : {};
  if (status === 413 || e.error === 'too_large') return 'too_big';
  if (e.error === 'not_image') return 'not_image';
  if (e.error === 'not_configured') return 'not_set';
  if (e.error === 'upstream' && (e.status === 401 || e.status === 403)) return 'key_refused';
  if (outOfCredit(e)) return 'no_credit';
  if (e.error === 'upstream' && e.status === 404) return 'bad_model';
  if (e.error === 'declined') return 'declined';
  if (status === 429 || e.error === 'daily_limit') return 'daily_limit';
  if (e.error === 'bad_answer') return 'unread';
  return 'down';
}

/** Send a cert's picture to be read. The answer is held to shape here; the review is certRows'. */
export async function askMillCert(base: string, image: string, opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}): Promise<MillRead | MillMiss> {
  const b64 = bareBase64(image);
  if (b64.length > MAX_IMAGE_B64) return 'too_big';
  if (!mediaOf(b64)) return 'not_image';
  const f = opts.fetchImpl ?? fetch;
  const ctrl = new AbortController();
  // The free reader first (30 s at most), then Claude as the last resort (45 s): inside this.
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 85_000);
  let res: Response;
  try {
    res = await f(`${base}${MILL_CERT_PATH}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image: b64 }), signal: ctrl.signal });
  } catch {
    clearTimeout(timer);
    return 'offline';
  }
  try {
    const data = (await res.json()) as unknown;
    if (!res.ok) return millMissOf(res.status, data);
    return readMill(isRec(data) ? data.cert : null) ?? 'down';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}
