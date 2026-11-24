// A pressable the voice can press
// -------------------------------
// The icon buttons (a cross to close, a bin to delete, a pencil to edit) have
// no words on them, but each carries the name a screen reader reads out, and
// that is the name it is said by: "close", "delete W14", "remove leg 2",
// "turn the light on". A drop-in for Pressable; `voiceLabel` says it shorter
// where the screen reader's name is a sentence, and null keeps it off the
// voice where the row has no name of its own to tell one from another.

import React from 'react';
import { Pressable, type PressableProps, type View } from 'react-native';
import { useVoiceTargets } from './useVoiceTargets';

type Props = PressableProps & { voiceLabel?: string | null };

export const VoicePressable = React.forwardRef<View, Props>(function VoicePressable({ voiceLabel, ...props }, ref) {
  const label = voiceLabel === null ? '' : (voiceLabel ?? (typeof props.accessibilityLabel === 'string' ? props.accessibilityLabel : ''));
  const can = !!label && !!props.onPress && !props.disabled;
  // The handlers given here take no event: a press by voice has none to give.
  useVoiceTargets(can ? [{ kind: 'press', label, run: () => (props.onPress?.(undefined as never), `${label}.`) }] : null);
  return <Pressable ref={ref} {...props} />;
});
