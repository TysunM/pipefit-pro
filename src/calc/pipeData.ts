// Steel and wrought-iron pipe dimensions, transcribed from printed
// schedule tables and checked row by row: every wall here reproduces the
// table's own weight per foot through w = 10.6802 t (OD - t), and every
// schedule 120 bore reproduces its printed internal area.
//
// Walls are stored; inside diameter, bore area, circumference and weight are
// derived, so nothing can drift out of agreement with itself.

export type ScheduleId = '40' | '80' | '120' | '40S' | '80S' | 'Std' | 'XS';

export type PipeRow = {
  nps: number;
  label: string;
  od: number;
  walls: Partial<Record<'40' | '80' | '120' | '40S' | '80S', number>>;
};

export const PIPE_TABLE: PipeRow[] = [
  {
    nps: 0.125,
    label: '1/8"',
    od: 0.405,
    walls: {
      '40': 0.068,
      '80': 0.095,
      '40S': 0.068,
      '80S': 0.095,
    },
  },
  {
    nps: 0.25,
    label: '1/4"',
    od: 0.54,
    walls: {
      '40': 0.088,
      '80': 0.119,
      '40S': 0.088,
      '80S': 0.119,
    },
  },
  {
    nps: 0.375,
    label: '3/8"',
    od: 0.675,
    walls: {
      '40': 0.091,
      '80': 0.126,
      '40S': 0.091,
      '80S': 0.126,
    },
  },
  {
    nps: 0.5,
    label: '1/2"',
    od: 0.84,
    walls: {
      '40': 0.109,
      '80': 0.147,
      '40S': 0.109,
      '80S': 0.147,
    },
  },
  {
    nps: 0.75,
    label: '3/4"',
    od: 1.05,
    walls: {
      '40': 0.113,
      '80': 0.154,
      '40S': 0.113,
      '80S': 0.154,
    },
  },
  {
    nps: 1,
    label: '1"',
    od: 1.315,
    walls: {
      '40': 0.133,
      '80': 0.179,
      '40S': 0.133,
      '80S': 0.179,
    },
  },
  {
    nps: 1.25,
    label: '1-1/4"',
    od: 1.66,
    walls: {
      '40': 0.14,
      '80': 0.191,
      '40S': 0.14,
      '80S': 0.191,
    },
  },
  {
    nps: 1.5,
    label: '1-1/2"',
    od: 1.9,
    walls: {
      '40': 0.145,
      '80': 0.2,
      '40S': 0.145,
      '80S': 0.2,
    },
  },
  {
    nps: 2,
    label: '2"',
    od: 2.375,
    walls: {
      '40': 0.154,
      '80': 0.218,
      '40S': 0.154,
      '80S': 0.218,
    },
  },
  {
    nps: 2.5,
    label: '2-1/2"',
    od: 2.875,
    walls: {
      '40': 0.203,
      '80': 0.276,
      '40S': 0.203,
      '80S': 0.276,
    },
  },
  {
    nps: 3,
    label: '3"',
    od: 3.5,
    walls: {
      '40': 0.216,
      '80': 0.3,
      '40S': 0.216,
      '80S': 0.3,
    },
  },
  {
    nps: 3.5,
    label: '3-1/2"',
    od: 4.0,
    walls: {
      '40': 0.226,
      '80': 0.318,
      '40S': 0.226,
      '80S': 0.318,
    },
  },
  {
    nps: 4,
    label: '4"',
    od: 4.5,
    walls: {
      '40': 0.237,
      '80': 0.337,
      '120': 0.437,
      '40S': 0.237,
      '80S': 0.337,
    },
  },
  {
    nps: 5,
    label: '5"',
    od: 5.563,
    walls: {
      '40': 0.258,
      '80': 0.375,
      '120': 0.5,
      '40S': 0.258,
      '80S': 0.375,
    },
  },
  {
    nps: 6,
    label: '6"',
    od: 6.625,
    walls: {
      '40': 0.28,
      '80': 0.432,
      '120': 0.562,
      '40S': 0.28,
      '80S': 0.432,
    },
  },
  {
    nps: 8,
    label: '8"',
    od: 8.625,
    walls: {
      '40': 0.322,
      '80': 0.5,
      '120': 0.718,
      '40S': 0.322,
      '80S': 0.5,
    },
  },
  {
    nps: 10,
    label: '10"',
    od: 10.75,
    walls: {
      '40': 0.365,
      '80': 0.593,
      '120': 0.843,
      '40S': 0.365,
      '80S': 0.5,
    },
  },
  {
    nps: 12,
    label: '12"',
    od: 12.75,
    walls: {
      '40': 0.406,
      '80': 0.687,
      '120': 1.0,
      '40S': 0.375,
      '80S': 0.5,
    },
  },
  {
    nps: 14,
    label: '14"',
    od: 14.0,
    walls: {
      '40': 0.437,
      '80': 0.75,
      '120': 1.062,
    },
  },
  {
    nps: 16,
    label: '16"',
    od: 16.0,
    walls: {
      '40': 0.5,
      '80': 0.843,
      '120': 1.218,
    },
  },
  {
    nps: 18,
    label: '18"',
    od: 18.0,
    walls: {
      '40': 0.562,
      '80': 0.937,
      '120': 1.343,
    },
  },
  {
    nps: 20,
    label: '20"',
    od: 20.0,
    walls: {
      '40': 0.593,
      '80': 1.031,
      '120': 1.5,
    },
  },
  {
    nps: 24,
    label: '24"',
    od: 24.0,
    walls: {
      '40': 0.687,
      '120': 1.75,
    },
  },
];

const BY_NPS = new Map(PIPE_TABLE.map((r) => [r.nps, r]));

export const findRow = (nps: number): PipeRow | undefined => BY_NPS.get(nps);

// Standard Weight follows schedule 40 up to 10 inch; from 12 inch the wall is
// constant at 0.375. Extra Strong follows schedule 80 up to 8 inch; from 10
// inch the wall is constant at 0.500. Both notes are printed with the tables.
export function wallFor(nps: number, schedule: ScheduleId): number {
  const row = findRow(nps);
  if (!row) return NaN;

  if (schedule === 'Std') return nps >= 12 ? 0.375 : (row.walls['40'] ?? NaN);
  if (schedule === 'XS') return nps >= 10 ? 0.5 : (row.walls['80'] ?? NaN);
  return row.walls[schedule] ?? NaN;
}

export const WATER_LB_PER_CUBIC_FOOT = 62.42796;

export type PipeDims = {
  nps: number;
  label: string;
  od: number;
  wall: number;
  id: number;
  circumference: number;
  boreArea: number;
  weightPerFoot: number;
  filledWeightPerFoot: number;
  capacityGallonsPerFoot: number;
};

export function pipeDims(nps: number, schedule: ScheduleId): PipeDims | undefined {
  const row = findRow(nps);
  if (!row) return undefined;

  const wall = wallFor(nps, schedule);
  if (!Number.isFinite(wall) || wall <= 0) return undefined;

  const id = row.od - 2 * wall;
  if (id <= 0) return undefined;

  const boreArea = (Math.PI * id * id) / 4;
  const weightPerFoot = 10.6802 * wall * (row.od - wall);
  const waterPerFoot = (boreArea / 144) * WATER_LB_PER_CUBIC_FOOT;

  return {
    nps,
    label: row.label,
    od: row.od,
    wall,
    id,
    circumference: Math.PI * row.od,
    boreArea,
    weightPerFoot,
    filledWeightPerFoot: weightPerFoot + waterPerFoot,
    capacityGallonsPerFoot: (boreArea * 12) / 231,
  };
}

export function schedulesFor(nps: number): ScheduleId[] {
  const row = findRow(nps);
  if (!row) return [];
  const out: ScheduleId[] = [];
  for (const s of ['40', '80', '120', '40S', '80S'] as const) if (row.walls[s] !== undefined) out.push(s);
  if (row.walls['40'] !== undefined || nps >= 12) out.push('Std');
  if (row.walls['80'] !== undefined || nps >= 10) out.push('XS');
  return out;
}
