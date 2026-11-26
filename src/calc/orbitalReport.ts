// A weld report set against its program
// -------------------------------------
// What the power supply says the weld did (ai/weldReport.ts), level by
// level against what the program says it should: the peak and background
// current and the rotor speed, each as a difference from the program, and
// the heat input the reported volts, current and speed put in, checked
// against the WPS the program is qualified to where that WPS is in the WPS
// book. Then the plain list of anything worth a look: a level off its
// program, a fault, a report for another program, a level count that does
// not match.
//
// A report that prints the programmed figures rather than the measured ones
// is the same check made of the program on the power supply: it says
// whether the supply holds this program.
//
// The 5% that marks a difference is the app's, to draw the eye; what is
// acceptable is the WPS's and the job's.

import type { ReportLevel, WeldReportRead } from '../ai/weldReport';
import type { Level, ProgramBody } from '../state/orbitalBook';
import type { Wps } from '../state/wpsBook';
import { processOf } from './heatInput';
import { pulsed } from './orbitalProgram';

export const REPORT_OFF_PCT = 5;
const MM_PER_IN = 25.4;

export type Cmp = { read: number; program: number; pct: number; off: boolean };
export type LevelReport = {
  level: number;
  /** The program's level it is set against, or null when the program has fewer. */
  index: number | null;
  ip: Cmp | null;
  ib: Cmp | null;
  rpm: Cmp | null;
  volts: number | null;
  avg: number | null;
  ipm: number | null;
  /** Arc energy, J/in: volts × average amps × 60 ÷ travel speed, no efficiency (ASME IX QW-409.1(a)). */
  heat: number | null;
  /** Against the WPS's heat input window, on the WPS's own basis. */
  wps: 'in' | 'low' | 'high' | null;
};
export type ReportCheck = {
  levels: LevelReport[];
  program: 'same' | 'differs' | 'unknown';
  wps: Wps | null;
  notes: string[];
};

const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function cmp(read: number | null, program: number | null | undefined): Cmp | null {
  if (read === null || program === null || program === undefined || !(program > 0)) return null;
  const pct = ((read - program) / program) * 100;
  return { read, program, pct, off: Math.abs(pct) > REPORT_OFF_PCT };
}

/** The travel speed the report gives, in/min: as printed, from mm/min, or from the rotor speed round this OD. */
function ipmOf(r: ReportLevel, od: number | null): number | null {
  if (r.ipm !== null) return r.ipm;
  if (r.mmpm !== null) return r.mmpm / MM_PER_IN;
  if (r.rpm !== null && od) return r.rpm * Math.PI * od;
  return null;
}

/** The current the joint felt: as printed, or the reported peak and background over the program's pulse times. */
function avgOf(r: ReportLevel, l: Level | undefined): number | null {
  if (r.avg !== null) return r.avg;
  if (r.ip === null) return null;
  if (l && pulsed(l) && r.ib !== null) return (r.ip * l.tp + r.ib * l.tb) / (l.tp + l.tb);
  if (!l || !pulsed(l)) return r.ip;
  return null;
}

const signed = (pct: number) => `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`;

export function checkReport(r: WeldReportRead, p: ProgramBody, wpsBook: readonly Wps[]): ReportCheck {
  const wps = p.wps.trim() ? wpsBook.find((w) => key(w.name) === key(p.wps)) ?? null : null;
  const k = wps?.basis === 'iso' ? processOf('gtaw').k : 1;
  const set = r.figures === 'programmed';
  const levels: LevelReport[] = r.levels.map((rl, i) => {
    const index = rl.level - 1 < p.levels.length ? rl.level - 1 : i < p.levels.length ? i : null;
    const l = index === null ? undefined : p.levels[index];
    const ipm = ipmOf(rl, p.od) ?? (l && l.rpm > 0 && p.od ? l.rpm * Math.PI * p.od : null);
    const rpm = rl.rpm ?? (ipm !== null && p.od && (rl.ipm !== null || rl.mmpm !== null) ? ipm / (Math.PI * p.od) : null);
    const avg = avgOf(rl, l);
    const heat = rl.volts !== null && avg !== null && ipm ? (rl.volts * avg * 60) / ipm : null;
    let inWps: LevelReport['wps'] = null;
    if (heat !== null && wps && (wps.heat.min !== null || wps.heat.max !== null)) {
      const jmm = (heat / MM_PER_IN) * k;
      inWps = wps.heat.min !== null && jmm < wps.heat.min ? 'low' : wps.heat.max !== null && jmm > wps.heat.max ? 'high' : 'in';
    }
    return {
      level: rl.level,
      index,
      ip: cmp(rl.ip, l?.ip),
      ib: l && pulsed(l) ? cmp(rl.ib, l.ib) : null,
      rpm: cmp(rpm, l?.rpm),
      volts: rl.volts,
      avg,
      ipm,
      heat,
      wps: inWps,
    };
  });

  const notes: string[] = [];
  const program = !r.program ? 'unknown' : key(r.program) === key(p.name) ? 'same' : 'differs';
  if (program === 'differs') notes.push(`The report is for program ${r.program}; this weld is on ${p.name}.`);
  if (r.levels.length && r.levels.length !== p.levels.length) notes.push(`The report has ${r.levels.length} level${r.levels.length === 1 ? '' : 's'}; the program has ${p.levels.length}.`);
  if (r.status === 'fault' || r.faults.length) notes.push(`${r.status === 'fault' ? 'The weld stopped on a fault' : 'The report shows'}: ${r.faults.join(', ') || 'no fault named'}.`);
  if (r.status === 'stopped') notes.push('The report says the weld was stopped by the operator.');
  for (const l of levels) {
    const what = [
      l.ip?.off && `peak current ${signed(l.ip.pct)}`,
      l.ib?.off && `background ${signed(l.ib.pct)}`,
      l.rpm?.off && `rotor speed ${signed(l.rpm.pct)}`,
    ].filter(Boolean);
    if (what.length) notes.push(`Level ${l.level} ${set ? 'is set' : 'ran'} off its program: ${what.join(', ')}.`);
    if (l.wps === 'low' || l.wps === 'high')
      notes.push(`Level ${l.level}'s heat input, ${Math.round(l.heat!)} J/in, is ${l.wps === 'low' ? 'under' : 'over'} ${wps!.name}'s window.`);
  }
  if (set && levels.some((l) => l.ip?.off || l.ib?.off || l.rpm?.off)) notes.push("These are the power supply's set figures: the program on the supply is not the one here.");
  return { levels, program, wps, notes };
}
