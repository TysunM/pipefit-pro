// Where the mic stands
// --------------------
// The mic floats low on the right of every screen (VoiceButton.tsx). On a
// screen whose own keys run to that corner, the calculator's =, it would sit
// on the one key pressed most, so such a screen puts a mic of its own in its
// layout and asks the floating one to step aside while it is in front. Each
// ask is returned by the function it hands back; the mic comes back when the
// last one is returned.

let asks = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const floatingMicHidden = (): boolean => asks > 0;

export function subscribeMicSpot(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Hide the floating mic until the returned function is called; calling it twice returns one ask, not two. */
export function hideFloatingMic(): () => void {
  asks++;
  emit();
  let returned = false;
  return () => {
    if (returned) return;
    returned = true;
    asks--;
    emit();
  };
}
