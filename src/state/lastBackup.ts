// When the phone was last backed up, so Settings can say so and nag when it
// has been a while. Only the time; the backup itself is wherever it was sent.

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'pipefit.backupAt.v1';
let cached: number | null | undefined;
const subs = new Set<(at: number | null) => void>();

/** Past this, Settings asks for a backup. */
export const BACKUP_DUE_DAYS = 7;

export function backupAge(at: number | null, now: number): { days: number | null; due: boolean } {
  if (!at) return { days: null, due: true };
  const days = Math.floor((now - at) / 86_400_000);
  return { days, due: days >= BACKUP_DUE_DAYS };
}

export function useLastBackup(): { at: number | null; mark: (at: number) => void } {
  const [at, setAt] = useState<number | null>(cached ?? null);
  useEffect(() => {
    subs.add(setAt);
    if (cached === undefined)
      void AsyncStorage.getItem(KEY)
        .then((raw) => {
          const n = Number(raw);
          cached = raw && Number.isFinite(n) && n > 0 ? n : null;
          subs.forEach((f) => f(cached ?? null));
        })
        .catch(() => undefined);
    return () => {
      subs.delete(setAt);
    };
  }, []);
  const mark = useCallback((when: number) => {
    cached = when;
    subs.forEach((f) => f(when));
    void AsyncStorage.setItem(KEY, String(when)).catch(() => undefined);
  }, []);
  return { at, mark };
}
