import React from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SettingsProvider } from "./src/state/settings";
import { UpdatesProvider, useOtaUpdate } from "./src/state/updates";
import { JointsProvider } from "./src/state/joints";
import { HeatsProvider } from "./src/state/heats";
import { SpoolsProvider } from "./src/state/spools";
import { SketchesProvider } from "./src/state/sketches";
import { LevelsProvider } from "./src/state/levels";
import { PressureTestsProvider } from "./src/state/pressureTests";
import { HoldAlertsProvider } from "./src/state/holdAlerts";
import { WeldsProvider } from "./src/state/welds";
import { InstrumentsProvider } from "./src/state/instruments";
import { PassportProvider } from "./src/state/passports";
import { OrientationProvider } from "./src/state/orientations";
import { CoachProvider } from "./src/components/Coach";
import { PreTasksProvider } from "./src/state/pretasks";
import { ShiftsProvider } from "./src/state/shifts";
import { LaserProvider } from "./src/state/laser";
import { FittingsProvider } from "./src/state/fittings";
import { CutsProvider } from "./src/state/cuts";
import { RecentsProvider } from "./src/state/recents";
import { LayoutProvider } from "./src/state/layouts";
import { JobPickProvider } from "./src/state/jobPick";
import { ThemeProvider, useTheme } from "./src/theme/ThemeProvider";
import { useAppFonts } from "./src/theme/useFonts";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { UpdateBanner } from "./src/components/UpdateBanner";
import { VoiceProvider } from "./src/voice/VoiceProvider";
import { VoiceButton } from "./src/components/VoiceButton";
import { NoticeToast } from "./src/components/NoticeToast";

function Shell() {
  const t = useTheme();
  const { visible, bannerHeight } = useOtaUpdate();
  return (
    <>
      <StatusBar style={t.mode === "dark" ? "light" : "dark"} />
      <View style={{ flex: 1, paddingBottom: visible ? bannerHeight : 0 }}>
        <RootNavigator />
        <NoticeToast />
        <VoiceButton />
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
              <SketchesProvider>
                <LevelsProvider>
                  <PressureTestsProvider>
                    <WeldsProvider>
                    <InstrumentsProvider>
                    <PassportProvider>
                    <OrientationProvider>
                    <CoachProvider>
                    <PreTasksProvider>
                    <HoldAlertsProvider>
                    <ShiftsProvider>
                      <FittingsProvider>
                      <CutsProvider>
                      <RecentsProvider>
                      <LayoutProvider>
                        <JobPickProvider>
                          <LaserProvider>
                            <VoiceProvider>
                              <UpdatesProvider>
                                <Gate />
                              </UpdatesProvider>
                            </VoiceProvider>
                          </LaserProvider>
                        </JobPickProvider>
                      </LayoutProvider>
                      </RecentsProvider>
                      </CutsProvider>
                      </FittingsProvider>
                    </ShiftsProvider>
                  </HoldAlertsProvider>
                    </PreTasksProvider>
                    </CoachProvider>
                    </OrientationProvider>
                    </PassportProvider>
                    </InstrumentsProvider>
                    </WeldsProvider>
                  </PressureTestsProvider>
                </LevelsProvider>
              </SketchesProvider>
            </SpoolsProvider>
          </HeatsProvider>
        </JointsProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
