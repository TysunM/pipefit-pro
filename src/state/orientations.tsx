// Holding the orientation on the device: the company's modules, the courses
// Claude built, and the passes. The reasoning is in orientation.ts; this binds
// the three to the shared write-through store.

import React from 'react';
import {
  CompletionStore,
  CourseStore,
  ModuleStore,
  emptyCompletions,
  emptyCourses,
  emptyModules,
  parseCompletions,
  parseCourses,
  parseModules,
  serialiseCompletions,
  serialiseCourses,
  serialiseModules,
} from './orientation';
import { createPersistedStore } from './persisted';

const modules = createPersistedStore<ModuleStore>({ key: 'pipefit.orientation.v1', name: 'useOrientationModules', empty: emptyModules, parse: parseModules, serialise: serialiseModules });
const courses = createPersistedStore<CourseStore>({ key: 'pipefit.orientation.courses.v1', name: 'useOrientationCourses', empty: emptyCourses, parse: parseCourses, serialise: serialiseCourses });
const done = createPersistedStore<CompletionStore>({ key: 'pipefit.orientation.done.v1', name: 'useOrientationDone', empty: emptyCompletions, parse: parseCompletions, serialise: serialiseCompletions });

export function OrientationProvider({ children }: { children: React.ReactNode }) {
  return (
    <modules.Provider>
      <courses.Provider>
        <done.Provider>{children}</done.Provider>
      </courses.Provider>
    </modules.Provider>
  );
}

export function useOrientationModules() {
  const { value, hydrated, saveError, apply, takeOver } = modules.use();
  return { store: value, hydrated, saveError, apply, takeOver };
}

export function useOrientationCourses() {
  const { value, apply } = courses.use();
  return { courses: value, apply };
}

export function useOrientationDone() {
  const { value, hydrated, saveError, apply, takeOver } = done.use();
  return { done: value, hydrated, saveError, apply, takeOver };
}
