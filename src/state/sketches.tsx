// Holding the sketch book on the device. All the reasoning is in
// sketchStore.ts; this binds it to the shared write-through store.

import { SketchBook, emptyBook, parseBook, serialiseBook } from './sketchStore';
import { createPersistedStore } from './persisted';

const store = createPersistedStore<SketchBook>({
  key: 'pipefit.sketches.v1',
  name: 'useSketches',
  empty: emptyBook,
  parse: parseBook,
  serialise: serialiseBook,
});

export const SketchesProvider = store.Provider;

export function useSketches() {
  const { value, hydrated, saveError, apply, clearDropped, takeOver } = store.use();
  return { book: value, hydrated, saveError, apply, clearDropped, takeOver };
}
