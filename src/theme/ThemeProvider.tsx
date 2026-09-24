import React, { createContext, useContext, useMemo } from 'react';
import { type TextStyle, useColorScheme } from 'react-native';
import { Colors, Mode, finish, hairline, layout, palette, radius, space } from './tokens';
import { cutFor, fontFamily, type, type TypeKey, type TypeStyle } from './typography';
import { useSettings } from '../state/settings';

export type Theme = {
  mode: Mode;
  colors: Colors;
  space: typeof space;
  radius: typeof radius;
  layout: typeof layout;
  type: Record<TypeKey, TextStyle>;
  font: typeof fontFamily;
  finish: (typeof finish)[Mode];
  hairline: number;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children, fontsLoaded = false }: { children: React.ReactNode; fontsLoaded?: boolean }) {
  const system = useColorScheme();
  const { settings } = useSettings();

  const mode: Mode =
    settings.themePreference === 'system' ? (system === 'dark' ? 'dark' : 'light') : settings.themePreference;

  const value = useMemo<Theme>(() => {
    // Every cut falls back to the phone's own face of the same kind until the
    // fonts are in, so nothing renders in a substitute for a frame and jumps.
    const font = fontsLoaded
      ? fontFamily
      : {
          ...fontFamily,
          sans: fontFamily.sansFallback,
          sansMedium: fontFamily.sansFallback,
          sansRegular: fontFamily.sansFallback,
          serif: fontFamily.serifFallback,
          serifMedium: fontFamily.serifFallback,
          serifRegular: fontFamily.serifFallback,
          serifItalic: fontFamily.serifFallback,
        };
    // `face` is how a style says which family it wants; it is resolved here
    // and never reaches a <Text>, which would not know what to do with it.
    const typed = Object.fromEntries(
      Object.entries(type).map(([k, s]) => {
        const { face: _face, ...rest } = s as TypeStyle;
        return [k, { ...rest, fontFamily: font[cutFor(s)] }];
      })
    ) as Record<TypeKey, TextStyle>;
    return { mode, colors: palette[mode], space, radius, layout, type: typed, font, finish: finish[mode], hairline };
  }, [mode, fontsLoaded]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
