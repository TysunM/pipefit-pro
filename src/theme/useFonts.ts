import { useFonts as useExpoFonts } from 'expo-font';
import { Bitter_600SemiBold, Bitter_700Bold } from '@expo-google-fonts/bitter';

export type FontState = { ready: boolean; serifLoaded: boolean };

export function useAppFonts(): FontState {
  const [loaded, error] = useExpoFonts({ Bitter_600SemiBold, Bitter_700Bold });
  return { ready: loaded || !!error, serifLoaded: loaded && !error };
}
