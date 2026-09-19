// One store, held on the device, written through on every change.
//
// The joint register and the spool shelf keep different things and share every
// concern about keeping them: read once on start, hand the value out, write it
// back on each change without ever losing the newest write. That machinery is
// subtle enough to want a single copy — a drain bug fixed in one store and not
// the other is exactly the kind of split this file exists to prevent.
//
// The writing is the part with any care in it. Work is written through on
// every change, so the writes come faster than the store finishes them, and
// the case this exists for — a phone going into a pocket mid-job — is exactly
// when the last write must not be the one that gets dropped. So writes are
// queued rather than fired off in parallel: only the newest value is ever
// pending, it stays pending until the store has actually taken it, and a
// failed write leaves it there to be retried by the next change instead of
// vanishing.
//
// Every store here also refuses to write over a store from a NEWER app. The
// crew runs the web app and the APK side by side, and the older one silently
// overwriting the newer one's records would lose real work. `foreign` is that
// state; `takeOver` is the one deliberate way out of it.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** What any persisted value must carry for the shared machinery to steer by. */
export type Persistable = {
  /** The store was written by a newer app; nothing is written this session. */
  foreign: boolean;
  /** Records that failed to load. Shown once, dismissible. */
  dropped: number;
};

export type StoreCtx<T extends Persistable> = {
  value: T;
  /** The store has been read. Nothing is written before this is true. */
  hydrated: boolean;
  /** A write has failed and the value on screen is ahead of the store. */
  saveError: boolean;
  /** Change the value. The reducer runs on the newest value. */
  apply: (f: (v: T) => T) => void;
  /** Dismiss the "some records would not load" notice. */
  clearDropped: () => void;
  /**
   * Start saving again over a store written by a newer app, discarding what it
   * held. Only ever called from an explicit tap that says so, never on its own.
   */
  takeOver: () => void;
};

export function createPersistedStore<T extends Persistable>({
  key,
  name,
  empty,
  parse,
  serialise,
}: {
  key: string;
  /** For the hook's error message when used outside its provider. */
  name: string;
  empty: () => T;
  parse: (raw: string | null | undefined) => T;
  serialise: (value: T) => string;
}) {
  const Ctx = createContext<StoreCtx<T> | null>(null);

  function Provider({ children }: { children: React.ReactNode }) {
    const [value, setValue] = useState<T>(empty);
    const [hydrated, setHydrated] = useState(false);
    const [saveError, setSaveError] = useState(false);

    /** The newest value not yet taken by the store, or null when it is level. */
    const pending = useRef<string | null>(null);
    const writing = useRef(false);
    const readOnly = useRef(false);

    useEffect(() => {
      let alive = true;
      AsyncStorage.getItem(key)
        .then((raw) => {
          if (!alive) return;
          const v = parse(raw);
          readOnly.current = v.foreign;
          setValue(v);
        })
        .catch(() => {
          if (alive) setValue({ ...empty(), dropped: 1 });
        })
        .finally(() => {
          if (alive) setHydrated(true);
        });
      return () => {
        alive = false;
      };
    }, []);

    const drain = useCallback(async () => {
      if (writing.current) return;
      writing.current = true;
      try {
        while (pending.current !== null) {
          const next = pending.current;
          try {
            await AsyncStorage.setItem(key, next);
          } catch {
            // Leave it pending. The next change retries it, and the banner
            // says the value on screen is ahead of the store.
            setSaveError(true);
            return;
          }
          setSaveError(false);
          // Only clear it if nothing newer arrived while the store was busy.
          if (pending.current === next) pending.current = null;
        }
      } finally {
        writing.current = false;
      }
    }, []);

    const apply = useCallback(
      (f: (v: T) => T) => {
        setValue((prev) => {
          const next = f(prev);
          if (next === prev) return prev;
          if (!readOnly.current) {
            pending.current = serialise(next);
            void drain();
          }
          return next;
        });
      },
      [drain]
    );

    // Only the dropped count is dismissible. `foreign` is not a thing that
    // happened once, it is the state of play — nothing is being saved — so it
    // stays on screen until it is either fixed by updating or overridden below.
    const clearDropped = useCallback(() => {
      setValue((prev) => (prev.dropped ? { ...prev, dropped: 0 } : prev));
    }, []);

    const takeOver = useCallback(() => {
      readOnly.current = false;
      setValue((prev) => {
        const next = { ...prev, foreign: false };
        pending.current = serialise(next);
        void drain();
        return next;
      });
    }, [drain]);

    const ctx = useMemo<StoreCtx<T>>(
      () => ({ value, hydrated, saveError, apply, clearDropped, takeOver }),
      [value, hydrated, saveError, apply, clearDropped, takeOver]
    );

    return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
  }

  function use(): StoreCtx<T> {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error(`${name} must be used inside its provider`);
    return ctx;
  }

  return { Provider, use };
}
