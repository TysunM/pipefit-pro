import AsyncStorage from '@react-native-async-storage/async-storage';
import { MIC_PLACE_KEY, parseMicPlace, serialiseMicPlace, type MicPlace } from './micPlace';

// micPlace.ts on the device: read once when the mic first shows, written when
// it is let go or put back. Shared by the mic and the Settings button that
// puts it back, without a provider, as micSpot.ts is. A lost write costs
// where the mic stood, not a record, so there is no queue.

let place: MicPlace | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const getMicPlace = (): MicPlace | null => place;

export function subscribeMicPlace(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Read the kept place, once. */
export function loadMicPlace(): Promise<void> {
  loading ??= AsyncStorage.getItem(MIC_PLACE_KEY)
    .then((raw) => {
      // A move made before the read came back wins over the kept place.
      if (place === null) {
        place = parseMicPlace(raw);
        if (place) emit();
      }
    })
    .catch(() => {});
  return loading;
}

/** Keep the mic here; null puts it back where it shipped. */
export function setMicPlace(next: MicPlace | null): void {
  place = next;
  emit();
  void (next ? AsyncStorage.setItem(MIC_PLACE_KEY, serialiseMicPlace(next)) : AsyncStorage.removeItem(MIC_PLACE_KEY)).catch(() => {});
}
