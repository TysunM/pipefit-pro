import { Platform } from 'react-native';

/**
 * Where the app's one server endpoint lives. The web app is served by the same
 * Worker, so it asks its own origin; the phone asks the Worker by name.
 */
export const API_BASE = Platform.OS === 'web' ? '' : 'https://pipefit-pro.pipefitter.workers.dev';

/** The web app itself, for the one thing a phone browser does that the APK cannot: AR. */
export const WEB_APP_URL = 'https://pipefit-pro.pipefitter.workers.dev';
