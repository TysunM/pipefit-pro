// What a fitter says to the camera
// --------------------------------
// With the sheet reader opened by voice, the mic stays open while the camera
// is up, so a gloved hand never has to find the button: "take it" shoots,
// "again" goes back to the camera, "save" keeps what is ticked, "cancel"
// shuts it. Only these few words, said more or less alone, do anything;
// anything else heard is ignored, never guessed at.

import { tokens } from './words';

export type CameraWord = 'shoot' | 'save' | 'retake' | 'close';

const SAID: Record<CameraWord, readonly string[][]> = {
  shoot: [['take', 'it'], ['take', 'the', 'picture'], ['take', 'a', 'picture'], ['snap'], ['snap', 'it'], ['shoot'], ['read', 'it'], ['capture'], ['go'], ['now'], ['picture'], ['photo']],
  retake: [['again'], ['retake'], ['take', 'another'], ['another'], ['try', 'again'], ['redo']],
  save: [['save'], ['save', 'them'], ['save', 'it'], ['save', 'all'], ['keep', 'them'], ['looks', 'good'], ['good']],
  close: [['cancel'], ['close'], ['stop'], ['done'], ['never', 'mind'], ['quit']],
};

const POLITE = new Set(['please', 'ok', 'okay', 'yeah', 'yes', 'right', 'go', 'ahead', 'and', 'the', 'it', 'that', 'this', 'now']);

/** The camera word said, or null. A phrase must make up what was said, give or take a polite word. */
export function cameraWord(text: string): CameraWord | null {
  const ws = tokens(text);
  if (!ws.length || ws.length > 5) return null;
  for (const kind of ['close', 'retake', 'save', 'shoot'] as const) {
    for (const p of SAID[kind]) {
      const at = ws.findIndex((_, i) => p.every((w, k) => ws[i + k] === w));
      if (at < 0) continue;
      const rest = [...ws.slice(0, at), ...ws.slice(at + p.length)];
      if (rest.every((w) => POLITE.has(w))) return kind;
    }
  }
  return null;
}
