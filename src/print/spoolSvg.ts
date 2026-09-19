// The spool as a line drawing
// ---------------------------
// The screen draws the spool in shaded steel, which reads as solid under a
// thumb and is the right ink for a phone. Paper wants the opposite: no fills,
// no gradients, no haze — two hairlines for the pipe, a break where something
// passes behind, a tick at every weld, and the figures in plain black. That is
// what a shop printer can hold and what a man can read in bad light.
//
// The geometry is not re-derived here. It comes from the same scene the screen
// draws, so the sheet in a man's hand is the drawing he was looking at.

import { Vec3 } from '../calc/spool';
import { Scene, ScenePiece, polyline, runCap, runNormal, runSides, tubeSides, weldTick } from '../components/spool3d/scene';
import { Camera, Projected, fitProjection, project } from '../components/spool3d/project';

/** Everything on the sheet is one of these weights, and nothing else. */
const INK = '#000000';
const PAPER = '#FFFFFF';
const HAIR = 0.7;
const FIGURE = 10.5;
const SUB = 8.5;

export const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const n = (v: number): string => (Number.isFinite(v) ? v.toFixed(2) : '0');

/**
 * A break across the piece behind, where the one in front crosses it.
 *
 * Drawn in the paper colour, along the near piece, reaching far enough to
 * clear the width of the one behind — its own width divided by the sine of the
 * angle they meet at. Shallow crossings are capped rather than run off to a
 * break the length of the drawing.
 */
function breaks(scene: Scene, i: number, od: number): string {
  return (scene.breaks[i] ?? [])
    .map((c) => {
      const reach = (od + 5) / 2 / Math.max(c.sin, 0.3);
      return `<line x1="${n(c.x - c.ax * reach)}" y1="${n(c.y - c.ay * reach)}" x2="${n(c.x + c.ax * reach)}" y2="${n(
        c.y + c.ay * reach
      )}" stroke="${PAPER}" stroke-width="${n(od + 5)}" stroke-linecap="butt" />`;
    })
    .join('');
}

function piecePaths(p: ScenePiece, od: number): string {
  const half = od / 2;
  if (p.kind === 'run') {
    const l = Math.hypot(p.b.x - p.a.x, p.b.y - p.a.y);
    // A leg square on to the viewer is a bore looked down, not a line.
    if (l < od * 0.9) {
      const cx = (p.a.x + p.b.x) / 2;
      const cy = (p.a.y + p.b.y) / 2;
      return (
        `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(half)}" fill="${PAPER}" stroke="${INK}" stroke-width="${HAIR}" />` +
        `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(Math.max(0.6, half - 2.4))}" fill="none" stroke="${INK}" stroke-width="${HAIR * 0.8}" />`
      );
    }
    const nrm = runNormal(p, half);
    // The body is filled in paper so a piece in front hides what it covers,
    // then the two rails are drawn over it.
    const body =
      `<path d="M${n(p.a.x + nrm.x)},${n(p.a.y + nrm.y)} L${n(p.b.x + nrm.x)},${n(p.b.y + nrm.y)} ` +
      `L${n(p.b.x - nrm.x)},${n(p.b.y - nrm.y)} L${n(p.a.x - nrm.x)},${n(p.a.y - nrm.y)} Z" fill="${PAPER}" stroke="none" />`;
    // A free end is pipe cut off square, and gets closed. An end that meets a
    // fitting is closed by the fitting's own weld tick.
    const caps = ([0, 1] as const)
      .filter((at) => p.caps[at])
      .map((at) => {
        const c = runCap(p, half, at);
        return `<line x1="${n(c.x1)}" y1="${n(c.y1)}" x2="${n(c.x2)}" y2="${n(c.y2)}" stroke="${INK}" stroke-width="${HAIR}" />`;
      })
      .join('');
    return `${body}<path d="${runSides(p, half)}" fill="none" stroke="${INK}" stroke-width="${HAIR}" />${caps}`;
  }

  const [left, right] = tubeSides(p.path, half);
  const spine = polyline(p.path);
  const welds = [0, p.path.length - 1]
    .map((at) => weldTick(p.path, half, at))
    .filter((w): w is NonNullable<typeof w> => w !== null)
    .map(
      (w) =>
        `<line x1="${n(w.x1)}" y1="${n(w.y1)}" x2="${n(w.x2)}" y2="${n(w.y2)}" stroke="${INK}" stroke-width="${HAIR}" />`
    )
    .join('');
  return (
    `<path d="${spine}" fill="none" stroke="${PAPER}" stroke-width="${n(od)}" stroke-linecap="butt" />` +
    `<path d="${left}" fill="none" stroke="${INK}" stroke-width="${HAIR}" stroke-linejoin="round" />` +
    `<path d="${right}" fill="none" stroke="${INK}" stroke-width="${HAIR}" stroke-linejoin="round" />` +
    welds
  );
}

/** The compass triad, in the corner the scene set aside for it. */
function compass(cam: Camera, box: { x: number; y: number; w: number; h: number }): string {
  if (box.w <= 0) return '';
  const size = Math.min(box.w, box.h);
  const raw = [
    project({ x: 0, y: 0, z: 0 }, cam),
    project({ x: 1, y: 0, z: 0 }, cam),
    project({ x: 0, y: 1, z: 0 }, cam),
    project({ x: 0, y: 0, z: 1 }, cam),
  ];
  const map = fitProjection(raw, size, size, size * 0.22);
  const [O, X, Y, Z] = raw.map(map) as Projected[];
  const arms: [Projected, string, [number, number]][] = [
    [X!, 'E', [1, 0.6]],
    [Y!, 'UP', [0, -1]],
    [Z!, 'N', [-1, 0.6]],
  ];
  const parts = arms
    .map(([end, label, away]) => {
      const dx = end.x - O!.x;
      const dy = end.y - O!.y;
      const l = Math.hypot(dx, dy);
      // An axis square on to the viewer has no arm to draw, and gets the same
      // treatment the pipe does: a dot, with its name set off it.
      if (l < size * 0.06)
        return (
          `<circle cx="${n(O!.x)}" cy="${n(O!.y)}" r="1.6" fill="${INK}" />` +
          `<text x="${n(O!.x + away[0] * 10)}" y="${n(O!.y + away[1] * 10)}" font-size="${SUB}" font-weight="700" text-anchor="middle">${label}</text>`
        );
      return (
        `<line x1="${n(O!.x)}" y1="${n(O!.y)}" x2="${n(end.x)}" y2="${n(end.y)}" stroke="${INK}" stroke-width="${HAIR * 1.6}" />` +
        `<text x="${n(end.x + (dx / l) * 5)}" y="${n(end.y + (dy / l) * 5 + 3)}" font-size="${SUB}" font-weight="700" text-anchor="middle">${label}</text>`
      );
    })
    .join('');
  return `<g transform="translate(${n(box.x)} ${n(box.y)})">${parts}</g>`;
}

/** The figures, each already placed clear of the pipe and of each other. */
function figures(scene: Scene): string {
  return scene.labels
    .map((l) => {
      const leader = l.leader
        ? `<line x1="${n(l.ax)}" y1="${n(l.ay)}" x2="${n(l.x)}" y2="${n(l.y)}" stroke="${INK}" stroke-width="${HAIR * 0.7}" stroke-dasharray="2 2" />`
        : '';
      // A backing in the paper colour, so a figure that had to fall back onto
      // the iron is still legible. On white paper it is invisible elsewhere.
      const pad = `<rect x="${n(l.box.x)}" y="${n(l.box.y)}" width="${n(l.box.w)}" height="${n(
        l.box.h
      )}" fill="${PAPER}" stroke="none" />`;
      const lines = l.lines
        .map(
          (line, k) =>
            `<text x="${n(l.x)}" y="${n(l.box.y + 2 + 8.5 + k * 11)}" font-size="${k === 0 ? FIGURE : SUB}" font-weight="${
              k === 0 ? 700 : 500
            }" text-anchor="middle">${esc(line)}</text>`
        )
        .join('');
      return `${leader}${pad}${lines}`;
    })
    .join('');
}

export type SvgOpts = {
  width: number;
  height: number;
  /** Drawn pipe width in page units. */
  od: number;
  /** The camera the scene was built with, for the compass. */
  cam: Camera;
  /** Ruled round the drawing, the way a view on a sheet is. */
  frame?: boolean;
};

/**
 * One view of a spool, as standalone SVG markup.
 *
 * Painted far to near, exactly as the screen paints it: each piece breaks
 * whatever it crosses behind it before it is drawn, so the drawing says which
 * pipe is in front without anybody having to work it out.
 */
export function spoolSvg(scene: Scene, opts: SvgOpts): string {
  const { width, height, od, cam } = opts;
  const body = scene.pieces.map((p, i) => `${breaks(scene, i, od)}${piecePaths(p, od)}`).join('');
  const frame = opts.frame
    ? `<rect x="0.5" y="0.5" width="${n(width - 1)}" height="${n(height - 1)}" fill="none" stroke="${INK}" stroke-width="${HAIR * 0.6}" />`
    : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(width)} ${n(height)}" width="100%" ` +
    `style="display:block" font-family="Helvetica, Arial, sans-serif" fill="${INK}">` +
    `<rect width="${n(width)}" height="${n(height)}" fill="${PAPER}" />` +
    frame +
    body +
    figures(scene) +
    compass(cam, scene.gizmo) +
    '</svg>'
  );
}

/** The world axes, for a caller that wants the triad without a whole scene. */
export const AXES: readonly Vec3[] = [
  { x: 1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: 0, z: 1 },
];
