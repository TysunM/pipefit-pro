// Holding the skills passport's sign-offs on the device. The reasoning is in
// passport.ts; this binds it to the shared write-through store.

import { Passport, emptyPassport, parsePassport, serialisePassport } from './passport';
import { createPersistedStore } from './persisted';

const store = createPersistedStore<Passport>({
  key: 'pipefit.passport.v1',
  name: 'usePassport',
  empty: emptyPassport,
  parse: parsePassport,
  serialise: serialisePassport,
});

export const PassportProvider = store.Provider;

export function usePassport() {
  const { value, hydrated, saveError, apply, takeOver } = store.use();
  return { passport: value, hydrated, saveError, apply, takeOver };
}
