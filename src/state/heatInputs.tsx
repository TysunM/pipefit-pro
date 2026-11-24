// Holding the heat input log, and the WPS ranges it is checked against, on
// the device. The reasoning is in heatInputLog.ts and wpsBook.ts.

import { emptyHeatInputs, parseHeatInputs, serialiseHeatInputs, type HeatInputLog } from './heatInputLog';
import { createPersistedStore } from './persisted';
import { emptyWpsBook, parseWpsBook, serialiseWpsBook, type WpsBook } from './wpsBook';

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

// The WPS ranges the heat input screen checks against. The reasoning is in wpsBook.ts.
const wpsStore = createPersistedStore<WpsBook>({
  key: 'pipefit.wps.v1',
  name: 'useWpsBook',
  empty: emptyWpsBook,
  parse: parseWpsBook,
  serialise: serialiseWpsBook,
});

export const WpsBookProvider = wpsStore.Provider;

export function useWpsBook() {
  const { value, hydrated, saveError, apply, clearDropped, takeOver } = wpsStore.use();
  return { book: value, hydrated, saveError, apply, clearDropped, takeOver };
}
