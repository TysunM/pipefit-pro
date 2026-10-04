// Holding the fitting library on the device. All the reasoning is in
// fittingLibrary.ts; this binds it to the shared write-through store.

import { FittingLibrary, emptyLibrary, parseLibrary, serialiseLibrary } from './fittingLibrary';
import { createPersistedStore } from './persisted';

const store = createPersistedStore<FittingLibrary>({
  key: 'pipefit.fittings.v1',
  name: 'useFittings',
  empty: emptyLibrary,
  parse: parseLibrary,
  serialise: serialiseLibrary,
});

export const FittingsProvider = store.Provider;

export function useFittings() {
  const { value, hydrated, saveError, apply } = store.use();
  return { library: value, hydrated, saveError, apply };
}
