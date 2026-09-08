import { rad } from './units';

export type SaddleType = 'three' | 'four';

export type SaddleInput = {
  type: SaddleType;
  depth: number;
  width: number;
  distanceToObstruction: number;
  centerAngle: number;
};

export type SaddleMark = {
  label: string;
  position: number;
  angle: number;
  note: string;
};

export type SaddleResult = {
  valid: boolean;
  error?: string;
  sideAngle: number;
  multiplier: number;
  shrink: number;
  shrinkPerBend: number;
  marks: SaddleMark[];
  developedLength: number;
  minimumDistance: number;
};

const EMPTY: SaddleResult = {
  valid: false,
  sideAngle: NaN,
  multiplier: NaN,
  shrink: NaN,
  shrinkPerBend: NaN,
  marks: [],
  developedLength: NaN,
  minimumDistance: NaN,
};

export function offsetMultiplier(angleDeg: number): number {
  return 1 / Math.sin(rad(angleDeg));
}

export function offsetShrinkPerUnit(angleDeg: number): number {
  return Math.tan(rad(angleDeg) / 2);
}

export function solveSaddle(input: SaddleInput): SaddleResult {
  const { depth, width, distanceToObstruction, centerAngle } = input;

  if (!Number.isFinite(depth) || depth <= 0) return { ...EMPTY, error: 'Enter an obstruction depth greater than zero.' };
  if (!(centerAngle > 0 && centerAngle < 90)) return { ...EMPTY, error: 'Bend angle must be between 0° and 90°.' };
  if (!Number.isFinite(distanceToObstruction) || distanceToObstruction <= 0)
    return { ...EMPTY, error: 'Enter the distance from the conduit end to the obstruction.' };

  if (input.type === 'three') {
    const sideAngle = centerAngle / 2;
    const multiplier = offsetMultiplier(sideAngle);
    const spacing = depth * multiplier;
    const shrinkPerBend = depth * offsetShrinkPerUnit(sideAngle);
    const center = distanceToObstruction + shrinkPerBend;
    const first = center - spacing;
    const minimumDistance = spacing - shrinkPerBend;

    if (first < 0)
      return {
        ...EMPTY,
        sideAngle,
        multiplier,
        minimumDistance,
        error: 'Obstruction is too close to the conduit end for this depth and angle.',
      };

    return {
      valid: true,
      sideAngle,
      multiplier,
      shrinkPerBend,
      shrink: shrinkPerBend * 2,
      developedLength: spacing * 2,
      minimumDistance,
      marks: [
        { label: 'Mark 1', position: first, angle: sideAngle, note: 'Bend up, arrow to the centre mark' },
        { label: 'Centre', position: center, angle: centerAngle, note: 'Bend over the obstruction' },
        { label: 'Mark 3', position: center + spacing, angle: sideAngle, note: 'Bend down, back to level' },
      ],
    };
  }

  if (!Number.isFinite(width) || width <= 0)
    return { ...EMPTY, error: 'Enter the obstruction width for a four-point saddle.' };

  const multiplier = offsetMultiplier(centerAngle);
  const spacing = depth * multiplier;
  const shrinkPerBend = depth * offsetShrinkPerUnit(centerAngle);
  const horizontalRun = depth / Math.tan(rad(centerAngle));
  const first = distanceToObstruction - horizontalRun;
  const minimumDistance = horizontalRun;

  if (first < 0)
    return {
      ...EMPTY,
      sideAngle: centerAngle,
      multiplier,
      minimumDistance,
      error: 'Obstruction is too close to the conduit end for this depth and angle.',
    };

  const second = first + spacing;
  const third = second + width;

  return {
    valid: true,
    sideAngle: centerAngle,
    multiplier,
    shrinkPerBend,
    shrink: shrinkPerBend * 2,
    developedLength: spacing * 2 + width,
    minimumDistance,
    marks: [
      { label: 'Mark 1', position: first, angle: centerAngle, note: 'First offset — start the climb' },
      { label: 'Mark 2', position: second, angle: centerAngle, note: 'First offset — level off above' },
      { label: 'Mark 3', position: third, angle: centerAngle, note: 'Second offset — start the descent' },
      { label: 'Mark 4', position: third + spacing, angle: centerAngle, note: 'Second offset — back to level' },
    ],
  };
}
