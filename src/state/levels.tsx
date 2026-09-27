// Holding the level log on the device. All the reasoning is in levelLog.ts;
// this binds it to the shared write-through store.

import { LevelLog, emptyLog, parseLog, serialiseLog } from './levelLog';
import { createPersistedStore } from './persisted';

const store = createPersistedStore<LevelLog>({
  key: 'pipefit.levels.v1',
  name: 'useLevels',
  empty: emptyLog,
  parse: parseLog,
  serialise: serialiseLog,
});

export const LevelsProvider = store.Provider;

export function useLevels() {
  const { value, hydrated, saveError, apply, clearDropped, takeOver } = store.use();
  return { log: value, hydrated, saveError, apply, clearDropped, takeOver };
}
