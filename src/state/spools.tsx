// Holding the spool shelf on the device.
//
// All the reasoning is in spoolStore.ts; the persistence machinery is the
// shared write-through store in persisted.tsx, the same one the joint register
// rides. This file only binds the two together.

import { SpoolShelf, emptyShelf, parseShelf, serialiseShelf } from './spoolStore';
import { createPersistedStore } from './persisted';

const store = createPersistedStore<SpoolShelf>({
  key: 'pipefit.spools.v1',
  name: 'useSpools',
  empty: emptyShelf,
  parse: parseShelf,
  serialise: serialiseShelf,
});

export const SpoolsProvider = store.Provider;

export function useSpools() {
  const { value, hydrated, saveError, apply, clearDropped, takeOver } = store.use();
  return { shelf: value, hydrated, saveError, apply, clearDropped, takeOver };
}
