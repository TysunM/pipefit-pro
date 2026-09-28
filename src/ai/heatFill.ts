// Smart fill: the rest of a heat entry, read off the same scan
// ------------------------------------------------------------
// The phone already reads the stencil or the cert and finds the strings that
// look like heat numbers. What it cannot do by rule is tell which of them is
// the heat, or read "A1O6 GR.B  SMLS  6" SCH40" as a grade, a size and a
// schedule when the OCR has mangled half of it. That is judgement about
// messy text, which is what Jev (TypeSafe's System One model) is for.
//
// So code finds the candidates and Jev only chooses: which candidate is the
// heat, and which grade, form, size and schedule from fixed lists. It never
// writes a value of its own, so nothing it returns can be a value the app did
// not already know how to hold. Every answer comes back as a probability, and
// only a confident one is offered — and offered is all: the fitter still taps
// the heat, and sees what will be filled in before it is.
//
// This file is shared by the Worker that holds the API key (it builds the
// questions there, so the endpoint cannot be used to ask Jev anything else)
// and by the app (which reads the answers). It has no React Native in it.

import { HEAT_FORMS, type Heat, type HeatForm } from '../calc/heat';
import { PIPE_SIZES } from '../calc/pipe';

/** The model every request names. `jev-latest` follows TypeSafe's current Jev. */
export const JEV_MODEL = 'jev-latest';

/** Longest scan text sent. A cert page is a few hundred characters; this is room to spare. */
export const MAX_TEXT = 4000;
/** Most heat candidates offered to Jev: the scanner's best, never a whole page of tokens. */
export const MAX_CANDIDATES = 12;
/** Longest candidate string. A heat number is rarely over a dozen characters. */
export const MAX_CANDIDATE_LEN = 32;

/**
 * How sure Jev has to be before an answer is offered. A starting point, set
 * to err on the side of leaving a field blank: a blank field costs a few
 * taps, a wrong grade on a heat record costs a great deal more. To be tuned
 * against real stencils and certs.
 */
export const OFFER_AT = 0.6;

type Option<T> = { key: string; value: T; label: string; about: string };

const MATERIALS: Option<string>[] = [
  ['a106b', 'A106 Gr B', 'ASTM A106 / ASME SA-106 Grade B carbon steel seamless pipe'],
  ['a106c', 'A106 Gr C', 'ASTM A106 / ASME SA-106 Grade C carbon steel seamless pipe'],
  ['a53b', 'A53 Gr B', 'ASTM A53 / ASME SA-53 Grade B carbon steel pipe, seamless or ERW'],
  ['api5lb', 'API 5L Gr B', 'API 5L Grade B line pipe'],
  ['a333g6', 'A333 Gr 6', 'ASTM A333 / SA-333 Grade 6 low-temperature carbon steel pipe'],
  ['a335p11', 'A335 P11', 'ASTM A335 / SA-335 P11 chrome-moly alloy pipe'],
  ['a335p22', 'A335 P22', 'ASTM A335 / SA-335 P22 chrome-moly alloy pipe'],
  ['a335p91', 'A335 P91', 'ASTM A335 / SA-335 P91 chrome-moly alloy pipe'],
  ['a312tp304', 'A312 TP304/304L', 'ASTM A312 / SA-312 TP304 or TP304L stainless pipe, including dual-certified 304/304L'],
  ['a312tp316', 'A312 TP316/316L', 'ASTM A312 / SA-312 TP316 or TP316L stainless pipe, including dual-certified 316/316L'],
  ['a105', 'A105', 'ASTM A105 / SA-105 carbon steel forgings: flanges and forged fittings'],
  ['a350lf2', 'A350 LF2', 'ASTM A350 / SA-350 LF2 low-temperature carbon steel forgings'],
  ['a182f304', 'A182 F304/F304L', 'ASTM A182 / SA-182 F304 or F304L stainless forgings'],
  ['a182f316', 'A182 F316/F316L', 'ASTM A182 / SA-182 F316 or F316L stainless forgings'],
  ['a182f11', 'A182 F11', 'ASTM A182 / SA-182 F11 alloy forgings'],
  ['a182f22', 'A182 F22', 'ASTM A182 / SA-182 F22 alloy forgings'],
  ['a182f91', 'A182 F91', 'ASTM A182 / SA-182 F91 alloy forgings'],
  ['a234wpb', 'A234 WPB', 'ASTM A234 / SA-234 WPB carbon steel butt-weld fittings'],
  ['a420wpl6', 'A420 WPL6', 'ASTM A420 / SA-420 WPL6 low-temperature carbon steel butt-weld fittings'],
  ['a403wp304', 'A403 WP304/304L', 'ASTM A403 / SA-403 WP304 or WP304L stainless butt-weld fittings'],
  ['a403wp316', 'A403 WP316/316L', 'ASTM A403 / SA-403 WP316 or WP316L stainless butt-weld fittings'],
  ['a193b7', 'A193 B7', 'ASTM A193 / SA-193 B7 alloy steel studs and bolts'],
  ['a194_2h', 'A194 2H', 'ASTM A194 / SA-194 2H heavy hex nuts'],
  ['a320l7', 'A320 L7', 'ASTM A320 / SA-320 L7 low-temperature studs and bolts'],
  ['a516g70', 'A516 Gr 70', 'ASTM A516 / SA-516 Grade 70 carbon steel plate'],
].map(([key, label, about]) => ({ key: key!, value: label!, label: label!, about: about! }));

const FORMS: Option<HeatForm>[] = HEAT_FORMS.map((f) => ({
  key: f.id,
  value: f.id,
  label: f.label,
  about: {
    pipe: 'Pipe: a length of pipe or tube',
    fitting: 'Fitting: an elbow, tee, reducer, cap or other butt-weld or socket fitting',
    flange: 'Flange: a weld neck, slip-on, socket weld, blind or other flange',
    plate: 'Plate or sheet',
    bolting: 'Bolting: studs, bolts or nuts',
    other: 'Some other product form',
  }[f.id],
}));

const SIZES: Option<number>[] = PIPE_SIZES.map((s) => ({
  key: `nps${String(s.nps).replace('.', '_')}`,
  value: s.nps,
  label: s.label,
  about: `${s.label} nominal pipe size (NPS ${s.nps}, ${s.od}" OD)`,
}));

const SCHEDULE_LIST = ['5S', '10S', '10', '20', '30', 'STD', '40', '40S', '60', 'XS', '80', '80S', '100', '120', '140', '160', 'XXS'];
const SCHEDULES: Option<string>[] = SCHEDULE_LIST.map((s) => ({
  key: `sch${s.toLowerCase()}`,
  value: s,
  label: s === 'STD' || s === 'XS' || s === 'XXS' ? s : `SCH ${s}`,
  about: s === 'STD' ? 'Standard weight (STD)' : s === 'XS' ? 'Extra strong (XS)' : s === 'XXS' ? 'Double extra strong (XXS)' : `Schedule ${s}`,
}));

/** The question JSON TypeSafe's API takes: POST /v1/systemone, `questions`. */
export type ChoiceQuestionJson = { type: 'choice'; instructions: string; criteria: Record<string, string> };

const READ =
  '`ocr_text` was read by phone OCR off a pipe stencil, a stamped marking or a mill test report (MTR). ' +
  'Letters and digits may be misread (O for 0, I or l for 1, S for 5, B for 8), spaces lost, and lines out of order.';

const choice = (instructions: string, opts: readonly Option<unknown>[], none: string): ChoiceQuestionJson => ({
  type: 'choice',
  instructions: `${READ} ${instructions}`,
  criteria: { ...Object.fromEntries(opts.map((o) => [o.key, o.about])), none },
});

/** Clean and cap what goes to the model: printable, trimmed, bounded. */
export function cleanText(text: string): string {
  return text.replace(/[^\x20-\x7E\n\t]/g, ' ').replace(/[ \t]+/g, ' ').trim().slice(0, MAX_TEXT);
}

export function cleanCandidates(candidates: readonly unknown[]): string[] {
  const out: string[] = [];
  for (const c of candidates) {
    if (typeof c !== 'string') continue;
    const s = c.trim();
    if (!s || s.length > MAX_CANDIDATE_LEN || out.includes(s)) continue;
    out.push(s);
    if (out.length >= MAX_CANDIDATES) break;
  }
  return out;
}

/**
 * The questions for one scan. Asked together, so they run in parallel and
 * none sees another's answer. The heat question only ever chooses among the
 * scanner's own candidates: Jev cannot pick a value code did not find.
 */
export function heatQuestions(candidates: readonly string[]): Record<string, ChoiceQuestionJson> {
  const cands: Option<string>[] = candidates.map((c, i) => ({ key: `c${i}`, value: c, label: c, about: `The string "${c}"` }));
  const qs: Record<string, ChoiceQuestionJson> = {
    material: choice(
      'Which material specification and grade does it name?',
      MATERIALS,
      'No grade in this list is named: the text names none, or names one not listed here',
    ),
    form: choice('What product form is it marking?', FORMS, 'The text does not say or show what form it is'),
    size: choice('What nominal pipe size (NPS) does it give?', SIZES, 'No nominal pipe size is given, or it is not one of these'),
    schedule: choice('What wall schedule or weight class does it give?', SCHEDULES, 'No schedule or weight class is given'),
  };
  if (cands.length)
    qs.heat = choice(
      'Which of these candidate strings is the heat number: the melt identifier the mill assigns, often marked HEAT, HT, HT NO or H/N? ' +
        'Not a size, schedule, grade, specification, purchase order, item, tag or certificate number.',
      cands,
      'None of these strings is the heat number',
    );
  return qs;
}

/** What `POST /v1/systemone` is sent for one scan. */
export function heatRequest(text: string, candidates: readonly string[]) {
  return { model: JEV_MODEL, state: { ocr_text: cleanText(text) }, questions: heatQuestions(cleanCandidates(candidates)) };
}

export type Offer<T> = { value: T; label: string; confidence: number };

/** What a scan can fill in, each only when Jev was sure enough. */
export type HeatFill = {
  heat?: Offer<string>;
  material?: Offer<string>;
  form?: Offer<HeatForm>;
  nps?: Offer<number>;
  schedule?: Offer<string>;
};

/** The heat-entry fields a fill sets. */
export type HeatDetails = Partial<Pick<Heat, 'material' | 'form' | 'nps' | 'schedule'>>;

type ChoiceAnswer = { choice: string; confidence: number };

function asChoice(v: unknown): ChoiceAnswer | null {
  if (!v || typeof v !== 'object') return null;
  const a = v as Record<string, unknown>;
  if (a.type !== 'choice' || typeof a.choice !== 'string' || typeof a.confidence !== 'number' || !Number.isFinite(a.confidence)) return null;
  return { choice: a.choice, confidence: a.confidence };
}

function pick<T>(answer: unknown, opts: readonly Option<T>[], at: number): Offer<T> | undefined {
  const a = asChoice(answer);
  if (!a || a.choice === 'none' || a.confidence < at) return undefined;
  const o = opts.find((x) => x.key === a.choice);
  return o ? { value: o.value, label: o.label, confidence: a.confidence } : undefined;
}

/**
 * Jev's answers, as offers. Anything malformed, unknown, "none" or not
 * confident enough is simply left out: a fill is only ever less, never wrong
 * in shape. `answers` is whatever came back over the network, so it is
 * checked, not trusted.
 */
export function readHeatAnswers(answers: unknown, candidates: readonly string[], at = OFFER_AT): HeatFill {
  const a = answers && typeof answers === 'object' ? (answers as Record<string, unknown>) : {};
  const cands: Option<string>[] = cleanCandidates(candidates).map((c, i) => ({ key: `c${i}`, value: c, label: c, about: '' }));
  const fill: HeatFill = {};
  const heat = pick(a.heat, cands, at);
  if (heat) fill.heat = heat;
  const material = pick(a.material, MATERIALS, at);
  if (material) fill.material = material;
  const form = pick(a.form, FORMS, at);
  if (form) fill.form = form;
  const nps = pick(a.size, SIZES, at);
  if (nps) fill.nps = nps;
  const schedule = pick(a.schedule, SCHEDULES, at);
  if (schedule) fill.schedule = schedule;
  return fill;
}

/** The entry fields a fill would set, for when the heat is added. */
export function detailsOf(fill: HeatFill): HeatDetails {
  const d: HeatDetails = {};
  if (fill.material) d.material = fill.material.value;
  if (fill.form) d.form = fill.form.value;
  if (fill.nps) d.nps = fill.nps.value;
  if (fill.schedule) d.schedule = fill.schedule.value;
  return d;
}

/** The fill in a line: "A106 Gr B · 6" · SCH 40 · Pipe". */
export function describeDetails(fill: HeatFill): string {
  return [fill.material?.label, fill.nps?.label, fill.schedule?.label, fill.form?.label].filter(Boolean).join(' · ');
}

/** A stored fill in a line, the same words the scan showed: "A106 Gr B · 6" · SCH 40 · Pipe". */
export function describeHeatDetails(d: HeatDetails): string {
  const size = d.nps != null ? SIZES.find((o) => o.value === d.nps)?.label : undefined;
  const sch = d.schedule ? SCHEDULES.find((o) => o.value === d.schedule)?.label ?? d.schedule : undefined;
  const form = d.form ? FORMS.find((o) => o.value === d.form)?.label : undefined;
  return [d.material || undefined, size, sch, form].filter(Boolean).join(' · ');
}

/** The Worker route the app calls. */
export const HEAT_FILL_PATH = '/api/heat-fill';

/**
 * Ask the Worker for a fill. Resolves null on anything short of a clean
 * answer — no signal, a timeout, the key not set, a server fault — because a
 * scan without a fill is exactly the scanner the app already had.
 */
export async function fetchHeatFill(
  base: string,
  text: string,
  candidates: readonly string[],
  opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<HeatFill | null> {
  const f = opts.fetchImpl ?? fetch;
  const body = { text: cleanText(text), candidates: cleanCandidates(candidates) };
  if (!body.text) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 6000);
  try {
    const res = await f(`${base}${HEAT_FILL_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { answers?: unknown };
    return readHeatAnswers(data?.answers, body.candidates);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
