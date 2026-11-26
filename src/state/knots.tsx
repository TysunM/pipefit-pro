// What has been tied and how the knot tests went, held on the device
// (knotProgress.ts says what is kept; persisted.tsx keeps it).

import React from 'react';
import { createPersistedStore } from './persisted';
import { emptyKnots, parseKnots, serialiseKnots, type KnotBook } from './knotProgress';

export const KNOTS_KEY = 'pipefit.knots.v1';

const store = createPersistedStore<KnotBook>({ key: KNOTS_KEY, name: 'useKnotBook', empty: emptyKnots, parse: parseKnots, serialise: serialiseKnots });

export function KnotProvider({ children }: { children: React.ReactNode }) {
  return <store.Provider>{children}</store.Provider>;
}

export const useKnotBook = store.use;
