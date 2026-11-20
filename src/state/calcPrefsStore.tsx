import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CALC_PREFS_KEY, defaultCalcPrefs, parseCalcPrefs, serialiseCalcPrefs, type CalcPrefs } from './calcPrefs';

// Holding calcPrefs.ts on the device. Read once on start; every change is
// written straight through. Losing a write costs a calculator mode, not a
// record, so there is no queue and no refusal here (see recents.tsx).

type Ctx = { prefs: CalcPrefs; hydrated: boolean; update: (f: (p: CalcPrefs) => CalcPrefs) => void };

const CalcPrefsContext = createContext<Ctx | null>(null);

export function CalcPrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<CalcPrefs>(defaultCalcPrefs);
  const [hydrated, setHydrated] = useState(false);
  const live = useRef(prefs);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(CALC_PREFS_KEY)
      .then((raw) => {
        if (!alive) return;
        const p = parseCalcPrefs(raw);
        live.current = p;
        setPrefs(p);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setHydrated(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback((f: (p: CalcPrefs) => CalcPrefs) => {
    const next = f(live.current);
    if (next === live.current) return;
    live.current = next;
    setPrefs(next);
    void AsyncStorage.setItem(CALC_PREFS_KEY, serialiseCalcPrefs(next)).catch(() => {});
  }, []);

  const value = useMemo<Ctx>(() => ({ prefs, hydrated, update }), [prefs, hydrated, update]);
  return <CalcPrefsContext.Provider value={value}>{children}</CalcPrefsContext.Provider>;
}

export function useCalcPrefs(): Ctx {
  const ctx = useContext(CalcPrefsContext);
  if (!ctx) throw new Error('useCalcPrefs must be used inside CalcPrefsProvider');
  return ctx;
}
