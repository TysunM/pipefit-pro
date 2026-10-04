// Pipe specs by voice
// -------------------
// "Half inch stainless, 40S." "Six inch chrome moly P22, schedule 80, long
// radius." "Four inch PVC." What is said sets the job's pipe: size, material,
// wall and elbow radius, any of them, in any order. Like a tool's figures it
// is only taken when every word is accounted for; anything else is Claude's.

import { MATERIALS, material, resolveSpec, sizeLabel, wallLabel, type MaterialId } from '../calc/materials';
import { calcSchedule } from '../calc/materials';
import { hasPhrase, lengthAt, numberAt, tokens } from './words';

export type SpecCommand = { material?: MaterialId; nps?: number; wall?: string; elbow?: 'LR' | 'SR' };

/** Words that say this is about the pipe's specs, and may be left over. */
const SPEC_FILLER = new Set([
  'spec', 'specs', 'specification', 'pipe', 'set', 'change', 'make', 'it', 'to', 'the', 'is', 'its', 'my', 'our', 'job', 'material',
  'grade', 'switch', 'use', 'using', 'go', 'with', 'a', 'an', 'and', 'of', 'on', 'we', 're', 'are', 'running', 'now', 'please',
  'project', 'line', 'type', 'wall', 'size', 'in', 'for', 'ok', 'okay', 'steel', 'tp', 'elbows', 'elbow', 'ells', 'ell', 'fittings',
]);

/** "schedule 40", "sch 80", "40s", "forty s", "standard", "double extra strong", "dr 11", "class 52". */
function wallAt(ws: readonly string[], i: number): { wall: string; next: number } | null {
  const w = ws[i]!;
  const word = (k: number) => ws[i + k];
  if (w === 'schedule' || w === 'sch' || w === 'skid' || w === 'sked') {
    const n = numberAt(ws, i + 1);
    if (!n || !Number.isInteger(n.value)) return null;
    const s = ws[n.next] === 's' ? 'S' : '';
    return { wall: `${n.value}${s}`, next: n.next + (s ? 1 : 0) };
  }
  const glued = /^(\d+)s$/.exec(w);
  if (glued) return { wall: `${glued[1]}S`, next: i + 1 };
  if (w === 'standard' || w === 'std') return { wall: 'STD', next: i + 1 + (word(1) === 'weight' || word(1) === 'wall' ? 1 : 0) };
  if (w === 'xxs' || (w === 'double' && word(1) === 'extra' && word(2) === 'strong')) return { wall: 'XXS', next: i + (w === 'xxs' ? 1 : 3) };
  if (w === 'xs' || (w === 'extra' && word(1) === 'strong')) return { wall: 'XS', next: i + (w === 'xs' ? 1 : 2) };
  if (w === 'dr' || w === 'sdr') {
    const n = numberAt(ws, i + 1);
    return n ? { wall: `DR${n.value}`, next: n.next } : null;
  }
  const dr = /^s?dr(\d+)$/.exec(w);
  if (dr) return { wall: `DR${dr[1]}`, next: i + 1 };
  if (w === 'class' && word(1) === '52') return { wall: 'TC52', next: i + 2 };
  if (w === 'pressure' && word(1) === 'class') return { wall: 'PC', next: i + 2 };
  // "40 s" said as a number then the letter.
  const n = numberAt(ws, i);
  if (n && Number.isInteger(n.value) && ws[n.next] === 's') return { wall: `${n.value}S`, next: n.next + 1 };
  return null;
}

/** All the material names, longest first, as word lists. */
const MATERIAL_NAMES = MATERIALS.flatMap((m) => m.words.map((w) => ({ id: m.id, words: w.split(' ') }))).sort(
  (a, b) => b.words.length - a.words.length,
);

/**
 * The specs said, or null when this is not a spec command or has words in it
 * that are not specs. A spec command names a material, a wall, or an elbow
 * radius; a size alone is not one (that is a figure for whatever is open).
 */
export function readSpecs(text: string): SpecCommand | null {
  const ws = tokens(text);
  if (!ws.length) return null;
  const used = new Array<boolean>(ws.length).fill(false);
  const take = (a: number, b: number) => {
    for (let k = a; k < b; k++) used[k] = true;
  };
  const out: SpecCommand = {};

  // Material: the longest name in it.
  for (const name of MATERIAL_NAMES) {
    const at = hasPhrase(ws, name.words);
    if (at >= 0 && !used.slice(at, at + name.words.length).some(Boolean)) {
      out.material = name.id;
      take(at, at + name.words.length);
      break;
    }
  }

  for (let i = 0; i < ws.length; i++) {
    if (used[i]) continue;
    const w = ws[i]!;
    if (!out.elbow && (w === 'long' || w === 'short') && ws[i + 1] === 'radius') {
      out.elbow = w === 'long' ? 'LR' : 'SR';
      take(i, i + 2);
      i += 1;
      continue;
    }
    if (!out.elbow && (w === 'lr' || w === 'sr')) {
      out.elbow = w === 'lr' ? 'LR' : 'SR';
      take(i, i + 1);
      continue;
    }
    if (!out.wall) {
      const wall = wallAt(ws, i);
      if (wall) {
        out.wall = wall.wall;
        take(i, wall.next);
        i = wall.next - 1;
        continue;
      }
    }
    if (out.nps === undefined && w === 'inch' && ws[i + 1] === 'and' && ws[i + 2] === 'a' && (ws[i + 3] === 'half' || ws[i + 3] === 'quarter')) {
      // "Inch and a half", "inch and a quarter": the trade's 1-1/2 and 1-1/4.
      out.nps = ws[i + 3] === 'half' ? 1.5 : 1.25;
      take(i, i + 4);
      i += 3;
      continue;
    }
    if (out.nps === undefined) {
      // A size is said with its unit: "half inch", "6 inch", "1-1/4 inch".
      const l = lengthAt(ws, i);
      if (l && l.explicit && l.inches > 0 && l.inches <= 48 && /^(inch|inches)$/.test(ws[l.next - 1] ?? '')) {
        out.nps = l.inches;
        take(i, l.next);
        i = l.next - 1;
        continue;
      }
    }
  }

  if (!out.material && !out.wall && !out.elbow) return null;
  // "2 inch stainless 40": a bare whole number with a material is its schedule.
  if (!out.wall && out.material) {
    for (let i = 0; i < ws.length; i++) {
      if (used[i] || !/^\d+$/.test(ws[i]!)) continue;
      out.wall = ws[i]!;
      take(i, i + 1);
      break;
    }
  }
  for (let i = 0; i < ws.length; i++) if (!used[i] && !SPEC_FILLER.has(ws[i]!)) return null;
  return out;
}

/** The specs as said back: '1/2" stainless 316L, 40S, long radius'. */
export function specsSaid(s: { nps: string; material: string; wall: string; elbow: 'LR' | 'SR' }): string {
  return `${s.nps} ${s.material}, ${s.wall}, ${s.elbow === 'LR' ? 'long radius' : 'short radius'}`;
}

/** A wall as said, in the material's own designation: "40" on stainless is 40S; "40S" on steel is 40. */
export function wallFor(walls: readonly string[], said: string): string | null {
  if (walls.includes(said)) return said;
  if (walls.includes(`${said}S`)) return `${said}S`;
  if (said.endsWith('S') && walls.includes(said.slice(0, -1))) return said.slice(0, -1);
  return null;
}

type Current = { material: MaterialId; defaultNps: number; wall: string; defaultKind: 'LR' | 'SR' };
type Patch = Current & { defaultSchedule: '10' | '40' | '80' };

/**
 * The settings a spec command leaves, and what to say back. What was not said
 * is kept; what cannot be had (a size the material does not come in, a wall it
 * does not have) is moved to the nearest that can, and said so.
 */
export function specPatch(cur: Current, cmd: SpecCommand): { patch: Patch; said: string; moved: string[] } {
  const m = material(cmd.material ?? cur.material);
  const moved: string[] = [];
  const wantNps = cmd.nps ?? cur.defaultNps;
  let wantWall = cmd.wall ? wallFor(m.walls, cmd.wall) : wallFor(m.walls, cur.wall);
  if (cmd.wall && !wantWall) moved.push(`${m.name} has no ${wallLabel(cmd.wall)}`);
  const r = resolveSpec(m.id, wantNps, wantWall ?? m.defaultWall);
  if (cmd.nps !== undefined && r.nps !== cmd.nps) moved.push(`${m.name} does not come in ${sizeLabel(cmd.nps)}`);
  if (wantWall && r.wall !== wantWall && cmd.wall) moved.push(`no ${wallLabel(wantWall)} at ${sizeLabel(r.nps)}`);
  wantWall = r.wall;
  const elbow = cmd.elbow ?? cur.defaultKind;
  const patch: Patch = { material: r.material, defaultNps: r.nps, wall: r.wall, defaultKind: elbow, defaultSchedule: calcSchedule(r.wall) };
  const said = specsSaid({ nps: sizeLabel(r.nps), material: m.name, wall: wallLabel(r.wall), elbow });
  return { patch, said: moved.length ? `${said}. (${moved.join('; ')}.)` : said, moved };
}
