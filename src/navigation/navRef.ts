import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/** The navigator, for what moves screens from outside one: a link, a spoken command. */
export const nav = createNavigationContainerRef<RootStackParamList>();
