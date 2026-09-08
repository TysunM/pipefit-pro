import { ElbowRadius, findSize, pipeWeight, Schedule, takeoff } from './pipe';

export type EndFitting =
  | 'none'
  | 'elbow90'
  | 'elbow45'
  | 'tee'
  | 'flange150'
  | 'flange300'
  | 'custom';

export const END_FITTINGS: { id: EndFitting; label: string }[] = [
  { id: 'none', label: 'Open end' },
  { id: 'elbow90', label: '90° elbow' },
  { id: 'elbow45', label: '45° elbow' },
  { id: 'tee', label: 'Tee (run)' },
  { id: 'flange150', label: 'WN flange 150#' },
  { id: 'flange300', label: 'WN flange 300#' },
  { id: 'custom', label: 'Custom' },
];

export const FITTING_SOURCE: Record<EndFitting, string> = {
  none: 'No fitting — nothing deducted',
  elbow90: 'ASME B16.9 — 1.5D / 1.0D centre to face',
  elbow45: 'ASME B16.9 — 1.5D / 1.0D centre to face',
  tee: 'ASME B16.9 — centre to end, run',
  flange150: 'ASME B16.5 Class 150 — weld neck, length through hub',
  flange300: 'ASME B16.5 Class 300 — weld neck, length through hub',
  custom: 'Your measured dimension',
};

const TEE_CENTER_TO_END: Record<number, number> = {
  0.5: 1.0, 0.75: 1.125, 1: 1.5, 1.25: 1.875, 1.5: 2.25, 2: 2.5, 2.5: 3.0, 3: 3.375, 3.5: 3.75,
  4: 4.125, 5: 4.875, 6: 5.625, 8: 7.0, 10: 8.5, 12: 10.0, 14: 11.0, 16: 12.0, 18: 13.5, 20: 15.0, 24: 17.0,
};

const FLANGE_150_LTH: Record<number, number> = {
  0.5: 1.88, 0.75: 2.06, 1: 2.19, 1.25: 2.25, 1.5: 2.44, 2: 2.5, 2.5: 2.75, 3: 2.75, 3.5: 2.81,
  4: 3.0, 5: 3.5, 6: 3.5, 8: 4.0, 10: 4.0, 12: 4.5, 14: 5.0, 16: 5.0, 18: 5.5, 20: 5.69, 24: 6.0,
};

const FLANGE_300_LTH: Record<number, number> = {
  0.5: 2.06, 0.75: 2.25, 1: 2.44, 1.25: 2.56, 1.5: 2.69, 2: 2.75, 2.5: 3.0, 3: 3.12, 3.5: 3.19,
  4: 3.38, 5: 3.88, 6: 3.88, 8: 4.38, 10: 4.62, 12: 5.12, 14: 5.62, 16: 5.75, 18: 6.25, 20: 6.38, 24: 6.62,
};

export function endTakeoff(fitting: EndFitting, nps: number, kind: ElbowRadius, custom: number): number {
  switch (fitting) {
    case 'none':
      return 0;
    case 'elbow90':
      return takeoff(nps, kind, 90);
    case 'elbow45':
      return takeoff(nps, kind, 45);
    case 'tee':
      return TEE_CENTER_TO_END[nps] ?? NaN;
    case 'flange150':
      return FLANGE_150_LTH[nps] ?? NaN;
    case 'flange300':
      return FLANGE_300_LTH[nps] ?? NaN;
    case 'custom':
      return Number.isFinite(custom) ? custom : 0;
    default:
      return 0;
  }
}

export type CutLengthInput = {
  centerToCenter: number;
  endA: EndFitting;
  endB: EndFitting;
  customA: number;
  customB: number;
  gap: number;
  nps: number;
  kind: ElbowRadius;
  schedule: Schedule;
};

export type CutLengthResult = {
  valid: boolean;
  error?: string;
  takeoffA: number;
  takeoffB: number;
  totalDeduction: number;
  pipeCut: number;
  weight: number;
};

export function solveCutLength(input: CutLengthInput): CutLengthResult {
  const { centerToCenter, gap, nps, kind, schedule } = input;
  const base = {
    takeoffA: endTakeoff(input.endA, nps, kind, input.customA),
    takeoffB: endTakeoff(input.endB, nps, kind, input.customB),
  };
  const gapValue = Number.isFinite(gap) ? gap : 0;
  const weldCount = (input.endA === 'none' ? 0 : 1) + (input.endB === 'none' ? 0 : 1);
  const totalDeduction = base.takeoffA + base.takeoffB + gapValue * weldCount;

  if (!Number.isFinite(base.takeoffA) || !Number.isFinite(base.takeoffB)) {
    return {
      valid: false,
      error: 'No published dimension for that fitting at this size — use Custom and enter the measured takeout.',
      ...base,
      totalDeduction,
      pipeCut: NaN,
      weight: NaN,
    };
  }

  if (!Number.isFinite(centerToCenter) || centerToCenter <= 0) {
    return { valid: false, error: 'Enter a centre-to-centre dimension.', ...base, totalDeduction, pipeCut: NaN, weight: NaN };
  }

  const pipeCut = centerToCenter - totalDeduction;
  const size = findSize(nps);
  return {
    valid: pipeCut > 0,
    error: pipeCut > 0 ? undefined : 'Deductions exceed the centre-to-centre dimension.',
    ...base,
    totalDeduction,
    pipeCut,
    weight: pipeWeight(pipeCut, size.od, size.wall[schedule]),
  };
}
