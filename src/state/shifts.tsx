// Holding the shift reports on the device. All the reasoning is in
// shiftLog.ts; this binds it to the shared write-through store.

import { ShiftLog, emptyShifts, parseShifts, serialiseShifts } from './shiftLog';
import { createPersistedStore } from './persisted';

const store = createPersistedStore<ShiftLog>({
  key: 'pipefit.shifts.v1',
  name: 'useShifts',
  empty: emptyShifts,
  parse: parseShifts,
  serialise: serialiseShifts,
});

export const ShiftsProvider = store.Provider;

export function useShifts() {
  const { value, hydrated, saveError, apply, clearDropped, takeOver } = store.use();
  return { log: value, hydrated, saveError, apply, clearDropped, takeOver };
}
