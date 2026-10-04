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

/**
 * Say it, and settle once it has been said — so the microphone is not opened
 * while the phone is still talking and hears itself. Gives up waiting after
 * long enough for the words, in case an engine never says it is done.
 */
export function sayThen(text: string): Promise<void> {
  if (!text) return Promise.resolve();
  return new Promise((resolve) => {
    const limit = setTimeout(resolve, 1500 + text.length * 90);
    const done = () => {
      clearTimeout(limit);
      resolve();
    };
    try {
      void Speech.stop();
      Speech.speak(text, { rate: RATE, language: 'en-US', onDone: done, onStopped: done, onError: done });
    } catch {
      done();
    }
  });
}
