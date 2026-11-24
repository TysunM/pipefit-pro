// A control's label, told to the voice while it is drawn
// ------------------------------------------------------
// The buttons, chips, segments and fields call this with what they show and
// what pressing or filling them does. Each is filed under the screen it is
// drawn on (its route), so a page left under another in the stack is not
// heard. The newest drawn wins a tie: a sheet's Save over its page's.
// onScreen.ts does the matching.

import { useContext, useEffect, useRef } from 'react';
import { NavigationRouteContext } from '@react-navigation/native';
import { addTarget, removeTarget, type Target } from './onScreen';

export function useVoiceTargets(targets: readonly Target[] | null): void {
  const route = useContext(NavigationRouteContext);
  const screen = route?.key ?? null;
  const latest = useRef(targets);
  latest.current = targets;
  // Registered again only when what is shown changes; a press always runs the latest handler.
  const sig = targets ? targets.map((t) => `${t.kind}\u0001${t.group ?? ''}\u0001${t.label}\u0001${t.field ?? ''}\u0001${t.on ? 1 : 0}`).join('\u0002') : '';
  useEffect(() => {
    if (!sig) return;
    const ids = (latest.current ?? []).map((t, i) => addTarget({ ...t, run: (v) => latest.current?.[i]?.run(v) ?? null }, screen));
    return () => ids.forEach(removeTarget);
  }, [sig, screen]);
}
