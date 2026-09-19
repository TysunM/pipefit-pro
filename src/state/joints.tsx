// Holding the joint register on the device.
//
// All the reasoning is in register.ts, and all the persistence machinery — the
// queued write-through, the refusal to write over a newer app's store — lives
// in persisted.tsx, shared with the spool shelf. This file only binds the two
// together and keeps the register's names on the hook, so nothing that uses it
// had to move.

import { Register, emptyRegister, parseRegister, serialiseRegister } from './register';
import { createPersistedStore } from './persisted';

const store = createPersistedStore<Register>({
  key: 'pipefit.joints.v1',
  name: 'useJoints',
  empty: emptyRegister,
  parse: parseRegister,
  serialise: serialiseRegister,
});

export const JointsProvider = store.Provider;

export function useJoints() {
  const { value, hydrated, saveError, apply, clearDropped, takeOver } = store.use();
  return { register: value, hydrated, saveError, apply, clearDropped, takeOver };
}
