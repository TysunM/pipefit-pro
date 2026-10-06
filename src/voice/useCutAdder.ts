// "Add it", for the screen in front
// ---------------------------------
// Cut Length and the 3D spool both put cuts on the list, and both can be
// open in the stack at once. The one in front takes "add it": it holds the
// command while focused and lets go when it is covered, so the screen behind
// never answers for the one being looked at.

import { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useVoiceMaybe, type CutAdder } from './VoiceProvider';

export function useCutAdder(add: CutAdder): void {
  const voice = useVoiceMaybe();
  const focused = useIsFocused();
  const latest = useRef(add);
  latest.current = add;
  // One function for the life of the screen, so it can be let go of by identity.
  const handler = useRef<CutAdder>(() => latest.current()).current;
  useEffect(() => {
    if (!voice || !focused) return;
    voice.useCutAdder(handler);
    return () => voice.releaseCutAdder(handler);
  }, [voice, focused, handler]);
}
