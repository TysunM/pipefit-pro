// Reading a pipe marking without a network
// ----------------------------------------
// Two things on a stencil are facts that code can read exactly, with no
// judgement and no signal: who made it, when the mill's name is on it, and
// the size and wall, when the mill printed the outside diameter and the wall
// thickness ("6.625 X .280"). The outside diameter says the nominal size, and
// the wall on that size says the schedule — from the ASME tables, not a
// guess. Jev reads the words; this reads the numbers.

import { PIPE_SIZES } from './pipe';

/**
 * Wall thickness by schedule, inches, ASME B36.10M (carbon and alloy) and
 * B36.19M (the S schedules, stainless). Several schedules share a wall on one
 * size — 6" SCH 40, STD and 40S are all .280 — so a wall can name more than
 * one, and which to call it is decided with the grade, elsewhere.
 */
export const WALLS: Record<number, Record<string, number>> = {
  0.5: { '5S': 0.065, '10S': 0.083, '10': 0.083, '40': 0.109, STD: 0.109, '40S': 0.109, '80': 0.147, XS: 0.147, '80S': 0.147, '160': 0.188, XXS: 0.294 },
  0.75: { '5S': 0.065, '10S': 0.083, '10': 0.083, '40': 0.113, STD: 0.113, '40S': 0.113, '80': 0.154, XS: 0.154, '80S': 0.154, '160': 0.219, XXS: 0.308 },
  1: { '5S': 0.065, '10S': 0.109, '10': 0.109, '40': 0.133, STD: 0.133, '40S': 0.133, '80': 0.179, XS: 0.179, '80S': 0.179, '160': 0.25, XXS: 0.358 },
  1.25: { '5S': 0.065, '10S': 0.109, '10': 0.109, '40': 0.14, STD: 0.14, '40S': 0.14, '80': 0.191, XS: 0.191, '80S': 0.191, '160': 0.25, XXS: 0.382 },
  1.5: { '5S': 0.065, '10S': 0.109, '10': 0.109, '40': 0.145, STD: 0.145, '40S': 0.145, '80': 0.2, XS: 0.2, '80S': 0.2, '160': 0.281, XXS: 0.4 },
  2: { '5S': 0.065, '10S': 0.109, '10': 0.109, '40': 0.154, STD: 0.154, '40S': 0.154, '80': 0.218, XS: 0.218, '80S': 0.218, '160': 0.344, XXS: 0.436 },
  2.5: { '5S': 0.083, '10S': 0.12, '10': 0.12, '40': 0.203, STD: 0.203, '40S': 0.203, '80': 0.276, XS: 0.276, '80S': 0.276, '160': 0.375, XXS: 0.552 },
  3: { '5S': 0.083, '10S': 0.12, '10': 0.12, '40': 0.216, STD: 0.216, '40S': 0.216, '80': 0.3, XS: 0.3, '80S': 0.3, '160': 0.438, XXS: 0.6 },
  3.5: { '5S': 0.083, '10S': 0.12, '10': 0.12, '40': 0.226, STD: 0.226, '40S': 0.226, '80': 0.318, XS: 0.318, '80S': 0.318 },
  4: { '5S': 0.083, '10S': 0.12, '10': 0.12, '40': 0.237, STD: 0.237, '40S': 0.237, '80': 0.337, XS: 0.337, '80S': 0.337, '120': 0.438, '160': 0.531, XXS: 0.674 },
  5: { '5S': 0.109, '10S': 0.134, '10': 0.134, '40': 0.258, STD: 0.258, '40S': 0.258, '80': 0.375, XS: 0.375, '80S': 0.375, '120': 0.5, '160': 0.625, XXS: 0.75 },
  6: { '5S': 0.109, '10S': 0.134, '10': 0.134, '40': 0.28, STD: 0.28, '40S': 0.28, '80': 0.432, XS: 0.432, '80S': 0.432, '120': 0.562, '160': 0.719, XXS: 0.864 },
  8: {
    '5S': 0.109, '10S': 0.148, '10': 0.148, '20': 0.25, '30': 0.277, '40': 0.322, STD: 0.322, '40S': 0.322, '60': 0.406,
    '80': 0.5, XS: 0.5, '80S': 0.5, '100': 0.594, '120': 0.719, '140': 0.812, '160': 0.906, XXS: 0.875,
  },
  10: {
    '5S': 0.134, '10S': 0.165, '10': 0.165, '20': 0.25, '30': 0.307, '40': 0.365, STD: 0.365, '40S': 0.365, '60': 0.5,
    XS: 0.5, '80S': 0.5, '80': 0.594, '100': 0.719, '120': 0.844, '140': 1.0, '160': 1.125, XXS: 1.0,
  },
  12: {
    '5S': 0.156, '10S': 0.18, '10': 0.18, '20': 0.25, '30': 0.33, STD: 0.375, '40S': 0.375, '40': 0.406, XS: 0.5, '80S': 0.5,
    '60': 0.562, '80': 0.688, '100': 0.844, '120': 1.0, '140': 1.125, '160': 1.312, XXS: 1.0,
  },
  14: {
    '5S': 0.156, '10S': 0.188, '10': 0.25, '20': 0.312, '30': 0.375, STD: 0.375, '40': 0.438, XS: 0.5, '60': 0.594,
    '80': 0.75, '100': 0.938, '120': 1.094, '140': 1.25, '160': 1.406,
  },
  16: {
    '5S': 0.165, '10S': 0.188, '10': 0.25, '20': 0.312, '30': 0.375, STD: 0.375, '40': 0.5, XS: 0.5, '60': 0.656,
    '80': 0.844, '100': 1.031, '120': 1.219, '140': 1.438, '160': 1.594,
  },
  18: {
    '5S': 0.165, '10S': 0.188, '10': 0.25, '20': 0.312, STD: 0.375, '30': 0.438, XS: 0.5, '40': 0.562, '60': 0.75,
    '80': 0.938, '100': 1.156, '120': 1.375, '140': 1.562, '160': 1.781,
  },
  20: {
    '5S': 0.188, '10S': 0.218, '10': 0.25, '20': 0.375, STD: 0.375, '30': 0.5, XS: 0.5, '40': 0.594, '60': 0.812,
    '80': 1.031, '100': 1.281, '120': 1.5, '140': 1.75, '160': 1.969,
  },
  24: {
    '5S': 0.218, '10S': 0.25, '10': 0.25, '20': 0.375, STD: 0.375, XS: 0.5, '30': 0.562, '40': 0.688, '60': 0.969,
    '80': 1.219, '100': 1.531, '120': 1.812, '140': 2.062, '160': 2.344,
  },
};

/** Tables round to the thousandth, and some print .687 where others print .688. */
const WALL_TOL = 0.0015;
/** A millimetre wall, turned to inches, carries its own rounding: 7.11 mm is 0.27992". */
const WALL_TOL_MM = 0.004;
const OD_TOL = 0.006;
const OD_TOL_MM = 0.6;
const MM = 25.4;

/** The schedules a wall on a size can be called, or none when the tables have no such wall. */
export function schedulesFor(nps: number, wall: number, tol = WALL_TOL): string[] {
  const row = WALLS[nps];
  if (!row) return [];
  return Object.entries(row)
    .filter(([, w]) => Math.abs(w - wall) <= tol)
    .map(([s]) => s);
}

/** What the numbers on a marking say. Each part only when it was read, and read one way. */
export type Dimensions = { nps: number; schedules: string[] };

const NUM = String.raw`(\d{1,3}(?:\.\d{1,3})?|\.\d{2,3})`;
const FRACTION = String.raw`(\d{1,2})[ -](\d{1,2})\/(\d{1,2})`;
const INCH = String.raw`(?:"|''|IN\.?|INCH(?:ES)?)?`;
const UNIT = String.raw`(?:"|''|IN\.?|INCH(?:ES)?|MM)?`;
const BY = String.raw`\s*${UNIT}\s*(?:O\.?D\.?)?\s*[X×*]\s*`;
const PAIR = new RegExp(String.raw`(?:${FRACTION}|${NUM})${BY}${NUM}\s*${UNIT}\s*(?:W\.?T\.?)?`, 'gi');

/** Stencil text as numbers can be read off it: one kind of quote, a decimal point, one space. */
function tidy(text: string): string {
  return text
    .toUpperCase()
    .replace(/[″”“]/g, '"')
    .replace(/(\d),(\d{3})(?!\d)/g, '$1.$2')
    .replace(/\s+/g, ' ');
}

/**
 * The size and schedule from an outside diameter and a wall, where the
 * marking gives both. The first number can be the true OD ("6.625"), the
 * size as fitters write it ("6", "6-5/8"), or millimetres ("168.3 X 7.11");
 * each reading is tried, and one is kept only when the wall is a wall the
 * tables have on that size. "4 X .237" is 4" SCH 40 and not the 3-1/2" whose
 * OD is 4.000, because .237 is a 4" wall and no 3-1/2" one.
 */
export function readDimensions(text: string): Dimensions | null {
  const found = new Map<number, Set<string>>();
  for (const m of tidy(text).matchAll(PAIR)) {
    const [, whole, num, den, first, second] = m;
    const a = whole ? Number(whole) + Number(num) / Number(den) : Number(first);
    const b = Number(second);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) continue;
    for (const s of PIPE_SIZES) {
      const tries: { wall: number; tol: number }[] = [];
      if (Math.abs(s.od - a) <= OD_TOL || Math.abs(s.nps - a) < 1e-9) tries.push({ wall: b, tol: WALL_TOL });
      if (a > 12 && Math.abs(s.od * MM - a) <= OD_TOL_MM) tries.push({ wall: b / MM, tol: WALL_TOL_MM });
      for (const t of tries) {
        const sch = schedulesFor(s.nps, t.wall, t.tol);
        if (!sch.length) continue;
        const set = found.get(s.nps) ?? new Set<string>();
        sch.forEach((x) => set.add(x));
        found.set(s.nps, set);
      }
    }
  }
  // Two sizes read off one marking is a misread somewhere: neither is offered.
  if (found.size !== 1) return null;
  const [nps, set] = [...found.entries()][0]!;
  return { nps, schedules: [...set] };
}

/**
 * Mills, as they stencil themselves. Only names that mean the mill wherever
 * they turn up: a short code that is also a connection, a grade or a word
 * ("VAM", "USS") is left out, because a wrong mill on a heat record is worse
 * than an empty one.
 */
const MILLS: { name: string; marks: string[] }[] = [
  { name: 'Tenaris', marks: ['TENARIS', 'SIDERCA', 'DALMINE', 'TAMSA', 'TENARIS HYDRIL'] },
  { name: 'Vallourec', marks: ['VALLOUREC', 'V & M STAR', 'V&M STAR'] },
  { name: 'Nippon Steel', marks: ['NIPPON STEEL', 'NSSMC'] },
  { name: 'Sumitomo', marks: ['SUMITOMO'] },
  { name: 'JFE Steel', marks: ['JFE'] },
  { name: 'TMK IPSCO', marks: ['TMK IPSCO', 'IPSCO', 'TMK'] },
  { name: 'U.S. Steel', marks: ['U.S. STEEL', 'US STEEL', 'U. S. STEEL'] },
  { name: 'Wheatland Tube', marks: ['WHEATLAND'] },
  { name: 'Nucor Tubular', marks: ['NUCOR'] },
  { name: 'Zekelman', marks: ['ZEKELMAN'] },
  { name: 'Atlas Tube', marks: ['ATLAS TUBE'] },
  { name: 'Bull Moose Tube', marks: ['BULL MOOSE'] },
  { name: 'Northwest Pipe', marks: ['NORTHWEST PIPE'] },
  { name: 'Welspun', marks: ['WELSPUN'] },
  { name: 'Tata Steel', marks: ['TATA STEEL'] },
  { name: 'Jindal', marks: ['JINDAL'] },
  { name: 'Maharashtra Seamless', marks: ['MAHARASHTRA SEAMLESS'] },
  { name: 'ISMT', marks: ['ISMT'] },
  { name: 'TPCO', marks: ['TPCO', 'TIANJIN PIPE'] },
  { name: 'Hengyang Valin', marks: ['HENGYANG', 'HYST'] },
  { name: 'Baosteel', marks: ['BAOSTEEL', 'BAOSHAN'] },
  { name: 'Borusan', marks: ['BORUSAN'] },
  { name: 'ArcelorMittal', marks: ['ARCELORMITTAL', 'ARCELOR MITTAL'] },
  { name: 'Tubos Reunidos', marks: ['TUBOS REUNIDOS'] },
  { name: 'Tubacex', marks: ['TUBACEX'] },
  { name: 'Sandvik', marks: ['SANDVIK'] },
  { name: 'Outokumpu', marks: ['OUTOKUMPU'] },
  { name: 'Plymouth Tube', marks: ['PLYMOUTH TUBE'] },
  { name: 'Marcegaglia', marks: ['MARCEGAGLIA'] },
  { name: 'Bristol Metals', marks: ['BRISTOL METALS'] },
  { name: 'Felker Brothers', marks: ['FELKER'] },
  { name: 'Ta Chen', marks: ['TA CHEN'] },
  { name: 'Evraz', marks: ['EVRAZ'] },
  { name: 'Benteler', marks: ['BENTELER'] },
  { name: 'Mannesmann', marks: ['MANNESMANN', 'SALZGITTER'] },
  { name: 'SeAH Steel', marks: ['SEAH STEEL'] },
  { name: 'Husteel', marks: ['HUSTEEL'] },
  { name: 'Tube Forgings of America', marks: ['TUBE FORGINGS', 'TFA'] },
  { name: 'Weldbend', marks: ['WELDBEND'] },
  { name: 'Bonney Forge', marks: ['BONNEY FORGE', 'BONNEY'] },
  { name: 'Mills Iron Works', marks: ['MILLS IRON'] },
  { name: 'Ladish', marks: ['LADISH', 'HACKNEY LADISH'] },
  { name: 'Boltex', marks: ['BOLTEX'] },
  { name: 'Ulma', marks: ['ULMA'] },
  { name: 'Galperti', marks: ['GALPERTI'] },
  { name: 'Maass Flange', marks: ['MAASS'] },
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
const MILL_RE = MILLS.map((m) => ({ name: m.name, re: new RegExp(`(?:^|[^A-Z0-9])(?:${m.marks.map(escape).join('|')})(?![A-Z0-9])`) }));

/** The mill named on the marking, when exactly one is. */
export function readMill(text: string): string | null {
  const t = tidy(text);
  const hits = MILL_RE.filter((m) => m.re.test(t)).map((m) => m.name);
  return hits.length === 1 ? hits[0]! : null;
}
