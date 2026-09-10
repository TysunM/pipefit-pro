import { Vec3 } from '../../calc/spool';
import { Pt } from '../diagram/primitives';

export type Camera = { yaw: number; pitch: number };

export type Projected = Pt & { depth: number };

export function rotate(p: Vec3, cam: Camera): Vec3 {
  const cy = Math.cos(cam.yaw);
  const sy = Math.sin(cam.yaw);
  const x1 = p.x * cy + p.z * sy;
  const z1 = -p.x * sy + p.z * cy;

  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const y2 = p.y * cp - z1 * sp;
  const z2 = p.y * sp + z1 * cp;

  return { x: x1, y: y2, z: z2 };
}

export function project(p: Vec3, cam: Camera): Projected {
  const r = rotate(p, cam);
  return { x: r.x, y: -r.y, depth: r.z };
}

export type Fitted = { map: (p: Vec3) => Projected; scale: number };

export function fitSphere(points: Vec3[], cam: Camera, width: number, height: number, pad: number): Fitted {
  if (!points.length) return { map: () => ({ x: width / 2, y: height / 2, depth: 0 }), scale: 1 };
  const c: Vec3 = {
    x: (Math.min(...points.map((p) => p.x)) + Math.max(...points.map((p) => p.x))) / 2,
    y: (Math.min(...points.map((p) => p.y)) + Math.max(...points.map((p) => p.y))) / 2,
    z: (Math.min(...points.map((p) => p.z)) + Math.max(...points.map((p) => p.z))) / 2,
  };
  const radius = Math.max(
    1e-6,
    ...points.map((p) => Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z))
  );
  const scale = Math.min(width - pad * 2, height - pad * 2) / 2 / radius;
  const pc = project(c, cam);
  return {
    scale,
    map: (p: Vec3) => {
      const pr = project(p, cam);
      return {
        x: (pr.x - pc.x) * scale + width / 2,
        y: (pr.y - pc.y) * scale + height / 2,
        depth: (pr.depth - pc.depth) * scale,
      };
    },
  };
}

export function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-9) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function fitProjection(
  points: Projected[],
  width: number,
  height: number,
  pad: number
): (p: Projected) => Projected {
  if (!points.length) return (p) => p;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
  const offX = pad + (width - pad * 2 - spanX * scale) / 2 - minX * scale;
  const offY = pad + (height - pad * 2 - spanY * scale) / 2 - minY * scale;
  return (p) => ({ x: p.x * scale + offX, y: p.y * scale + offY, depth: p.depth * scale });
}

export const ISO_VIEW: Camera = { yaw: -Math.PI / 4, pitch: Math.atan(Math.SQRT1_2) };

export const clampPitch = (v: number): number => Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, v));
