import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UnitSystem } from '../calc/units';
import { FractionDenominator } from '../calc/format';
import { ElbowRadius, Schedule } from '../calc/pipe';

export type ThemePreference = 'light' | 'dark' | 'system';

export type Settings = {
  themePreference: ThemePreference;
  unitSystem: UnitSystem;
  fractionDenominator: FractionDenominator;
  defaultNps: number;
  defaultKind: ElbowRadius;
  defaultSchedule: Schedule;
  defaultGap: number;
  stockLength: number;
};

export const DEFAULT_SETTINGS: Settings = {
  themePreference: 'light',
  unitSystem: 'imperial',
  fractionDenominator: 16,
  defaultNps: 2,
  defaultKind: 'LR',
  defaultSchedule: '40',
  defaultGap: 0.09375,
  stockLength: 240,
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
        if (raw) {
          try {
            setSettings({ ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) });
          } catch {
            setSettings(DEFAULT_SETTINGS);
          }
        }
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

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
  }, []);

  const value = useMemo<Ctx>(() => ({ settings, hydrated, update, reset }), [settings, hydrated, update, reset]);
  return React.createElement(SettingsContext.Provider, { value }, children);
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
