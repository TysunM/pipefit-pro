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
import { emptySigning, parseSigning, serialiseSigning, type SigningBook } from './qcSigning';

export const ORBITAL_KEYS = {
  gear: 'pipefit.orbital.gear.v1',
  programs: 'pipefit.orbital.programs.v1',
  equations: 'pipefit.orbital.equations.v1',
  runs: 'pipefit.orbital.runs.v1',
  // The QC's own signing key, the QCs this phone trusts, and the signed codes its programs came in on.
  // Deliberately not in a backup: a key in a file sent round is a key anyone can sign with (qcSigning.ts).
  signing: 'pipefit.orbital.signing.v1',
} as const;

const gear = createPersistedStore<GearBook>({ key: ORBITAL_KEYS.gear, name: 'useOrbitalGear', empty: emptyGear, parse: parseGear, serialise: serialiseGear });
const programs = createPersistedStore<ProgramBook>({ key: ORBITAL_KEYS.programs, name: 'useOrbitalPrograms', empty: emptyPrograms, parse: parsePrograms, serialise: serialisePrograms });
const equations = createPersistedStore<EquationBook>({ key: ORBITAL_KEYS.equations, name: 'useOrbitalEquations', empty: emptyEquations, parse: parseEquations, serialise: serialiseEquations });
const runs = createPersistedStore<RunBook>({ key: ORBITAL_KEYS.runs, name: 'useOrbitalRuns', empty: emptyRuns, parse: parseRuns, serialise: serialiseRuns });
const signing = createPersistedStore<SigningBook>({ key: ORBITAL_KEYS.signing, name: 'useOrbitalSigning', empty: emptySigning, parse: parseSigning, serialise: serialiseSigning });

export function OrbitalProvider({ children }: { children: React.ReactNode }) {
  return (
    <gear.Provider>
      <programs.Provider>
        <equations.Provider>
          <runs.Provider>
            <signing.Provider>{children}</signing.Provider>
          </runs.Provider>
        </equations.Provider>
      </programs.Provider>
    </gear.Provider>
  );
}

export const useOrbitalGear = gear.use;
export const useOrbitalPrograms = programs.use;
export const useOrbitalEquations = equations.use;
export const useOrbitalRuns = runs.use;
export const useOrbitalSigning = signing.use;
