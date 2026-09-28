import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEEP_FIGURES, pushFigure } from '../calc/gloveEntry';
import type { UnitSystem } from '../calc/units';

// The figures keyed on the glove keypad lately, so the ones a job keeps coming
// back to are one tap away. Kept apart from settings for the same reason the
// last-used tools are: it churns, and losing it costs a tap, not work. Imperial
// and metric are kept apart, since "12" means a different thing in each.

const KEY = 'pipefit.figures.v1';

type Stored = Record<UnitSystem, string[]>;

let cache: Stored | null = null;

const clean = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0 && x.length <= 24).slice(0, KEEP_FIGURES) : [];

async function load(): Promise<Stored> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Record<UnitSystem, unknown>>) : {};
    cache = { imperial: clean(parsed?.imperial), metric: clean(parsed?.metric) };
  } catch {
    cache = { imperial: [], metric: [] };
  }
  return cache;
}

/** The recent figures for this unit system, and a way to add one. */
export function useRecentFigures(system: UnitSystem): [string[], (value: string) => void] {
  const [list, setList] = useState<string[]>(cache?.[system] ?? []);
  useEffect(() => {
    let alive = true;
    void load().then((c) => {
      if (alive) setList(c[system]);
    });
    return () => {
      alive = false;
    };
  }, [system]);
  const remember = useCallback(
    (value: string) => {
      const base = cache ?? { imperial: [], metric: [] };
      const next = { ...base, [system]: pushFigure(base[system], value) };
      cache = next;
      setList(next[system]);
      void AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
    },
    [system],
  );
  return [list, remember];
}
