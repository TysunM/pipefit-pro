// Heat input
// ----------
// What a weld put into the joint per length of weld, the figure a WPS sets a
// range on and a PQR records. Two ways in, as the codes allow:
//
//   Volts and amps (ASME IX QW-409.1(a), AWS D1.1, ISO/TR 17671-1):
//     arc energy = volts x amps x arc time / length welded
//   Total energy, for the waveform-controlled machines that read it out
//   (ASME IX QW-409.1(c)): arc energy = energy shown / length welded
//
// The European codes then multiply by the process's thermal efficiency, k
// (ISO/TR 17671-1, formerly EN 1011-1): 1.0 for submerged arc, 0.8 for stick,
// MIG/MAG and flux core, 0.6 for TIG and plasma. ASME IX and AWS D1.1 use no
// efficiency, which is "None" here and the default.
//
// The length can be a straight length or, for a pass all the way round a
// pipe, its diameter: the length is then pi x D. Everything is worked in
// millimetres, seconds and joules and only turned into the reader's units at
// the end, so changing units never changes an answer.

export type HeatUnit = 'kJ/mm' | 'kJ/in' | 'J/mm' | 'J/in';
export type SpeedUnit = 'mm/min' | 'mm/s' | 'cm/min' | 'in/min';
/** Unit settings as kept: a unit, or auto to follow the app's imperial or metric. */
export type HeatUnitSetting = 'auto' | HeatUnit;
export type SpeedUnitSetting = 'auto' | SpeedUnit;
export type ArcMode = 'va' | 'energy';

export const HEAT_UNITS: readonly HeatUnit[] = ['kJ/in', 'J/in', 'kJ/mm', 'J/mm'];
export const SPEED_UNITS: readonly SpeedUnit[] = ['in/min', 'mm/min', 'mm/s', 'cm/min'];

export const MM_PER_IN = 25.4;

export type Process = { id: string; label: string; k: number };

/** Thermal efficiency by process, ISO/TR 17671-1 Table 1. "None" is the ASME IX and AWS D1.1 figure. */
export const PROCESSES: readonly Process[] = [
  { id: 'none', label: 'None (ASME IX)', k: 1 },
  { id: 'saw', label: 'SAW', k: 1 },
  { id: 'smaw', label: 'SMAW stick', k: 0.8 },
  { id: 'gmaw', label: 'GMAW MIG/MAG', k: 0.8 },
  { id: 'fcaw', label: 'FCAW flux core', k: 0.8 },
  { id: 'gtaw', label: 'GTAW TIG', k: 0.6 },
  { id: 'paw', label: 'Plasma', k: 0.6 },
];

export const processOf = (id: string): Process => PROCESSES.find((p) => p.id === id) ?? PROCESSES[0]!;

export const heatUnitFor = (s: HeatUnitSetting, imperial: boolean): HeatUnit => (s === 'auto' ? (imperial ? 'kJ/in' : 'kJ/mm') : s);
export const speedUnitFor = (s: SpeedUnitSetting, imperial: boolean): SpeedUnit => (s === 'auto' ? (imperial ? 'in/min' : 'mm/min') : s);

export type HeatInputArgs = {
  mode: ArcMode;
  amps?: number | null;
  volts?: number | null;
  /** The machine's total energy, kilojoules (total-energy mode). */
  energyKJ?: number | null;
  /** Length welded, mm. */
  lengthMm: number | null;
  /** Arc time, seconds. Needed for volts and amps; in total-energy mode only for the travel speed. */
  seconds: number | null;
  k: number;
};

export type HeatInputResult = {
  /** Before the efficiency, J/mm. */
  arcEnergy: number;
  /** After it, J/mm. */
  heatInput: number;
  /** mm/s, or null when no arc time was given. */
  travel: number | null;
};

const pos = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

/** The heat input, or null until there is enough to work it. */
export function heatInput(a: HeatInputArgs): HeatInputResult | null {
  if (!pos(a.lengthMm) || !(a.k > 0 && a.k <= 1)) return null;
  const travel = pos(a.seconds) ? a.lengthMm / a.seconds : null;
  let arcEnergy: number;
  if (a.mode === 'energy') {
    if (!pos(a.energyKJ)) return null;
    arcEnergy = (a.energyKJ * 1000) / a.lengthMm;
  } else {
    if (!pos(a.amps) || !pos(a.volts) || !pos(a.seconds)) return null;
    arcEnergy = (a.volts * a.amps * a.seconds) / a.lengthMm;
  }
  return { arcEnergy, heatInput: arcEnergy * a.k, travel };
}

/** J/mm in the reader's unit. */
export function inHeatUnit(jPerMm: number, u: HeatUnit): number {
  switch (u) {
    case 'J/mm':
      return jPerMm;
    case 'kJ/mm':
      return jPerMm / 1000;
    case 'J/in':
      return jPerMm * MM_PER_IN;
    case 'kJ/in':
      return (jPerMm * MM_PER_IN) / 1000;
  }
}

/** mm/s in the reader's unit. */
export function inSpeedUnit(mmPerS: number, u: SpeedUnit): number {
  switch (u) {
    case 'mm/s':
      return mmPerS;
    case 'mm/min':
      return mmPerS * 60;
    case 'cm/min':
      return mmPerS * 6;
    case 'in/min':
      return (mmPerS * 60) / MM_PER_IN;
  }
}

/** The length welded, mm: as measured, or round the pipe from its diameter. */
export const weldLength = (value: number | null, imperial: boolean, around: boolean): number | null => {
  if (!pos(value)) return null;
  const mm = imperial ? value * MM_PER_IN : value;
  return around ? Math.PI * mm : mm;
};

/** Three significant figures, the way a WPS range is written: 1.23, 12.3, 123, 1,234. */
export function figure(v: number): string {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  const s = a >= 1000 ? String(Math.round(v)) : String(Number(v.toPrecision(3)));
  const [whole, frac] = s.split('.');
  return `${whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${frac === undefined ? '' : `.${frac}`}`;
}

// ------------------------------------------------------------ arc time

/**
 * Arc time as typed: plain seconds (42, 42.5), minutes and seconds (1:30), or
 * hours, minutes and seconds (1:02:30). Null for anything else.
 */
export function parseDuration(text: string): number | null {
  const s = text.trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) {
    const v = Number(s);
    return v > 0 ? v : null;
  }
  const parts = s.split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  if (!parts.every((p, i) => (i === parts.length - 1 ? /^\d{1,2}(\.\d+)?$/ : /^\d{1,3}$/).test(p))) return null;
  const n = parts.map(Number);
  const sec = n[n.length - 1]!;
  const min = n[n.length - 2]!;
  const hr = n.length === 3 ? n[0]! : 0;
  if (sec >= 60 || (n.length === 3 && min >= 60)) return null;
  const total = hr * 3600 + min * 60 + sec;
  return total > 0 ? total : null;
}

/** Seconds as the arc-time field shows them: 0:42, 1:30, 1:02:30. Tenths only under a minute. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '';
  if (seconds < 60) {
    const tenths = Math.round(seconds * 10) / 10;
    if (tenths < 60) return `0:${tenths < 10 ? '0' : ''}${tenths % 1 ? tenths.toFixed(1) : tenths}`;
  }
  const whole = Math.round(seconds);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const sec = whole % 60;
  const pad = (x: number) => String(x).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
