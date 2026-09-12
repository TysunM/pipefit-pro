import { deg, rad } from './units';

export type TriField = 'offset' | 'run' | 'travel' | 'angle';

export const TRI_FIELDS: TriField[] = ['offset', 'run', 'travel', 'angle'];

export type TriKnown = { field: TriField; value: number };

export type TriSolution = {
  valid: boolean;
  error?: string;
  offset: number;
  run: number;
  travel: number;
  angle: number;
  slopePercent: number;
  slopePerFoot: number;
};

const EMPTY: TriSolution = {
  valid: false,
  offset: NaN,
  run: NaN,
  travel: NaN,
  angle: NaN,
  slopePercent: NaN,
  slopePerFoot: NaN,
};

const FIELD_LABEL: Record<TriField, string> = {
  offset: 'offset',
  run: 'run',
  travel: 'travel',
  angle: 'angle',
};

export const triFieldLabel = (f: TriField): string => FIELD_LABEL[f];

function finish(offset: number, run: number, travel: number, angle: number): TriSolution {
  return {
    valid: true,
    offset,
    run,
    travel,
    angle,
    slopePercent: run === 0 ? NaN : (offset / run) * 100,
    slopePerFoot: run === 0 ? NaN : (offset / run) * 12,
  };
}

function positive(k: TriKnown): string | null {
  if (!Number.isFinite(k.value)) return `Enter a ${FIELD_LABEL[k.field]}.`;
  if (k.field === 'angle') {
    if (k.value <= 0 || k.value >= 90) return 'Angle must be between 0° and 90°.';
    return null;
  }
  if (k.value <= 0) return `${FIELD_LABEL[k.field]} must be greater than zero.`;
  return null;
}

export function solveTriangle(a: TriKnown, b: TriKnown): TriSolution {
  if (a.field === b.field) return { ...EMPTY, error: 'Enter two different values.' };

  for (const k of [a, b]) {
    const bad = positive(k);
    if (bad) return { ...EMPTY, error: bad };
  }

  const given = new Map<TriField, number>([
    [a.field, a.value],
    [b.field, b.value],
  ]);

  const offset = given.get('offset');
  const run = given.get('run');
  const travel = given.get('travel');
  const angle = given.get('angle');

  if (offset !== undefined && run !== undefined) {
    return finish(offset, run, Math.hypot(offset, run), deg(Math.atan2(offset, run)));
  }

  if (offset !== undefined && travel !== undefined) {
    if (travel <= offset) return { ...EMPTY, error: 'Travel must be longer than the offset.' };
    return finish(offset, Math.sqrt(travel * travel - offset * offset), travel, deg(Math.asin(offset / travel)));
  }

  if (run !== undefined && travel !== undefined) {
    if (travel <= run) return { ...EMPTY, error: 'Travel must be longer than the run.' };
    return finish(Math.sqrt(travel * travel - run * run), run, travel, deg(Math.acos(run / travel)));
  }

  if (angle !== undefined && offset !== undefined) {
    const t = offset / Math.sin(rad(angle));
    return finish(offset, offset / Math.tan(rad(angle)), t, angle);
  }

  if (angle !== undefined && run !== undefined) {
    return finish(run * Math.tan(rad(angle)), run, run / Math.cos(rad(angle)), angle);
  }

  if (angle !== undefined && travel !== undefined) {
    return finish(travel * Math.sin(rad(angle)), travel * Math.cos(rad(angle)), travel, angle);
  }

  return { ...EMPTY, error: 'Enter two of offset, run, travel or angle.' };
}

export function slopeToAngle(rise: number, perRun: number): number {
  if (!Number.isFinite(rise) || !Number.isFinite(perRun) || perRun === 0) return NaN;
  return deg(Math.atan(rise / perRun));
}

export function percentToAngle(percent: number): number {
  if (!Number.isFinite(percent)) return NaN;
  return deg(Math.atan(percent / 100));
}

export function angleToPercent(angleDeg: number): number {
  if (!Number.isFinite(angleDeg) || angleDeg <= -90 || angleDeg >= 90) return NaN;
  return Math.tan(rad(angleDeg)) * 100;
}

export function angleToPerFoot(angleDeg: number): number {
  if (!Number.isFinite(angleDeg) || angleDeg <= -90 || angleDeg >= 90) return NaN;
  return Math.tan(rad(angleDeg)) * 12;
}
