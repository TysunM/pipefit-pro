// Holding the pressure test log on the device. All the reasoning is in
// pressureLog.ts; this binds it to the shared write-through store.

import { PressureLog, emptyPressureLog, parsePressureLog, serialisePressureLog } from './pressureLog';
import { createPersistedStore } from './persisted';

const store = createPersistedStore<PressureLog>({
  key: 'pipefit.pressure.v1',
  name: 'usePressureTests',
  empty: emptyPressureLog,
  parse: parsePressureLog,
  serialise: serialisePressureLog,
});

export const PressureTestsProvider = store.Provider;

export function usePressureTests() {
  const { value, hydrated, saveError, apply, clearDropped, takeOver } = store.use();
  return { log: value, hydrated, saveError, apply, clearDropped, takeOver };
}
