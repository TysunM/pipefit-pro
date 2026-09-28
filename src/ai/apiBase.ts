import { Platform } from 'react-native';

/**
 * Where the app's one server endpoint lives. The web app is served by the same
 * Worker, so it asks its own origin; the phone asks the Worker by name.
 */
export const API_BASE = Platform.OS === 'web' ? '' : 'https://pipefit-pro.pipefitter.workers.dev';
