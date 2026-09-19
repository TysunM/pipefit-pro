import { writeFileSync } from 'node:fs';
import { solveSpool } from '../calc/spool';
import { solveDirections, dirLabel, dirShort, fittingFor } from '../calc/direction';
import { planCuts } from '../calc/cutList';
import { buildSpoolSheet, SheetSource } from '../print/spoolSheet';
import { spoolSheetHtml } from '../print/sheet';
import { esc, spoolSvg } from '../print/spoolSvg';
import { buildScene } from '../components/spool3d/scene';
import { ISO_VIEW, PLAN_VIEW } from '../components/spool3d/project';

const DIRS = [
  { bearing: 90, slope: 0 },
  { bearing: 0, slope: 90 },
  { bearing: 0, slope: 0 },
  { bearing: 315, slope: -30 },
];
const LENGTHS = [36, 24, 30, 41.5];

function spoolOf(count = 3) {
  const solved = solveDirections(
    DIRS.slice(0, count).map((d, i) => ({ id: `l${i}`, length: LENGTHS[i]!, dir: d }))
  );
  if (!solved.ok) throw new Error(solved.error);
  return solveSpool({ legs: solved.legs, start: solved.start, nps: 2, kind: 'LR', schedule: '40', gap: 0.09375 });
}

const num = (v: number) => (Number.isFinite(v) ? `${v.toFixed(2)} inch` : '—');
const fig = (v: number) => (Number.isFinite(v) ? `${Math.round(v * 100) / 100}"` : '—');

function sourceOf(count = 3, over: Partial<SheetSource> = {}): SheetSource {
  const spool = spoolOf(count);
  const cuts = planCuts(
    spool.runs.map((r, i) => ({ id: `leg${i}`, label: `Leg ${i + 1}`, tag: String(i + 1), length: r.cutLength })),
    240,
    0.125
  );
  return {
    name: 'SP-104 RISER',
    place: 'Pump house, east wall',
    spec: '2" LR · SCH 40 · Gap 3/32"',
    dateLine: 'Printed 19 Sep 2026',
    spool,
    cuts,
    text: {
      legText: (i) => [fig(spool.runs[i]!.centerToCenter), dirShort(DIRS[i]!)],
      elbowText: (i) => {
        const e = spool.elbows[i]!;
        return fittingFor(e.angle).stock ? [`${Math.round(e.angle)}°`] : [`${Math.round(e.angle)}°`, 'cut to suit'];
      },
    },
    legDir: (i) => dirLabel(DIRS[i]!),
    length: num,
    angle: (d) => `${d.toFixed(1)}°`,
    fitting: (d) => fittingFor(d).label,
    footer: 'Lengths are centre-to-centre. Each cut deducts the takeoff at both ends plus the weld gap.',
    ...over,
  };
}

describe('the sheet says everything the bench needs', () => {
  const html = buildSpoolSheet(sourceOf(4));

  test('it is one self-contained page, with its own style and no outside fetches', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('@page { size: A4');
    // Nothing to load: a sheet printed in a site office has no network. The
    // only URL on the page is the SVG namespace, which is a name, not a fetch.
    expect(html).not.toMatch(/<(script|link|img)\b/);
    expect(html).not.toMatch(/\s(?:src|href)=/);
    expect(html.match(/https?:\/\//g) ?? []).toEqual(
      Array.from({ length: 3 }, () => 'http://')
    );
  });

  test('the title block names the spool, where it goes and the pipe', () => {
    expect(html).toContain('SP-104 RISER');
    expect(html).toContain('Pump house, east wall');
    expect(html).toContain('SCH 40');
    expect(html).toContain('Printed 19 Sep 2026');
  });

  test('three views: an isometric across the top, then a plan and an elevation', () => {
    const titles = [...html.matchAll(/<h3>([^<]+)<\/h3>/g)].map((m) => m[1]!);
    expect(titles).toHaveLength(3);
    expect(titles[0]).toContain('Isometric');
    expect(titles[1]).toContain('Plan');
    expect(titles[2]).toContain('Elevation');
    expect(html.match(/class="main"/g)).toHaveLength(1);
    expect(html.match(/class="view"/g)).toHaveLength(3);
  });

  test('every leg is on the cut list with its cut, and every elbow on the schedule', () => {
    const spool = spoolOf(4);
    for (const r of spool.runs) expect(html).toContain(num(r.cutLength));
    for (const e of spool.elbows) expect(html).toContain(num(e.throatArc));
    expect(html).toContain('Cut list');
    expect(html).toContain('Elbows, in order along the spool');
    expect(html).toContain('What to pull off the rack');
  });

  test('every view carries a figure for every leg and every elbow', () => {
    const spool = spoolOf(4);
    const views = [...html.matchAll(/<div class="view[^"]*"><h3>[^<]+<\/h3>(.*?)<\/svg>/gs)].map((m) => m[1]!);
    expect(views).toHaveLength(3);
    // The inch mark is escaped on the way in, so the figure on the page is
    // `36&quot;`. Searching for the raw form finds numeric attributes instead,
    // which is how this test first fooled itself.
    const wanted = spool.runs.map((r) => esc(fig(r.centerToCenter)));
    for (const svg of views) {
      const figures = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]!);
      for (const w of wanted) expect(figures).toContain(w);
      // Every elbow's angle is on it too, and the compass triad.
      expect(figures.filter((f) => f.endsWith('°'))).toHaveLength(spool.elbows.length);
      for (const arm of ['E', 'UP', 'N']) expect(figures).toContain(arm);
    }
  });

  test('a turn that is not a stock elbow is named as one to cut', () => {
    // The fourth leg comes off on an odd angle on purpose.
    expect(html).toContain('cut to suit');
  });

  test('a spool that cannot be built says so instead of drawing a lie', () => {
    const src = sourceOf(3, { problem: 'Leg 2 is too short for its fittings.' });
    const bad = buildSpoolSheet(src);
    expect(bad).toContain('class="problem"');
    expect(bad).toContain('Leg 2 is too short for its fittings.');
  });

  test('an empty place leaves no empty line behind it', () => {
    expect(buildSpoolSheet(sourceOf(3, { place: '' }))).not.toContain('class="where"');
  });
});

describe('nothing typed into the app can break the page', () => {
  test('a name with markup in it is escaped everywhere it appears', () => {
    const nasty = 'Riser <3" & up</h1><script>alert(1)</script>';
    const html = buildSpoolSheet(sourceOf(3, { name: nasty, place: nasty }));
    expect(html).not.toContain('<script>');
    // The injected tags arrive as text, not as markup.
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toContain('up</h1>');
    expect(html).toContain('Riser &lt;3&quot; &amp; up&lt;/h1&gt;');
    // And it is still the title of the page.
    expect(html).toMatch(/<title>Riser &lt;3&quot; &amp; up/);
  });

  test('a figure with markup in it is escaped inside the drawing', () => {
    const scene = buildScene({
      spool: spoolOf(3),
      cam: ISO_VIEW,
      width: 400,
      height: 300,
      pad: 30,
      od: 14,
      text: { legText: () => ['</svg><script>x</script>'], elbowText: () => ['&'] },
    });
    const svg = spoolSvg(scene, { width: 400, height: 300, od: 14, cam: ISO_VIEW });
    expect(svg).not.toContain('<script>');
    expect(svg.match(/<\/svg>/g)).toHaveLength(1);
    expect(svg).toContain('&amp;');
  });

  test('the escaper covers every character that means something in markup', () => {
    expect(esc(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
    expect(esc('plain')).toBe('plain');
  });

  test('a table with no rows still renders its heading rather than collapsing', () => {
    const html = spoolSheetHtml({
      name: 'X',
      place: '',
      spec: 's',
      dateLine: 'd',
      totals: [],
      views: [],
      tables: [{ title: 'Empty', head: ['A', 'B'], rows: [] }],
      footer: 'f',
    });
    expect(html).toContain('Empty');
    expect(html).toContain('<tbody></tbody>');
  });
});

describe('the drawing on paper is the drawing on screen', () => {
  test('both inks read the same scene, so the pieces and figures match', () => {
    const spool = spoolOf(4);
    const opts = { spool, cam: ISO_VIEW, width: 560, height: 330, pad: 34, od: 15 };
    const text = { legText: (i: number) => [fig(spool.runs[i]!.centerToCenter)], elbowText: () => ['90°'] };
    const a = buildScene({ ...opts, text });
    const b = buildScene({ ...opts, text });
    expect(b.pieces.map((p) => p.depth)).toEqual(a.pieces.map((p) => p.depth));
    expect(b.labels.map((l) => [l.key, l.x, l.y])).toEqual(a.labels.map((l) => [l.key, l.x, l.y]));
    expect(a.pieces).toHaveLength(spool.runs.length + spool.elbows.length);
  });

  test('a view with no figures asked for carries none, and still places the compass', () => {
    const scene = buildScene({
      spool: spoolOf(3),
      cam: PLAN_VIEW.cam,
      width: 400,
      height: 300,
      pad: 30,
      od: 14,
      gizmo: { size: 76, edge: 5 },
      text: null,
    });
    expect(scene.labels).toEqual([]);
    expect(scene.gizmo.w).toBe(76);
  });

  test('an invalid spool draws nothing rather than drawing nonsense', () => {
    const bad = solveSpool({ legs: [], nps: 2, kind: 'LR', schedule: '40', gap: 0 });
    const scene = buildScene({ spool: bad, cam: ISO_VIEW, width: 400, height: 300, pad: 30, od: 14, text: {} });
    expect(scene.pieces).toEqual([]);
    expect(scene.labels).toEqual([]);
    const svg = spoolSvg(scene, { width: 400, height: 300, od: 14, cam: ISO_VIEW });
    expect(svg).toContain('</svg>');
  });

  test('a riser in a plan draws as a bore, not as a line', () => {
    const scene = buildScene({
      spool: spoolOf(3),
      cam: PLAN_VIEW.cam,
      width: 400,
      height: 300,
      pad: 30,
      od: 14,
      text: {},
    });
    // Leg 2 runs straight up, so from overhead it has no length at all.
    expect(scene.collapsed[1]).toBe(true);
    const svg = spoolSvg(scene, { width: 400, height: 300, od: 14, cam: PLAN_VIEW.cam });
    expect(svg).toContain('<circle');
  });
});

// Writing the sheet out is how it gets looked at on paper before it ships.
// Off unless asked for, so an ordinary test run touches no files.
if (process.env.SHEET_OUT) {
  test('writes a sheet for inspection', () => {
    writeFileSync(process.env.SHEET_OUT!, buildSpoolSheet(sourceOf(4)));
    expect(true).toBe(true);
  });
}
