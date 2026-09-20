export type Mode = 'light' | 'dark';

export type Colors = {
  bg: string;
  bgSubtle: string;
  bgSunken: string;
  bgRaised: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  accent: string;
  accentSoft: string;
  /** Text on an accent fill. Gold is light on dark, so this is not onPrimary. */
  onAccent: string;
  data: string;
  dataSoft: string;
  /** Text on a data fill — a cut-list bar. Same reason. */
  onData: string;
  warnBg: string;
  warnBorder: string;
  warnText: string;
  danger: string;
  success: string;
  overlay: string;
};

// The palette
// -----------
// Two jobs, and they pull opposite ways.
//
// The chrome has to make a man want to open the app. Deep emerald, gold and
// black is a trade tool that looks like it cost something, and that is what
// the headers, the buttons, the tiles and the rules are drawn in.
//
// The instrument has to be read on a roof at eleven in the morning. So the
// drawing surface stays near-white, the figures stay near-black, and nothing
// that carries a number is asked to do it in gold on green.
//
// Gold is the problem colour and it is worth saying why. It is a mid-tone: on
// white it is barely darker than the paper, on black it glows. So it shifts
// value between the themes while keeping its hue — a deep bronze on light, a
// bright leaf on dark. Same colour to the eye, opposite ends of the ramp.
//
// Every pair here is checked by contrast.test.ts against the WCAG formula, at
// 4.5:1, which is the body-text bar and not the large-text one. The palette
// this replaced failed eleven of those checks.

export const palette: Record<Mode, Colors> = {
  light: {
    bg: '#FCFCFA',
    bgSubtle: '#EDF1EB',
    bgSunken: '#F5F7F3',
    bgRaised: '#FFFFFF',
    border: '#D7DDD3',
    borderStrong: '#98A69A',
    text: '#0B1F1A',
    textMuted: '#42544D',
    textFaint: '#5C6E67',
    primary: '#0E3B32',
    primaryPressed: '#072520',
    onPrimary: '#FAF6E9',
    accent: '#7A5A12',
    accentSoft: '#F6EFD9',
    onAccent: '#FAF6E9',
    data: '#0A4F66',
    dataSoft: '#E2EDF1',
    onData: '#FAF6E9',
    warnBg: '#FAF2DC',
    warnBorder: '#E0CB98',
    warnText: '#6F5008',
    danger: '#A5301F',
    success: '#115A49',
    overlay: 'rgba(7,31,27,0.45)',
  },
  dark: {
    bg: '#071A16',
    bgSubtle: '#0D2A23',
    bgSunken: '#04110E',
    bgRaised: '#0F3128',
    border: '#1D4739',
    borderStrong: '#3A7563',
    text: '#EDF3EF',
    textMuted: '#A8BEB5',
    textFaint: '#8AA39A',
    primary: '#1A7A63',
    primaryPressed: '#125A49',
    // The same cream as the light theme. Text on a primary fill is one idea,
    // and a fill dark enough to carry it in one theme is dark enough in both.
    onPrimary: '#FAF6E9',
    accent: '#D8B863',
    accentSoft: '#2A2210',
    // Gold and this blue are the two fills that are lighter than their text in
    // the dark theme, which is the whole reason these tokens exist.
    onAccent: '#08201A',
    data: '#6FC0D8',
    dataSoft: '#0B2A33',
    onData: '#08201A',
    warnBg: '#2B2411',
    warnBorder: '#4A3D1C',
    warnText: '#DCC07A',
    danger: '#F0857A',
    success: '#4FBE9E',
    overlay: 'rgba(0,0,0,0.62)',
  },
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const radius = { sm: 8, md: 10, lg: 12, xl: 16, pill: 999 } as const;

export const hairline = 1;

export const layout = {
  screenPadding: space.xl,
  fieldHeight: 62,
  chipHeight: 46,
  controlHeight: 56,
  maxContentWidth: 640,
} as const;
