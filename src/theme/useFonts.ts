import { useFonts as useExpoFonts } from 'expo-font';
import {
  SourceSerif4_400Regular,
  SourceSerif4_400Regular_Italic,
  SourceSerif4_600SemiBold,
  SourceSerif4_700Bold,
} from '@expo-google-fonts/source-serif-4';

export type FontState = { ready: boolean; serifLoaded: boolean };

export function useAppFonts(): FontState {
  const [loaded, error] = useExpoFonts({
    SourceSerif4_400Regular,
    SourceSerif4_400Regular_Italic,
    SourceSerif4_600SemiBold,
    SourceSerif4_700Bold,
  });
  return { ready: loaded || !!error, serifLoaded: loaded && !error };
}
