// Holding the cut list on the device. The reasoning is in cutLog.ts; this
// binds it to the shared write-through store.

import { CutLog, emptyCuts, parseCuts, serialiseCuts } from './cutLog';
import { createPersistedStore } from './persisted';

const store = createPersistedStore<CutLog>({
  key: 'pipefit.cuts.v1',
  name: 'useCuts',
  empty: emptyCuts,
  parse: parseCuts,
  serialise: serialiseCuts,
});

export const CutsProvider = store.Provider;

export function useCuts() {
  const { value, hydrated, saveError, apply } = store.use();
  return { log: value, hydrated, saveError, apply };
}
