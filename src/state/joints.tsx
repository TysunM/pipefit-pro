// Holding the joint register on the device.
//
// All the reasoning is in register.ts. This file does three things and nothing
// else: read the store once on start, hand the register out, and write it back
// on every change.
//
// The writing is the part with any care in it. A bolt-up is written through on
// every tap, so the writes come faster than the store finishes them, and the
// case this whole feature exists for — a phone going into a pocket mid-pass —
// is exactly when the last write must not be the one that gets dropped. So
// writes are queued rather than fired off in parallel: only the newest value is
// ever pending, it stays pending until the store has actually taken it, and a
// failed write leaves it there to be retried by the next change instead of
// vanishing.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Register, emptyRegister, parseRegister, serialiseRegister } from './register';

const STORAGE_KEY = 'pipefit.joints.v1';

type Ctx = {
  register: Register;
  /** The store has been read. Nothing is written before this is true. */
  hydrated: boolean;
  /** A write has failed and the register on screen is ahead of the store. */
  saveError: boolean;
  /** Change the register. The reducer runs on the newest value. */
  apply: (f: (r: Register) => Register) => void;
  /** Dismiss the "some joints would not load" notice. */
  clearDropped: () => void;
  /**
   * Start saving again over a store written by a newer app, discarding what it
   * held. Only ever called from an explicit tap that says so, never on its own.
   */
  takeOver: () => void;
};

const JointsContext = createContext<Ctx | null>(null);

export function JointsProvider({ children }: { children: React.ReactNode }) {
  const [register, setRegister] = useState<Register>(emptyRegister);
  const [hydrated, setHydrated] = useState(false);
  const [saveError, setSaveError] = useState(false);

  /** The newest value not yet taken by the store, or null when it is level. */
  const pending = useRef<string | null>(null);
  const writing = useRef(false);
  /**
   * Set when the store was written by a newer app. Nothing is written for the
   * rest of the session: the crew runs the web app and the APK side by side,
   * and the older one overwriting the newer one's joints would lose real work.
   */
  const readOnly = useRef(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!alive) return;
        const r = parseRegister(raw);
        readOnly.current = r.foreign;
        setRegister(r);
      })
      .catch(() => {
        if (alive) setRegister({ ...emptyRegister(), dropped: 1 });
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
          await AsyncStorage.setItem(STORAGE_KEY, next);
        } catch {
          // Leave it pending. The next change retries it, and the banner says
          // the register on screen is ahead of the store.
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
    (f: (r: Register) => Register) => {
      setRegister((prev) => {
        const next = f(prev);
        if (next === prev) return prev;
        if (!readOnly.current) {
          pending.current = serialiseRegister(next);
          void drain();
        }
        return next;
      });
    },
    [drain],
  );

  // Only the dropped count is dismissible. `foreign` is not a thing that
  // happened once, it is the state of play — nothing is being saved — so it
  // stays on screen until it is either fixed by updating or overridden below.
  const clearDropped = useCallback(() => {
    setRegister((prev) => (prev.dropped ? { ...prev, dropped: 0 } : prev));
  }, []);

  const takeOver = useCallback(() => {
    readOnly.current = false;
    setRegister((prev) => {
      const next = { ...prev, foreign: false };
      pending.current = serialiseRegister(next);
      void drain();
      return next;
    });
  }, [drain]);

  const value = useMemo<Ctx>(
    () => ({ register, hydrated, saveError, apply, clearDropped, takeOver }),
    [register, hydrated, saveError, apply, clearDropped, takeOver],
  );

  return <JointsContext.Provider value={value}>{children}</JointsContext.Provider>;
}

export function useJoints(): Ctx {
  const ctx = useContext(JointsContext);
  if (!ctx) throw new Error('useJoints must be used inside JointsProvider');
  return ctx;
}
