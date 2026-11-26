// The weld report reader
// ----------------------
// An orbital power supply prints a report at the end of a weld (or shows one
// on its screen): the schedule it ran, the weld's count, and level by level
// the current, the voltage, the speed and the time, with any fault it
// stopped on. Photographed, it is read into the weld's run sheet, where the
// app sets it against the program (calc/orbitalReport.ts): did the weld run
// as the program says, what heat did it put in, inside the WPS?
//
// The same road as every photo: the free vision model first, Claude only
// when that cannot read it, the picture not kept, and nothing written to
// the weld until the fitter keeps it.

import { MAX_PHOTO_BODY, askPhoto, photoMissOf, photoMissWords, str, type PhotoMiss } from './photoRead';

export const WELD_REPORT_PATH = '/api/weld-report';
export const MAX_REPORT_BODY = MAX_PHOTO_BODY;
export const MAX_REPORT_LEVELS = 24;

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export const REPORT_SYSTEM = [
  'You read the weld report an orbital welding power supply prints, or shows on its screen, at the end of a weld, photographed by a pipefitter on a job.',
  'The fitter checks the weld against its program and its procedure from what you read, so read only what is printed. Never estimate, never fill a figure in from what such welds usually run at, and never carry a figure from one level to another. A figure you cannot read clearly is 0 and named in `unread`.',
  '',
  'Rules:',
  '- program: the weld schedule or program name or number as printed, else "". weldNo: the weld number or counter for this weld, else "". date and time: as printed, else "". operator: the operator or welder as printed, else "". machine: the power supply model and serial if printed, else "".',
  '- figures: "actual" if the figures are the measured values of this weld, "programmed" if they are the schedule\'s set values, "" if the report does not say. Where a report prints both for each level, give the actual (measured) values.',
  '- levels: one row per level (or segment) in order. level is its number as printed. ip is the peak (primary) current in amps; ib the background current in amps, 0 if not printed or not pulsed; avg the average current in amps if printed, else 0; volts the arc voltage if printed, else 0; secs the level\'s time in seconds if printed, else 0.',
  '- Speed, in the unit printed: rpm if printed as RPM; ipm if printed in inches per minute (IPM, in/min); mmpm if printed in millimetres per minute. The others 0.',
  '- faults: every fault, alarm or error the report prints, each as printed ("ARC START FAIL", "LOW GAS", "E07 OVERCURRENT"). Empty if none.',
  '- status: "complete" if the report says the weld completed, "fault" if it stopped on a fault, "stopped" if stopped by the operator, "" if it does not say.',
  'If the picture is not an orbital weld report, return no levels and no faults and say what it is in `unread`. Keep `unread` to one or two plain sentences.',
].join('\n');

const num = { type: 'number' } as const;
export const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    program: { type: 'string' },
    weldNo: { type: 'string' },
    date: { type: 'string' },
    time: { type: 'string' },
    operator: { type: 'string' },
    machine: { type: 'string' },
    figures: { type: 'string', enum: ['actual', 'programmed', ''] },
    levels: {
      type: 'array',
      items: {
        type: 'object',
        properties: { level: num, ip: num, ib: num, avg: num, volts: num, rpm: num, ipm: num, mmpm: num, secs: num },
        required: ['level', 'ip', 'ib', 'avg', 'volts', 'rpm', 'ipm', 'mmpm', 'secs'],
        additionalProperties: false,
      },
    },
    faults: { type: 'array', items: { type: 'string' } },
    status: { type: 'string', enum: ['complete', 'fault', 'stopped', ''] },
    unread: { type: 'string' },
  },
  required: ['program', 'weldNo', 'date', 'time', 'operator', 'machine', 'figures', 'levels', 'faults', 'status', 'unread'],
  additionalProperties: false,
} as const;

export const REPORT_PROMPT = 'Read this orbital weld report: the program, the weld number, each level\'s current, voltage, speed and time, and any fault.';

export type ReportLevel = { level: number; ip: number | null; ib: number | null; avg: number | null; volts: number | null; rpm: number | null; ipm: number | null; mmpm: number | null; secs: number | null };
export type WeldReportRead = {
  program: string;
  weldNo: string;
  date: string;
  time: string;
  operator: string;
  machine: string;
  figures: 'actual' | 'programmed' | '';
  levels: ReportLevel[];
  faults: string[];
  status: 'complete' | 'fault' | 'stopped' | '';
  unread: string;
};

/** A figure a report could print: a finite number above nothing and under a ceiling, else not printed. */
const fig = (v: unknown, max: number): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= max ? v : null);

/** A reply held to shape, or null. A level with nothing on it is dropped; the order is the report's. */
export function readReport(v: unknown): WeldReportRead | null {
  if (!isRec(v) || !Array.isArray(v.levels) || !Array.isArray(v.faults)) return null;
  const levels: ReportLevel[] = [];
  for (const l of v.levels.slice(0, MAX_REPORT_LEVELS)) {
    if (!isRec(l)) continue;
    const level = typeof l.level === 'number' && Number.isInteger(l.level) && l.level > 0 && l.level <= 99 ? l.level : levels.length + 1;
    const row: ReportLevel = {
      level,
      ip: fig(l.ip, 1000),
      ib: fig(l.ib, 1000),
      avg: fig(l.avg, 1000),
      volts: fig(l.volts, 80),
      rpm: fig(l.rpm, 100),
      ipm: fig(l.ipm, 200),
      mmpm: fig(l.mmpm, 5000),
      secs: fig(l.secs, 3600),
    };
    if (row.ip === null && row.avg === null && row.volts === null && row.rpm === null && row.ipm === null && row.mmpm === null && row.secs === null) continue;
    levels.push(row);
  }
  const figures = v.figures === 'actual' || v.figures === 'programmed' ? v.figures : '';
  const status = v.status === 'complete' || v.status === 'fault' || v.status === 'stopped' ? v.status : '';
  return {
    program: str(v.program, 40),
    weldNo: str(v.weldNo, 40),
    date: str(v.date, 20),
    time: str(v.time, 20),
    operator: str(v.operator, 40),
    machine: str(v.machine, 60),
    figures,
    levels,
    faults: v.faults.map((f) => str(f, 60)).filter(Boolean).slice(0, 10),
    status,
    unread: str(v.unread, 300),
  };
}

export type ReportMiss = PhotoMiss;

export const reportMissWords = (m: ReportMiss): string =>
  photoMissWords(m, 'Check the levels against the power supply by eye instead.', 'Fill the frame with the printout or the screen, square on and in good light, and try again.');

export const reportMissOf = photoMissOf;

/** Send a report's picture to be read. The answer is held to shape here; the comparing is orbitalReport.ts'. */
export const askWeldReport = (base: string, image: string, opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}): Promise<WeldReportRead | ReportMiss> =>
  askPhoto(base, WELD_REPORT_PATH, image, 'report', readReport, opts);
