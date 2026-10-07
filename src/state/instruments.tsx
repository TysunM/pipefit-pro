// Holding the calibration register on the device. The reasoning is in
// calibration.ts; this binds it to the shared write-through store.

import { CalibrationRegister, emptyInstruments, parseInstruments, serialiseInstruments } from './calibration';
import { createPersistedStore } from './persisted';

const store = createPersistedStore<CalibrationRegister>({
  key: 'pipefit.instruments.v1',
  name: 'useInstruments',
  empty: emptyInstruments,
  parse: parseInstruments,
  serialise: serialiseInstruments,
});

export const InstrumentsProvider = store.Provider;

export function useInstruments() {
  const { value, hydrated, saveError, apply, takeOver } = store.use();
  return { register: value, hydrated, saveError, apply, takeOver };
}
