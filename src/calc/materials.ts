// What the pipe is made of
// ------------------------
// A size and a schedule only mean something once the material is known.
// Stainless walls (B36.19, the "S" schedules) part company with carbon steel
// (B36.10) at 10" and up; cast iron soil pipe and ductile iron are not on the
// steel OD at all; plastics weigh a fifth of steel and grow five to fifteen
// times as much with heat; and chrome-moly carries preheat and heat treatment
// that carbon steel does not. So the material is chosen once, with the size
// and wall, and everything that depends on it reads it from here.
//
// Dimensions are from the standards named on each table. The welding entries
// are a reference, not a procedure: preheat, heat treatment and filler come
// from the job's WPS, and the code tables they come from have changed between
// B31.3 editions. Where a figure is given it is the B31.3 table value; where a
// figure moved between editions, the table is named and no number is guessed.

import { PIPE_SIZES } from './pipe';

export type MaterialId = 'cs' | 'galv' | 'ss304l' | 'ss316l' | 'p11' | 'p22' | 'p9' | 'p91' | 'ci-soil' | 'ductile' | 'pvc' | 'cpvc' | 'hdpe' | 'ptfe';

export type MaterialGroup = 'Steels' | 'Chrome-moly' | 'Iron' | 'Plastics & lined';

/** How the pipe is joined in the field, which decides which takeouts apply. */
export type Joining = 'butt-weld' | 'no-hub' | 'push-on' | 'solvent' | 'fusion' | 'flanged';

export const JOINING_LABEL: Record<Joining, string> = {
  'butt-weld': 'Butt weld (threaded and socket weld in small bore)',
  'no-hub': 'No-hub couplings (CISPI 310) — not welded',
  'push-on': 'Push-on or mechanical joint (AWWA C111) — not field welded',
  solvent: 'Primer and solvent cement into socket fittings',
  fusion: 'Butt fusion (ASTM F2620)',
  flanged: 'Flanged factory spools — not cut or welded in the field',
};

/** The wall table a material is sized from. */
type DimSet = 'steel' | 'stainless' | 'plastic' | 'ci-soil' | 'ductile' | 'hdpe';

/** Welding reference, for a material that is welded. Text, to be read against the WPS. */
export type WeldRef = { pNo: string; filler: string; preheat: string; pwht: string };

export type Material = {
  id: MaterialId;
  name: string;
  /** A few characters for a card: "CS", "316L", "P91". */
  short: string;
  group: MaterialGroup;
  /** The pipe specification it is bought to. */
  spec: string;
  dims: DimSet;
  /** Wall designations, thinnest first; the first listed is not the default. */
  walls: readonly string[];
  defaultWall: string;
  /** lb per cubic inch. */
  density: number;
  /** Mean thermal expansion, inches per 100 ft per 100 °F, from about 70 °F. */
  expansion: number;
  joining: Joining;
  /** Highest service temperature commonly allowed, °F, where the material sets one a fitter needs to know. */
  maxTempF?: number;
  weld?: WeldRef;
  /** What a fitter is told about it. */
  notes: readonly string[];
  /** What it is called out loud. Longest first is not required; matching takes the longest. */
  words: readonly string[];
};

const STEEL_WALLS = ['10', '40', 'STD', '80', 'XS', '160', 'XXS'] as const;

const P1: WeldRef = {
  pNo: 'P-1 Gr 1',
  filler: 'E7018 / ER70S-6 (E6010 root where allowed)',
  preheat: '50 °F min; 175 °F over 1" wall or over 71 ksi SMTS (B31.3 Table 330.1.1)',
  pwht: 'Over 3/4" wall: 1100–1200 °F, 1 hr/in, 1 hr min (B31.3 Table 331.1.1)',
};

export const MATERIALS: readonly Material[] = [
  {
    id: 'cs',
    name: 'Carbon steel',
    short: 'CS',
    group: 'Steels',
    spec: 'ASTM A106 Gr B / A53 Gr B',
    dims: 'steel',
    walls: STEEL_WALLS,
    defaultWall: '40',
    density: 0.2833,
    expansion: 0.78,
    joining: 'butt-weld',
    weld: P1,
    notes: ['A106 is seamless; A53 Type E is ERW and Type F furnace butt-welded (not for bending or flaring).'],
    words: ['carbon steel', 'carbon', 'black iron', 'black pipe', 'cs', 'a106', 'a53', 'steel'],
  },
  {
    id: 'galv',
    name: 'Galvanized steel',
    short: 'GALV',
    group: 'Steels',
    spec: 'ASTM A53 galvanized',
    dims: 'steel',
    walls: STEEL_WALLS,
    defaultWall: '40',
    density: 0.2833,
    expansion: 0.78,
    joining: 'butt-weld',
    weld: { ...P1, filler: 'E6010 / E7018 after the zinc is ground back' },
    notes: [
      'Usually threaded or grooved, not welded. Where it is welded, grind the zinc back and ventilate: zinc fume is a known hazard. Cold-galvanize the joint after.',
    ],
    words: ['galvanized', 'galvanised', 'galv', 'galvy'],
  },
  {
    id: 'ss304l',
    name: 'Stainless 304L',
    short: '304L',
    group: 'Steels',
    spec: 'ASTM A312 TP304L',
    dims: 'stainless',
    walls: ['5S', '10S', '40S', '80S', '160', 'XXS'],
    defaultWall: '10S',
    density: 0.289,
    expansion: 1.15,
    joining: 'butt-weld',
    weld: {
      pNo: 'P-8 Gr 1',
      filler: 'ER308L / E308L-16',
      preheat: 'None; 50 °F min. Keep interpass under 350 °F (WPS sets it)',
      pwht: 'Not required (B31.3 Table 331.1.1)',
    },
    notes: [
      'S-schedule walls (B36.19) are not the carbon steel walls from 10" up: 12" 40S is 0.375", 12" Sch 40 is 0.406".',
      'Purge the root (argon) and keep carbon steel tools, brushes and grinding discs off it.',
    ],
    words: ['stainless 304', 'stainless 304l', '304 stainless', '304l', '304', 'ss 304'],
  },
  {
    id: 'ss316l',
    name: 'Stainless 316L',
    short: '316L',
    group: 'Steels',
    spec: 'ASTM A312 TP316L',
    dims: 'stainless',
    walls: ['5S', '10S', '40S', '80S', '160', 'XXS'],
    defaultWall: '10S',
    density: 0.289,
    expansion: 1.15,
    joining: 'butt-weld',
    weld: {
      pNo: 'P-8 Gr 1',
      filler: 'ER316L / E316L-16',
      preheat: 'None; 50 °F min. Keep interpass under 350 °F (WPS sets it)',
      pwht: 'Not required (B31.3 Table 331.1.1)',
    },
    notes: [
      'S-schedule walls (B36.19) are not the carbon steel walls from 10" up: 12" 40S is 0.375", 12" Sch 40 is 0.406".',
      'Purge the root (argon) and keep carbon steel tools, brushes and grinding discs off it.',
    ],
    words: ['stainless 316', 'stainless 316l', '316 stainless', '316l', '316', 'ss 316', 'stainless steel', 'stainless', 'ss'],
  },
  {
    id: 'p11',
    name: 'Chrome-moly P11 (1-1/4Cr-1/2Mo)',
    short: 'P11',
    group: 'Chrome-moly',
    spec: 'ASTM A335 P11',
    dims: 'steel',
    walls: STEEL_WALLS,
    defaultWall: '80',
    density: 0.2833,
    expansion: 0.8,
    joining: 'butt-weld',
    weld: {
      pNo: 'P-4 Gr 1',
      filler: 'E8018-B2 / ER80S-B2',
      preheat: '250 °F min (B31.3 Table 330.1.1)',
      pwht: 'Required over 1/2" wall — holding range per B31.3 Table 331.1.1 for your edition and the WPS',
    },
    notes: ['Keep preheat through the weld and until PWHT or a controlled cool-down, as the WPS says.'],
    words: ['p11', 'p 11', 'p eleven', 'one and a quarter chrome', '1 and a quarter chrome', 'chrome moly p11'],
  },
  {
    id: 'p22',
    name: 'Chrome-moly P22 (2-1/4Cr-1Mo)',
    short: 'P22',
    group: 'Chrome-moly',
    spec: 'ASTM A335 P22',
    dims: 'steel',
    walls: STEEL_WALLS,
    defaultWall: '80',
    density: 0.2833,
    expansion: 0.8,
    joining: 'butt-weld',
    weld: {
      pNo: 'P-5A Gr 1',
      filler: 'E9018-B3 / ER90S-B3',
      preheat: '300 °F min (B31.3 Table 330.1.1)',
      pwht: 'Required over 1/2" wall — holding range per B31.3 Table 331.1.1 for your edition and the WPS',
    },
    notes: ['Keep preheat through the weld and until PWHT or a controlled cool-down, as the WPS says.'],
    words: ['p22', 'p 22', 'p twenty two', 'two and a quarter chrome', '2 and a quarter chrome', 'chrome moly p22', 'chrome moly', 'chrome molly', 'chromoly', 'chrome'],
  },
  {
    id: 'p9',
    name: 'Chrome-moly P9 (9Cr-1Mo)',
    short: 'P9',
    group: 'Chrome-moly',
    spec: 'ASTM A335 P9',
    dims: 'steel',
    walls: STEEL_WALLS,
    defaultWall: '80',
    density: 0.2833,
    expansion: 0.72,
    joining: 'butt-weld',
    weld: {
      pNo: 'P-5B Gr 1',
      filler: 'E8018-B8 / ER80S-B8',
      preheat: 'Per B31.3 Table 330.1.1 and the WPS (P-5B)',
      pwht: 'Required — holding range per B31.3 Table 331.1.1 for your edition and the WPS',
    },
    notes: ['Air-hardening: it cracks if it is let cool without the WPS cool-down or PWHT.'],
    words: ['p9', 'p 9', 'p nine', 'nine chrome', '9 chrome', 'chrome 9', 'chrome moly 9', 'chrome molly 9', 'nine cr'],
  },
  {
    id: 'p91',
    name: 'Chrome-moly P91 (9Cr-1Mo-V)',
    short: 'P91',
    group: 'Chrome-moly',
    spec: 'ASTM A335 P91',
    dims: 'steel',
    walls: STEEL_WALLS,
    defaultWall: '80',
    density: 0.28,
    expansion: 0.72,
    joining: 'butt-weld',
    weld: {
      pNo: 'P-15E Gr 1',
      filler: 'E9018-B91 / ER90S-B91 (formerly -B9)',
      preheat: '400 °F min (B31.3 Table 330.1.1)',
      pwht: 'Required at all thicknesses — holding range per B31.3 Table 331.1.1 and the WPS',
    },
    notes: [
      'The least forgiving pipe on a job: hold preheat, cool to the WPS martensite-finish temperature before PWHT, and never let a joint sit cold un-heat-treated.',
    ],
    words: ['p91', 'p 91', 'p ninety one', 'nine one', 'grade 91', 't91'],
  },
  {
    id: 'ci-soil',
    name: 'Cast iron soil pipe (no-hub)',
    short: 'CI',
    group: 'Iron',
    spec: 'ASTM A888 / CISPI 301',
    dims: 'ci-soil',
    walls: ['CISPI'],
    defaultWall: 'CISPI',
    density: 0.26,
    expansion: 0.7,
    joining: 'no-hub',
    notes: [
      'Not on the steel OD: 4" is 4.38", not 4.50". Cut with a snap cutter; joined with no-hub couplings (CISPI 310), not welded.',
    ],
    words: ['cast iron', 'cast iron soil', 'soil pipe', 'no hub', 'nohub', 'ci'],
  },
  {
    id: 'ductile',
    name: 'Ductile iron',
    short: 'DI',
    group: 'Iron',
    spec: 'AWWA C151',
    dims: 'ductile',
    walls: ['PC', 'TC52'],
    defaultWall: 'PC',
    density: 0.255,
    expansion: 0.7,
    joining: 'push-on',
    notes: ['Not on the steel OD: 4" is 4.80", 6" is 6.90". PC is the lightest pressure class (350 to 12", 250 from 14").'],
    words: ['ductile iron', 'ductile', 'di pipe', 'water main'],
  },
  {
    id: 'pvc',
    name: 'PVC',
    short: 'PVC',
    group: 'Plastics & lined',
    spec: 'ASTM D1785',
    dims: 'plastic',
    walls: ['40', '80'],
    defaultWall: '40',
    density: 0.0506,
    expansion: 3.6,
    joining: 'solvent',
    maxTempF: 140,
    notes: ['Pressure rating falls fast above 73 °F. Socket fittings take up their socket depth: weld-elbow takeouts do not apply.'],
    words: ['pvc', 'p v c', 'schedule 40 plastic', 'plastic'],
  },
  {
    id: 'cpvc',
    name: 'CPVC',
    short: 'CPVC',
    group: 'Plastics & lined',
    spec: 'ASTM F441',
    dims: 'plastic',
    walls: ['40', '80'],
    defaultWall: '80',
    density: 0.0553,
    expansion: 4.1,
    joining: 'solvent',
    maxTempF: 200,
    notes: ['CPVC cement (F493), not PVC cement. Socket fittings take up their socket depth: weld-elbow takeouts do not apply.'],
    words: ['cpvc', 'c p v c', 'pvcb', 'pvc b', 'chlorinated pvc'],
  },
  {
    id: 'hdpe',
    name: 'HDPE',
    short: 'HDPE',
    group: 'Plastics & lined',
    spec: 'ASTM F714 / D3035 (IPS, DR)',
    dims: 'hdpe',
    walls: ['DR7', 'DR9', 'DR11', 'DR17'],
    defaultWall: 'DR11',
    density: 0.0343,
    expansion: 12,
    joining: 'fusion',
    maxTempF: 140,
    notes: ['Grows about 12" per 100 ft for a 100 °F rise: anchor and loop for it. The lower the DR, the thicker the wall.'],
    words: ['hdpe', 'h d p e', 'poly', 'polyethylene', 'high density'],
  },
  {
    id: 'ptfe',
    name: 'PTFE-lined steel (Teflon)',
    short: 'PTFE',
    group: 'Plastics & lined',
    spec: 'ASTM F1545 (carbon steel shell)',
    dims: 'steel',
    walls: ['40', '80'],
    defaultWall: '40',
    density: 0.2833,
    expansion: 0.78,
    joining: 'flanged',
    maxTempF: 450,
    notes: [
      'Shell dimensions shown; the liner (about 1/8" to 1/4") is the manufacturer\'s. Spools are made to measure and ordered: do not cut, weld or heat the shell. Torque to the liner maker\'s figures.',
    ],
    words: ['teflon', 'teflon lined', 'ptfe', 'p t f e', 'ptfe lined', 'lined pipe'],
  },
];

export const material = (id: string): Material => MATERIALS.find((m) => m.id === id) ?? MATERIALS[0]!;

// ----------------------------------------------------------- the walls

type Walls = Record<string, number>;

/** B36.10M, the walls beyond 10/40/80 that the steel table does not carry: STD, XS, 160, XXS. */
const STEEL_HEAVY: Record<number, Walls> = {
  0.5: { STD: 0.109, XS: 0.147, '160': 0.188, XXS: 0.294 },
  0.75: { STD: 0.113, XS: 0.154, '160': 0.219, XXS: 0.308 },
  1: { STD: 0.133, XS: 0.179, '160': 0.25, XXS: 0.358 },
  1.25: { STD: 0.14, XS: 0.191, '160': 0.25, XXS: 0.382 },
  1.5: { STD: 0.145, XS: 0.2, '160': 0.281, XXS: 0.4 },
  2: { STD: 0.154, XS: 0.218, '160': 0.344, XXS: 0.436 },
  2.5: { STD: 0.203, XS: 0.276, '160': 0.375, XXS: 0.552 },
  3: { STD: 0.216, XS: 0.3, '160': 0.438, XXS: 0.6 },
  3.5: { STD: 0.226, XS: 0.318 },
  4: { STD: 0.237, XS: 0.337, '160': 0.531, XXS: 0.674 },
  5: { STD: 0.258, XS: 0.375, '160': 0.625, XXS: 0.75 },
  6: { STD: 0.28, XS: 0.432, '160': 0.719, XXS: 0.864 },
  8: { STD: 0.322, XS: 0.5, '160': 0.906, XXS: 0.875 },
  10: { STD: 0.365, XS: 0.5, '160': 1.125, XXS: 1.0 },
  12: { STD: 0.375, XS: 0.5, '160': 1.312, XXS: 1.0 },
  14: { STD: 0.375, XS: 0.5, '160': 1.406 },
  16: { STD: 0.375, XS: 0.5, '160': 1.594 },
  18: { STD: 0.375, XS: 0.5, '160': 1.781 },
  20: { STD: 0.375, XS: 0.5, '160': 1.969 },
  24: { STD: 0.375, XS: 0.5, '160': 2.344 },
};

/** B36.19M, stainless: 5S, 10S, 40S, 80S. */
const STAINLESS: Record<number, Walls> = {
  0.5: { '5S': 0.065, '10S': 0.083, '40S': 0.109, '80S': 0.147 },
  0.75: { '5S': 0.065, '10S': 0.083, '40S': 0.113, '80S': 0.154 },
  1: { '5S': 0.065, '10S': 0.109, '40S': 0.133, '80S': 0.179 },
  1.25: { '5S': 0.065, '10S': 0.109, '40S': 0.14, '80S': 0.191 },
  1.5: { '5S': 0.065, '10S': 0.109, '40S': 0.145, '80S': 0.2 },
  2: { '5S': 0.065, '10S': 0.109, '40S': 0.154, '80S': 0.218 },
  2.5: { '5S': 0.083, '10S': 0.12, '40S': 0.203, '80S': 0.276 },
  3: { '5S': 0.083, '10S': 0.12, '40S': 0.216, '80S': 0.3 },
  3.5: { '5S': 0.083, '10S': 0.12, '40S': 0.226, '80S': 0.318 },
  4: { '5S': 0.083, '10S': 0.12, '40S': 0.237, '80S': 0.337 },
  5: { '5S': 0.109, '10S': 0.134, '40S': 0.258, '80S': 0.375 },
  6: { '5S': 0.109, '10S': 0.134, '40S': 0.28, '80S': 0.432 },
  8: { '5S': 0.109, '10S': 0.148, '40S': 0.322, '80S': 0.5 },
  10: { '5S': 0.134, '10S': 0.165, '40S': 0.365, '80S': 0.5 },
  12: { '5S': 0.156, '10S': 0.18, '40S': 0.375, '80S': 0.5 },
  14: { '5S': 0.156, '10S': 0.188, '40S': 0.375, '80S': 0.5 },
  16: { '5S': 0.165, '10S': 0.188, '40S': 0.375, '80S': 0.5 },
  18: { '5S': 0.165, '10S': 0.188, '40S': 0.375, '80S': 0.5 },
  20: { '5S': 0.188, '10S': 0.218, '40S': 0.375, '80S': 0.5 },
  24: { '5S': 0.218, '10S': 0.25, '40S': 0.375, '80S': 0.5 },
};

/** CISPI 301 no-hub soil pipe: OD and the one wall each size comes in. */
const CI_SOIL: Record<number, { od: number; wall: number }> = {
  1.5: { od: 1.9, wall: 0.16 },
  2: { od: 2.35, wall: 0.16 },
  3: { od: 3.35, wall: 0.16 },
  4: { od: 4.38, wall: 0.19 },
  5: { od: 5.3, wall: 0.19 },
  6: { od: 6.3, wall: 0.19 },
  8: { od: 8.38, wall: 0.23 },
  10: { od: 10.56, wall: 0.28 },
  12: { od: 12.5, wall: 0.28 },
  15: { od: 15.83, wall: 0.36 },
};

/** AWWA C151 ductile iron: OD, the lightest pressure class (350 to 12", 250 from 14"), and Special Thickness Class 52. */
const DUCTILE: Record<number, { od: number; PC: number; TC52: number }> = {
  3: { od: 3.96, PC: 0.25, TC52: 0.28 },
  4: { od: 4.8, PC: 0.25, TC52: 0.32 },
  6: { od: 6.9, PC: 0.25, TC52: 0.34 },
  8: { od: 9.05, PC: 0.25, TC52: 0.36 },
  10: { od: 11.1, PC: 0.26, TC52: 0.38 },
  12: { od: 13.2, PC: 0.28, TC52: 0.4 },
  14: { od: 15.3, PC: 0.28, TC52: 0.42 },
  16: { od: 17.4, PC: 0.3, TC52: 0.43 },
  18: { od: 19.5, PC: 0.31, TC52: 0.44 },
  20: { od: 21.6, PC: 0.33, TC52: 0.45 },
  24: { od: 25.8, PC: 0.33, TC52: 0.47 },
};

const HDPE_DR: Record<string, number> = { DR7: 7, DR9: 9, DR11: 11, DR17: 17 };

/** The sizes a material comes in, nominal inches. */
export function sizesFor(m: Material): number[] {
  if (m.dims === 'ci-soil') return Object.keys(CI_SOIL).map(Number).sort((a, b) => a - b);
  if (m.dims === 'ductile') return Object.keys(DUCTILE).map(Number).sort((a, b) => a - b);
  return PIPE_SIZES.map((s) => s.nps);
}

export type PipeSpec = {
  material: Material;
  nps: number;
  wallId: string;
  od: number;
  wall: number;
  /** Inside diameter. */
  id: number;
  /** Empty pipe, lb per foot. */
  lbPerFt: number;
};

/** OD and wall of a material at a size in a wall designation, or null when it does not come that way. */
export function pipeSpec(materialId: string, nps: number, wallId: string): PipeSpec | null {
  const m = material(materialId);
  if (!m.walls.includes(wallId)) return null;
  let od: number | undefined;
  let wall: number | undefined;
  if (m.dims === 'ci-soil') {
    const r = CI_SOIL[nps];
    od = r?.od;
    wall = r?.wall;
  } else if (m.dims === 'ductile') {
    const r = DUCTILE[nps];
    od = r?.od;
    wall = r ? r[wallId as 'PC' | 'TC52'] : undefined;
  } else {
    const s = PIPE_SIZES.find((p) => p.nps === nps);
    od = s?.od;
    if (s) {
      if (m.dims === 'hdpe') wall = HDPE_DR[wallId] ? s.od / HDPE_DR[wallId]! : undefined;
      else if (wallId === '10' || wallId === '40' || wallId === '80') wall = s.wall[wallId];
      else if (/^\d+S$/.test(wallId)) wall = STAINLESS[nps]?.[wallId];
      else wall = STEEL_HEAVY[nps]?.[wallId];
    }
  }
  if (od === undefined || wall === undefined || !(wall > 0) || wall >= od / 2) return null;
  // Weight: the steel table's 10.6802 lb/ft per in² of section is steel at 0.2833 lb/in³.
  const lbPerFt = 12 * Math.PI * wall * (od - wall) * m.density;
  return { material: m, nps, wallId, od, wall, id: od - 2 * wall, lbPerFt };
}

/** The wall designations a material comes in at a size. */
export const wallsAt = (materialId: string, nps: number): string[] =>
  material(materialId).walls.filter((w) => pipeSpec(materialId, nps, w) !== null);

/** A wall designation as it is written on a card: "SCH 40", "40S", "DR 11", "Class 52". */
export function wallLabel(wallId: string): string {
  if (/^\d+$/.test(wallId)) return `SCH ${wallId}`;
  if (wallId.startsWith('DR')) return `DR ${wallId.slice(2)}`;
  if (wallId === 'PC') return 'Pressure class';
  if (wallId === 'TC52') return 'Class 52';
  if (wallId === 'CISPI') return 'CISPI 301';
  return wallId;
}

/**
 * The steel schedule the calculators' elbow geometry is worked in. The bend
 * and offset maths only use the wall for the throat and back of an elbow cut,
 * so the nearest of 10, 40 and 80 is close enough there; the weight and the
 * card use the true wall above.
 */
export function calcSchedule(wallId: string): '10' | '40' | '80' {
  if (['5S', '10S', '10', 'DR17'].includes(wallId)) return '10';
  if (['40', '40S', 'STD', 'CISPI', 'PC', 'DR11'].includes(wallId)) return '40';
  return '80';
}

/** A size label for any material: 1/2", 1-1/4", 15". */
export function sizeLabel(nps: number): string {
  const s = PIPE_SIZES.find((p) => p.nps === nps);
  if (s) return s.label;
  const whole = Math.floor(nps);
  const frac = nps - whole;
  const f = frac === 0.5 ? '1/2' : frac === 0.25 ? '1/4' : frac === 0.75 ? '3/4' : '';
  return f ? (whole ? `${whole}-${f}"` : `${f}"`) : `${nps}"`;
}

/** The size nearest to `nps` that a material comes in. */
export function nearestSize(m: Material, nps: number): number {
  const sizes = sizesFor(m);
  return sizes.reduce((best, s) => (Math.abs(s - nps) < Math.abs(best - nps) ? s : best), sizes[0]!);
}

/**
 * A material, size and wall that go together. Each part is kept when it can
 * be: a size the material does not come in moves to the nearest it does, and
 * a wall it does not come in at that size falls back to the material's usual
 * one, then to the first it has.
 */
export function resolveSpec(materialId: unknown, nps: unknown, wall: unknown): { material: MaterialId; nps: number; wall: string } {
  const m = MATERIALS.find((x) => x.id === materialId) ?? MATERIALS[0]!;
  const size = typeof nps === 'number' && Number.isFinite(nps) ? nearestSize(m, nps) : nearestSize(m, 2);
  const at = wallsAt(m.id, size);
  const w = typeof wall === 'string' && at.includes(wall) ? wall : at.includes(m.defaultWall) ? m.defaultWall : at[0]!;
  return { material: m.id, nps: size, wall: w };
}
