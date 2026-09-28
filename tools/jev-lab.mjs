// Jev lab
// -------
// How well smart fill actually does, measured, before anyone trusts it with a
// heat record — and whether Jev can fix the handbook search, which today finds
// nothing for most things a fitter would type.
//
//   TYPESAFE_API_KEY in the shell, or in .env at the repo root (gitignored; never in chat)
//   npx --yes tsx tools/jev-lab.mjs              both experiments
//   npx --yes tsx tools/jev-lab.mjs heat         one of them
//   npx --yes tsx tools/jev-lab.mjs --dry        no calls: the scanner baseline and request sizes only
//
// It runs the app's own code — the scanner, the questions smart fill asks, the
// way answers are read — against text with known answers, then prints what
// was right, what was wrong and what was left blank at every confidence
// threshold. Everything it sent and got back goes to tools/.jev-lab/ (gitignored),
// minus the key. The whole run is a few hundred thousand input tokens.

import { mkdirSync, writeFileSync } from 'node:fs';
import { JEV_MODEL, OFFER_AT, heatRequest, readHeatAnswers } from '../src/ai/heatFill';
import { BEST_AT, handbookRequest, readHandbookAnswer } from '../src/ai/handbookPick';
import { scanForHeats } from '../src/calc/heatScan';
import { normaliseHeat } from '../src/calc/heat';
import { REFERENCE_TABLES, searchReference } from '../src/calc/reference';

// The key can sit in a .env at the repo root (gitignored) instead of the
// shell. A key already exported wins over the file.
for (const f of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(f);
  } catch {
    // No such file: the shell's environment is all there is.
  }
}

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const ONLY = args.find((a) => a === 'heat' || a === 'handbook');
const KEY = process.env.TYPESAFE_API_KEY?.trim();
const BASE = (process.env.TYPESAFE_BASE_URL?.trim() || 'https://api.typesafe.ai').replace(/\/+$/, '');
const THRESHOLDS = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
/** For the cost line only. Check it against the console's price list. */
const USD_PER_M_INPUT = 0.042;

// ------------------------------------------------------------------ the cases

// Heat markings as phone OCR returns them: stencils, stamps, fitting and
// flange markings, bolting, an MTR block, misreads and distractors. `truth`
// lists every acceptable answer; null means the right answer is to leave the
// field blank. Heats are compared the way the book compares them.
const HEAT_CASES = [
  { id: 'clean-stencil', text: 'HEAT E7Z419 ASTM A106 GR B 6" SCH 40 SMLS', truth: { heat: ['E7Z419'], material: ['A106 Gr B'], form: ['pipe'], nps: [6], schedule: ['40'] } },
  { id: 'triple-cert', text: 'ASTM A106B/A53B/API 5L X42 PSL1 6" SCH40 .280 HT# 4K1123 SMLS MADE IN USA', truth: { heat: ['4K1123'], material: ['A106 Gr B', 'A53 Gr B'], form: ['pipe'], nps: [6], schedule: ['40'] } },
  { id: 'mill-stencil', text: 'TENARIS A106-B/A53-B 8" SCH 80 SMLS HEAT NO. 22H0917 BEV', truth: { heat: ['22H0917'], material: ['A106 Gr B', 'A53 Gr B'], form: ['pipe'], nps: [8], schedule: ['80'] } },
  { id: 'elbow', text: 'WPB 6 STD 90 LR HT 88213 A234', truth: { heat: ['88213'], material: ['A234 WPB'], form: ['fitting'], nps: [6], schedule: ['STD'] } },
  { id: 'flange-wn', text: 'A105N 6" 150# WN RF STD BORE HEAT# J4471 MADE IN ITALY', truth: { heat: ['J4471'], material: ['A105'], form: ['flange'], nps: [6], schedule: ['STD'] } },
  { id: 'ss-pipe', text: 'A312 TP304/304L 2" SCH 10S WELDED HT 5K0332', truth: { heat: ['5K0332'], material: ['A312 TP304/304L'], form: ['pipe'], nps: [2], schedule: ['10S'] } },
  { id: 'ss-elbow', text: 'A403 WP316/316L 3" SCH 40S 90 LR HT NO 61207A', truth: { heat: ['61207A'], material: ['A403 WP316/316L'], form: ['fitting'], nps: [3], schedule: ['40S'] } },
  { id: 'stud', text: 'A193 B7 7/8 X 5 1/2 STUD HEAT 3M5561', truth: { heat: ['3M5561'], material: ['A193 B7'], form: ['bolting'], nps: [null], schedule: [null] } },
  { id: 'nut-lot', text: 'A194 2H 7/8 HVY HEX NUT LOT 7731 HT 89Q21', truth: { heat: ['89Q21'], material: ['A194 2H'], form: ['bolting'], nps: [null], schedule: [null] } },
  { id: 'po-item', text: 'PO 45001234 ITEM 12 A106 GR B 4" SCH 40 HEAT 7Y6602', truth: { heat: ['7Y6602'], material: ['A106 Gr B'], form: ['pipe'], nps: [4], schedule: ['40'] } },
  { id: 'ocr-misreads', text: 'HEAT N0 E7Z4l9 ASTM Al06 GR 8 6" SCH4O SMLS', truth: { heat: ['E7Z4l9'], material: ['A106 Gr B'], form: ['pipe'], nps: [6], schedule: ['40'] } },
  { id: 'no-heat', text: 'ASTM A106 GRADE B SCH 40 SMLS PIPE NPS 4', truth: { heat: [null], material: ['A106 Gr B'], form: ['pipe'], nps: [4], schedule: ['40'] } },
  { id: 'lt-pipe', text: 'A333 GR 6 3" SCH 80 SMLS -50F IMPACT TESTED HT K9921', truth: { heat: ['K9921'], material: ['A333 Gr 6'], form: ['pipe'], nps: [3], schedule: ['80'] } },
  { id: 'p91-digits', text: 'A335 P91 10" SCH 120 HEAT 181134 SMLS', truth: { heat: ['181134'], material: ['A335 P91'], form: ['pipe'], nps: [10], schedule: ['120'] } },
  { id: 'reducer', text: 'A420 WPL6 8 X 6 CONC RED SCH 40 HT 3301B', truth: { heat: ['3301B'], material: ['A420 WPL6'], form: ['fitting'], nps: [8, 6], schedule: ['40'] } },
  { id: 'sw-forged', text: 'A182 F316/316L 1" 3000# SW 90 HT# 22K118', truth: { heat: ['22K118'], material: ['A182 F316/F316L'], form: ['fitting'], nps: [1], schedule: [null] } },
  { id: 'lf2-flange', text: 'A350 LF2 CL1 4" 300# WN RF SCH 80 BORE HT A77121', truth: { heat: ['A77121'], material: ['A350 LF2'], form: ['flange'], nps: [4], schedule: ['80'] } },
  { id: 'plate', text: 'A516 GR 70 PLATE 1/2" THK HEAT B31907 SLAB 2', truth: { heat: ['B31907'], material: ['A516 Gr 70'], form: ['plate'], nps: [null], schedule: [null] } },
  {
    id: 'mtr-block',
    text: 'MILL TEST REPORT CUSTOMER: GULF PIPING PO: 88123-44 SPEC: ASTM A106-B/ASME SA106-B SIZE: 12" SCH STD HEAT NO: 5H8812 C .21 MN .98 P .011 S .006 YIELD 52,300 TENSILE 71,800',
    truth: { heat: ['5H8812'], material: ['A106 Gr B'], form: ['pipe'], nps: [12], schedule: ['STD'] },
  },
  { id: 'metric-dn', text: 'DN150 PN40 A105 WN FLANGE HT 4Z1180', truth: { heat: ['4Z1180'], material: ['A105'], form: ['flange'], nps: [6], schedule: [null] } },
  { id: 'wall-only', text: 'API 5L GR B PSL2 16" .375 WALL HT 21A0457 ERW', truth: { heat: ['21A0457'], material: ['API 5L Gr B'], form: ['pipe'], nps: [16], schedule: ['STD', null] } },
  { id: 'erw-black', text: 'A53 GR B ERW 2" SCH 80 BLACK HT 8L4402', truth: { heat: ['8L4402'], material: ['A53 Gr B'], form: ['pipe'], nps: [2], schedule: ['80'] } },
  { id: 'sa-small', text: 'SA-106 B 3/4" SCH 160 HT 11J883', truth: { heat: ['11J883'], material: ['A106 Gr B'], form: ['pipe'], nps: [0.75], schedule: ['160'] } },
  { id: 'unlisted-grade', text: 'ASTM A790 S32205 DUPLEX 4" SCH 10S HT 7D2211', truth: { heat: ['7D2211'], material: [null], form: ['pipe'], nps: [4], schedule: ['10S'] } },
  { id: 'swage', text: 'HT: 3K556 1/2" X 3/4" SCH 80 SWAGE A234 WPB', truth: { heat: ['3K556'], material: ['A234 WPB'], form: ['fitting'], nps: [0.75, 0.5], schedule: ['80'] } },
  { id: 'hn-cert', text: 'SMLS 4 XS A106B H/N 92K7731 CERT 55102', truth: { heat: ['92K7731'], material: ['A106 Gr B'], form: ['pipe'], nps: [4], schedule: ['XS'] } },
  { id: 'line-tag', text: 'LINE 6"-P-1024-A1 TAG PV-1102 HT 4K1123 A106 B SCH 40', truth: { heat: ['4K1123'], material: ['A106 Gr B'], form: ['pipe'], nps: [6], schedule: ['40'] } },
  { id: 'date-job', text: '2025-08-14 A106 GR.B 6 SCH 40 HEAT 16B2204 JOB 7731', truth: { heat: ['16B2204'], material: ['A106 Gr B'], form: ['pipe'], nps: [6], schedule: ['40'] } },
];

// Things a fitter would type into the handbook, with every table that
// answers each. An empty list means no table does, and saying so is right.
const HANDBOOK_CASES = [
  { q: 'how far does a 90 take out', ok: ['takeout-90', 'weld-elbows', 'screwed-fittings', 'solder-elbows', 'street-elbows'] },
  { q: 'center to face 90 ell', ok: ['weld-elbows', 'flanged-150', 'screwed-fittings'] },
  { q: 'LR 90 weld ell 6 inch', ok: ['weld-elbows'] },
  { q: 'short radius elbow center to end', ok: ['weld-elbows'] },
  { q: 'how long is a 6x4 concentric reducer', ok: ['weld-reducers'] },
  { q: 'weld cap length', ok: ['weld-caps'] },
  { q: '180 return spacing', ok: ['weld-returns'] },
  { q: 'stub end dimensions', ok: ['stub-ends'] },
  { q: 'how far does pipe thread in', ok: ['threads'] },
  { q: 'tap drill for 1/2 npt', ok: ['threads'] },
  { q: 'close nipple length', ok: ['nipples'] },
  { q: 'union takeout', ok: ['unions'] },
  { q: 'bolt circle for 125# cast iron flange', ok: ['bolt-up-125'] },
  { q: 'how many bolts on a 250 lb flange', ok: ['bolt-up-250'] },
  { q: 'weld neck flange length 300#', ok: ['welding-necks'] },
  { q: 'flange thickness 600 class', ok: ['flanges'] },
  { q: 'gate valve face to face 150', ok: ['gate-valves-steel', 'gate-valves-ci', 'weld-valves'] },
  { q: 'check valve length', ok: ['check-valves', 'weld-valves'] },
  { q: 'wall thickness of sch 80 pipe', ok: ['steel-pipe'] },
  { q: 'weight per foot of 4 inch pipe', ok: ['steel-pipe'] },
  { q: 'copper type L inside diameter', ok: ['copper-tube'] },
  { q: 'pvc pressure rating sch 40', ok: ['pvc'] },
  { q: 'how much does steel pipe grow when hot', ok: ['expansion'] },
  { q: 'hanger spacing for steam line', ok: ['support-gas'] },
  { q: 'how far apart do supports go on water pipe', ok: ['support-water'] },
  { q: 'gallons in a tank', ok: ['tank-capacity', 'tank-part-full'] },
  { q: 'minimum bend radius for 2 inch', ok: ['bend-radius'] },
  { q: 'u-bolt size for 3 inch pipe', ok: ['u-bolts'] },
  { q: 'how far off the wall', ok: ['clearances'] },
  { q: 'sweat fitting takeout 3/4 copper 90', ok: ['solder-elbows'] },
  { q: 'socket weld 90 dimensions', ok: [] },
  { q: 'torque for B7 studs', ok: [] },
  { q: 'api 5l grade chart', ok: [] },
];

// -------------------------------------------------------------- the questions

// Both experiments ask exactly what the app asks and read the answers exactly
// as the app reads them (src/ai/heatFill.ts, src/ai/handbookPick.ts), so a run
// measures what ships. The first run (2026-09-28) also tried the heat
// candidates shown in context and the tables described by title alone; neither
// beat what is here, so they are gone.

// -------------------------------------------------------------------- calling

let tokensIn = 0;
const latencies = [];

async function ask(body) {
  for (let attempt = 0; ; attempt += 1) {
    const t0 = Date.now();
    const res = await fetch(`${BASE}/v1/systemone`, {
      method: 'POST',
      headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const ms = Date.now() - t0;
    if (res.ok) {
      const data = await res.json();
      latencies.push(ms);
      tokensIn += data?.usage?.input_tokens ?? 0;
      return data;
    }
    const detail = (await res.text()).slice(0, 400);
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    if (res.status === 401 || res.status === 403) throw new Error(`TypeSafe refused the key (${res.status}). Check TYPESAFE_API_KEY.`);
    throw new Error(`TypeSafe answered ${res.status}: ${detail}`);
  }
}

/** Run `jobs` four at a time. */
async function pool(jobs, n = 4) {
  const out = new Array(jobs.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, jobs.length) }, async () => {
      while (next < jobs.length) {
        const i = next++;
        out[i] = await jobs[i]();
      }
    }),
  );
  return out;
}

// -------------------------------------------------------------------- scoring

const FIELDS = ['heat', 'material', 'form', 'nps', 'schedule'];
const same = (field, a, b) => (field === 'heat' ? normaliseHeat(String(a)) === normaliseHeat(String(b)) : a === b);

/** One field at one threshold: right, wrong (a bad value offered), missed (blank where a value was due), or rightly blank. */
function judge(field, offer, truth, at) {
  const shown = offer && offer.confidence >= at ? offer : null;
  if (shown) return truth.some((t) => t !== null && same(field, shown.value, t)) ? 'right' : 'wrong';
  return truth.includes(null) ? 'blank' : 'missed';
}

const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : '—');
const pad = (s, n) => String(s).padEnd(n);

// ---------------------------------------------------------------- experiments

async function heatExperiment(log) {
  console.log('\n== Heat fill ==');
  // The scanner on its own: is the heat among its candidates, and is it first?
  const scanned = HEAT_CASES.map((c) => {
    const found = scanForHeats(c.text).map((x) => x.text);
    const heat = c.truth.heat[0];
    return {
      ...c,
      candidates: found,
      covered: heat === null || found.some((f) => same('heat', f, heat)),
      top1: heat === null ? found.length === 0 : found.length > 0 && same('heat', found[0], heat),
    };
  });
  const withHeat = scanned.filter((c) => c.truth.heat[0] !== null);
  console.log(`Scanner alone: heat among candidates ${pct(withHeat.filter((c) => c.covered).length, withHeat.length)}, first candidate right ${pct(scanned.filter((c) => c.top1).length, scanned.length)} (${scanned.length} cases)`);
  for (const c of scanned.filter((x) => !x.covered)) console.log(`  not a candidate: ${c.id} — wanted ${c.truth.heat[0]}, found [${c.candidates.join(', ')}]`);
  for (const c of scanned.filter((x) => x.covered && !x.top1)) console.log(`  not first: ${c.id} — wanted ${c.truth.heat[0] ?? 'none'}, found [${c.candidates.join(', ')}]`);
  log.heatScanner = scanned.map(({ id, candidates, covered, top1 }) => ({ id, candidates, covered, top1 }));

  const sample = heatRequest(HEAT_CASES[0].text, scanned[0].candidates);
  console.log(`Request size: ~${JSON.stringify(sample).length} characters each, ${HEAT_CASES.length} requests`);
  if (DRY) return;

  {
    const runs = await pool(
      scanned.map((c) => async () => {
        const body = heatRequest(c.text, c.candidates);
        const data = await ask(body);
        // Read at every threshold the way the app reads at its own, checks
        // between the answers included, so one call serves every threshold.
        const fills = Object.fromEntries(THRESHOLDS.map((t) => [t, readHeatAnswers(data.answers, c.candidates, t)]));
        return { id: c.id, truth: c.truth, candidates: c.candidates, fills, answers: data.answers, body };
      }),
    );
    log.heat = runs;

    console.log(`${pad('field', 9)}${THRESHOLDS.map((t) => pad(`@${t}`, 12)).join('')}   (right, incl. rightly blank / wrong / missed)`);
    for (const f of FIELDS) {
      const row = THRESHOLDS.map((t) => {
        const js = runs.map((r) => judge(f, r.fills[t][f], r.truth[f], t));
        return pad(`${js.filter((j) => j === 'right' || j === 'blank').length}/${js.filter((j) => j === 'wrong').length}/${js.filter((j) => j === 'missed').length}`, 12);
      });
      console.log(`${pad(f, 9)}${row.join('')}`);
    }
    // The ones that matter most: a wrong value offered at the shipped threshold.
    const wrong = [];
    const atShipped = (r) => readHeatAnswers(r.answers, r.candidates, OFFER_AT);
    for (const r of runs)
      for (const f of FIELDS) {
        const o = atShipped(r)[f];
        if (judge(f, o, r.truth[f], OFFER_AT) === 'wrong')
          wrong.push(`  WRONG @${OFFER_AT} ${r.id}.${f}: offered ${o.label} (${Math.round(o.confidence * 100)}%), truth ${r.truth[f].map((t) => t ?? 'blank').join(' or ')}`);
      }
    for (const w of wrong.slice(0, 15)) console.log(w);
    if (wrong.length > 15) console.log(`  …and ${wrong.length - 15} more in the full record`);
  }
}

async function handbookExperiment(log) {
  console.log('\n== Handbook search ==');
  const base = HANDBOOK_CASES.map(({ q, ok }) => {
    const hits = searchReference(q).map((t) => t.id);
    const right = ok.length ? hits.some((h) => ok.includes(h)) : hits.length === 0;
    return { q, ok, hits: hits.slice(0, 5), right, first3: ok.length ? hits.slice(0, 3).some((h) => ok.includes(h)) : hits.length === 0 };
  });
  console.log(`Today's search: a right table anywhere in the results ${pct(base.filter((b) => b.right).length, base.length)}, in the first three ${pct(base.filter((b) => b.first3).length, base.length)} (${base.length} queries)`);
  log.handbookBaseline = base;
  console.log(`Request size: ~${JSON.stringify(handbookRequest(HANDBOOK_CASES[0].q)).length} characters, ${HANDBOOK_CASES.length} requests`);
  if (DRY) return;

  const runs = await pool(
    HANDBOOK_CASES.map(({ q, ok }) => async () => {
      const data = await ask(handbookRequest(q));
      const pick = readHandbookAnswer(data.answers?.table);
      const want = ok.length ? ok : [null];
      const top3 = pick ? (pick.best === null ? [null] : pick.ranked) : [];
      return { q, ok, pick, right: !!pick && want.includes(pick.best), in3: top3.some((x) => want.includes(x)) };
    }),
  );
  log.handbook = runs;
  const sure = runs.filter((r) => r.pick && r.pick.confidence >= BEST_AT);
  console.log(
    `Jev: first choice right ${pct(runs.filter((r) => r.right).length, runs.length)}, right in top three ${pct(runs.filter((r) => r.in3).length, runs.length)}, ` +
      `shown as best match (≥${BEST_AT} sure) ${sure.filter((r) => r.right).length}/${sure.length} right`,
  );
  for (const r of runs.filter((x) => !x.right).slice(0, 10))
    console.log(`    miss: "${r.q}" -> ${r.pick?.best ?? 'none'} (${Math.round((r.pick?.confidence ?? 0) * 100)}%), wanted ${r.ok.join(' or ') || 'none'}`);
}

// ----------------------------------------------------------------------- main

if (!DRY && !KEY) {
  console.error('TYPESAFE_API_KEY is not set: export it, or put TYPESAFE_API_KEY=... in .env at the repo root, or run with --dry.');
  process.exit(1);
}
const log = { at: new Date().toISOString(), model: JEV_MODEL, base: BASE, offerAt: OFFER_AT };
try {
  if (ONLY !== 'handbook') await heatExperiment(log);
  if (ONLY !== 'heat') await handbookExperiment(log);
} catch (e) {
  console.error(`\nStopped: ${e instanceof Error ? e.message : e}`);
  process.exitCode = 1;
}
if (latencies.length) {
  const s = [...latencies].sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  console.log(`\n${s.length} calls · latency p50 ${q(0.5)} ms, p95 ${q(0.95)} ms · ${tokensIn} input tokens ≈ $${((tokensIn / 1e6) * USD_PER_M_INPUT).toFixed(4)}`);
}
mkdirSync('tools/.jev-lab', { recursive: true });
const file = `tools/.jev-lab/run-${log.at.replace(/[:.]/g, '-')}.json`;
writeFileSync(file, JSON.stringify({ ...log, latencies, tokensIn }, null, 1));
console.log(`Full record: ${file}`);
