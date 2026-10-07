// Holding the weld log and the welder roster on the device. The reasoning is
// in weldLog.ts; this binds both to the shared write-through store.

import { WeldLog, WelderRoster, emptyWelders, emptyWelds, parseWelders, parseWelds, serialiseWelders, serialiseWelds } from './weldLog';
import { createPersistedStore } from './persisted';

const welds = createPersistedStore<WeldLog>({
  key: 'pipefit.welds.v1',
  name: 'useWelds',
  empty: emptyWelds,
  parse: parseWelds,
  serialise: serialiseWelds,
});

const welders = createPersistedStore<WelderRoster>({
  key: 'pipefit.welders.v1',
  name: 'useWelders',
  empty: emptyWelders,
  parse: parseWelders,
  serialise: serialiseWelders,
});

export function WeldsProvider({ children }: { children: React.ReactNode }) {
  return (
    <welders.Provider>
      <welds.Provider>{children}</welds.Provider>
    </welders.Provider>
  );
}

export function useWelds() {
  const { value, hydrated, saveError, apply, takeOver } = welds.use();
  return { log: value, hydrated, saveError, apply, takeOver };
}

export function useWelders() {
  const { value, hydrated, saveError, apply, takeOver } = welders.use();
  return { roster: value, hydrated, saveError, apply, takeOver };
}
