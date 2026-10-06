// A screen's own spoken words, while it is in front
// ------------------------------------------------
// The cut list hears "4 done" and "next" before the app-wide commands do —
// but only while it is the screen being looked at, and it lets go when it is
// covered, the same way "add it" works (useCutAdder.ts).

import { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useVoiceMaybe, type ScreenVoice } from './VoiceProvider';

export function useScreenVoice(hear: ScreenVoice): void {
  const voice = useVoiceMaybe();
  const focused = useIsFocused();
  const latest = useRef(hear);
  latest.current = hear;
  const handler = useRef<ScreenVoice>((heard) => latest.current(heard)).current;
  useEffect(() => {
    if (!voice || !focused) return;
    voice.useScreenVoice(handler);
    return () => voice.releaseScreenVoice(handler);
  }, [voice, focused, handler]);
}
