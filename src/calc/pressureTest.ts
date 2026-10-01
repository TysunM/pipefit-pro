// Checking a pressure test against the code
// -----------------------------------------
// The test pressure on a test package is the engineer's, and this never
// replaces it. What it does is the arithmetic QC does on the back of the form
// before anyone opens a valve: is the test pressure inside what the code
// allows for this design pressure, is each gauge in calibration and the right
// size for the test, is the relief valve set where it will protect the line
// without lifting before the test is reached, and was the pressure held long
// enough.
//
// The figures are the codes' minimums, as written:
//
//   ASME B31.3   hydrostatic  at least 1.5 × design pressure
//                pneumatic    1.1 × to 1.33 × design pressure; a relief valve
//                             set no higher than the test pressure plus the
//                             lesser of 50 psi or 10% of it; a preliminary
//                             check at the lesser of 25 psi or half the test
//                             pressure; examined at design pressure
//   ASME B31.1   hydrostatic  at least 1.5 × design pressure
//                pneumatic    1.2 × to 1.5 × design pressure
//   both         the test pressure held at least 10 minutes before the
//                joints are examined
//
// B31.3 raises its hydrostatic minimum further when the design temperature is
// above the test temperature, by the ratio of the material's allowable stress
// at the two. That ratio needs the material's stress tables, which this app
// does not hold, so it is flagged rather than worked. A test pressure is also
// capped by what the weakest component can take at test temperature; that
// too is the engineer's figure, not one a phone can know.
//
// Gauge range is in neither code. ASME Section VIII's rule for vessel test
// gauges — about twice the test pressure, never under 1.5 times it nor over 4
// times — is what most piping specs adopt, so a gauge outside it is a
// warning, not a fault.

import { dayBounds, usDate } from './days';
import type { PressureTest, TestCode, TestKind } from '../state/pressureLog';
import { heldMinutes, holding, isSigned, stepsFor } from '../state/pressureLog';

export type CodeRule = {
  /** Lowest test pressure the code allows, psi, rounded up. Null when it sets none or there is no design pressure. */
  min: number | null;
  /** Highest, rounded down. */
  max: number | null;
  /** How the limits are worked: "1.5 × design". */
  minWhy: string;
  maxWhy: string;
  /** Shortest hold, minutes. Null for a job spec. */
  hold: number | null;
};

const FACTORS: Record<Exclude<TestCode, 'spec'>, Record<TestKind, { min: number; max: number | null }>> = {
  'B31.3': { hydro: { min: 1.5, max: null }, pneumatic: { min: 1.1, max: 1.33 } },
  'B31.1': { hydro: { min: 1.5, max: null }, pneumatic: { min: 1.2, max: 1.5 } },
};

/** The codes' hold, before the joints are examined. */
export const CODE_HOLD_MIN = 10;

/** Nudged off a float's last digit before rounding, so 1.1 × 150 is 165 and not 166. */
const up = (v: number) => Math.ceil(v - 1e-9);
const down = (v: number) => Math.floor(v + 1e-9);

export function codeRule(code: TestCode, kind: TestKind, designPsi: number | null): CodeRule {
  if (code === 'spec') return { min: null, max: null, minWhy: '', maxWhy: '', hold: null };
  const f = FACTORS[code][kind];
  return {
    min: designPsi !== null ? up(f.min * designPsi) : null,
    max: designPsi !== null && f.max !== null ? down(f.max * designPsi) : null,
    minWhy: `${f.min} × design`,
    maxWhy: f.max !== null ? `${f.max} × design` : '',
    hold: CODE_HOLD_MIN,
  };
}

/** The relief valve's highest set pressure on a B31.3 pneumatic test, or null where the code sets none. */
export function reliefMax(t: Pick<PressureTest, 'code' | 'kind' | 'testPsi'>): number | null {
  if (t.code !== 'B31.3' || t.kind !== 'pneumatic' || t.testPsi === null) return null;
  return down(t.testPsi + Math.min(50, 0.1 * t.testPsi));
}

/** The pressure of a B31.3 pneumatic test's preliminary check, or null. */
export function prelimPsi(t: Pick<PressureTest, 'code' | 'kind' | 'testPsi'>): number | null {
  if (t.code !== 'B31.3' || t.kind !== 'pneumatic' || t.testPsi === null) return null;
  return Math.min(25, t.testPsi / 2);
}

/** The hold this test needs, minutes: the job's, never less than the code's. */
export function requiredHold(t: Pick<PressureTest, 'code' | 'kind' | 'holdReq'>): number | null {
  const code = t.code === 'spec' ? null : CODE_HOLD_MIN;
  if (code === null) return t.holdReq;
  return Math.max(code, t.holdReq ?? 0);
}

/** Gauge range rule, as a pair: about twice the test pressure, from 1.5 to 4 times it. */
export const gaugeSpan = (testPsi: number): { lo: number; hi: number } => ({ lo: up(1.5 * testPsi), hi: down(4 * testPsi) });

export type Level = 'stop' | 'warn' | 'ok';
export type TestCheck = { id: string; level: Level; text: string };

const fig = (n: number) => `${Math.round(n * 10) / 10}`;
const p = (n: number) => `${fig(n)} psi`;
const mins = (n: number) => `${fig(n)} min`;

/**
 * Everything worth saying about a test before it is signed, in the order the
 * form is filled in. A stop is something the record cannot be right with; a
 * warning is something to look at; an ok is a check that was made and passed,
 * kept so the printed record shows what was checked as well as what was not.
 */
export function checkTest(t: PressureTest): TestCheck[] {
  const out: TestCheck[] = [];
  const add = (id: string, level: Level, text: string) => out.push({ id, level, text });
  const rule = codeRule(t.code, t.kind, t.designPsi);
  const code = t.code === 'spec' ? '' : t.code;

  // The test pressure.
  if (t.testPsi === null) add('test-psi', 'stop', 'No test pressure entered.');
  if (code && t.designPsi === null) add('design', 'warn', `No design pressure, so the test pressure is not checked against ${code}.`);
  if (t.testPsi !== null && rule.min !== null) {
    if (t.testPsi < rule.min) add('test-min', 'stop', `${p(t.testPsi)} is under the ${code} minimum of ${p(rule.min)} (${rule.minWhy}).`);
    else if (rule.max !== null && t.testPsi > rule.max)
      add('test-max', 'stop', `${p(t.testPsi)} is over the ${code} ${t.kind} maximum of ${p(rule.max)} (${rule.maxWhy}).`);
    else
      add(
        'test-code',
        'ok',
        rule.max !== null
          ? `${p(t.testPsi)} is inside ${code}: ${p(rule.min)} to ${p(rule.max)} (${rule.minWhy} to ${rule.maxWhy}).`
          : `${p(t.testPsi)} meets the ${code} minimum of ${p(rule.min)} (${rule.minWhy}).`,
      );
  }
  if (t.code === 'B31.3' && t.kind === 'hydro' && t.designTemp !== null && t.testTemp !== null && t.designTemp > t.testTemp)
    add(
      'stress',
      'warn',
      `Design temperature (${fig(t.designTemp)}°F) is above the test temperature (${fig(t.testTemp)}°F): B31.3 raises the minimum by the material's stress ratio, which this app does not work out. Check the test package figure allows for it.`,
    );

  // The hold the test needs.
  const need = requiredHold(t);
  if (code && t.holdReq !== null && t.holdReq < CODE_HOLD_MIN)
    add('hold-req', 'warn', `The job's ${mins(t.holdReq)} hold is shorter than the ${mins(CODE_HOLD_MIN)} ${code} asks for, so ${mins(CODE_HOLD_MIN)} is used.`);

  // The gauges.
  if (!t.gauges.length) add('gauges', 'warn', 'No test gauge recorded.');
  const { start } = dayBounds(t.day);
  t.gauges.forEach((g, i) => {
    const name = g.id ? `Gauge ${g.id}` : `Gauge ${i + 1}`;
    if (!g.calDue) add(`cal-${i}`, 'warn', `${name} has no calibration due date.`);
    else if (dayBounds(g.calDue).end <= start) add(`cal-${i}`, 'stop', `${name}: calibration ran out ${usDate(g.calDue)}, before the test.`);
    else add(`cal-${i}`, 'ok', `${name} is in calibration to ${usDate(g.calDue)}.`);
    if (g.range !== null && t.testPsi !== null && t.testPsi > 0) {
      const span = gaugeSpan(t.testPsi);
      if (g.range < span.lo || g.range > span.hi)
        add(`range-${i}`, 'warn', `${name} reads to ${p(g.range)}: for a ${p(t.testPsi)} test a gauge should read to ${p(span.lo)}–${p(span.hi)}, best about ${p(2 * t.testPsi)}.`);
      else add(`range-${i}`, 'ok', `${name} range ${p(g.range)} suits a ${p(t.testPsi)} test.`);
    }
  });

  // The relief valve.
  const top = reliefMax(t);
  if (t.reliefPsi === null) {
    if (t.code === 'B31.3' && t.kind === 'pneumatic')
      add('relief', 'stop', `B31.3 needs a relief valve on a pneumatic test${top !== null ? `, set no higher than ${p(top)}` : ''}.`);
  } else if (t.testPsi !== null && t.reliefPsi < t.testPsi) {
    add('relief', 'stop', `Relief set at ${p(t.reliefPsi)} lifts before the ${p(t.testPsi)} test pressure is reached.`);
  } else if (top !== null && t.reliefPsi > top) {
    add('relief', 'stop', `Relief set at ${p(t.reliefPsi)} is over the B31.3 limit of ${p(top)} (test pressure plus the lesser of 50 psi or 10%).`);
  } else if (t.testPsi !== null) {
    add('relief', 'ok', `Relief set at ${p(t.reliefPsi)}${top !== null ? `, inside the B31.3 limit of ${p(top)}` : ''}.`);
  }

  // The hold itself.
  if (t.hold.startAt !== null && t.hold.startPsi !== null && t.testPsi !== null && t.hold.startPsi < t.testPsi)
    add('hold-start', 'stop', `The hold started at ${p(t.hold.startPsi)}, under the ${p(t.testPsi)} test pressure.`);
  const held = heldMinutes(t);
  if (held !== null && need !== null) {
    if (held < need) add('hold-time', 'stop', `Held ${mins(Math.floor(held * 10) / 10)}; the test needs ${mins(need)}.`);
    else add('hold-time', 'ok', `Held ${mins(Math.floor(held))}, at least the ${mins(need)} needed.`);
  }
  const low = Math.min(...[t.hold.endPsi, ...t.readings.map((r) => r.psi)].filter((x): x is number => x !== null));
  if (t.hold.startPsi !== null && Number.isFinite(low) && low < t.hold.startPsi)
    add(
      'hold-drop',
      'warn',
      `Pressure fell ${p(t.hold.startPsi - low)} during the hold (${p(t.hold.startPsi)} to ${p(low)}). Find why before it is signed${t.kind === 'hydro' ? '; trapped air and the water cooling both drop a gauge as well as a leak does' : ''}.`,
    );

  if (t.testTemp !== null && t.testTemp <= 40)
    add('cold', 'warn', `Testing at ${fig(t.testTemp)}°F: ${t.kind === 'hydro' ? 'water can freeze, and ' : ''}steel this cold can fail brittle. Check the procedure's minimum test temperature.`);

  // The result and who signs for it.
  const before = stepsFor(t.kind).filter((s) => s.when === 'before' && !t.steps.includes(s.id)).length;
  if (t.result !== 'open' && before) add('steps', 'warn', `${before} pre-test ${before === 1 ? 'step is' : 'steps are'} not ticked.`);
  if (t.result === 'fail' && !t.leaks) add('leaks', 'warn', 'Failed, with nothing written about where it leaked.');
  if (t.result === 'pass' && holding(t)) add('pass-holding', 'stop', 'Marked passed while the hold is still running.');
  if (t.result === 'pass' && t.hold.startAt === null) add('pass-nohold', 'warn', 'Marked passed with no hold recorded.');
  const examiner = t.people.examiner;
  if (t.result === 'pass' && !examiner.name) add('examiner', 'stop', `Passed with no examiner named: ${code || 'the code'} has the examiner certify the result.`);
  else if (t.result !== 'open' && examiner.name && !isSigned(examiner)) add('examiner', 'warn', `The examiner, ${examiner.name}, has not signed.`);
  return out;
}

/** Stops first, then warnings: what the screen leads with. */
export const problems = (cs: readonly TestCheck[]): TestCheck[] => [...cs.filter((c) => c.level === 'stop'), ...cs.filter((c) => c.level === 'warn')];

export type HoldState =
  | { phase: 'ready' }
  | { phase: 'holding'; elapsedMs: number; needMs: number | null; met: boolean }
  | { phase: 'held'; elapsedMs: number; needMs: number | null; met: boolean };

/** Where the hold is, at a moment. Worked from the stamps, so it is right after the phone has slept. */
export function holdState(t: PressureTest, now: number): HoldState {
  const { startAt, endAt } = t.hold;
  if (startAt === null) return { phase: 'ready' };
  const need = requiredHold(t);
  const needMs = need === null ? null : need * 60000;
  const elapsedMs = Math.max(0, (endAt ?? now) - startAt);
  return { phase: endAt === null ? 'holding' : 'held', elapsedMs, needMs, met: needMs === null || elapsedMs >= needMs };
}
