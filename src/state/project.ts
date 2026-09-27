import { PROJECT_ID_MAX } from './readSettings';

// Which job a record belongs to
// -----------------------------
// Every saved record — a joint, an iso, a spool, a level reading — carries the
// Project ID that was active in Settings when it was first saved, and keeps it
// through every later edit. The Projects page filters on it, so a man on his
// second job is not scrolling past the first one's bolt-ups.
//
// An empty string is "no project": everything saved before records were
// tagged, and anything saved while no Project ID was set. Matching ignores
// case and the spaces round the edges, because "bp-ref-001" and "BP-REF-001 "
// are the same job typed twice.

/** What a record stores: trimmed, capped, and '' for anything that is not a string. */
export const cleanProject = (v: unknown): string => (typeof v === 'string' ? v.trim().slice(0, PROJECT_ID_MAX) : '');

export const projectKey = (p: string): string => p.trim().toUpperCase();

export const sameProject = (a: string, b: string): boolean => projectKey(a) === projectKey(b);

export type ProjectFilter = { kind: 'all' } | { kind: 'one'; id: string };

export const ALL: ProjectFilter = { kind: 'all' };
export const only = (id: string): ProjectFilter => ({ kind: 'one', id: cleanProject(id) });

export const inProject = (project: string, f: ProjectFilter): boolean => f.kind === 'all' || sameProject(project, f.id);

export type ProjectCount = { id: string; count: number };

/**
 * Every project the records name, with how many records each holds. The
 * active project comes first even when nothing is saved under it yet, the
 * rest by count then name, and "no project" last.
 */
export function projectsIn(records: readonly { project: string }[], active: string): ProjectCount[] {
  const byKey = new Map<string, ProjectCount>();
  const cleanActive = cleanProject(active);
  if (cleanActive) byKey.set(projectKey(cleanActive), { id: cleanActive, count: 0 });
  for (const r of records) {
    const k = projectKey(r.project);
    const hit = byKey.get(k);
    if (hit) hit.count += 1;
    else byKey.set(k, { id: cleanProject(r.project), count: 1 });
  }
  const activeKey = projectKey(cleanActive);
  return [...byKey.values()].sort((a, b) => {
    const rank = (p: ProjectCount) => (cleanActive && projectKey(p.id) === activeKey ? 0 : p.id === '' ? 2 : 1);
    return rank(a) - rank(b) || b.count - a.count || a.id.localeCompare(b.id);
  });
}

/** The active project when one is set, else everything. */
export const defaultFilter = (active: string): ProjectFilter => (cleanProject(active) ? only(active) : ALL);

/** Put every untagged record under a project. Records already tagged are left where they are. */
export function claimUntagged<T extends { project: string }>(xs: readonly T[], project: string): T[] {
  const p = cleanProject(project);
  if (!p) return xs.slice();
  return xs.map((x) => (x.project === '' ? { ...x, project: p } : x));
}

/** How many records have no project. */
export const untagged = (xs: readonly { project: string }[]): number => xs.filter((x) => x.project === '').length;

/**
 * The job list with the picked job in it even when this list holds nothing
 * for it, so a job chosen on one screen stays visible, and chosen, on the next.
 */
export function withPicked(jobs: readonly ProjectCount[], picked: ProjectFilter | null): ProjectCount[] {
  if (picked?.kind !== 'one' || jobs.some((j) => sameProject(j.id, picked.id))) return jobs.slice();
  if (picked.id === '') return [...jobs, { id: '', count: 0 }];
  // Before "no project", which always sits last.
  const out = jobs.slice();
  const at = out.findIndex((j) => j.id === '');
  out.splice(at === -1 ? out.length : at, 0, { id: picked.id, count: 0 });
  return out;
}
