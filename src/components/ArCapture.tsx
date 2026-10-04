import React from 'react';
import { Linking, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { AccentButton } from './Buttons';
import { WEB_APP_URL } from '../ai/apiBase';
import type { ArCaptureProps } from './arTypes';

/**
 * AR capture in the APK: not here. Phone AR in an app means a native AR
 * engine in the build, which costs a new APK for every change and measures no
 * better than the browser's. Chrome on the same phone runs it, so this opens
 * the web app straight on this screen, where it does.
 */
export function ArCapture(_props: ArCaptureProps) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space.md }}>
      <Text style={[t.type.body, { color: t.colors.textMuted }]}>
        AR runs in Chrome, not in the installed app. This opens the PipeFit web app in Chrome on this screen. Measure there, and the
        figures can go straight into a rolling offset in the browser.
      </Text>
      <AccentButton label="Open AR measure in Chrome" icon="open-outline" onPress={() => void Linking.openURL(`${WEB_APP_URL}/#measure`)} />
    </View>
  );
}
