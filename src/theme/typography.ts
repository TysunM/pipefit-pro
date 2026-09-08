import { Platform, TextStyle } from 'react-native';

export const fontFamily = {
  serif: 'Bitter_700Bold',
  serifMedium: 'Bitter_600SemiBold',
  serifFallback: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }) as string,
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui' }) as string,
  sansMedium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'system-ui' }) as string,
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
};

type T = TextStyle;

export const type: Record<string, T> = {
  screenTitle: { fontSize: 21, fontWeight: '700', letterSpacing: -0.2 },
  display: { fontSize: 46, fontWeight: '800', letterSpacing: -1.4 },
  displaySmall: { fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  sectionTitle: { fontSize: 19, fontWeight: '700', letterSpacing: -0.3 },
  label: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.85, textTransform: 'uppercase' },
  labelSmall: { fontSize: 11, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' },
  fieldValue: { fontSize: 23, fontWeight: '700', letterSpacing: -0.4 },
  statValue: { fontSize: 21, fontWeight: '700', letterSpacing: -0.3 },
  body: { fontSize: 15.5, fontWeight: '400', lineHeight: 22 },
  bodyStrong: { fontSize: 15.5, fontWeight: '600', lineHeight: 22 },
  caption: { fontSize: 12.5, fontWeight: '400', lineHeight: 17 },
  captionStrong: { fontSize: 12.5, fontWeight: '700' },
  italicNote: { fontSize: 12.5, fontStyle: 'italic' },
  button: { fontSize: 15.5, fontWeight: '700', letterSpacing: 0.3 },
};
