// Holding the heat input log on the device. The reasoning is in heatInputLog.ts.

import { emptyHeatInputs, parseHeatInputs, serialiseHeatInputs, type HeatInputLog } from './heatInputLog';
import { createPersistedStore } from './persisted';

const store = createPersistedStore<HeatInputLog>({
  key: 'pipefit.heatinput.v1',
  name: 'useHeatInputs',
  empty: emptyHeatInputs,
  parse: parseHeatInputs,
  serialise: serialiseHeatInputs,
});

export const HeatInputsProvider = store.Provider;

export function useHeatInputs() {
  const { value, hydrated, saveError, apply, clearDropped, takeOver } = store.use();
  return { log: value, hydrated, saveError, apply, clearDropped, takeOver };
}
