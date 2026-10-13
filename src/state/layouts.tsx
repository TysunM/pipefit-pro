import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EMPTY_LAYOUT, applyOrder, isCustomised, moveId, orderOf, parseLayout, serialiseLayout, withOrder, type Layout } from './layout';

// Holding the layout on the device: where the tabs, tiles and cards stand.
//
// Kept like the recently-used strip and for the same reason (see recents.tsx):
// it is a preference, not work, so none of createPersistedStore's care about a
// newer app's writes applies. Read once on start, written on every change.

const KEY = 'pipefit.layout.v1';

type Ctx = {
  layout: Layout;
  hydrated: boolean;
  /** Whether anything stands anywhere but where it shipped. */
  customised: boolean;
  /** Put `a` where `b` stands in a zone. */
  move: (zone: string, a: string, b: string) => void;
  /** Everything back where it shipped. */
  reset: () => void;
};

const LayoutContext = createContext<Ctx | null>(null);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [layout, setLayout] = useState<Layout>(EMPTY_LAYOUT);
  const [hydrated, setHydrated] = useState(false);
  const live = useRef<Layout>(EMPTY_LAYOUT);

  const write = useCallback((next: Layout) => {
    if (next === live.current) return;
    live.current = next;
    setLayout(next);
    void AsyncStorage.setItem(KEY, serialiseLayout(next)).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!alive) return;
        const read = parseLayout(raw);
        live.current = read;
        setLayout(read);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setHydrated(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const move = useCallback(
    (zone: string, a: string, b: string) => {
      const current = live.current;
      write(withOrder(current, zone, moveId(orderOf(current, zone), a, b)));
    },
    [write]
  );

  const reset = useCallback(() => write(EMPTY_LAYOUT), [write]);

  const value = useMemo<Ctx>(() => ({ layout, hydrated, customised: isCustomised(layout), move, reset }), [layout, hydrated, move, reset]);
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout(): Ctx {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used inside LayoutProvider');
  return ctx;
}

/**
 * A zone's items as the man left them, and a move said in the indexes of
 * what is on screen. The items may be only part of the zone (the Home page
 * shows the field tools not yet used); the move still lands in the whole
 * order, because it is carried as ids.
 */
export function useZone<T>(zone: string, items: readonly T[], idOf: (x: T) => string): { items: T[]; move: (from: number, to: number) => void } {
  const { layout, move: moveIn } = useLayout();
  const order = useMemo(() => orderOf(layout, zone), [layout, zone]);
  const ordered = useMemo(() => applyOrder(items, idOf, order), [items, idOf, order]);
  const move = useCallback(
    (from: number, to: number) => {
      const a = ordered[from];
      const b = ordered[to];
      if (a === undefined || b === undefined || from === to) return;
      moveIn(zone, idOf(a), idOf(b));
    },
    [ordered, idOf, moveIn, zone]
  );
  return { items: ordered, move };
}
