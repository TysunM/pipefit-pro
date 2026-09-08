import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, Mode, hairline, layout, palette, radius, space } from './tokens';
import { fontFamily, type } from './typography';
import { useSettings } from '../state/settings';

export type Theme = {
  mode: Mode;
  colors: Colors;
  space: typeof space;
  radius: typeof radius;
  layout: typeof layout;
  type: typeof type;
  font: typeof fontFamily;
  hairline: number;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children, serifLoaded = false }: { children: React.ReactNode; serifLoaded?: boolean }) {
  const system = useColorScheme();
  const { settings } = useSettings();

  const mode: Mode =
    settings.themePreference === 'system' ? (system === 'dark' ? 'dark' : 'light') : settings.themePreference;

  const value = useMemo<Theme>(
    () => ({
      mode,
      colors: palette[mode],
      space,
      radius,
      layout,
      type,
      font: { ...fontFamily, serif: serifLoaded ? fontFamily.serif : fontFamily.serifFallback },
      hairline,
    }),
    [mode, serifLoaded]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
