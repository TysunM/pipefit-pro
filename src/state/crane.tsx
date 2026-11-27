// How the crane signals have gone, held on the device
// (craneProgress.ts says what is kept; persisted.tsx keeps it).

import React from 'react';
import { createPersistedStore } from './persisted';
import { emptyCrane, parseCrane, serialiseCrane, type CraneBook } from './craneProgress';

export const CRANE_KEY = 'pipefit.crane.v1';

const store = createPersistedStore<CraneBook>({ key: CRANE_KEY, name: 'useCraneBook', empty: emptyCrane, parse: parseCrane, serialise: serialiseCrane });

export function CraneProvider({ children }: { children: React.ReactNode }) {
  return <store.Provider>{children}</store.Provider>;
}

export const useCraneBook = store.use;
