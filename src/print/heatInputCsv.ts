// The heat input log as a spreadsheet
// -----------------------------------
// One row per saved heat input, in the units the reader has set, with the
// WPS it was checked against and how it came out, and the job's own fields as
// columns, for the PQR file or the QC folder. Text a man
// typed is quoted where it must be and never starts with = + - or @, so a
// spreadsheet opening it cannot take a welder's note for a formula.

import { figure, inHeatUnit, inSpeedUnit, MM_PER_IN, processOf, type HeatUnit, type SpeedUnit } from '../calc/heatInput';
import type { HeatInputEntry } from '../state/heatInputLog';
import { verdictLine } from '../state/wpsBook';

const cell = (s: string): string => {
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const pad = (n: number) => String(n).padStart(2, '0');
const stamp = (at: number): [string, string] => {
  const d = new Date(at);
  return [`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, `${pad(d.getHours())}:${pad(d.getMinutes())}`];
};

/** Plain figures for a spreadsheet: no thousands commas. */
const num = (v: number | null, places = 3): string => (v === null ? '' : String(Number(v.toFixed(places))));

export function heatInputCsv(entries: readonly HeatInputEntry[], o: { heat: HeatUnit; speed: SpeedUnit; imperial: boolean; fieldNames: readonly string[] }): string {
  const names = [...o.fieldNames];
  for (const e of entries) for (const f of e.fields) if (!names.some((n) => n.toLowerCase() === f.name.toLowerCase())) names.push(f.name);
  const lengthUnit = o.imperial ? 'in' : 'mm';
  const head = [
    'Date',
    'Time',
    'Project',
    'Method',
    'Process',
    'Efficiency k',
    'Amps (A)',
    'Volts (V)',
    'Energy (kJ)',
    `Length (${lengthUnit})`,
    'Round pipe',
    'Arc time (s)',
    `Travel speed (${o.speed})`,
    `Arc energy (${o.heat})`,
    `Heat input (${o.heat})`,
    'Checked against',
    'WPS check',
    ...names,
  ];
  const rows = entries.map((e) => {
    const [day, time] = stamp(e.createdAt);
    const value = (n: string) => e.fields.find((f) => f.name.toLowerCase() === n.toLowerCase())?.value ?? '';
    return [
      day,
      time,
      e.project,
      e.mode === 'energy' ? 'Total energy' : 'Volts and amps',
      processOf(e.process).label,
      String(e.k),
      num(e.amps, 1),
      num(e.volts, 1),
      num(e.energyKJ, 3),
      num(o.imperial ? e.lengthMm / MM_PER_IN : e.lengthMm, o.imperial ? 3 : 1),
      e.around ? 'Yes' : 'No',
      num(e.seconds, 1),
      e.travel === null ? '' : figure(inSpeedUnit(e.travel, o.speed)).replace(/,/g, ''),
      figure(inHeatUnit(e.arcEnergy, o.heat)).replace(/,/g, ''),
      figure(inHeatUnit(e.heatInput, o.heat)).replace(/,/g, ''),
      e.wps?.name ?? '',
      e.wps ? (e.wps.out.length ? `Out of range: ${verdictLine(e.wps, o)}` : e.wps.checked.length ? 'In range' : 'Not checked') : '',
      ...names.map(value),
    ];
  });
  return [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
