import { useFonts as useExpoFonts } from 'expo-font';
import { SourceSans3_400Regular, SourceSans3_600SemiBold, SourceSans3_700Bold } from '@expo-google-fonts/source-sans-3';
import {
  SourceSerif4_400Regular,
  SourceSerif4_400Regular_Italic,
  SourceSerif4_600SemiBold,
  SourceSerif4_700Bold,
} from '@expo-google-fonts/source-serif-4';

export type FontState = { ready: boolean; fontsLoaded: boolean };

/**
 * Both faces load together. If either fails the whole set falls back to the
 * phone's own sans and serif, so a screen never mixes a loaded face with a
 * substitute for the other.
 */
export function useAppFonts(): FontState {
  const [loaded, error] = useExpoFonts({
    SourceSans3_400Regular,
    SourceSans3_600SemiBold,
    SourceSans3_700Bold,
    SourceSerif4_400Regular,
    SourceSerif4_400Regular_Italic,
    SourceSerif4_600SemiBold,
    SourceSerif4_700Bold,
  });
  return { ready: loaded || !!error, fontsLoaded: loaded && !error };
}
