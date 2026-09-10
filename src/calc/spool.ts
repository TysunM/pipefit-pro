import { ElbowRadius, Schedule, backArc, centerlineArc, findSize, pipeWeight, takeoff, throatArc } from './pipe';
import { deg, rad } from './units';

export type Vec3 = { x: number; y: number; z: number };

export type Cardinal = 'N' | 'S' | 'E' | 'W' | 'U' | 'D';

export const CARDINALS: { id: Cardinal; label: string; hint: string }[] = [
  { id: 'N', label: 'North', hint: '+Z' },
  { id: 'S', label: 'South', hint: '−Z' },
  { id: 'E', label: 'East', hint: '+X' },
  { id: 'W', label: 'West', hint: '−X' },
  { id: 'U', label: 'Up', hint: '+Y' },
  { id: 'D', label: 'Down', hint: '−Y' },
];

export type SpoolSegment = {
  id: string;
  mode: 'cardinal' | 'polar';
  cardinal: Cardinal;
  azimuth: number;
  elevation: number;
  length: number;
};

export const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const scale = (a: Vec3, k: number): Vec3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const len = (a: Vec3): number => Math.sqrt(dot(a, a));
export const unit = (a: Vec3): Vec3 => {
  const l = len(a);
  return l < 1e-12 ? { x: 0, y: 0, z: 0 } : scale(a, 1 / l);
};

const CARDINAL_VECTORS: Record<Cardinal, Vec3> = {
  N: { x: 0, y: 0, z: 1 },
  S: { x: 0, y: 0, z: -1 },
  E: { x: 1, y: 0, z: 0 },
  W: { x: -1, y: 0, z: 0 },
  U: { x: 0, y: 1, z: 0 },
  D: { x: 0, y: -1, z: 0 },
};

export function segmentDirection(s: SpoolSegment): Vec3 {
  if (s.mode === 'cardinal') return CARDINAL_VECTORS[s.cardinal];
  const a = rad(s.azimuth);
  const e = rad(s.elevation);
  const h = Math.cos(e);
  return { x: h * Math.sin(a), y: Math.sin(e), z: h * Math.cos(a) };
}

export function directionLabel(s: SpoolSegment): string {
  if (s.mode === 'cardinal') return CARDINALS.find((c) => c.id === s.cardinal)?.label ?? s.cardinal;
  return `${s.azimuth.toFixed(1)}° az / ${s.elevation.toFixed(1)}° el`;
}

export type SpoolRun = {
  index: number;
  from: Vec3;
  to: Vec3;
  centerToCenter: number;
  cutLength: number;
  takeoffStart: number;
  takeoffEnd: number;
  direction: Vec3;
  label: string;
};

export type SpoolElbow = {
  index: number;
  at: Vec3;
  angle: number;
  takeoff: number;
  centerlineArc: number;
  throatArc: number;
  backArc: number;
  planeChangeFromPrevious: number;
};

export type SpoolResult = {
  valid: boolean;
  error?: string;
  points: Vec3[];
  runs: SpoolRun[];
  elbows: SpoolElbow[];
  totalCut: number;
  totalCenterToCenter: number;
  weight: number;
  bounds: { min: Vec3; max: Vec3; size: Vec3 };
};

const EMPTY_BOUNDS = {
  min: { x: 0, y: 0, z: 0 },
  max: { x: 0, y: 0, z: 0 },
  size: { x: 0, y: 0, z: 0 },
};

const EMPTY: SpoolResult = {
  valid: false,
  points: [],
  runs: [],
  elbows: [],
  totalCut: NaN,
  totalCenterToCenter: NaN,
  weight: NaN,
  bounds: EMPTY_BOUNDS,
};

export type SpoolInput = {
  segments: SpoolSegment[];
  nps: number;
  kind: ElbowRadius;
  schedule: Schedule;
  gap: number;
};

export function solveSpool(input: SpoolInput): SpoolResult {
  const { segments, nps, kind, schedule } = input;
  const gap = Number.isFinite(input.gap) ? input.gap : 0;

  if (segments.length < 1) return { ...EMPTY, error: 'Add at least one run to build a spool.' };

  for (const s of segments) {
    if (!Number.isFinite(s.length) || s.length <= 0)
      return { ...EMPTY, error: 'Every run needs a length greater than zero.' };
    if (s.mode === 'polar' && (!Number.isFinite(s.azimuth) || !Number.isFinite(s.elevation)))
      return { ...EMPTY, error: 'Enter both an azimuth and an elevation for a custom direction.' };
  }

  const dirs = segments.map(segmentDirection);
  for (const d of dirs) if (len(d) < 1e-9) return { ...EMPTY, error: 'A run has no direction.' };

  const points: Vec3[] = [{ x: 0, y: 0, z: 0 }];
  segments.forEach((s, i) => {
    points.push(add(points[i]!, scale(dirs[i]!, s.length)));
  });

  const elbows: SpoolElbow[] = [];
  const size = findSize(nps);
  const normals: Vec3[] = [];

  for (let i = 1; i < points.length - 1; i += 1) {
    const u1 = dirs[i - 1]!;
    const u2 = dirs[i]!;
    const d = Math.max(-1, Math.min(1, dot(u1, u2)));
    const angle = deg(Math.acos(d));
    if (angle < 0.01) {
      normals.push({ x: 0, y: 0, z: 0 });
      continue;
    }
    if (angle > 179.99) return { ...EMPTY, error: `Run ${i + 1} doubles straight back on run ${i}.` };

    const n = unit(cross(u1, u2));
    let planeChange = NaN;
    const prevNormal = normals[normals.length - 1];
    if (prevNormal && len(prevNormal) > 1e-9) {
      const c = Math.min(1, Math.abs(dot(prevNormal, n)));
      planeChange = deg(Math.acos(c));
    }
    normals.push(n);

    elbows.push({
      index: i,
      at: points[i]!,
      angle,
      takeoff: takeoff(nps, kind, angle),
      centerlineArc: centerlineArc(nps, kind, angle),
      throatArc: throatArc(nps, kind, angle, size.od),
      backArc: backArc(nps, kind, angle, size.od),
      planeChangeFromPrevious: planeChange,
    });
  }

  const takeoffAt = (vertexIndex: number): number => {
    const e = elbows.find((x) => x.index === vertexIndex);
    return e ? e.takeoff : 0;
  };

  const runs: SpoolRun[] = segments.map((s, i) => {
    const tStart = takeoffAt(i);
    const tEnd = takeoffAt(i + 1);
    const welds = (tStart > 0 ? 1 : 0) + (tEnd > 0 ? 1 : 0);
    return {
      index: i,
      from: points[i]!,
      to: points[i + 1]!,
      centerToCenter: s.length,
      takeoffStart: tStart,
      takeoffEnd: tEnd,
      cutLength: s.length - tStart - tEnd - gap * welds,
      direction: dirs[i]!,
      label: directionLabel(s),
    };
  });

  const short = runs.find((r) => r.cutLength <= 0);
  if (short)
    return {
      ...EMPTY,
      points,
      error: `Run ${short.index + 1} is too short for its fittings — takeouts exceed the ${short.centerToCenter} centre-to-centre.`,
    };

  const totalCut = runs.reduce((a, r) => a + r.cutLength, 0);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const zs = points.map((p) => p.z);
  const min = { x: Math.min(...xs), y: Math.min(...ys), z: Math.min(...zs) };
  const max = { x: Math.max(...xs), y: Math.max(...ys), z: Math.max(...zs) };

  return {
    valid: true,
    points,
    runs,
    elbows,
    totalCut,
    totalCenterToCenter: segments.reduce((a, s) => a + s.length, 0),
    weight: pipeWeight(totalCut, size.od, size.wall[schedule]),
    bounds: { min, max, size: sub(max, min) },
  };
}

export function makeSegment(id: string, cardinal: Cardinal, length: number): SpoolSegment {
  return { id, mode: 'cardinal', cardinal, azimuth: 0, elevation: 0, length };
}
