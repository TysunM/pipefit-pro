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

export type PipeSpecs = { nps: number; kind: 'LR' | 'SR'; schedule: '10' | '40' | '80' };

/** What moved in the job's specs, as a patch for the screen. Empty when nothing did. */
export function specMoved(prev: PipeSpecs, next: PipeSpecs): Partial<PipeSpecs> {
  const patch: Partial<PipeSpecs> = {};
  if (prev.nps !== next.nps) patch.nps = next.nps;
  if (prev.kind !== next.kind) patch.kind = next.kind;
  if (prev.schedule !== next.schedule) patch.schedule = next.schedule;
  return patch;
}
