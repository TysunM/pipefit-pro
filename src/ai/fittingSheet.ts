// Reading a maker's dimension sheet into the fitting library
// ----------------------------------------------------------
// Socket and no-hub takeouts are the maker's (state/fittingLibrary.ts), and
// the maker prints them: a submittal sheet, a catalog page, the side of the
// box. Photograph it and Claude reads the figures off it — every fitting and
// size on the page at once, instead of one at a time by thumb.
//
// Nothing is saved by the read. A misread takeout looks exactly like a right
// one and goes on to cut every length it touches, so what comes back is laid
// out for the fitter to check against the sheet in their hand, with anything
// doubtful shown and left unticked: a size the line does not come in, a figure
// too big for the size (millimetres read as inches), two figures for one
// fitting, a sheet for another schedule. Only what is ticked is saved.
//
// Claude reads; the arithmetic is the app's. Where a sheet prints centre to
// the face and the socket depth instead of the takeout, both are read and the
// subtraction is done here, where it is tested.
//
// Shared by the Worker (prompt, schema, the check of the answer) and the app
// (the request, the review). No React Native, no SDK.

import { LIBRARY_FITTINGS } from '../calc/takeoffCatalog';
import type { FittingLibrary } from '../state/fittingLibrary';
import { lookup } from '../state/fittingLibrary';

export const FITTING_SHEET_PATH = '/api/fitting-sheet';

/** The image as base64, at most this long: Anthropic's own cap on one image. */
export const MAX_IMAGE_B64 = 5 * 1024 * 1024;
/** The request: the image and a few words. */
export const MAX_SHEET_BODY = MAX_IMAGE_B64 + 1024;
/** Most rows read off one sheet. A full catalog page is a few dozen. */
export const MAX_ROWS = 120;

export type SheetFamily = 'socket' | 'nohub';
export type SheetMedia = 'image/jpeg' | 'image/png' | 'image/webp';

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const fittingsOf = (family: SheetFamily) => LIBRARY_FITTINGS.filter((f) => f.family === family);
const FITTING_IDS = LIBRARY_FITTINGS.map((f) => f.id);

// ------------------------------------------------------------ the request

export type SheetBody = { image: string; media: SheetMedia; family: SheetFamily };

/** What the bytes are, from the bytes: a JPEG, PNG or WebP, or nothing. */
export function mediaOf(b64: string): SheetMedia | null {
  if (b64.startsWith('/9j/')) return 'image/jpeg';
  if (b64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (b64.startsWith('UklGR')) return 'image/webp';
  return null;
}

/** A data URI or bare base64, as base64 alone. */
export const bareBase64 = (s: string): string => s.replace(/^data:[^,]*,/, '').replace(/\s+/g, '');

/**
 * A request off the wire, or null. The type is taken from the bytes, not from
 * what the request says, and the route takes nothing but a picture and which
 * kind of fitting to look for: there is no way in for a question of its own.
 */
export function cleanSheetBody(v: unknown): SheetBody | null {
  if (!isRec(v) || (v.family !== 'socket' && v.family !== 'nohub') || typeof v.image !== 'string') return null;
  const image = bareBase64(v.image);
  if (!image || image.length > MAX_IMAGE_B64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) return null;
  const media = mediaOf(image);
  return media ? { image, media, family: v.family } : null;
}

// ------------------------------------------------------------ the question

const list = (family: SheetFamily) => fittingsOf(family).map((f) => `- ${f.id}: ${f.label} — takeout is ${f.how}`).join('\n');

export const SHEET_SYSTEM = [
  'You read pipe fitting dimension sheets for a pipefitter: a maker\'s catalog page, submittal, or the label on a box, photographed on a job.',
  'The fitter will save what you read as the takeout of each fitting: the length the fitting takes up between a centre-to-centre dimension and the end of the pipe. It is cut to, so read only what is printed. Never estimate, never fill a figure in from what such fittings usually measure, and never carry a figure from one size or fitting to another. A figure you cannot read clearly is left out and named in `unread`.',
  '',
  'PVC and CPVC socket fittings (family "socket"). The pipe goes into the socket until it bottoms, so the takeout is centre to the bottom of the socket. Sheets call it the laying length, centre to socket bottom, or a letter such as G. If the sheet gives only centre to the end (the face or lip of the socket) and the socket depth, give those two in centreToEnd and socketDepth and leave takeout 0: the app subtracts. A street elbow\'s spigot end is centre to the end of the spigot.',
  list('socket'),
  '',
  'Cast iron no-hub fittings (family "nohub", CISPI 301). The pipe butts the fitting end inside the coupling, so the takeout is centre to the end of the fitting (often called the laying length, or a letter). The coupling\'s centre stop is not part of it. For a sanitary tee or wye, the run figure is the branch centreline to the end of the run, and the branch figure the run centreline to the end of the branch. If a sheet gives two different run figures for one fitting (the two run ends differ), give both as separate rows, each with its own label.',
  list('nohub'),
  '',
  'Rules for each row:',
  '- fitting: one of the ids above for the family asked for. Fittings not in that list (couplings, caps, adapters, reducing fittings, other materials) are left out.',
  '- nps: the nominal size as a decimal: 1-1/4" is 1.25, 1/2" is 0.5. Reducing sizes are left out.',
  '- takeout, centreToEnd, socketDepth: numbers in the sheet\'s own unit, 0 where the sheet does not give one. Fractions as decimals: 1-1/8 is 1.125.',
  '- label: the sheet\'s own name for the figure you used, as printed ("G", "Laying length", "X"), so the fitter can find it on the page.',
  'unit: "in" or "mm", the unit the figures are printed in. maker: the maker\'s name if printed, else "". schedule: the schedule or class the sheet is for as printed ("40", "80", "DWV", "CISPI 301"), else "". material: the material as printed ("PVC", "CPVC", "cast iron"), else "".',
  'If the picture is not a dimension sheet or label for this family, return no rows and say what it is in `unread`. Keep `unread` to one or two plain sentences.',
].join('\n');

export const SHEET_SCHEMA = {
  type: 'object',
  properties: {
    unit: { type: 'string', enum: ['in', 'mm'] },
    maker: { type: 'string' },
    schedule: { type: 'string' },
    material: { type: 'string' },
    rows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          fitting: { type: 'string', enum: FITTING_IDS },
          nps: { type: 'number' },
          takeout: { type: 'number' },
          centreToEnd: { type: 'number' },
          socketDepth: { type: 'number' },
          label: { type: 'string' },
        },
        required: ['fitting', 'nps', 'takeout', 'centreToEnd', 'socketDepth', 'label'],
        additionalProperties: false,
      },
    },
    unread: { type: 'string' },
  },
  required: ['unit', 'maker', 'schedule', 'material', 'rows', 'unread'],
  additionalProperties: false,
} as const;

const FAMILY_WORDS: Record<SheetFamily, string> = {
  socket: 'PVC or CPVC socket fittings (family "socket")',
  nohub: 'cast iron no-hub fittings (family "nohub")',
};

export const sheetPrompt = (family: SheetFamily): string =>
  `Read the takeouts of ${FAMILY_WORDS[family]} off this picture. Only ids from that family.`;

// ------------------------------------------------------------ the answer

export type SheetRow = { fitting: string; nps: number; takeout: number; centreToEnd: number; socketDepth: number; label: string };
export type SheetRead = { unit: 'in' | 'mm'; maker: string; schedule: string; material: string; rows: SheetRow[]; unread: string };

const fig = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 2000 ? v : 0);

/** Claude's answer, held to shape: rows for the family asked about, figures bounded. Null if it is not an answer. */
export function readSheet(v: unknown, family: SheetFamily): SheetRead | null {
  if (!isRec(v) || (v.unit !== 'in' && v.unit !== 'mm') || !Array.isArray(v.rows)) return null;
  const ids = new Set(fittingsOf(family).map((f) => f.id));
  const rows: SheetRow[] = [];
  for (const r of v.rows) {
    if (!isRec(r) || typeof r.fitting !== 'string' || !ids.has(r.fitting)) continue;
    const nps = typeof r.nps === 'number' && Number.isFinite(r.nps) && r.nps > 0 && r.nps <= 48 ? r.nps : 0;
    if (!nps) continue;
    rows.push({ fitting: r.fitting, nps, takeout: fig(r.takeout), centreToEnd: fig(r.centreToEnd), socketDepth: fig(r.socketDepth), label: str(r.label, 40) });
    if (rows.length >= MAX_ROWS) break;
  }
  return {
    unit: v.unit,
    maker: str(v.maker, 60),
    schedule: str(v.schedule, 30),
    material: str(v.material, 40),
    rows,
    unread: str(v.unread, 400),
  };
}

// ------------------------------------------------------------ the review

export type ReviewStatus =
  /** Not in the library yet. */
  | 'new'
  /** Already saved, the same figure. */
  | 'same'
  /** Already saved, a different figure: saving replaces it. */
  | 'changes'
  /** Another row reads a different figure for the same fitting and size. */
  | 'conflict'
  /** Bigger than any such fitting of that size: likely a misread or the wrong unit. */
  | 'implausible'
  /** The line does not come in this size. */
  | 'no-size'
  /** No takeout on the sheet, nor the two figures it comes from. */
  | 'no-figure';

export type ReviewRow = {
  id: string;
  fitting: string;
  fittingLabel: string;
  nps: number;
  /** Inches, or NaN when there is none. */
  takeout: number;
  /** How it was read, for the fitter to find on the sheet. */
  from: string;
  status: ReviewStatus;
  /** The figure already saved, when there is one. */
  saved?: number;
  /** Ticked to begin with: only rows nothing is doubtful about. */
  pick: boolean;
};

/** Rows that can be saved at all. A doubtful-but-real figure can be ticked by hand; one with no figure cannot. */
export const canSave = (r: ReviewRow): boolean => Number.isFinite(r.takeout) && r.status !== 'no-size' && r.status !== 'no-figure';

/**
 * The largest takeout believed for a size: no socket or no-hub fitting takes
 * up more than three times its size plus six inches (a 4" no-hub long sweep is
 * about 11"; a 2" PVC ell about 1 1/4"). Millimetres read as inches land far
 * past it.
 */
export const plausibleMax = (nps: number): number => 3 * nps + 6;

const round = (n: number) => Math.round(n * 10000) / 10000;
const SAME = 1 / 64;

/** A sheet's schedule against the line's wall: false only when the sheet plainly says another. */
export function scheduleMatches(sheet: string, wall: string): boolean {
  const s = sheet.toUpperCase().replace(/^SCH(EDULE)?\.?\s*/, '').replace(/\s+/g, ' ').trim();
  if (!s) return true;
  const n = /^(\d+)S?\b/.exec(s)?.[1];
  const w = /^(\d+)S?$/.exec(wall.toUpperCase())?.[1];
  // A numbered schedule on a numbered wall: they must be the same number.
  if (n && w) return n === w;
  return true;
}

/**
 * What a read means for this line and this library: one row per figure,
 * marked, with the safe ones ticked. Pure, so every rule here is tested.
 */
export function reviewRows(read: SheetRead, opts: { line: string; sizes: readonly number[]; library: FittingLibrary; wall: string }): ReviewRow[] {
  const toIn = (n: number) => (read.unit === 'mm' ? n / 25.4 : n);
  const labelOf = (id: string) => LIBRARY_FITTINGS.find((f) => f.id === id)?.label ?? id;
  const wrongSchedule = !scheduleMatches(read.schedule, opts.wall);

  const rows: ReviewRow[] = read.rows.map((r, i) => {
    let takeout = NaN;
    let from = r.label;
    if (r.takeout > 0) takeout = toIn(r.takeout);
    else if (r.centreToEnd > 0 && r.socketDepth > 0 && r.centreToEnd > r.socketDepth) {
      takeout = toIn(r.centreToEnd - r.socketDepth);
      from = `${r.label ? `${r.label}: ` : ''}centre to end ${round(r.centreToEnd)} − socket ${round(r.socketDepth)}${read.unit === 'mm' ? ' mm' : ''}`;
    }
    if (Number.isFinite(takeout)) takeout = round(takeout);
    const nps = opts.sizes.find((s) => Math.abs(s - r.nps) < 1e-6);
    const saved = nps === undefined ? undefined : lookup(opts.library, opts.line, r.fitting, nps);
    let status: ReviewStatus = 'new';
    if (nps === undefined) status = 'no-size';
    else if (!Number.isFinite(takeout)) status = 'no-figure';
    else if (takeout > plausibleMax(nps)) status = 'implausible';
    else if (saved !== undefined) status = Math.abs(saved - takeout) < SAME ? 'same' : 'changes';
    return {
      id: `${i}`,
      fitting: r.fitting,
      fittingLabel: labelOf(r.fitting),
      nps: nps ?? r.nps,
      takeout,
      from,
      status,
      saved,
      pick: !wrongSchedule && (status === 'new' || status === 'changes'),
    };
  });

  // Two figures for one fitting and size: neither is ticked, and the fitter picks.
  const byKey = new Map<string, ReviewRow[]>();
  for (const r of rows) if (canSave(r)) byKey.set(`${r.fitting}|${r.nps}`, [...(byKey.get(`${r.fitting}|${r.nps}`) ?? []), r]);
  for (const group of byKey.values()) {
    if (group.length < 2) continue;
    const first = group[0]!.takeout;
    if (group.every((r) => Math.abs(r.takeout - first) < SAME)) {
      // The same figure twice is one figure.
      for (const r of group.slice(1)) {
        r.pick = false;
        r.status = 'same';
      }
      continue;
    }
    for (const r of group) {
      r.status = r.status === 'implausible' ? r.status : 'conflict';
      r.pick = false;
    }
  }

  const order = (id: string) => LIBRARY_FITTINGS.findIndex((f) => f.id === id);
  return rows.sort((a, b) => order(a.fitting) - order(b.fitting) || a.nps - b.nps || Number(a.id) - Number(b.id));
}

/** Tick one row; a row it conflicts with is unticked, since only one figure can be kept. */
export function toggleRow(rows: readonly ReviewRow[], id: string): ReviewRow[] {
  const row = rows.find((r) => r.id === id);
  if (!row || !canSave(row)) return [...rows];
  const on = !row.pick;
  return rows.map((r) => {
    if (r.id === id) return { ...r, pick: on };
    if (on && r.fitting === row.fitting && r.nps === row.nps) return { ...r, pick: false };
    return r;
  });
}

// --------------------------------------------------------- asking from the app

/** The largest picture size worth sending: Claude's full resolution, and no more. */
export function bestPictureSize(sizes: readonly string[]): string | undefined {
  let best: { s: string; area: number } | undefined;
  for (const s of sizes) {
    const m = /^(\d+)x(\d+)$/.exec(s);
    if (!m) continue;
    const w = Number(m[1]);
    const h = Number(m[2]);
    const area = w * h;
    if (Math.max(w, h) > 2576 || area > 3_750_000) continue;
    if (!best || area > best.area) best = { s, area };
  }
  return best?.s;
}


export type SheetMiss = 'not_set' | 'key_refused' | 'bad_model' | 'declined' | 'too_big' | 'not_image' | 'down' | 'offline';

export function sheetMissWords(m: SheetMiss): string {
  const then = 'Type the takeout in instead — it works the same.';
  switch (m) {
    case 'not_set':
      return `Claude is not switched on: the server needs the ANTHROPIC_API_KEY secret and the CLAUDE_MODEL variable. ${then}`;
    case 'key_refused':
      return `Anthropic turned the key down. Settings → Smart help → Test Claude shows why. ${then}`;
    case 'bad_model':
      return `The model in CLAUDE_MODEL would not take this. Settings → Smart help → Test Claude shows what Anthropic said. ${then}`;
    case 'declined':
      return `Claude declined to read that picture. ${then}`;
    case 'too_big':
      return 'That picture is too big to send. Step back a little, or photograph half the sheet at a time.';
    case 'not_image':
      return 'That picture could not be sent as a JPEG or PNG. Try again.';
    case 'down':
      return `Claude is not answering right now. ${then}`;
    case 'offline':
      return `No signal to reach Claude. ${then}`;
  }
}

export function sheetMissOf(status: number, body: unknown): SheetMiss {
  const e = isRec(body) ? body : {};
  if (status === 413 || e.error === 'too_large') return 'too_big';
  if (e.error === 'not_image') return 'not_image';
  if (e.error === 'not_configured') return 'not_set';
  if (e.error === 'upstream' && (e.status === 401 || e.status === 403)) return 'key_refused';
  if (e.error === 'upstream' && e.status === 404) return 'bad_model';
  if (e.error === 'declined') return 'declined';
  return 'down';
}

/** Send a picture to be read. The answer is held to shape here; the review is reviewRows'. */
export async function askFittingSheet(
  base: string,
  image: string,
  family: SheetFamily,
  opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<SheetRead | SheetMiss> {
  const b64 = bareBase64(image);
  if (b64.length > MAX_IMAGE_B64) return 'too_big';
  if (!mediaOf(b64)) return 'not_image';
  const f = opts.fetchImpl ?? fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 75_000);
  let res: Response;
  try {
    res = await f(`${base}${FITTING_SHEET_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image: b64, family }),
      signal: ctrl.signal,
    });
  } catch {
    clearTimeout(timer);
    return 'offline';
  }
  try {
    const data = (await res.json()) as unknown;
    if (!res.ok) return sheetMissOf(res.status, data);
    return readSheet(isRec(data) ? data.sheet : null, family) ?? 'down';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}
