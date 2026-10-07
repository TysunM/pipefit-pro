// Writing what was said into the records
// -------------------------------------
// Claude says what it heard as data (ai/voice.ts); this is where it lands. Pure
// functions of the log, so the provider can keep the log as it was and put it
// back when Undo is tapped, and the tests can hold every case.

import type { VoiceAnswer } from '../ai/voice';
import { Shift, workDay } from '../calc/days';
import { ShiftLog, ShiftReport, newReport, putReport, reportFor } from '../state/shiftLog';
import { PressureLog, PressureTest, endHold, getTest, holding, logReading, putTest, sortTests, startHold, testName } from '../state/pressureLog';
import { sameProject } from '../state/project';

type ShiftAnswer = Extract<VoiceAnswer, { action: 'shift' }>;
type TestAnswer = Extract<VoiceAnswer, { action: 'test' }>;

/** Today's report for the job, started if it has not been, with what was said added to it. */
export function applyShift(log: ShiftLog, a: ShiftAnswer, project: string, now: number, shift: Shift = 'days'): { log: ShiftLog; report: ShiftReport } {
  const day = workDay(now, shift);
  const r = reportFor(log, day, project) ?? newReport(day, project, now);
  const welds = r.welds.map((w) => ({ ...w }));
  for (const w of a.welds) {
    const at = welds.find((x) => x.nps === w.nps);
    if (at) at.count += w.count;
    else welds.push({ ...w });
  }
  const notes = { ...r.notes };
  if (a.note) notes[a.note.key] = notes[a.note.key].trim() ? `${notes[a.note.key].trim()}\n${a.note.text}` : a.note.text;
  const next: ShiftReport = {
    ...r,
    welds,
    rejects: [...r.rejects, ...a.rejects],
    spools: [...r.spools, ...a.spools.filter((s) => !r.spools.includes(s))],
    notes,
    crew: a.crew ?? r.crew,
    hours: a.hours ?? r.hours,
    // The written report no longer matches the record; it is built again from the screen.
    text: '',
    polished: false,
  };
  const out = putReport(log, next, now);
  return { log: out, report: reportFor(out, day, project) ?? next };
}

/**
 * The test a step is for: the one on screen, or else the job's most recently
 * touched test that is still open.
 */
export function targetTest(log: PressureLog, onScreen: string | null, project: string): PressureTest | null {
  if (onScreen) {
    const t = getTest(log, onScreen);
    if (t) return t;
  }
  return sortTests(log.tests.filter((t) => t.result === 'open' && sameProject(t.project, project))).sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
}

export function applyTest(
  log: PressureLog,
  a: TestAnswer,
  onScreen: string | null,
  project: string,
  now: number,
): { log: PressureLog; test: PressureTest } | { error: string } {
  const t = targetTest(log, onScreen, project);
  if (!t) return { error: 'There is no open pressure test on this job. Open one first.' };
  let next: PressureTest;
  switch (a.op) {
    case 'start_hold':
      next = startHold(t, now, a.psi!);
      break;
    case 'reading':
      if (!holding(t)) return { error: `${testName(t)} is not holding. Say when the hold starts first.` };
      next = logReading(t, now, a.psi!);
      break;
    case 'end_hold':
      if (!holding(t)) return { error: `${testName(t)} is not holding.` };
      next = endHold(t, now, a.psi!);
      break;
    case 'pass':
    case 'fail':
      next = { ...t, result: a.op, updatedAt: now };
      break;
  }
  if (a.leaks) next = { ...next, leaks: next.leaks.trim() ? `${next.leaks.trim()}\n${a.leaks}` : a.leaks };
  const out = putTest(log, next, now);
  return { log: out, test: getTest(out, next.id) ?? next };
}
