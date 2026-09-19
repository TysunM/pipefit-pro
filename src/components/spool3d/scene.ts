// The drawing, worked out once
// ----------------------------
// A spool gets drawn twice: on the screen, in shaded pipe that reads as solid
// under a thumb, and on paper, as the line drawing a man actually builds from.
// Those are two different renderings of one drawing, and the difference between
// them is ink, not geometry.
//
// So the geometry lives here and nowhere else: what the pieces are, which of
// them is in front, where they cross, where the figures go, and which corner
// the compass can have. Both renderers read the same scene, which is the only
// way the sheet in a man's hand can be trusted to be the spool on his screen.

import { SpoolResult, Vec3, add, elbowCenterline, scale, sub } from '../../calc/spool';
import { Box, LabelWant, Placed, Seg, placeLabels, segmentHitsBox } from './dimension';
import {
  Camera,
  Crossing,
  LOST,
  Projected,
  Transform,
  fitView,
  polylineCrossings,
  projectedFraction,
} from './project';

export type ScenePiece =
  | {
      kind: 'run';
      depth: number;
      a: Projected;
      b: Projected;
      index: number;
      joints: [number, number];
      /**
       * Whether each end of this leg is a free end rather than a weld.
       *
       * The spool's two open ends are pipe cut off square, and a line drawing
       * has to close them or the leg reads as running on past the page. An end
       * that meets a fitting is closed by the fitting's own weld tick instead.
       */
      caps: [boolean, boolean];
    }
  | { kind: 'elbow'; depth: number; path: Projected[]; index: number; joints: [number, number] };

export const outline = (p: ScenePiece): Projected[] => (p.kind === 'run' ? [p.a, p.b] : p.path);

const joined = (a: ScenePiece, b: ScenePiece) =>
  a.joints[0] === b.joints[0] ||
  a.joints[0] === b.joints[1] ||
  a.joints[1] === b.joints[0] ||
  a.joints[1] === b.joints[1];

export type Scene = {
  /** The corners of the spool, on the page. */
  pts: Projected[];
  /** Page units per inch, which is what a leg's drawn length is worth. */
  scale: number;
  /** Far to near: everything before a piece in this list is behind it. */
  pieces: ScenePiece[];
  /** Per piece, where it crosses something behind it that it is not joined to. */
  breaks: Crossing[][];
  /** Per leg, whether it is square on to the viewer and has no length on the page. */
  collapsed: boolean[];
  /** Where the compass goes: the corner the spool has least business in. */
  gizmo: Box;
  /** The figures, placed clear of the pipe, each other, and the compass. */
  labels: Placed[];
  /** The mapping this scene was drawn with, so a drag can pin it and reuse it. */
  transform: Transform;
};

export type SceneText = {
  /** What goes against leg `index`: its length, then where it runs. */
  legText?: (index: number) => string[];
  /** What goes against elbow `index`: its angle, then the fitting it needs. */
  elbowText?: (index: number) => string[];
};

export type SceneOpts = {
  spool: SpoolResult;
  cam: Camera;
  width: number;
  height: number;
  /** Room round the drawing for the figures that hang off it. */
  pad: number;
  /** Drawn pipe width. Decides when a leg is short enough to read as end on. */
  od: number;
  /** A ceiling on the scale, for a drag that must not let the picture swell. */
  maxScale?: number;
  /**
   * Pin the drawing to a mapping taken earlier rather than fitting it again.
   *
   * A resize drag holds one: while a leg is being pulled, its drawn length has
   * to follow the finger, and it cannot do that if the scale is moving too.
   */
  hold?: Transform | null;
  gizmo?: { size: number; edge: number };
  /** Left out, the drawing carries no figures — which is what a drag wants. */
  text?: SceneText | null;
};

const EMPTY_BOX: Box = { x: 0, y: 0, w: 0, h: 0 };

export function buildScene(opts: SceneOpts): Scene {
  const { spool, cam, width, height, pad, od } = opts;
  const gizmoSize = opts.gizmo?.size ?? 0;
  const gizmoEdge = opts.gizmo?.edge ?? 0;

  if (!spool.valid || spool.points.length < 2)
    return {
      pts: [],
      scale: 1,
      pieces: [],
      breaks: [],
      collapsed: [],
      gizmo: EMPTY_BOX,
      labels: [],
      transform: opts.hold ?? { scale: 1, midX: 0, midY: 0, midDepth: 0 },
    };

  const fitted = fitView(spool.points, cam, width, height, pad, opts.maxScale ?? Infinity, opts.hold);
  const pts = spool.points.map(fitted.map);

  const pieces: ScenePiece[] = [];
  const collapsed = spool.runs.map((r) => projectedFraction(r.direction, cam) < LOST);

  // Legs are drawn from where the pipe actually starts to where it actually
  // stops, a takeoff short of each corner it turns at, because that is where
  // the fitting takes over. A leg too short for its own takeoffs is a spool
  // that cannot be built; it draws as a stub rather than inside out.
  spool.runs.forEach((r, i) => {
    const half = r.centerToCenter / 2;
    const a = fitted.map(add(r.from, scale(r.direction, Math.min(r.takeoffStart, half))));
    const b = fitted.map(sub(r.to, scale(r.direction, Math.min(r.takeoffEnd, half))));
    pieces.push({
      kind: 'run',
      depth: (a.depth + b.depth) / 2,
      a,
      b,
      index: i,
      joints: [i, i + 1],
      caps: [r.takeoffStart <= 0, r.takeoffEnd <= 0],
    });
  });

  // And the corner itself is drawn as the fitting that fills it: an arc on the
  // bend radius, not a ball on a stick.
  spool.elbows.forEach((e, i) => {
    const into = spool.runs[e.index - 1];
    const outOf = spool.runs[e.index];
    if (!into || !outOf) return;
    const path = elbowCenterline(spool.points[e.index]!, into.direction, outOf.direction, e.takeoff).map(fitted.map);
    const depth = path.reduce((m, q) => m + q.depth, 0) / path.length;
    pieces.push({ kind: 'elbow', depth, path, index: i, joints: [e.index, e.index] });
  });

  pieces.sort((p, q) => p.depth - q.depth);

  // Painted far to near, so everything before a piece in this list is behind
  // it. Where it crosses one of those and is not joined to it, it breaks it.
  const breaks: Crossing[][] = pieces.map((near, i) => {
    const marks: Crossing[] = [];
    for (let j = 0; j < i; j += 1) {
      const far = pieces[j]!;
      if (joined(near, far)) continue;
      marks.push(...polylineCrossings(outline(near), outline(far)));
    }
    return marks;
  });

  const pipes: Seg[] = [];
  for (let i = 0; i < pts.length - 1; i += 1)
    pipes.push({ ax: pts[i]!.x, ay: pts[i]!.y, bx: pts[i + 1]!.x, by: pts[i + 1]!.y });

  // The compass goes in whichever corner the spool has least business in.
  // Fixed in one corner it lands on the drawing about a quarter of the time,
  // and a compass on top of a leg costs more than it gives.
  let gizmo = EMPTY_BOX;
  if (gizmoSize > 0) {
    const spots: Box[] = [
      { x: width - gizmoSize - gizmoEdge, y: height - gizmoSize - gizmoEdge, w: gizmoSize, h: gizmoSize },
      { x: gizmoEdge, y: height - gizmoSize - gizmoEdge, w: gizmoSize, h: gizmoSize },
      { x: width - gizmoSize - gizmoEdge, y: gizmoEdge, w: gizmoSize, h: gizmoSize },
      { x: gizmoEdge, y: gizmoEdge, w: gizmoSize, h: gizmoSize },
    ];
    // Ties go to the first spot, which is the corner a drawing usually has it in.
    let bestHit = Infinity;
    gizmo = spots[0]!;
    for (const spot of spots) {
      const hit = pipes.filter((s) => segmentHitsBox(s, spot)).length;
      if (hit < bestHit) {
        bestHit = hit;
        gizmo = spot;
      }
    }
  }

  const labels = opts.text
    ? placeLabels(
        legendWants(spool, pts, collapsed, od, opts.text),
        pipes,
        width,
        height,
        2,
        gizmoSize > 0 ? [gizmo] : []
      )
    : [];

  return { pts, scale: fitted.scale, pieces, breaks, collapsed, gizmo, labels, transform: fitted.transform };
}

/**
 * What the drawing has to say, and roughly where.
 *
 * A leg square on to the viewer has no length on the page, so its dimension is
 * the only thing that says how long it is — which is how a riser has been drawn
 * on a plan since drawings were drawn.
 */
function legendWants(
  spool: SpoolResult,
  pts: Projected[],
  collapsed: boolean[],
  od: number,
  text: SceneText
): LabelWant[] {
  const wants: LabelWant[] = [];

  spool.runs.forEach((r, i) => {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    wants.push({
      key: `leg${i}`,
      ax: (a.x + b.x) / 2,
      ay: (a.y + b.y) / 2,
      ux: l > 1e-6 ? (b.x - a.x) / l : 1,
      uy: l > 1e-6 ? (b.y - a.y) / l : 0,
      collapsed: (collapsed[i] ?? false) || l < od,
      lines: text.legText?.(i) ?? [`${r.centerToCenter}`],
      // The long legs are the ones somebody is going to cut, so on a crowded
      // drawing they get the obvious places and the short ones take what is left.
      weight: 1000 + r.centerToCenter,
      tone: 'leg',
    });
  });

  spool.elbows.forEach((e, i) => {
    const at = pts[e.index];
    if (!at) return;
    const into = pts[e.index - 1];
    const outOf = pts[e.index + 1];
    // Off the outside of the turn: away from both legs at once.
    let ux = 1;
    let uy = 0;
    if (into && outOf) {
      const vx = at.x - (into.x + outOf.x) / 2;
      const vy = at.y - (into.y + outOf.y) / 2;
      const l = Math.hypot(vx, vy);
      if (l > 1e-6) {
        ux = -vy / l;
        uy = vx / l;
      }
    }
    wants.push({
      key: `elb${i}`,
      ax: at.x,
      ay: at.y,
      ux,
      uy,
      collapsed: false,
      lines: text.elbowText?.(i) ?? [`${e.angle.toFixed(0)}°`],
      weight: 10 + i,
      tone: 'elbow',
    });
  });

  return wants;
}

// ------------------------------------------------- paths, shared by both inks

/** An open polyline through projected points. */
export const polyline = (ps: Projected[]): string =>
  ps.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(' ');

/**
 * The two sides of a curved tube.
 *
 * A bent pipe's outline is its centreline pushed out half a diameter each way,
 * along the normal at each point rather than one normal for the whole fitting,
 * or the outline would cross itself round the inside of the bend.
 */
export function tubeSides(ps: Projected[], half: number): [string, string] {
  if (ps.length < 2) return ['', ''];
  const left: Projected[] = [];
  const right: Projected[] = [];
  for (let i = 0; i < ps.length; i += 1) {
    const a = ps[Math.max(0, i - 1)]!;
    const b = ps[Math.min(ps.length - 1, i + 1)]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const nx = (-dy / l) * half;
    const ny = (dx / l) * half;
    const at = ps[i]!;
    left.push({ x: at.x + nx, y: at.y + ny, depth: at.depth });
    right.push({ x: at.x - nx, y: at.y - ny, depth: at.depth });
  }
  return [polyline(left), polyline(right)];
}

/** The perpendicular of a straight run, half a diameter long. */
export function runNormal(p: Extract<ScenePiece, { kind: 'run' }>, half: number): { x: number; y: number } {
  const dx = p.b.x - p.a.x;
  const dy = p.b.y - p.a.y;
  const l = Math.hypot(dx, dy) || 1;
  return { x: (-dy / l) * half, y: (dx / l) * half };
}

/** A straight run's two sides, as one path with a gap between them. */
export function runSides(p: Extract<ScenePiece, { kind: 'run' }>, half: number): string {
  const n = runNormal(p, half);
  return `M${p.a.x + n.x},${p.a.y + n.y} L${p.b.x + n.x},${p.b.y + n.y} M${p.b.x - n.x},${p.b.y - n.y} L${p.a.x - n.x},${p.a.y - n.y}`;
}

/** A line across a run's end, square to it: pipe cut off, and closed. */
export function runCap(
  p: Extract<ScenePiece, { kind: 'run' }>,
  half: number,
  at: 0 | 1
): { x1: number; y1: number; x2: number; y2: number } {
  const n = runNormal(p, half);
  const q = at === 0 ? p.a : p.b;
  return { x1: q.x + n.x, y1: q.y + n.y, x2: q.x - n.x, y2: q.y - n.y };
}

/** Where a weld tick goes across a fitting's end, and which way it runs. */
export function weldTick(
  ps: Projected[],
  half: number,
  at: number
): { x1: number; y1: number; x2: number; y2: number } | null {
  const a = ps[Math.max(0, at - 1)]!;
  const b = ps[Math.min(ps.length - 1, at + 1)]!;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = Math.hypot(dx, dy);
  if (l < 1e-6) return null;
  const nx = (-dy / l) * half;
  const ny = (dx / l) * half;
  const q = ps[at]!;
  return { x1: q.x + nx, y1: q.y + ny, x2: q.x - nx, y2: q.y - ny };
}
