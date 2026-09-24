import React from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SettingsProvider } from "./src/state/settings";
import { UpdatesProvider, useOtaUpdate } from "./src/state/updates";
import { JointsProvider } from "./src/state/joints";
import { HeatsProvider } from "./src/state/heats";
import { SpoolsProvider } from "./src/state/spools";
import { RecentsProvider } from "./src/state/recents";
import { ThemeProvider, useTheme } from "./src/theme/ThemeProvider";
import { useAppFonts } from "./src/theme/useFonts";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { UpdateBanner } from "./src/components/UpdateBanner";

function Shell() {
  const t = useTheme();
  const { visible, bannerHeight } = useOtaUpdate();
  return (
    <>
      <StatusBar style={t.mode === "dark" ? "light" : "dark"} />
      <View style={{ flex: 1, paddingBottom: visible ? bannerHeight : 0 }}>
        <RootNavigator />
      </View>
      <UpdateBanner />
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
    <ThemeProvider fontsLoaded={fonts.fontsLoaded}>
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
        <JointsProvider>
          <HeatsProvider>
            <SpoolsProvider>
              <RecentsProvider>
                <UpdatesProvider>
                  <Gate />
                </UpdatesProvider>
              </RecentsProvider>
            </SpoolsProvider>
          </HeatsProvider>
        </JointsProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
