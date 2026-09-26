import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UnitSystem } from '../calc/units';
import { FractionDenominator } from '../calc/format';
import { ElbowRadius, Schedule } from '../calc/pipe';
import { LOOK, readSettings } from './readSettings';

export type ThemePreference = 'light' | 'dark' | 'system';

/** What the calculator shows a length as before any conversion is asked for. */
export type LengthReadout = 'inches' | 'feetInches';

export type Settings = {
  themePreference: ThemePreference;
  unitSystem: UnitSystem;
  fractionDenominator: FractionDenominator;
  lengthReadout: LengthReadout;
  defaultNps: number;
  defaultKind: ElbowRadius;
  defaultSchedule: Schedule;
  defaultGap: number;
  stockLength: number;
  /**
   * What the saw takes off on every cut.
   *
   * It is not a rounding error. A stick that looks like it holds four sixty
   * inch pieces holds three, and a cut list that ignores the blade is a cut
   * list that comes up one piece short at the end of the day.
   */
  cutAllowance: number;
  /**
   * The job this phone is working, as the site names it — a project number, a
   * line number, a spool reference. Shown on the home screen so every figure
   * read off the phone is read against the right job. Empty until it is set.
   */
  projectId: string;
  /** Which look these were written under — see readSettings. */
  look: number;
};

export const DEFAULT_SETTINGS: Settings = {
  // The bronze look is the app. Daylight is there for direct sun, where a
  // dark screen shows you your own face.
  themePreference: 'dark',
  unitSystem: 'imperial',
  fractionDenominator: 16,
  lengthReadout: 'inches',
  defaultNps: 2,
  defaultKind: 'LR',
  defaultSchedule: '40',
  defaultGap: 0.09375,
  stockLength: 240,
  cutAllowance: 0.125,
  projectId: '',
  look: LOOK,
};

const STORAGE_KEY = 'pipefit.settings.v1';

type Ctx = {
  settings: Settings;
  hydrated: boolean;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
};

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!alive) return;
        const { settings: read, migrated } = readSettings(raw, DEFAULT_SETTINGS);
        setSettings(read);
        if (migrated) void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(read));
      })
      .finally(() => alive && setHydrated(true));
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // The project is the job, not a default, so resetting the defaults leaves it.
  const reset = useCallback(() => {
    setSettings((prev) => {
      const next = { ...DEFAULT_SETTINGS, projectId: prev.projectId };
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(() => ({ settings, hydrated, update, reset }), [settings, hydrated, update, reset]);
  return React.createElement(SettingsContext.Provider, { value }, children);
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
