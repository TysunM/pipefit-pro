// Holding the orbital book on the device: the equipment, the programs, the
// crew's equations and the runs, each its own store. The reasoning is in
// orbitalBook.ts; the keeping, shared with every other store, in persisted.tsx.

import React from 'react';
import { createPersistedStore } from './persisted';
import {
  emptyEquations,
  emptyGear,
  emptyPrograms,
  emptyRuns,
  parseEquations,
  parseGear,
  parsePrograms,
  parseRuns,
  serialiseEquations,
  serialiseGear,
  serialisePrograms,
  serialiseRuns,
  type EquationBook,
  type GearBook,
  type ProgramBook,
  type RunBook,
} from './orbitalBook';

export const ORBITAL_KEYS = {
  gear: 'pipefit.orbital.gear.v1',
  programs: 'pipefit.orbital.programs.v1',
  equations: 'pipefit.orbital.equations.v1',
  runs: 'pipefit.orbital.runs.v1',
} as const;

const gear = createPersistedStore<GearBook>({ key: ORBITAL_KEYS.gear, name: 'useOrbitalGear', empty: emptyGear, parse: parseGear, serialise: serialiseGear });
const programs = createPersistedStore<ProgramBook>({ key: ORBITAL_KEYS.programs, name: 'useOrbitalPrograms', empty: emptyPrograms, parse: parsePrograms, serialise: serialisePrograms });
const equations = createPersistedStore<EquationBook>({ key: ORBITAL_KEYS.equations, name: 'useOrbitalEquations', empty: emptyEquations, parse: parseEquations, serialise: serialiseEquations });
const runs = createPersistedStore<RunBook>({ key: ORBITAL_KEYS.runs, name: 'useOrbitalRuns', empty: emptyRuns, parse: parseRuns, serialise: serialiseRuns });

export function OrbitalProvider({ children }: { children: React.ReactNode }) {
  return (
    <gear.Provider>
      <programs.Provider>
        <equations.Provider>
          <runs.Provider>{children}</runs.Provider>
        </equations.Provider>
      </programs.Provider>
    </gear.Provider>
  );
}

export const useOrbitalGear = gear.use;
export const useOrbitalPrograms = programs.use;
export const useOrbitalEquations = equations.use;
export const useOrbitalRuns = runs.use;
