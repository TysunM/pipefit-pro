// Assembling the sheet for one spool
// ----------------------------------
// Which views go on it, what the tables say, and in what order. Three views is
// the convention and it is the right one: the isometric says what the spool is,
// the plan and the elevation are what a tape reads off.
//
// The two square-on views are chosen the same way the opening corner is — a
// spool can be unreadable from one side and obvious from another, and a sheet
// is printed once, so it gets the best of each.

import { SpoolResult } from '../calc/spool';
import { CutPlan } from '../calc/cutList';
import { ELEVATIONS, NamedView, PLAN_VIEW, bestCorner, viewScore } from '../components/spool3d/project';
import { SceneText, buildScene } from '../components/spool3d/scene';
import { SheetTable, SheetView, spoolSheetHtml } from './sheet';
import { spoolSvg } from './spoolSvg';

/** Big enough that a 90 elbow's arc reads, small enough that three views fit. */
const ISO = { width: 480, height: 466, od: 15, pad: 34 };
const SQUARE = { width: 300, height: 215, od: 11, pad: 26 };

export type SheetSource = {
  name: string;
  place: string;
  /** The pipe in one line: size, radius, schedule, gap. */
  spec: string;
  dateLine: string;
  spool: SpoolResult;
  cuts: CutPlan;
  /** The same figures the screen puts on the drawing. */
  text: SceneText;
  /** Where leg `i` runs, in words. */
  legDir: (i: number) => string;
  /** A length with its unit, for a table cell. */
  length: (inches: number) => string;
  /** An angle with its unit. */
  angle: (deg: number) => string;
  /** What fitting a bend needs. */
  fitting: (deg: number) => string;
  footer: string;
  /** Said under the title when the spool cannot be built as drawn. */
  problem?: string;
};

/** The square-on view of a given set that shows this spool best. */
function clearest(views: readonly NamedView[], spool: SpoolResult): NamedView {
  let best = views[0]!;
  let score = Infinity;
  for (const v of views) {
    const s = viewScore(spool.points, v.cam);
    if (s < score - 1e-9) {
      score = s;
      best = v;
    }
  }
  return best;
}

function view(spool: SpoolResult, v: NamedView, text: SceneText, box: typeof ISO, slot: 'main' | 'side'): SheetView {
  const scene = buildScene({
    spool,
    cam: v.cam,
    width: box.width,
    height: box.height,
    pad: box.pad,
    od: box.od,
    gizmo: { size: slot === 'main' ? 76 : 62, edge: 5 },
    text,
  });
  return {
    title: v.title,
    svg: spoolSvg(scene, { width: box.width, height: box.height, od: box.od, cam: v.cam }),
    slot,
  };
}

function cutTable(src: SheetSource): SheetTable {
  const { spool, length, legDir, angle } = src;
  const rows = spool.runs.map((r, i) => [
    String(i + 1),
    legDir(i),
    length(r.centerToCenter),
    length(r.takeoffStart + r.takeoffEnd),
    length(r.cutLength),
  ]);
  return {
    title: 'Cut list',
    head: ['Leg', 'Runs', 'Centre to centre', 'Takeouts', 'Cut to'],
    rows,
    right: [2, 3, 4],
    note: `Total pipe in the job ${length(spool.totalCut)}. Centre to centre ${length(
      spool.totalCenterToCenter
    )} over ${spool.runs.length} leg${spool.runs.length === 1 ? '' : 's'} and ${spool.elbows.length} elbow${
      spool.elbows.length === 1 ? '' : 's'
    }.${spool.elbows.length ? ` Turns: ${spool.elbows.map((e) => angle(e.angle)).join(', ')}.` : ''}`,
  };
}

function elbowTable(src: SheetSource): SheetTable | null {
  const { spool, length, angle, fitting } = src;
  if (!spool.elbows.length) return null;
  return {
    title: 'Elbows, in order along the spool',
    head: ['At', 'Turn', 'Fitting', 'Takeoff', 'Throat arc', 'Back arc'],
    rows: spool.elbows.map((e) => [
      `Leg ${e.legIndex} → ${e.legIndex + 1}`,
      angle(e.angle),
      fitting(e.angle),
      length(e.takeoff),
      length(e.throatArc),
      length(e.backArc),
    ]),
    right: [1, 3, 4, 5],
  };
}

function stickTable(src: SheetSource): SheetTable | null {
  const { cuts, length } = src;
  if (!cuts.ok) return { title: 'What to pull off the rack', head: ['Problem'], rows: [[cuts.error]] };
  return {
    title: 'What to pull off the rack',
    head: ['Stick', 'Cut from it', 'Left on the end'],
    rows: cuts.sticks.map((s) => [
      String(s.number),
      s.pieces.map((p) => `${p.label} ${length(p.length)}`).join(', '),
      s.drop < 0.01 ? 'nothing' : length(s.drop),
    ]),
    right: [2],
    note:
      `Pull ${cuts.count} stick${cuts.count === 1 ? '' : 's'}. Longest drop ${length(cuts.longestDrop)}. ` +
      `${length(cuts.kerfLoss)} goes to the saw.` +
      (cuts.best ? '' : ' This is a good packing rather than a proven best one.'),
  };
}

/**
 * The whole sheet for one spool.
 *
 * An isometric across the top, then a plan and an elevation side by side — and
 * every figure the bench needs under them, so nothing on this page has to be
 * looked up anywhere else.
 */
export function buildSpoolSheet(src: SheetSource): string {
  const { spool, text } = src;
  const views: SheetView[] = spool.valid
    ? [
        view(spool, bestCorner(spool.points), text, ISO, 'main'),
        view(spool, PLAN_VIEW, text, SQUARE, 'side'),
        view(spool, clearest(ELEVATIONS, spool), text, SQUARE, 'side'),
      ]
    : [];

  const tables = [cutTable(src), elbowTable(src), stickTable(src)].filter((x): x is SheetTable => x !== null);

  return spoolSheetHtml({
    name: src.name,
    place: src.place,
    spec: src.spec,
    dateLine: src.dateLine,
    totals: [
      { label: 'Total pipe', value: src.length(spool.totalCut) },
      { label: 'Centre to centre', value: src.length(spool.totalCenterToCenter) },
      { label: 'Legs', value: String(spool.runs.length) },
      { label: 'Elbows', value: String(spool.elbows.length) },
      { label: 'Sticks to pull', value: src.cuts.ok ? String(src.cuts.count) : '—' },
    ],
    views,
    tables,
    footer: src.footer,
    problem: src.problem,
  });
}
