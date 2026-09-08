import { rad } from './units';

export type Schedule = '10' | '40' | '80';
export type ElbowRadius = 'LR' | 'SR';

export type PipeSize = {
  nps: number;
  label: string;
  od: number;
  wall: Record<Schedule, number>;
};

export const PIPE_SIZES: PipeSize[] = [
  { nps: 0.5, label: '1/2"', od: 0.84, wall: { '10': 0.083, '40': 0.109, '80': 0.147 } },
  { nps: 0.75, label: '3/4"', od: 1.05, wall: { '10': 0.083, '40': 0.113, '80': 0.154 } },
  { nps: 1, label: '1"', od: 1.315, wall: { '10': 0.109, '40': 0.133, '80': 0.179 } },
  { nps: 1.25, label: '1-1/4"', od: 1.66, wall: { '10': 0.109, '40': 0.14, '80': 0.191 } },
  { nps: 1.5, label: '1-1/2"', od: 1.9, wall: { '10': 0.109, '40': 0.145, '80': 0.2 } },
  { nps: 2, label: '2"', od: 2.375, wall: { '10': 0.109, '40': 0.154, '80': 0.218 } },
  { nps: 2.5, label: '2-1/2"', od: 2.875, wall: { '10': 0.12, '40': 0.203, '80': 0.276 } },
  { nps: 3, label: '3"', od: 3.5, wall: { '10': 0.12, '40': 0.216, '80': 0.3 } },
  { nps: 3.5, label: '3-1/2"', od: 4.0, wall: { '10': 0.12, '40': 0.226, '80': 0.318 } },
  { nps: 4, label: '4"', od: 4.5, wall: { '10': 0.12, '40': 0.237, '80': 0.337 } },
  { nps: 5, label: '5"', od: 5.563, wall: { '10': 0.134, '40': 0.258, '80': 0.375 } },
  { nps: 6, label: '6"', od: 6.625, wall: { '10': 0.134, '40': 0.28, '80': 0.432 } },
  { nps: 8, label: '8"', od: 8.625, wall: { '10': 0.148, '40': 0.322, '80': 0.5 } },
  { nps: 10, label: '10"', od: 10.75, wall: { '10': 0.165, '40': 0.365, '80': 0.593 } },
  { nps: 12, label: '12"', od: 12.75, wall: { '10': 0.18, '40': 0.406, '80': 0.687 } },
  { nps: 14, label: '14"', od: 14.0, wall: { '10': 0.25, '40': 0.437, '80': 0.75 } },
  { nps: 16, label: '16"', od: 16.0, wall: { '10': 0.25, '40': 0.5, '80': 0.843 } },
  { nps: 18, label: '18"', od: 18.0, wall: { '10': 0.25, '40': 0.562, '80': 0.937 } },
  { nps: 20, label: '20"', od: 20.0, wall: { '10': 0.25, '40': 0.593, '80': 1.031 } },
  { nps: 24, label: '24"', od: 24.0, wall: { '10': 0.25, '40': 0.687, '80': 1.218 } },
];

export function findSize(nps: number): PipeSize {
  return PIPE_SIZES.find((s) => s.nps === nps) ?? PIPE_SIZES[5]!;
}

export function bendRadius(nps: number, kind: ElbowRadius): number {
  return kind === 'LR' ? 1.5 * nps : 1.0 * nps;
}

export function takeoff(nps: number, kind: ElbowRadius, angleDeg: number): number {
  return bendRadius(nps, kind) * Math.tan(rad(angleDeg) / 2);
}

export function centerlineArc(nps: number, kind: ElbowRadius, angleDeg: number): number {
  return bendRadius(nps, kind) * rad(angleDeg);
}

export function throatArc(nps: number, kind: ElbowRadius, angleDeg: number, od: number): number {
  return Math.max(0, bendRadius(nps, kind) - od / 2) * rad(angleDeg);
}

export function backArc(nps: number, kind: ElbowRadius, angleDeg: number, od: number): number {
  return (bendRadius(nps, kind) + od / 2) * rad(angleDeg);
}

export function pipeWeightPerFoot(od: number, wall: number): number {
  return 10.6802 * wall * (od - wall);
}

export function pipeWeight(lengthInches: number, od: number, wall: number): number {
  return (Math.max(0, lengthInches) / 12) * pipeWeightPerFoot(od, wall);
}

const ELBOW_MASS_FACTOR = 1.4;

export function elbowWeight(nps: number, kind: ElbowRadius, angleDeg: number, od: number, wall: number): number {
  return (centerlineArc(nps, kind, angleDeg) / 12) * pipeWeightPerFoot(od, wall) * ELBOW_MASS_FACTOR;
}

const WELD_DEPOSIT_PER_INCH_CIRC = 0.0047;

export function weldWeight(od: number, wall: number): number {
  return Math.PI * od * wall * WELD_DEPOSIT_PER_INCH_CIRC * 12;
}

export type Spool = {
  pipe: number;
  elbows: number;
  welds: number;
  total: number;
};

export function spoolWeight(args: {
  cutLength: number;
  nps: number;
  schedule: Schedule;
  kind: ElbowRadius;
  elbowAngle: number;
  elbowCount: number;
  weldCount: number;
}): Spool {
  const size = findSize(args.nps);
  const wall = size.wall[args.schedule];
  const pipe = pipeWeight(args.cutLength, size.od, wall);
  const elbows = elbowWeight(args.nps, args.kind, args.elbowAngle, size.od, wall) * args.elbowCount;
  const welds = weldWeight(size.od, wall) * args.weldCount;
  return { pipe, elbows, welds, total: pipe + elbows + welds };
}

export const FITTING_ANGLES = [45, 22.5, 11.25, 30, 60, 90] as const;
