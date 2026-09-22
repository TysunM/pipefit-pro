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
  /** Text on an accent fill. Copper is light on dark, so this is not onPrimary. */
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

  // The metal. None of these carries text except where a pair in
  // contrast.test.ts says so.
  /** Top and bottom of a plate's sheen — a card, a button. */
  metalHi: string;
  metalLo: string;
  /** The lit top edge of a plate and the shadowed bottom one. */
  edgeHi: string;
  edgeLo: string;
  /** A recess: the panel a figure or a drawing sits down inside. */
  well: string;
  wellEdge: string;
  /** Bronze trim — the bezel round a header button, the frame on a display. */
  copper: string;
  copperHi: string;
  copperLo: string;
  /** A copper-filled button, and the text on it. */
  copperFill: string;
  copperFillHi: string;
  copperFillLo: string;
  onCopper: string;
  /** Slate — the calculator's function keys, a third tier between copper and bronze. */
  slateHi: string;
  slateLo: string;
  onSlate: string;
  /** The lit indicator. Decoration only — it never carries meaning alone. */
  glow: string;
  /** The header bar, and the title set on it. */
  headerHi: string;
  headerLo: string;
  chrome: string;
};

// The palette
// -----------
// Two jobs, and they pull opposite ways.
//
// The chrome has to make a man want to open the app. Dark bronze and copper
// trim is what a good instrument looks like — the blue still carries whatever
// is selected and whatever is a figure, and copper carries the one thing on
// each screen worth pressing.
//
// The instrument has to be read on a roof at eleven in the morning. So the
// metal is all in the chrome — sheen, bevels, grain — and never in the ground a
// number sits on. Every figure sits in a recess darker than the plate round
// it, and nothing carrying a number is asked to do it in bronze on bronze.
//
// Daylight is the same instrument for bright sun. A dark screen in direct
// sunlight shows you your own face; that is not a taste, it is reflectance.
//
// Every pair here is checked by contrast.test.ts against the WCAG formula, at
// 4.5:1, which is the body-text bar and not the large-text one.

export const palette: Record<Mode, Colors> = {
  light: {
    bg: '#F6F2EA',
    bgSubtle: '#EAE3D6',
    bgSunken: '#E4DBCC',
    bgRaised: '#FFFCF7',
    border: '#D5C9B5',
    borderStrong: '#98866B',
    text: '#1D1711',
    textMuted: '#4F4337',
    textFaint: '#655747',
    primary: '#1D5294',
    primaryPressed: '#143D70',
    onPrimary: '#F7FAFF',
    accent: '#97461A',
    accentSoft: '#F5E4D4',
    onAccent: '#FFF7F0',
    data: '#17528F',
    dataSoft: '#E0E9F3',
    onData: '#F5F9FD',
    warnBg: '#F6ECCC',
    warnBorder: '#D9C68A',
    warnText: '#634A09',
    danger: '#9A2B1A',
    success: '#0E5842',
    overlay: 'rgba(29,23,17,0.45)',
    metalHi: '#FFFDF9',
    metalLo: '#EEE7DA',
    edgeHi: '#FFFFFF',
    edgeLo: '#C7B9A2',
    well: '#ECE4D7',
    wellEdge: '#CBBDA6',
    copper: '#B07742',
    copperHi: '#E6C196',
    copperLo: '#7C4A22',
    copperFill: '#8C4C21',
    copperFillHi: '#9F5629',
    copperFillLo: '#773F1A',
    onCopper: '#FFF6EC',
    slateHi: '#586776',
    slateLo: '#434F5B',
    onSlate: '#F7F8FA',
    glow: '#E0762B',
    headerHi: '#FBF7F0',
    headerLo: '#E8DFD0',
    chrome: '#4A3420',
  },
  dark: {
    bg: '#13110E',
    bgSubtle: '#1E1A15',
    bgSunken: '#0B0A08',
    bgRaised: '#25211C',
    border: '#3A3229',
    borderStrong: '#6E5F4B',
    text: '#F2EADC',
    textMuted: '#C9BDA9',
    textFaint: '#A99C87',
    primary: '#2F6DB8',
    primaryPressed: '#22548F',
    onPrimary: '#F6FAFF',
    accent: '#E8904C',
    accentSoft: '#2B1C10',
    // Copper and this blue are the two fills lighter than the text that sits
    // on them in the dark theme, which is the whole reason these tokens exist.
    onAccent: '#1A0D05',
    data: '#7FB2EE',
    dataSoft: '#10213A',
    onData: '#06121F',
    warnBg: '#2C2710',
    warnBorder: '#5A4E1C',
    warnText: '#E3CB78',
    danger: '#F2887B',
    success: '#5FC9A0',
    overlay: 'rgba(0,0,0,0.66)',
    metalHi: '#2F2A24',
    metalLo: '#1C1915',
    edgeHi: '#4C4338',
    edgeLo: '#050404',
    well: '#0C0B09',
    wellEdge: '#2E281F',
    copper: '#A8693A',
    copperHi: '#E2AA76',
    copperLo: '#5A3217',
    copperFill: '#8C4C21',
    copperFillHi: '#9F5629',
    copperFillLo: '#743F1B',
    onCopper: '#FFF2E2',
    slateHi: '#46525F',
    slateLo: '#2F3842',
    onSlate: '#F3EFE8',
    glow: '#FF8C3F',
    headerHi: '#2B251E',
    headerLo: '#15120F',
    chrome: '#EBD6B3',
  },
};

/** How strongly the brushed grain shows, and in what colour, per theme. */
export const finish: Record<Mode, { grain: string; grainOpacity: number }> = {
  light: { grain: '#5A4630', grainOpacity: 0.05 },
  dark: { grain: '#FFFFFF', grainOpacity: 0.035 },
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
