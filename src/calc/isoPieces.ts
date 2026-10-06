// An iso sketch, read as pipe
// ---------------------------
// A sketch is lines on dotted paper. To cut from it, the lines have to be
// read the way a fitter reads them: where a line ends, turns or meets another
// there is a fitting, and between two fittings is one piece of pipe, however
// many strokes it was drawn in. A line drawn in two goes that are dead in line
// is one piece; a line with a branch drawn off its middle is two, meeting at a
// tee.
//
// The runs are kept in the world (iso.ts), so which way each piece goes, and
// the angle at every turn, is known exactly. How long each piece is, is not:
// dots are not inches. That is the one figure the fitter gives, against the
// piece, the way it is written on any iso — centre to centre. From it and the
// fittings at the ends, isoCuts works the cut the same way Cut Length does,
// from the same tables (takeoffCatalog.ts).
//
// Pure.

import type { L3 } from './iso';
import { ElbowRadius } from './pipe';
import { elbowTakeout, endHasGap, endTakeout, isLibraryFitting, takeoffOption, type TakeoffOptions } from './takeoffCatalog';

export type IsoRun = { from: L3; to: L3 };

export type NodeKind = 'end' | 'elbow' | 'tee' | 'cross' | 'lateral' | 'odd';

export type IsoNode = {
  at: L3;
  kind: NodeKind;
  /** The turn at an elbow, or the branch off the run at a lateral, in degrees. */
  angle: number;
  /** How many pipes meet here. */
  pipes: number;
  /** At a tee or lateral, the way out along the branch. */
  branch: L3 | null;
};

export type IsoPiece = {
  /** Its two ends, in a fixed order: what its dimension is kept against. */
  key: string;
  /** 1, 2, 3… in the order the sketch was drawn: the number on the pipe. */
  n: number;
  from: L3;
  to: L3;
  /** One dot along it, from `from`. */
  step: L3;
  /** How many dots long it is on the paper. */
  dots: number;
};

export type IsoReading = { pieces: IsoPiece[]; nodes: Map<string, IsoNode>; error?: string };

/** Dots of pipe on one sketch past which it is not read: a runaway, not a run. */
export const MAX_DOTS = 20_000;

const k3 = (p: L3): string => `${p[0]},${p[1]},${p[2]}`;
const add = (p: L3, q: L3): L3 => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const neg = (p: L3): L3 => [-p[0] || 0, -p[1] || 0, -p[2] || 0];
const same = (p: L3, q: L3) => p[0] === q[0] && p[1] === q[1] && p[2] === q[2];
const dot = (p: L3, q: L3) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const before = (p: L3, q: L3) => p[0] - q[0] || p[1] - q[1] || p[2] - q[2];

/** The key a piece's dimension is kept against: its two ends, lower first. */
export const pieceKey = (a: L3, b: L3): string => (before(a, b) <= 0 ? `${k3(a)}~${k3(b)}` : `${k3(b)}~${k3(a)}`);
export const PIECE_KEY = /^-?\d+,-?\d+,-?\d+~-?\d+,-?\d+,-?\d+$/;

/** The angle between two directions, in degrees, to a hundredth. */
function between(p: L3, q: L3): number {
  const c = dot(p, q) / Math.sqrt(dot(p, p) * dot(q, q));
  return Math.round((Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI * 100) / 100;
}

function stepOf(from: L3, to: L3): { step: L3; dots: number } {
  const d: L3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const n = gcd(gcd(Math.abs(d[0]), Math.abs(d[1])), Math.abs(d[2]));
  return n ? { step: [d[0] / n, d[1] / n, d[2] / n], dots: n } : { step: [0, 0, 0], dots: 0 };
}

type Out = { dir: L3; seg: string };

/** What meets at a point, as a fitting. */
function classify(at: L3, outs: readonly Out[]): IsoNode {
  const pipes = outs.length;
  const base = { at, pipes, angle: 0, branch: null };
  if (pipes === 1) return { ...base, kind: 'end' };
  if (pipes === 2) return { ...base, kind: 'elbow', angle: Math.round((180 - between(outs[0]!.dir, outs[1]!.dir)) * 100) / 100 };
  const opposite = (o: Out) => outs.some((x) => same(x.dir, neg(o.dir)));
  if (pipes === 3) {
    const lone = outs.filter((o) => !opposite(o));
    if (lone.length !== 1) return { ...base, kind: 'odd' };
    const branch = lone[0]!.dir;
    const run = outs.find((o) => o !== lone[0])!.dir;
    const off = Math.min(between(branch, run), between(branch, neg(run)));
    return Math.abs(off - 90) < 0.01 ? { ...base, kind: 'tee', angle: 90, branch } : { ...base, kind: 'lateral', angle: off, branch };
  }
  if (pipes === 4 && outs.every(opposite)) {
    const [a, b] = [outs[0]!.dir, outs.find((o) => !same(o.dir, outs[0]!.dir) && !same(o.dir, neg(outs[0]!.dir)))!.dir];
    if (Math.abs(between(a, b) - 90) < 0.01) return { ...base, kind: 'cross', angle: 90 };
  }
  return { ...base, kind: 'odd' };
}

/**
 * The sketch's runs as pieces of pipe and the fittings between them.
 *
 * Every run is laid down dot by dot, so two strokes over the same stretch are
 * one stretch, and a branch drawn from the middle of a line splits it there.
 * A point where the pipe goes straight through — two strokes end to end in
 * line, or two lines crossing that were never joined — is no fitting.
 */
export function readIso(runs: readonly IsoRun[]): IsoReading {
  const outs = new Map<string, Out[]>();
  const point = new Map<string, L3>();
  const firstStroke = new Map<string, number>();
  const strokeStep: { step: L3; from: L3 }[] = [];
  const ends = new Set<string>();
  let total = 0;

  for (let i = 0; i < runs.length; i += 1) {
    const r = runs[i]!;
    const { step, dots } = stepOf(r.from, r.to);
    strokeStep.push({ step, from: r.from });
    if (!dots) continue;
    total += dots;
    if (total > MAX_DOTS) return { pieces: [], nodes: new Map(), error: 'This sketch has too much pipe on it to read as one cut list.' };
    ends.add(k3(r.from));
    ends.add(k3(r.to));
    let p = r.from;
    for (let k = 0; k < dots; k += 1) {
      const q = add(p, step);
      const seg = pieceKey(p, q);
      if (!firstStroke.has(seg)) {
        firstStroke.set(seg, i);
        for (const [at, dir] of [[p, step], [q, neg(step)]] as const) {
          point.set(k3(at), at);
          outs.set(k3(at), [...(outs.get(k3(at)) ?? []), { dir, seg }]);
        }
      }
      p = q;
    }
  }

  const through = (key: string): boolean => {
    const os = outs.get(key) ?? [];
    const paired = os.every((o) => os.some((x) => same(x.dir, neg(o.dir))));
    if (os.length === 2) return paired;
    return !ends.has(key) && (os.length === 4 || os.length === 6) && paired;
  };

  const nodes = new Map<string, IsoNode>();
  for (const [key, os] of outs) if (!through(key)) nodes.set(key, classify(point.get(key)!, os));

  const used = new Set<string>();
  const raw: { from: L3; to: L3; step: L3; dots: number; first: number; along: number }[] = [];
  const order = [...nodes.keys()].sort();
  for (const key of order) {
    const start = point.get(key)!;
    for (const o of outs.get(key)!) {
      if (used.has(o.seg)) continue;
      let at = start;
      let dots = 0;
      let first = Infinity;
      let seg: string | undefined = o.seg;
      while (seg && !used.has(seg)) {
        used.add(seg);
        first = Math.min(first, firstStroke.get(seg)!);
        at = add(at, o.dir);
        dots += 1;
        if (nodes.has(k3(at))) break;
        seg = outs.get(k3(at))?.find((x) => same(x.dir, o.dir))?.seg;
      }
      // Numbered the way the stroke it came from was drawn, and so along it.
      const s = strokeStep[first]!;
      const flip = same(o.dir, neg(s.step));
      const from = flip ? at : start;
      const to = flip ? start : at;
      const along = dot([from[0] - s.from[0], from[1] - s.from[1], from[2] - s.from[2]], s.step);
      raw.push({ from, to, step: flip ? neg(o.dir) : o.dir, dots, first, along });
    }
  }

  raw.sort((a, b) => a.first - b.first || a.along - b.along || pieceKey(a.from, a.to).localeCompare(pieceKey(b.from, b.to)));
  const pieces = raw.map((r, i) => ({ key: pieceKey(r.from, r.to), n: i + 1, from: r.from, to: r.to, step: r.step, dots: r.dots }));
  return { pieces, nodes };
}

// ------------------------------------------------------------ the cuts

/** How the line is joined, which decides the fitting at every node. */
export type IsoJoint = 'welded' | 'screwed' | 'socket' | 'nohub';

export const ISO_JOINTS: { id: IsoJoint; label: string }[] = [
  { id: 'welded', label: 'Butt weld' },
  { id: 'screwed', label: 'Screwed' },
  { id: 'socket', label: 'PVC socket' },
  { id: 'nohub', label: 'No-hub' },
];

/** The fitting ids each way of joining uses, from the catalog. */
const FITTINGS: Record<IsoJoint, { e90: string; e45: string; tee: string; branch: string; cross?: string; wyeRun?: string; wyeBranch?: string }> = {
  welded: { e90: 'weld90', e45: 'weld45', tee: 'weldTee', branch: 'weldTee', cross: 'weldTee' },
  screwed: { e90: 'screwed90', e45: 'screwed45', tee: 'screwed90', branch: 'screwed90', cross: 'screwed90' },
  socket: { e90: 'sock90', e45: 'sock45', tee: 'sockTee', branch: 'sockTee' },
  nohub: { e90: 'nh14', e45: 'nh18', tee: 'nhSanRun', branch: 'nhSanBranch', wyeRun: 'nhWyeRun', wyeBranch: 'nhWyeBranch' },
};

export type IsoCutOptions = {
  joint: IsoJoint;
  nps: number;
  radius: ElbowRadius;
  /** Root gap at a weld, or the coupling's centre stop at a no-hub joint. */
  gap: number;
  library?: TakeoffOptions['library'];
  /** For the words: the size as read, `2"`, and a length. */
  size: string;
  length: (inches: number) => string;
};

export type IsoEnd = { label: string; takeout: number; gap: number; problem?: string };

export type IsoCut = {
  piece: IsoPiece;
  c2c: number | null;
  ends: [IsoEnd, IsoEnd];
  /** What the saw cuts, or NaN when there is a problem. */
  cut: number;
  problem: string | null;
};

const near = (a: number, b: number) => Math.abs(a - b) < 0.01;
const tidy = (a: number) => String(Math.round(a * 100) / 100);

function fitted(id: string, label: string, o: IsoCutOptions): IsoEnd {
  const takeout = endTakeout(id, o.nps, { radius: o.radius, flangeClass: '150', custom: 0, library: o.library });
  if (!Number.isFinite(takeout)) {
    const name = takeoffOption(id)?.label ?? label;
    return {
      label,
      takeout: NaN,
      gap: 0,
      problem: isLibraryFitting(id) ? `Set the ${o.size} ${name} takeout in the fitting library.` : `A ${o.size} ${name.toLowerCase()} is not in the tables. Work this piece in Cut Length.`,
    };
  }
  return { label, takeout, gap: endHasGap(id) ? o.gap : 0 };
}

/** What is on one end of a piece: the fitting at `node`, the piece leaving it along `out`. */
export function isoEnd(node: IsoNode | undefined, out: L3, o: IsoCutOptions): IsoEnd {
  const f = FITTINGS[o.joint];
  const no = (problem: string): IsoEnd => ({ label: '?', takeout: NaN, gap: 0, problem });
  if (!node || node.kind === 'end') return { label: 'Open end', takeout: 0, gap: 0 };
  if (node.kind === 'elbow') {
    const a = node.angle;
    const ell = o.joint === 'welded' ? `${o.radius} elbow` : o.joint === 'nohub' ? 'bend' : 'elbow';
    if (near(a, 90)) return fitted(f.e90, o.joint === 'nohub' ? '1/4 bend' : `90° ${ell}`, o);
    if (near(a, 45)) return fitted(f.e45, o.joint === 'nohub' ? '1/8 bend' : `45° ${ell}`, o);
    if (o.joint === 'welded' && a < 90) {
      const t = elbowTakeout(o.nps, o.radius, a).value;
      return { label: `${tidy(a)}° elbow cut from a 90`, takeout: t, gap: o.gap };
    }
    return no(`A ${tidy(a)}° turn is not a stock fitting. Redraw it as 90s and 45s.`);
  }
  if (node.kind === 'tee') {
    const isBranch = !!node.branch && same(out, node.branch);
    return fitted(isBranch ? f.branch : f.tee, isBranch ? 'Tee, branch' : 'Tee, run', o);
  }
  if (node.kind === 'lateral') {
    const isBranch = !!node.branch && same(out, node.branch);
    if (near(node.angle, 45) && f.wyeRun && f.wyeBranch) return fitted(isBranch ? f.wyeBranch : f.wyeRun, isBranch ? 'Wye, branch' : 'Wye, run', o);
    return no(`A ${tidy(node.angle)}° lateral has no takeout here. Work this piece in Cut Length.`);
  }
  if (node.kind === 'cross') {
    if (f.cross) return fitted(f.cross, 'Cross', o);
    return no('No cross in this kind of joint. Draw it as two tees.');
  }
  return no(`${node.pipes} pipes meet at one point here. That is not a fitting the list can work.`);
}

/** Every piece's cut, from its dimension and the fittings at its ends. */
export function isoCuts(reading: IsoReading, dims: Readonly<Record<string, number>>, o: IsoCutOptions): IsoCut[] {
  return reading.pieces.map((piece) => {
    const a = isoEnd(reading.nodes.get(k3(piece.from)), piece.step, o);
    const b = isoEnd(reading.nodes.get(k3(piece.to)), neg(piece.step), o);
    const d = dims[piece.key];
    const c2c = typeof d === 'number' && Number.isFinite(d) && d > 0 ? d : null;
    const ends: [IsoEnd, IsoEnd] = [a, b];
    const fault = a.problem ?? b.problem ?? null;
    if (fault) return { piece, c2c, ends, cut: NaN, problem: fault };
    if (c2c === null) return { piece, c2c, ends, cut: NaN, problem: 'No dimension yet.' };
    const off = a.takeout + b.takeout + a.gap + b.gap;
    const cut = c2c - off;
    if (cut <= 0) return { piece, c2c, ends, cut: NaN, problem: `Too short for its fittings: ${o.length(off)} comes off.` };
    return { piece, c2c, ends, cut, problem: null };
  });
}

/** The joint a job's pipe is made up with, until the fitter says otherwise. */
export function jointFor(materialId: string, libraryFamily: 'socket' | 'nohub' | undefined): IsoJoint {
  if (libraryFamily) return libraryFamily;
  return materialId === 'galv' ? 'screwed' : 'welded';
}

// ------------------------------------------------------------ notes as dimensions

export type NoteAt = { at: [number, number]; text: string };

/**
 * Dimensions already written on the sketch as notes, matched to the piece
 * each one sits beside. Only offered, never taken: a 2" by a line may be its
 * size, not its length, so the fitter says yes to each.
 *
 * `mid` is where a piece's middle is on the page; a note counts for the
 * nearest piece within `reach`, and a piece takes only its nearest note.
 */
export function notedDims(
  pieces: readonly IsoPiece[],
  notes: readonly NoteAt[],
  mid: (p: IsoPiece) => [number, number],
  reach: number,
  read: (text: string) => number,
): Map<string, { value: number; text: string }> {
  const best = new Map<string, { value: number; text: string; d: number }>();
  for (const note of notes) {
    const text = note.text.trim();
    if (/[a-z]/i.test(text.replace(/\b(?:ft|in)\b/gi, ''))) continue;
    const value = read(text);
    if (!Number.isFinite(value) || value <= 0) continue;
    let near: IsoPiece | null = null;
    let nd = reach;
    for (const p of pieces) {
      const m = mid(p);
      const d = Math.hypot(m[0] - note.at[0], m[1] - note.at[1]);
      if (d < nd) {
        nd = d;
        near = p;
      }
    }
    if (!near) continue;
    const had = best.get(near.key);
    if (!had || nd < had.d) best.set(near.key, { value, text, d: nd });
  }
  return new Map([...best].map(([k, v]) => [k, { value: v.value, text: v.text }]));
}
