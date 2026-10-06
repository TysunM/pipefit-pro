// When the job's specs move under an open screen
// ----------------------------------------------
// A calculator takes the job's pipe when it opens and then keeps its own, so
// the fitter can try another size without changing the job. But when the
// job's pipe itself changes while the screen is open — "1 inch PVC" said
// into the mic, or Settings changed in another tab — the screen must follow,
// or it goes on working the old size with nothing on it to say so.
//
// So a screen follows a change in the job's specs, field by field, and keeps
// its own choice of anything the job did not change.

import { material, sizeLabel, wallLabel } from '../calc/materials';

export type PipeSpecs = { nps: number; kind: 'LR' | 'SR'; schedule: '10' | '40' | '80' };

/** What moved in the job's specs, as a patch for the screen. Empty when nothing did. */
export function specMoved(prev: PipeSpecs, next: PipeSpecs): Partial<PipeSpecs> {
  const patch: Partial<PipeSpecs> = {};
  if (prev.nps !== next.nps) patch.nps = next.nps;
  if (prev.kind !== next.kind) patch.kind = next.kind;
  if (prev.schedule !== next.schedule) patch.schedule = next.schedule;
  return patch;
}

export type JobSpecs = PipeSpecs & { material: string; wall: string };

/**
 * What an open calculator shows when it follows a change of the job's pipe —
 * size, radius, schedule, material or wall — or null when nothing it works
 * from moved. Seen as well as heard: the spoken reply is easy to miss in a
 * loud shop with ear protection in.
 */
export function specNotice(prev: JobSpecs, next: JobSpecs): string | null {
  const same =
    prev.nps === next.nps && prev.kind === next.kind && prev.schedule === next.schedule && prev.material === next.material && prev.wall === next.wall;
  if (same) return null;
  return `Pipe changed to ${sizeLabel(next.nps)} ${material(next.material).short} ${wallLabel(next.wall)} ${next.kind}, to match the job.`;
}
