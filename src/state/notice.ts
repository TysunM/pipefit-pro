// A line across the top of the screen
// -----------------------------------
// For the few things that change under a fitter without a tap of theirs (an
// open calculator following the job's new pipe) and must be seen, not just
// heard. One at a time; a newer one replaces an older. NoticeToast shows it.

import { useEffect, useState } from 'react';

export type Notice = { id: number; text: string };

let current: Notice | null = null;
let nextId = 1;
const subs = new Set<(n: Notice | null) => void>();

export function showNotice(text: string): void {
  current = { id: nextId++, text };
  subs.forEach((f) => f(current));
}

export function clearNotice(id?: number): void {
  if (id !== undefined && current?.id !== id) return;
  current = null;
  subs.forEach((f) => f(null));
}

export function useNotice(): Notice | null {
  const [n, setN] = useState(current);
  useEffect(() => {
    subs.add(setN);
    return () => {
      subs.delete(setN);
    };
  }, []);
  return n;
}
