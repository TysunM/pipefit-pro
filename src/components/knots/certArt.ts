// The certificate as a picture
// ----------------------------
// The Knot Certified certificate laid out once, as plain shapes and lines of
// text on a 1080-wide card (portrait, the shape chats and feeds show whole),
// so the phone (react-native-svg) and the browser (a canvas) draw the same
// thing and save it as a PNG. No text measuring is available on the phone, so
// lines are wrapped on a generous estimate of how wide each face sets. Pure.

import { ROPE_INK } from '../../calc/knots/rope';
import { FINE_PRINT, TIERS, clock, tierOf, type CertTotals } from '../../calc/knots/cert';

export type Face = 'sans' | 'sansRegular' | 'serif' | 'serifItalic';
export type Prim =
  | { k: 'rect'; x: number; y: number; w: number; h: number; rx: number; fill?: string; stroke?: string; sw?: number; dash?: number[] }
  | { k: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string; sw?: number; dash?: number[] }
  | { k: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; sw: number }
  | { k: 'text'; x: number; y: number; text: string; size: number; face: Face; color: string; anchor: 'start' | 'middle' | 'end'; spacing?: number; strike?: boolean }
  | { k: 'group'; rotate: number; cx: number; cy: number; children: Prim[] };
export type Art = { w: number; h: number; prims: Prim[] };

/** A group's corners turned as it is drawn: where a turned stamp really reaches. */
export function turnedBox(g: Extract<Prim, { k: 'group' }>): { top: number; bottom: number } {
  const ys: number[] = [];
  const a = (g.rotate * Math.PI) / 180;
  for (const c of g.children) {
    if (c.k !== 'rect') continue;
    for (const [x, y] of [
      [c.x, c.y],
      [c.x + c.w, c.y],
      [c.x, c.y + c.h],
      [c.x + c.w, c.y + c.h],
    ] as const) {
      ys.push(g.cy + (x - g.cx) * Math.sin(a) + (y - g.cy) * Math.cos(a));
    }
  }
  return { top: Math.min(...ys), bottom: Math.max(...ys) };
}

export const ART_W = 1080;
const PAD = 120;
const PAPER = '#f4ecd8';
const INK = '#2b2116';
const FADED = '#6b5a44';
const RULE = '#cdbf9f';
const STAMP = '#b3261e';
const ROPE = ROPE_INK.a;

/** How wide a face sets, as a share of its size per character: on the generous side, so no line runs over. */
const WIDTH: Record<Face, number> = { sans: 0.56, sansRegular: 0.52, serif: 0.5, serifItalic: 0.47 };
export const estWidth = (text: string, size: number, face: Face, spacing = 0) => [...text].reduce((a, ch) => a + (ch === ' ' ? 0.3 : /[A-Z]/.test(ch) ? 1.2 : 1) * WIDTH[face] * size, 0) + spacing * Math.max(0, text.length - 1);

/** Words into lines no wider than `max`. */
export function wrap(text: string, size: number, face: Face, max: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && estWidth(next, size, face) > max) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

export function certificateArt(totals: CertTotals, at: number): Art {
  const tierKey = tierOf(totals);
  const tier = TIERS[tierKey];
  const prims: Prim[] = [];
  const cx = ART_W / 2;
  const max = ART_W - 2 * PAD;
  let y = 0;
  const lines = (text: string, size: number, face: Face, color: string, gap = 1.3) => {
    for (const l of wrap(text, size, face, max)) {
      y += size * gap;
      prims.push({ k: 'text', x: cx, y, text: l, size, face, color, anchor: 'middle' });
    }
  };

  y = 150;
  prims.push({ k: 'text', x: cx, y, text: 'THIS IS TO CERTIFY THAT', size: 32, face: 'sans', color: FADED, anchor: 'middle', spacing: 7 });
  y += 20;
  lines('the hands holding this phone', 64, 'serifItalic', INK);
  y += 6;
  lines(totals.tied === totals.of ? `tied all ${totals.of} knots from memory, back to back, with every over and under called` : `tied ${totals.tied} of ${totals.of} knots from memory, and skipped ${totals.skipped}`, 38, 'sansRegular', INK, 1.35);
  y += 30;
  lines(tier.title, 84, 'serif', INK, 1.15);

  // The stamp, slapped on at an angle.
  const stampSize = 76;
  const sw = estWidth(tier.stamp, stampSize, 'sans', 9) + 110;
  const sh = 190;
  // Turned, its far corner rises by half its width times the sine of the turn: clear of the title's descenders.
  const rise = (sw / 2) * Math.sin((9 * Math.PI) / 180);
  const sy = y + 40 + rise;
  const stampCy = sy + sh / 2;
  prims.push({
    k: 'group',
    rotate: -9,
    cx,
    cy: stampCy,
    children: [
      { k: 'rect', x: cx - sw / 2, y: sy, w: sw, h: sh, rx: 26, stroke: STAMP, sw: 9 },
      { k: 'rect', x: cx - sw / 2 + 22, y: sy + 20, w: sw - 44, h: sh - 40, rx: 16, stroke: STAMP, sw: 4 },
      { k: 'text', x: cx, y: sy + 102, text: tier.stamp, size: stampSize, face: 'sans', color: STAMP, anchor: 'middle', spacing: 9 },
      tier.struck
        ? { k: 'text', x: cx, y: sy + 154, text: tier.struck, size: 44, face: 'sans', color: STAMP, anchor: 'middle', spacing: 12, strike: true }
        : { k: 'text', x: cx, y: sy + 152, text: tierKey === 'grand' ? '★   ★   ★' : '★   ★', size: 40, face: 'sans', color: STAMP, anchor: 'middle' },
    ],
  });
  // The corners a turned stamp swings out, and some air.
  y = sy + sh + 95;

  lines(tier.line, 42, 'serifItalic', INK, 1.3);

  // The run's numbers between two rules.
  y += 40;
  prims.push({ k: 'line', x1: PAD, y1: y, x2: ART_W - PAD, y2: y, stroke: RULE, sw: 3 });
  const cols = [
    ['TIME', clock(totals.ms)],
    ['OFF THE LINE', String(totals.slips)],
    ['WRONG CALLS', String(totals.wrong)],
  ] as const;
  cols.forEach(([label, value], i) => {
    const x = PAD + (max / 3) * (i + 0.5);
    prims.push({ k: 'text', x, y: y + 82, text: value, size: 66, face: 'sans', color: INK, anchor: 'middle' });
    prims.push({ k: 'text', x, y: y + 124, text: label, size: 25, face: 'sans', color: FADED, anchor: 'middle', spacing: 3 });
  });
  y += 160;
  prims.push({ k: 'line', x1: PAD, y1: y, x2: ART_W - PAD, y2: y, stroke: RULE, sw: 3 });

  y += 62;
  const date = new Date(at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  prims.push({ k: 'text', x: PAD, y, text: date, size: 31, face: 'sansRegular', color: FADED, anchor: 'start' });
  prims.push({ k: 'text', x: ART_W - PAD, y, text: 'Witnessed by one very tired rope', size: 31, face: 'serifItalic', color: FADED, anchor: 'end' });

  y += 26;
  lines(FINE_PRINT, 27, 'sansRegular', FADED, 1.4);

  y += 74;
  prims.push({ k: 'text', x: cx, y, text: 'TIED IN PIPEFIT PRO', size: 28, face: 'sans', color: ROPE.lay, anchor: 'middle', spacing: 6 });
  const h = Math.ceil(y + 110);

  // The rope round the edge, and a turn at each corner: drawn first, under everything.
  const inset = 34;
  const frame: Prim[] = [
    { k: 'rect', x: 0, y: 0, w: ART_W, h, rx: 0, fill: PAPER },
    { k: 'rect', x: inset, y: inset, w: ART_W - 2 * inset, h: h - 2 * inset, rx: 44, stroke: ROPE.edge, sw: 34 },
    { k: 'rect', x: inset, y: inset, w: ART_W - 2 * inset, h: h - 2 * inset, rx: 44, stroke: ROPE.core, sw: 22 },
    { k: 'rect', x: inset, y: inset, w: ART_W - 2 * inset, h: h - 2 * inset, rx: 44, stroke: ROPE.lay, sw: 22, dash: [8, 15] },
  ];
  const c = inset + 18;
  for (const [x, yy] of [
    [c, c],
    [ART_W - c, c],
    [c, h - c],
    [ART_W - c, h - c],
  ] as const) {
    frame.push({ k: 'circle', cx: x, cy: yy, r: 23, fill: PAPER, stroke: ROPE.edge, sw: 26 });
    frame.push({ k: 'circle', cx: x, cy: yy, r: 23, stroke: ROPE.core, sw: 16 });
    frame.push({ k: 'circle', cx: x, cy: yy, r: 23, stroke: ROPE.lay, sw: 16, dash: [6, 12] });
  }
  return { w: ART_W, h, prims: [...frame, ...prims] };
}

/** Every text in the picture, flattened out of groups: for the tests, and for reading it aloud. */
export function artTexts(a: Art): Extract<Prim, { k: 'text' }>[] {
  const out: Extract<Prim, { k: 'text' }>[] = [];
  const walk = (ps: Prim[]) => ps.forEach((p) => (p.k === 'text' ? out.push(p) : p.k === 'group' ? walk(p.children) : null));
  walk(a.prims);
  return out;
}
