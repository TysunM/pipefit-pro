import React, { createContext, useContext, useMemo, useState } from 'react';
import type { ProjectFilter } from './project';

// The job being looked at, shared by every screen that filters by job, so a
// job picked on the Projects page is still picked on the Joint log and the
// Order sheet it links to. Held in memory only: the app opens on the active
// job every time, because that is the job a man is on when he opens it.

type Ctx = { picked: ProjectFilter | null; setPicked: (f: ProjectFilter | null) => void };

const JobPickContext = createContext<Ctx | null>(null);

export function JobPickProvider({ children }: { children: React.ReactNode }) {
  const [picked, setPicked] = useState<ProjectFilter | null>(null);
  const value = useMemo(() => ({ picked, setPicked }), [picked]);
  return <JobPickContext.Provider value={value}>{children}</JobPickContext.Provider>;
}

export function useJobPick(): Ctx {
  const ctx = useContext(JobPickContext);
  if (!ctx) throw new Error('useJobPick must be used inside JobPickProvider');
  return ctx;
}
