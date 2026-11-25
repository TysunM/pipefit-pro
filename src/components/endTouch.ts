import type { GestureResponderEvent } from 'react-native';

/**
 * A finger lifting off a surface the app reads itself: the iso paper, the mic.
 *
 * In a phone's browser every tap is followed, a few milliseconds after the
 * finger lifts, by a mouse press and a click at the same spot. When the lift
 * has just opened a sheet or a screen, they land on that instead: on a sheet's
 * backdrop they shut it and take the text box's focus, so the keyboard drops
 * as the fitter starts to type; on a new screen they press whatever is under
 * the finger. Ending the touch here means the browser sends neither. The
 * phone app has no such clicks, so it is left alone: `os` is Platform.OS.
 */
export function endTouch(e: GestureResponderEvent | undefined, os: string): void {
  if (os === 'web') e?.preventDefault?.();
}
