import React from 'react';
import { Pressable, View } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer, Theme as NavTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from './types';
import { useTheme } from '../theme/ThemeProvider';
import { HomeScreen } from '../screens/HomeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SimpleOffsetScreen } from '../screens/SimpleOffsetScreen';
import { RollingOffsetScreen } from '../screens/RollingOffsetScreen';
import { CutLengthScreen } from '../screens/CutLengthScreen';
import { SaddleBendScreen } from '../screens/SaddleBendScreen';
import { MiterBendScreen } from '../screens/MiterBendScreen';
import { ThreadEngagementScreen } from '../screens/ThreadEngagementScreen';
import { HandBenderScreen } from '../screens/HandBenderScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function HeaderActions({ onSettings }: { onSettings: () => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: t.space.xl, alignItems: 'center' }}>
      <Pressable hitSlop={10} accessibilityRole="button" accessibilityLabel="Settings" onPress={onSettings}>
        <Ionicons name="settings-outline" size={22} color={t.colors.text} />
      </Pressable>
    </View>
  );
}

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
          headerShadowVisible: false,
          headerTintColor: t.colors.text,
          headerStyle: { backgroundColor: t.colors.bg },
          headerTitleAlign: 'center',
          headerTitleStyle: { fontFamily: t.font.serif, fontSize: 20, color: t.colors.text },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: t.colors.bg },
          headerRight:
            route.name === 'Settings' ? undefined : () => <HeaderActions onSettings={() => navigation.navigate('Settings')} />,
        })}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'PipeFit Pro' }} />
        <Stack.Screen name="SimpleOffset" component={SimpleOffsetScreen} options={{ title: 'Simple offset' }} />
        <Stack.Screen name="RollingOffset" component={RollingOffsetScreen} options={{ title: 'Rolling offset' }} />
        <Stack.Screen name="CutLength" component={CutLengthScreen} options={{ title: 'Cut length' }} />
        <Stack.Screen name="SaddleBend" component={SaddleBendScreen} options={{ title: 'Saddle bend' }} />
        <Stack.Screen name="MiterBend" component={MiterBendScreen} options={{ title: 'Miter bend' }} />
        <Stack.Screen name="ThreadEngagement" component={ThreadEngagementScreen} options={{ title: 'Thread engagement' }} />
        <Stack.Screen name="HandBender" component={HandBenderScreen} options={{ title: 'Hand bender' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
