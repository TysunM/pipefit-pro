import { ElbowRadius, Schedule, backArc, centerlineArc, findSize, pipeWeight, takeoff, throatArc } from './pipe';
import { deg, rad } from './units';

export type Vec3 = { x: number; y: number; z: number };

export const MAX_LEGS = 8;

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

export function rotateAbout(v: Vec3, axis: Vec3, angleRad: number): Vec3 {
  const k = unit(axis);
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  const term1 = scale(v, c);
  const term2 = scale(cross(k, v), s);
  const term3 = scale(k, dot(k, v) * (1 - c));
  return add(add(term1, term2), term3);
}

export type SpoolLeg = {
  id: string;
  length: number;
  bend: number;
  roll: number;
};

export type Frame = { d: Vec3; n: Vec3 };

export const START_FRAME: Frame = { d: { x: 0, y: 0, z: 1 }, n: { x: 0, y: 1, z: 0 } };

/**
 * The frame after a turn.
 *
 * Roll is read off the pipe the way a man standing behind it reads it: zero is
 * up, and it goes clockwise from there, so ninety is his right hand. That puts
 * the binormal at `n x d` — up crossed into the run, which for a leg heading
 * north is east, which is the right hand of anyone facing north. The other
 * order builds the same spool reflected, and a spool reflected is the other
 * hand, which is a spool that does not fit.
 */
export function advanceFrame(frame: Frame, bendDeg: number, rollDeg: number): Frame {
  if (!(bendDeg > 0.0001)) return frame;
  const b = cross(frame.n, frame.d);
  const psi = rad(rollDeg);
  const p = unit(add(scale(frame.n, Math.cos(psi)), scale(b, Math.sin(psi))));
  const axis = cross(frame.d, p);
  if (len(axis) < 1e-9) return frame;
  const theta = rad(bendDeg);
  return { d: unit(rotateAbout(frame.d, axis, theta)), n: unit(rotateAbout(frame.n, axis, theta)) };
}

export type SpoolRun = {
  index: number;
  from: Vec3;
  to: Vec3;
  direction: Vec3;
  centerToCenter: number;
  cutLength: number;
  takeoffStart: number;
  takeoffEnd: number;
};

export type SpoolElbow = {
  index: number;
  legIndex: number;
  at: Vec3;
  angle: number;
  roll: number;
  takeoff: number;
  centerlineArc: number;
  throatArc: number;
  backArc: number;
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

const ZERO: Vec3 = { x: 0, y: 0, z: 0 };
const EMPTY: SpoolResult = {
  valid: false,
  points: [],
  runs: [],
  elbows: [],
  totalCut: NaN,
  totalCenterToCenter: NaN,
  weight: NaN,
  bounds: { min: ZERO, max: ZERO, size: ZERO },
};

export type SpoolInput = {
  legs: SpoolLeg[];
  nps: number;
  kind: ElbowRadius;
  schedule: Schedule;
  gap: number;
  /**
   * Which way the first leg runs, and which way is up across it.
   *
   * Left out, the spool starts heading north with up overhead, which is what
   * every caller that describes a spool as turns off the last leg wants. A
   * caller that aims each leg at the compass sets it, so the first leg goes
   * where it was told instead of being swung round afterwards.
   */
  start?: Frame;
};

export function solveSpool(input: SpoolInput): SpoolResult {
  const { legs, nps, kind, schedule } = input;
  const gap = Number.isFinite(input.gap) ? input.gap : 0;

  if (legs.length < 1) return { ...EMPTY, error: 'Add at least one leg to build a spool.' };
  if (legs.length > MAX_LEGS) return { ...EMPTY, error: `A spool is limited to ${MAX_LEGS} legs.` };

  for (let i = 0; i < legs.length; i += 1) {
    const l = legs[i]!;
    if (!Number.isFinite(l.length) || l.length <= 0)
      return { ...EMPTY, error: `Leg ${i + 1} needs a length greater than zero.` };
    if (i > 0) {
      if (!Number.isFinite(l.bend) || l.bend < 0 || l.bend >= 180)
        return { ...EMPTY, error: `Joint ${i} needs a bend between 0° and 180°.` };
      if (!Number.isFinite(l.roll)) return { ...EMPTY, error: `Joint ${i} needs a roll angle.` };
    }
  }

  const points: Vec3[] = [ZERO];
  const dirs: Vec3[] = [];
  const elbows: SpoolElbow[] = [];
  const size = findSize(nps);

  let frame = input.start ?? START_FRAME;
  legs.forEach((leg, i) => {
    if (i > 0) {
      frame = advanceFrame(frame, leg.bend, leg.roll);
      if (leg.bend > 0.0001) {
        elbows.push({
          index: i,
          legIndex: i,
          at: points[i]!,
          angle: leg.bend,
          roll: ((leg.roll % 360) + 360) % 360,
          takeoff: takeoff(nps, kind, leg.bend),
          centerlineArc: centerlineArc(nps, kind, leg.bend),
          throatArc: throatArc(nps, kind, leg.bend, size.od),
          backArc: backArc(nps, kind, leg.bend, size.od),
        });
      }
    }
    dirs.push(frame.d);
    points.push(add(points[i]!, scale(frame.d, leg.length)));
  });

  const takeoffAt = (vertexIndex: number): number =>
    elbows.find((e) => e.index === vertexIndex)?.takeoff ?? 0;

  const runs: SpoolRun[] = legs.map((leg, i) => {
    const tStart = takeoffAt(i);
    const tEnd = takeoffAt(i + 1);
    const welds = (tStart > 0 ? 1 : 0) + (tEnd > 0 ? 1 : 0);
    return {
      index: i,
      from: points[i]!,
      to: points[i + 1]!,
      direction: dirs[i]!,
      centerToCenter: leg.length,
      takeoffStart: tStart,
      takeoffEnd: tEnd,
      cutLength: leg.length - tStart - tEnd - gap * welds,
    };
  });

  const short = runs.find((r) => r.cutLength <= 0);
  if (short)
    return {
      ...EMPTY,
      points,
      error: `Leg ${short.index + 1} is too short for its fittings — takeouts exceed the centre-to-centre.`,
    };

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const zs = points.map((p) => p.z);
  const min = { x: Math.min(...xs), y: Math.min(...ys), z: Math.min(...zs) };
  const max = { x: Math.max(...xs), y: Math.max(...ys), z: Math.max(...zs) };
  const totalCut = runs.reduce((a, r) => a + r.cutLength, 0);

  return {
    valid: true,
    points,
    runs,
    elbows,
    totalCut,
    totalCenterToCenter: legs.reduce((a, l) => a + l.length, 0),
    weight: pipeWeight(totalCut, size.od, size.wall[schedule]),
    bounds: { min, max, size: sub(max, min) },
  };
}

export function makeLeg(id: string, length: number, bend = 90, roll = 0): SpoolLeg {
  return { id, length, bend, roll };
}

/**
 * The centreline of an elbow, as points along its arc.
 *
 * A spool solved to centres is a set of corners, and a corner is not what gets
 * installed. The fitting leaves the incoming leg one takeoff back from the
 * corner, swings round on the bend radius, and meets the outgoing leg one
 * takeoff along it. Drawing that arc instead of the corner is the difference
 * between a stick figure and a picture of the pipe.
 *
 * The turn is read from the two leg directions rather than passed in beside
 * them. An angle that disagrees with the directions it is handed describes no
 * fitting that exists, and there is no way to tell from inside which of the two
 * was meant, so the question is not asked.
 *
 * The centre of the arc sits on the bisector of the turn, at radius over the
 * cosine of half the angle — which follows from the takeoff being the radius
 * times the tangent of that same half angle.
 */
export function elbowCenterline(
  vertex: Vec3,
  inDir: Vec3,
  outDir: Vec3,
  takeoffLength: number,
  steps = 12
): Vec3[] {
  const u = unit(inDir);
  const v = unit(outDir);
  const a = add(vertex, scale(u, -takeoffLength));
  const b = add(vertex, scale(v, takeoffLength));

  const theta = Math.acos(Math.max(-1, Math.min(1, dot(u, v))));
  if (!(theta > 1e-6) || !(takeoffLength > 1e-9) || !(steps > 0)) return [a, b];

  const half = theta / 2;
  const radius = takeoffLength / Math.tan(half);
  const centre = add(vertex, scale(unit(sub(v, u)), radius / Math.cos(half)));

  const ra = sub(a, centre);
  const axis = cross(ra, sub(b, centre));
  // A turn of half a circle leaves no plane to swing in.
  if (len(axis) < 1e-12) return [a, b];

  const out: Vec3[] = [];
  for (let i = 0; i <= steps; i += 1) out.push(add(centre, rotateAbout(ra, axis, (theta * i) / steps)));
  return out;
}
