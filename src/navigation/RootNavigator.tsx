import React, { useCallback } from 'react';
import { Platform } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type NavigationState,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { nav } from './navRef';
import { RootStackParamList } from './types';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../theme/ThemeProvider';
import { group } from './groups';
import { useRecents } from '../state/recents';
import { referenceTable } from '../calc/reference';
import { HomeScreen } from '../screens/HomeScreen';
import { GroupScreen } from '../screens/GroupScreen';
import { ProjectsScreen } from '../screens/ProjectsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SimpleOffsetScreen } from '../screens/SimpleOffsetScreen';
import { RollingOffsetScreen } from '../screens/RollingOffsetScreen';
import { CutLengthScreen } from '../screens/CutLengthScreen';
import { SaddleBendScreen } from '../screens/SaddleBendScreen';
import { MiterBendScreen } from '../screens/MiterBendScreen';
import { HandBenderScreen } from '../screens/HandBenderScreen';
import { FlangeBoltUpScreen } from '../screens/FlangeBoltUpScreen';
import { JointsScreen } from '../screens/JointsScreen';
import { HeatsScreen } from '../screens/HeatsScreen';
import { PressureTestsScreen } from '../screens/PressureTestsScreen';
import { PressureTestScreen } from '../screens/PressureTestScreen';
import { ShiftReportScreen } from '../screens/ShiftReportScreen';
import { FittingLibraryScreen } from '../screens/FittingLibraryScreen';
import { CutListScreen } from '../screens/CutListScreen';
import { WeldLogScreen } from '../screens/WeldLogScreen';
import { WeldScreen } from '../screens/WeldScreen';
import { CalibrationScreen } from '../screens/CalibrationScreen';
import { BackupScreen } from '../screens/BackupScreen';
import { PassportScreen } from '../screens/PassportScreen';
import { MeasureScreen } from '../screens/MeasureScreen';
import { SpoolBuilderScreen } from '../screens/SpoolBuilderScreen';
import { OrderSheetScreen } from '../screens/OrderSheetScreen';
import { IsoSketchScreen } from '../screens/IsoSketchScreen';
import { IsoDrawScreen } from '../screens/IsoDrawScreen';
import { IsoCutsScreen } from '../screens/IsoCutsScreen';
import { CalculatorScreen } from '../screens/CalculatorScreen';
import { LevelScreen } from '../screens/LevelScreen';
import { ReferenceScreen } from '../screens/ReferenceScreen';
import { ReferenceTableScreen } from '../screens/ReferenceTableScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();


/**
 * The installed app opens AR measure in Chrome as the web app's address with
 * #measure on the end, since AR runs in the browser and not in the APK. The
 * web app goes straight there, and drops the mark so a reload starts at home.
 */
function openFromLink() {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || window.location.hash !== '#measure') return;
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  nav.navigate('Measure');
}

/** The tabs: places reached from the tab bar, so none of them has a back arrow. */
const TAB_ROUTES = new Set<string>(['Group', 'Projects', 'Calculator']);

export function RootNavigator() {
  const t = useTheme();
  const { remember } = useRecents();
  // Whatever screen is on top is what was used last. Tabs and Settings are
  // filtered out by the store; this just reports.
  const record = useCallback(
    (state: NavigationState | undefined) => {
      const name = state?.routes[state.index ?? state.routes.length - 1]?.name;
      if (name) remember(name);
    },
    [remember]
  );
  const navTheme: NavTheme = {
    ...(t.mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(t.mode === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: t.colors.bg,
      card: t.colors.bg,
      text: t.colors.text,
      border: t.colors.border,
      primary: t.colors.primary,
      notification: t.colors.accent,
    },
  };

  return (
    <NavigationContainer ref={nav} theme={navTheme} onStateChange={record} onReady={openFromLink}>
      <Stack.Navigator
        screenOptions={({ navigation, route }) => ({
          contentStyle: { backgroundColor: t.colors.bg },
          header: ({ options, back }) => (
            <AppHeader
              title={typeof options.title === 'string' ? options.title : route.name}
              // A tab is a place, reached from the tab bar, so it has no back.
              onBack={back && !TAB_ROUTES.has(route.name) ? () => navigation.goBack() : undefined}
              onProfile={route.name === 'Home' ? () => navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'Projects' }] }) : undefined}
              onSettings={route.name === 'Settings' ? undefined : () => navigation.navigate('Settings')}
            />
          ),
        })}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'PipeFit Pro' }} />
        <Stack.Screen name="Projects" component={ProjectsScreen} options={{ title: 'Projects' }} />
        <Stack.Screen
          name="Group"
          component={GroupScreen}
          options={({ route }) => ({ title: group(route.params.id)?.title ?? 'Tools' })}
        />
        <Stack.Screen name="SimpleOffset" component={SimpleOffsetScreen} options={{ title: 'Simple offset' }} />
        <Stack.Screen name="RollingOffset" component={RollingOffsetScreen} options={{ title: 'Rolling offset' }} />
        <Stack.Screen name="CutLength" component={CutLengthScreen} options={{ title: 'Cut length' }} />
        <Stack.Screen name="SaddleBend" component={SaddleBendScreen} options={{ title: 'Saddle bend' }} />
        <Stack.Screen name="MiterBend" component={MiterBendScreen} options={{ title: 'Miter bend' }} />
        <Stack.Screen name="HandBender" component={HandBenderScreen} options={{ title: 'Pipe bend' }} />
        <Stack.Screen name="FlangeBoltUp" component={FlangeBoltUpScreen} options={{ title: 'Flange bolt-up' }} />
        <Stack.Screen name="Joints" component={JointsScreen} options={{ title: 'Joint log' }} />
        <Stack.Screen name="Heats" component={HeatsScreen} options={{ title: 'Heat book' }} />
        <Stack.Screen name="PressureTests" component={PressureTestsScreen} options={{ title: 'Pressure tests' }} />
        <Stack.Screen name="PressureTest" component={PressureTestScreen} options={{ title: 'Pressure test' }} />
        <Stack.Screen name="ShiftReport" component={ShiftReportScreen} options={{ title: 'Shift report' }} />
        <Stack.Screen name="FittingLibrary" component={FittingLibraryScreen} options={{ title: 'Fitting library' }} />
        <Stack.Screen name="CutList" component={CutListScreen} options={{ title: 'Cut list' }} />
        <Stack.Screen name="WeldLog" component={WeldLogScreen} options={{ title: 'Weld log' }} />
        <Stack.Screen name="Weld" component={WeldScreen} options={{ title: 'Weld' }} />
        <Stack.Screen name="Calibration" component={CalibrationScreen} options={{ title: 'Calibration' }} />
        <Stack.Screen name="Backup" component={BackupScreen} options={{ title: 'Backup' }} />
        <Stack.Screen name="Passport" component={PassportScreen} options={{ title: 'Skills passport' }} />
        <Stack.Screen name="Calculator" component={CalculatorScreen} options={{ title: 'Calculator' }} />
        <Stack.Screen name="Level" component={LevelScreen} options={{ title: 'Level' }} />
        <Stack.Screen name="Measure" component={MeasureScreen} options={{ title: 'Measure' }} />
        <Stack.Screen name="SpoolBuilder" component={SpoolBuilderScreen} options={{ title: '3D spool' }} />
        <Stack.Screen name="OrderSheet" component={OrderSheetScreen} options={{ title: 'Order sheet' }} />
        <Stack.Screen name="IsoSketch" component={IsoSketchScreen} options={{ title: 'Iso sketch' }} />
        <Stack.Screen name="IsoDraw" component={IsoDrawScreen} options={{ title: 'Sketch' }} />
        <Stack.Screen name="IsoCuts" component={IsoCutsScreen} options={{ title: 'Cuts off the iso' }} />
        <Stack.Screen name="Reference" component={ReferenceScreen} options={{ title: 'Handbook' }} />
        <Stack.Screen
          name="ReferenceTable"
          component={ReferenceTableScreen}
          options={({ route }) => ({ title: referenceTable(route.params.id)?.title ?? 'Table' })}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
