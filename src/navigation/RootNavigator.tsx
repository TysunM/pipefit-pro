import React from 'react';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../theme/ThemeProvider';
import { group } from './groups';
import { referenceTable } from '../calc/reference';
import { HomeScreen } from '../screens/HomeScreen';
import { GroupScreen } from '../screens/GroupScreen';
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
import { SpoolBuilderScreen } from '../screens/SpoolBuilderScreen';
import { OrderSheetScreen } from '../screens/OrderSheetScreen';
import { IsoSketchScreen } from '../screens/IsoSketchScreen';
import { IsoDrawScreen } from '../screens/IsoDrawScreen';
import { CalculatorScreen } from '../screens/CalculatorScreen';
import { LevelScreen } from '../screens/LevelScreen';
import { ReferenceScreen } from '../screens/ReferenceScreen';
import { ReferenceTableScreen } from '../screens/ReferenceTableScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const t = useTheme();
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
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={({ navigation, route }) => ({
          contentStyle: { backgroundColor: t.colors.bg },
          header: ({ options, back }) => (
            <AppHeader
              title={typeof options.title === 'string' ? options.title : route.name}
              // A tab is a place, reached from the tab bar, so it has no back.
              onBack={back && route.name !== 'Group' ? () => navigation.goBack() : undefined}
              onProfile={route.name === 'Home' ? () => navigation.navigate('Group', { id: 'projects' }) : undefined}
              onSettings={route.name === 'Settings' ? undefined : () => navigation.navigate('Settings')}
            />
          ),
        })}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'PipeFit Pro' }} />
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
        <Stack.Screen name="Joints" component={JointsScreen} options={{ title: 'Joint register' }} />
        <Stack.Screen name="Heats" component={HeatsScreen} options={{ title: 'Heat book' }} />
        <Stack.Screen name="Calculator" component={CalculatorScreen} options={{ title: 'Calculator' }} />
        <Stack.Screen name="Level" component={LevelScreen} options={{ title: 'Level' }} />
        <Stack.Screen name="SpoolBuilder" component={SpoolBuilderScreen} options={{ title: '3D spool' }} />
        <Stack.Screen name="OrderSheet" component={OrderSheetScreen} options={{ title: 'Order sheet' }} />
        <Stack.Screen name="IsoSketch" component={IsoSketchScreen} options={{ title: 'Iso sketch' }} />
        <Stack.Screen name="IsoDraw" component={IsoDrawScreen} options={{ title: 'Sketch' }} />
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
