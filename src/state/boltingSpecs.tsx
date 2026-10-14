// Holding the company's bolting specs on the device.
//
// The reasoning is in boltingSpec.ts and the persistence in persisted.tsx,
// shared with the joint register: the same refusal to write over a newer
// app's store, because a spec is what every record on the job is bolted to.

import { SpecBook, emptySpecBook, parseSpecBook, serialiseSpecBook } from './boltingSpec';
import { createPersistedStore } from './persisted';

const store = createPersistedStore<SpecBook>({
  key: 'pipefit.boltspecs.v1',
  name: 'useBoltingSpecs',
  empty: emptySpecBook,
  parse: parseSpecBook,
  serialise: serialiseSpecBook,
});

export const BoltingSpecsProvider = store.Provider;

export function useBoltingSpecs() {
  const { value, hydrated, saveError, apply, clearDropped, takeOver } = store.use();
  return { book: value, hydrated, saveError, apply, clearDropped, takeOver };
}
