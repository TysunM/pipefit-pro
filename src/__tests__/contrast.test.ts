import { Colors, Mode, palette } from '../theme/tokens';

// Contrast, measured
// ------------------
// This app gets read on a roof at eleven in the morning. A palette chosen on a
// desk monitor and eyeballed is a palette that fails there, and fails silently
// — so every pair that carries text is checked here against the WCAG formula
// rather than against anybody's taste.
//
// AA is 4.5:1 for body text and 3:1 for large text. Everything a man actually
// reads a figure off is held to 4.5 regardless of size, because a figure read
// wrong is worse than a label read slowly.

const srgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const luminance = (hex: string): number => {
  const [r, g, b] = srgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (fg: string, bg: string): number => {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

/** Every pair where one colour carries text on another, and the floor it must clear. */
const PAIRS: { fg: keyof Colors; bg: keyof Colors; min: number; what: string }[] = [
  { fg: 'text', bg: 'bg', min: 4.5, what: 'body text on the page' },
  { fg: 'text', bg: 'bgSubtle', min: 4.5, what: 'body text on a banner' },
  { fg: 'text', bg: 'bgSunken', min: 4.5, what: 'body text on a sunken panel' },
  { fg: 'text', bg: 'bgRaised', min: 4.5, what: 'body text on a card' },
  { fg: 'textMuted', bg: 'bg', min: 4.5, what: 'secondary text on the page' },
  { fg: 'textMuted', bg: 'bgSubtle', min: 4.5, what: 'secondary text on a banner' },
  { fg: 'textFaint', bg: 'bg', min: 4.5, what: 'faint text on the page' },
  { fg: 'onPrimary', bg: 'primary', min: 4.5, what: 'text on a primary fill' },
  { fg: 'onPrimary', bg: 'primaryPressed', min: 4.5, what: 'text on a pressed primary fill' },
  { fg: 'onAccent', bg: 'accent', min: 4.5, what: 'text on an accent fill' },
  { fg: 'onData', bg: 'data', min: 4.5, what: 'a piece label on a cut-list bar' },
  { fg: 'accent', bg: 'bg', min: 4.5, what: 'the accent button' },
  { fg: 'accent', bg: 'bgSubtle', min: 4.5, what: 'the accent on a banner' },
  { fg: 'accent', bg: 'accentSoft', min: 4.5, what: 'the accent on its own tint' },
  { fg: 'data', bg: 'bg', min: 4.5, what: 'a figure on the page' },
  { fg: 'data', bg: 'bgSubtle', min: 4.5, what: 'a figure on a banner' },
  { fg: 'data', bg: 'dataSoft', min: 4.5, what: 'a figure on its own tint' },
  { fg: 'warnText', bg: 'warnBg', min: 4.5, what: 'a warning' },
  { fg: 'danger', bg: 'bg', min: 4.5, what: 'a danger message' },
  { fg: 'success', bg: 'bg', min: 4.5, what: 'a success message' },
];

/** Borders carry no text, but an invisible edge is a control nobody finds. */
const EDGES: { fg: keyof Colors; bg: keyof Colors; min: number }[] = [
  { fg: 'border', bg: 'bg', min: 1.2 },
  { fg: 'borderStrong', bg: 'bg', min: 1.9 },
];

describe.each(['light', 'dark'] as Mode[])('the %s palette is readable', (mode) => {
  const c = palette[mode];

  test.each(PAIRS)('$what: $fg on $bg clears $min:1', ({ fg, bg, min }) => {
    const ratio = contrast(c[fg], c[bg]);
    expect(Number(ratio.toFixed(2))).toBeGreaterThanOrEqual(min);
  });

  test.each(EDGES)('an edge is visible: $fg on $bg', ({ fg, bg, min }) => {
    expect(contrast(c[fg], c[bg])).toBeGreaterThanOrEqual(min);
  });

  test('every colour is a real hex, so nothing silently renders black', () => {
    for (const [name, value] of Object.entries(c)) {
      if (name === 'overlay') continue;
      expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

test('the two palettes define exactly the same tokens', () => {
  expect(Object.keys(palette.light).sort()).toEqual(Object.keys(palette.dark).sort());
});
