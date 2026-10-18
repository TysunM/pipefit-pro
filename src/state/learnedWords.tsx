// Holding what the phone has learned of its own mishearings.
//
// The reasoning is in voice/learned.ts and the persistence in persisted.tsx,
// shared with the joint register: kept as a store so it is backed up and
// restored with everything else.

import { LearnedBook, emptyLearned, parseLearned, serialiseLearned } from '../voice/learned';
import { createPersistedStore } from './persisted';

const store = createPersistedStore<LearnedBook>({
  key: 'pipefit.heard.v1',
  name: 'useLearnedWords',
  empty: emptyLearned,
  parse: parseLearned,
  serialise: serialiseLearned,
});

export const LearnedWordsProvider = store.Provider;

export function useLearnedWords() {
  const { value, hydrated, saveError, apply, clearDropped, takeOver } = store.use();
  return { book: value, hydrated, saveError, apply, clearDropped, takeOver };
}
