import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RECORDABLE } from '../navigation/groups';
import { RECENT_VERSION, parseRecent, pushRecent, shown } from './recent';

// Holding the last-used strip on the device.
//
// This does not use createPersistedStore, and that is deliberate. That
// machinery exists to refuse to write over a store a newer app wrote, because
// overwriting a joint register or a heat book loses real work somebody did.
// A list of shortcuts is not work. Losing it costs a man one tap, so the
// refusal, the dropped-records notice and the take-over button would all be
// ceremony over nothing.
//
// What it does do is write only when the front of the list actually changes.
// The recorder runs on every navigation, and a screen that is reopened or
// simply re-rendered must not queue a write.

const KEY = 'pipefit.recent.v1';

type Ctx = {
  /** What the strip shows, newest first. */
  recent: string[];
  hydrated: boolean;
  remember: (route: string) => void;
};

const RecentsContext = createContext<Ctx | null>(null);

export function RecentsProvider({ children }: { children: React.ReactNode }) {
  const [routes, setRoutes] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  // The recorder fires before the read finishes on a cold start, so the newest
  // route is held here and folded in rather than lost or written too early.
  const pendingFirst = useRef<string | null>(null);
  const live = useRef<string[]>([]);

  const write = useCallback((next: string[]) => {
    live.current = next;
    setRoutes(next);
    void AsyncStorage.setItem(KEY, JSON.stringify({ version: RECENT_VERSION, routes: next })).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!alive) return;
        const stored = parseRecent(raw, (r) => RECORDABLE.has(r)).routes;
        const first = pendingFirst.current;
        const next = first ? pushRecent(stored, first) : stored;
        live.current = next;
        setRoutes(next);
        if (first) {
          void AsyncStorage.setItem(KEY, JSON.stringify({ version: RECENT_VERSION, routes: next })).catch(() => {});
        }
      })
      .catch(() => {
        if (alive) live.current = [];
      })
      .finally(() => {
        if (alive) setHydrated(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const remember = useCallback(
    (route: string) => {
      if (!RECORDABLE.has(route)) return;
      if (live.current[0] === route) return; // already the newest — nothing to write
      if (!hydrated) {
        pendingFirst.current = route;
        return;
      }
      write(pushRecent(live.current, route));
    },
    [hydrated, write]
  );

  const value = useMemo<Ctx>(
    () => ({ recent: shown(routes), hydrated, remember }),
    [routes, hydrated, remember]
  );

  return <RecentsContext.Provider value={value}>{children}</RecentsContext.Provider>;
}

export function useRecents(): Ctx {
  const ctx = useContext(RecentsContext);
  if (!ctx) throw new Error('useRecents must be used inside RecentsProvider');
  return ctx;
}
