// Holding the heat book on the device.
//
// All the reasoning is in calc/heat.ts and state/heatBook.ts, and all the
// persistence machinery — the queued write-through, the refusal to write over
// a newer app's store — is in persisted.tsx, shared with the joint register
// and the spool shelf. This file only binds them together.

import { HeatBook, emptyBook, parseBook, serialiseBook } from './heatBook';
import { createPersistedStore } from './persisted';

const store = createPersistedStore<HeatBook>({
  key: 'pipefit.heats.v1',
  name: 'useHeats',
  empty: emptyBook,
  parse: parseBook,
  serialise: serialiseBook,
});

export const HeatsProvider = store.Provider;

export function useHeats() {
  const { value, hydrated, saveError, apply, clearDropped, takeOver } = store.use();
  return { book: value, hydrated, saveError, apply, clearDropped, takeOver };
}
