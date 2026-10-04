// The microphone
// --------------
// One utterance at a time, through the phone's own speech recogniser:
// Android's (Google's) in the app, Chrome's in the web app — the same module
// covers both. The recogniser is told the tool names, so "bolt up" is heard
// as that and not as "bold cup".
//
// An APK built before voice was added has no recogniser in it. The module is
// looked for, not assumed, so that APK carries on without a mic button rather
// than failing to start.

import { LISTEN_FOR } from './intent';

/* eslint-disable @typescript-eslint/no-explicit-any */
let mod: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mod = require('expo-speech-recognition').ExpoSpeechRecognitionModule ?? null;
} catch {
  mod = null;
}

/** Whether there is a recogniser to ask: the module is in this build and the phone has a speech service. */
export function canListen(): boolean {
  try {
    return !!mod && mod.isRecognitionAvailable() !== false;
  } catch {
    return false;
  }
}

export type Heard = { text: string } | { error: 'no-speech' | 'denied' | 'busy' | 'unavailable' | 'network' | 'aborted' | 'other' };

let permitted = false;

async function permission(): Promise<boolean> {
  if (permitted) return true;
  try {
    const r = await mod.requestPermissionsAsync();
    permitted = !!r?.granted;
  } catch {
    permitted = false;
  }
  return permitted;
}

let current: { abort: () => void } | null = null;

/** Stop listening now; whatever was heard is dropped. */
export function stopListening(): void {
  current?.abort();
}

type Ended = { error: Exclude<Heard, { text: string }>['error'] } | { ok: true };

/**
 * One listening session. Each thing said comes to `onSaid` as it is finished;
 * the words so far come to `onHeard`. With `continuous`, the session stays
 * open across pauses (Android 13 and up, and Chrome); without, it closes after
 * the first. Settles when the session ends, saying why.
 */
async function session(opts: { continuous: boolean; onHeard?: (partial: string) => void; onSaid: (text: string) => void }): Promise<Ended> {
  if (!canListen()) return { error: 'unavailable' };
  if (current) return { error: 'busy' };
  if (!(await permission())) return { error: 'denied' };

  return new Promise<Ended>((resolve) => {
    let last = '';
    let said = 0;
    let done = false;
    const subs: { remove: () => void }[] = [];
    const finish = (e: Ended) => {
      if (done) return;
      done = true;
      current = null;
      subs.forEach((s) => s.remove());
      resolve(e);
    };
    current = {
      abort: () => {
        try {
          mod.abort();
        } catch {
          // already stopped
        }
        finish({ error: 'aborted' });
      },
    };
    const flush = () => {
      if (!last) return;
      const text = last;
      last = '';
      said += 1;
      opts.onSaid(text);
    };
    subs.push(
      mod.addListener('result', (e: any) => {
        const text: string = e?.results?.[0]?.transcript ?? '';
        if (text) {
          last = text;
          opts.onHeard?.(text);
        }
        if (e?.isFinal) flush();
      }),
      mod.addListener('error', (e: any) => {
        const code: string = e?.error ?? '';
        flush();
        if (said) return finish({ ok: true });
        finish({
          error:
            code === 'no-speech' || code === 'speech-timeout' || code === 'no-match'
              ? 'no-speech'
              : code === 'not-allowed' || code === 'service-not-allowed'
                ? 'denied'
                : code === 'busy'
                  ? 'busy'
                  : code === 'network'
                    ? 'network'
                    : code === 'aborted'
                      ? 'aborted'
                      : 'other',
        });
      }),
      mod.addListener('end', () => {
        flush();
        finish(said ? { ok: true } : { error: 'no-speech' });
      }),
    );
    try {
      mod.start({
        lang: 'en-US',
        interimResults: true,
        maxAlternatives: 1,
        continuous: opts.continuous,
        contextualStrings: LISTEN_FOR,
        // Commands, not dictation.
        androidIntentOptions: { EXTRA_LANGUAGE_MODEL: 'web_search' },
      });
    } catch {
      finish({ error: 'other' });
    }
  });
}

/** Listen for one thing said, and settle with it, or with why nothing was heard. */
export async function listenOnce(onHeard?: (partial: string) => void): Promise<Heard> {
  let text = '';
  const end = await session({
    continuous: false,
    onHeard,
    onSaid: (t) => {
      if (!text) text = t;
      try {
        mod.stop();
      } catch {
        // already stopping
      }
    },
  });
  if (text) return { text };
  return 'error' in end ? end : { error: 'no-speech' };
}

/**
 * Keep listening, handing each thing said to `onSaid`, until stopped. A
 * session that ends on its own (a pause on an older phone, a timeout) is
 * started again; one the phone refuses is not.
 */
export async function listenOn(
  onSaid: (text: string) => void,
  opts: { onHeard?: (partial: string) => void; still: () => boolean },
): Promise<Exclude<Heard, { text: string }>['error'] | null> {
  while (opts.still()) {
    const end = await session({ continuous: true, onHeard: opts.onHeard, onSaid });
    if ('error' in end && end.error !== 'no-speech') return end.error === 'aborted' ? null : end.error;
    // A beat between sessions, so a phone that ends them at once is not spun.
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

/** What to show when nothing came of listening. */
export function heardWords(e: Exclude<Heard, { text: string }>['error']): string {
  switch (e) {
    case 'no-speech':
      return 'Nothing heard. Hold the phone closer and try again.';
    case 'denied':
      return 'The microphone is off for PipeFit. Turn it on in the phone settings, under Apps, PipeFit, Permissions.';
    case 'busy':
      return 'The microphone is busy. Try again.';
    case 'unavailable':
      return 'This phone has no speech recogniser. Install or update the Google app.';
    case 'network':
      return 'Speech recognition needs signal on this phone.';
    case 'aborted':
      return '';
    case 'other':
      return 'The microphone did not start. Try again.';
  }
}
