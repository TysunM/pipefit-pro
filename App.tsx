import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SettingsProvider } from './src/state/settings';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { useAppFonts } from './src/theme/useFonts';
import { RootNavigator } from './src/navigation/RootNavigator';

function Shell() {
  const t = useTheme();
  return (
    <>
      <StatusBar style={t.mode === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
}

function Gate() {
  const fonts = useAppFonts();
  if (!fonts.ready) {
    return (
      <ThemeProvider>
        <Splash />
      </ThemeProvider>
    );
  }
  return (
    <ThemeProvider serifLoaded={fonts.serifLoaded}>
      <Shell />
    </ThemeProvider>
  );
}

function Splash() {
  const t = useTheme();
  return <View style={{ flex: 1, backgroundColor: t.colors.bg }} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <Gate />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
