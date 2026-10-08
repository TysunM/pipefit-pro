// Holding the pre-task plans on the device. The reasoning is in pretask.ts;
// this binds it to the shared write-through store.

import { PlanLog, emptyPlans, parsePlans, serialisePlans } from './pretask';
import { createPersistedStore } from './persisted';

const store = createPersistedStore<PlanLog>({
  key: 'pipefit.pretask.v1',
  name: 'usePreTasks',
  empty: emptyPlans,
  parse: parsePlans,
  serialise: serialisePlans,
});

export const PreTasksProvider = store.Provider;

export function usePreTasks() {
  const { value, hydrated, saveError, apply, clearDropped, takeOver } = store.use();
  return { log: value, hydrated, saveError, apply, clearDropped, takeOver };
}
