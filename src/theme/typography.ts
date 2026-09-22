import { Platform, TextStyle } from 'react-native';

// One serif, four cuts
// --------------------
// Source Serif 4 was drawn for screens: a tall lowercase, so a caption at
// twelve points is still a caption on a roof, and lining figures by default,
// so 1-1/2" never has a descending 4 in it. It was chosen over Crimson (too
// small at the sizes a label is set in) and Baskerville (too wide — a figure
// line wrapped on a phone) by setting all three against the same screen.
//
// Android does not pick a weight out of a family by fontWeight, so each weight
// is its own family name and every style below says which one it wants.

export const fontFamily = {
  serif: 'SourceSerif4_700Bold',
  serifMedium: 'SourceSerif4_600SemiBold',
  serifRegular: 'SourceSerif4_400Regular',
  serifItalic: 'SourceSerif4_400Regular_Italic',
  serifFallback: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }) as string,
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui' }) as string,
  sansMedium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'system-ui' }) as string,
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
};

type T = TextStyle;

export const type: Record<string, T> = {
  screenTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.2 },
  display: { fontSize: 46, fontWeight: '700', letterSpacing: -1 },
  displaySmall: { fontSize: 34, fontWeight: '700', letterSpacing: -0.6 },
  sectionTitle: { fontSize: 20, fontWeight: '600', letterSpacing: -0.2 },
  label: { fontSize: 12.5, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase' },
  labelSmall: { fontSize: 11.5, fontWeight: '600', letterSpacing: 0.9, textTransform: 'uppercase' },
  fieldValue: { fontSize: 24, fontWeight: '600', letterSpacing: -0.2 },
  statValue: { fontSize: 22, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 23 },
  bodyStrong: { fontSize: 16, fontWeight: '600', lineHeight: 23 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  captionStrong: { fontSize: 13, fontWeight: '600' },
  italicNote: { fontSize: 13, fontStyle: 'italic' },
  button: { fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
};

/** The cut a style is set in, from its weight and slant. */
export function cutFor(style: T): keyof typeof fontFamily {
  if (style.fontStyle === 'italic') return 'serifItalic';
  const w = Number(style.fontWeight ?? 400);
  return w >= 700 ? 'serif' : w >= 600 ? 'serifMedium' : 'serifRegular';
}
