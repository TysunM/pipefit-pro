import { Platform, TextStyle } from 'react-native';

// Two faces, one family
// ---------------------
// Source Serif 4 for what names a thing — the title of a screen, of a tile, of
// a section — and Source Sans 3 for everything read to use it: labels, body
// copy, hints, buttons, chips and the big figures. A serif title over a sans
// line is how a handbook sets a table heading over its rows, and it is what
// makes the front page read as a finished instrument rather than a form. The
// two were drawn as a pair by the same hand, so the x-heights and stroke
// weights agree and a title over a paragraph reads as one voice.
//
// The sans was picked by setting four against the same screen. Inter, Barlow
// and DM Sans all draw capital I and lowercase l as the same bar; on a screen
// that reads heat numbers off steel, E7Z4l9 and E7Z4I9 must not look alike.
// Source Sans tails its l and flags its 1, so all three are distinct. That is
// why every figure stays in the sans.
//
// Android does not pick a weight out of a family by fontWeight, so every
// weight is its own family name, and each style below says which face it is
// set in. The theme resolves that to a family name once, at the top.

export const fontFamily = {
  sans: 'SourceSans3_700Bold',
  sansMedium: 'SourceSans3_600SemiBold',
  sansRegular: 'SourceSans3_400Regular',
  serif: 'SourceSerif4_700Bold',
  serifMedium: 'SourceSerif4_600SemiBold',
  serifRegular: 'SourceSerif4_400Regular',
  serifItalic: 'SourceSerif4_400Regular_Italic',
  sansFallback: Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui' }) as string,
  serifFallback: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }) as string,
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
};

export type Face = 'sans' | 'serif';

/** A text style plus which face it is set in. `face` never reaches a <Text>. */
export type TypeStyle = TextStyle & { face: Face };

export const type = {
  screenTitle: { face: 'serif', fontSize: 22, fontWeight: '700', letterSpacing: -0.2 },
  display: { face: 'sans', fontSize: 46, fontWeight: '700', letterSpacing: -1 },
  displaySmall: { face: 'sans', fontSize: 34, fontWeight: '700', letterSpacing: -0.6 },
  sectionTitle: { face: 'serif', fontSize: 20, fontWeight: '700', letterSpacing: -0.2 },
  tileTitle: { face: 'serif', fontSize: 19.5, fontWeight: '700', letterSpacing: -0.3 },
  label: { face: 'sans', fontSize: 12.5, fontWeight: '600', letterSpacing: 1.1, textTransform: 'uppercase' },
  labelSmall: { face: 'sans', fontSize: 11.5, fontWeight: '600', letterSpacing: 0.9, textTransform: 'uppercase' },
  fieldValue: { face: 'sans', fontSize: 24, fontWeight: '600', letterSpacing: -0.2 },
  statValue: { face: 'sans', fontSize: 22, fontWeight: '600', letterSpacing: -0.2 },
  body: { face: 'sans', fontSize: 16, fontWeight: '400', lineHeight: 23 },
  bodyStrong: { face: 'sans', fontSize: 16, fontWeight: '600', lineHeight: 23 },
  caption: { face: 'sans', fontSize: 13.5, fontWeight: '400', lineHeight: 18 },
  captionStrong: { face: 'sans', fontSize: 13, fontWeight: '600' },
  italicNote: { face: 'serif', fontSize: 13, fontStyle: 'italic' },
  button: { face: 'sans', fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
} satisfies Record<string, TypeStyle>;

export type TypeKey = keyof typeof type;

/** The family a style is set in, from its face, weight and slant. */
export function cutFor(style: TypeStyle): keyof typeof fontFamily {
  const w = Number(style.fontWeight ?? 400);
  if (style.face === 'serif') {
    if (style.fontStyle === 'italic') return 'serifItalic';
    return w >= 700 ? 'serif' : w >= 600 ? 'serifMedium' : 'serifRegular';
  }
  return w >= 700 ? 'sans' : w >= 600 ? 'sansMedium' : 'sansRegular';
}
