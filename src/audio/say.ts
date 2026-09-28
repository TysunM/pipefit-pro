import * as Speech from 'expo-speech';

// Speaking a figure
// -----------------
// Through whatever the phone plays through: Bluetooth earbuds when they are
// connected, the speaker when not. A new figure cuts off the last one rather
// than queueing behind it, so what is heard is always the current answer.

/** A touch slower than the phone's default: a figure is heard once, over noise. */
const RATE = 0.92;

export function say(text: string): void {
  if (!text) return;
  try {
    void Speech.stop();
    Speech.speak(text, { rate: RATE, language: 'en-US' });
  } catch {
    // No speech engine (an old WebView, a stripped phone): the figure is still on the screen.
  }
}
