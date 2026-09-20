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
// The chrome has to make a man want to open the app. Cobalt, steel and a
// burnt-orange action colour is what a trade instrument looks like — the blue
// carries the structure, the orange carries the one thing on each screen that
// is worth pressing.
//
// The instrument has to be read on a roof at eleven in the morning. So the
// drawing surface stays near-white in light and near-black in dark, the pipe
// stays steel, and nothing carrying a number is asked to do it in mid-blue on
// mid-blue.
//
// Orange is the problem colour and it is worth saying why. It is a mid-tone:
// on white it is barely darker than the paper, on black it glows. So it shifts
// value between the themes while keeping its hue, a burnt rust on light and a
// bright amber on dark. Same colour to the eye, opposite ends of the ramp.
//
// Every pair here is checked by contrast.test.ts against the WCAG formula, at
// 4.5:1, which is the body-text bar and not the large-text one.

export const palette: Record<Mode, Colors> = {
  light: {
    bg: '#FCFCFD',
    bgSubtle: '#EBF0F6',
    bgSunken: '#F4F7FA',
    bgRaised: '#FFFFFF',
    border: '#D3DCE7',
    borderStrong: '#8C9DB1',
    text: '#0C1A28',
    textMuted: '#3D5168',
    textFaint: '#566B82',
    primary: '#11447E',
    primaryPressed: '#0A2E58',
    onPrimary: '#F6FAFF',
    accent: '#9E4515',
    accentSoft: '#FAEDE3',
    onAccent: '#FFF7F1',
    data: '#08536F',
    dataSoft: '#E1EDF3',
    onData: '#F6FBFE',
    warnBg: '#FAF2DB',
    warnBorder: '#DFCC9B',
    warnText: '#6C520B',
    danger: '#9C2D1C',
    success: '#0F5A45',
    overlay: 'rgba(12,26,40,0.45)',
  },
  dark: {
    bg: '#0F1318',
    bgSubtle: '#171D25',
    bgSunken: '#080A0E',
    bgRaised: '#1A222B',
    border: '#28323E',
    borderStrong: '#54687E',
    text: '#EEF3F9',
    textMuted: '#AABCCE',
    textFaint: '#93A7BA',
    primary: '#2C6CB4',
    primaryPressed: '#1F5091',
    onPrimary: '#F6FAFF',
    accent: '#F2954E',
    accentSoft: '#2A1C10',
    // Orange and this blue are the two fills lighter than the text that sits
    // on them in the dark theme, which is the whole reason these tokens exist.
    onAccent: '#1A0D05',
    data: '#72B9DE',
    dataSoft: '#0C2531',
    onData: '#06161F',
    warnBg: '#2A2412',
    warnBorder: '#483F1E',
    warnText: '#DCC07A',
    danger: '#F2867A',
    success: '#47C098',
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
