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
  /** Text on an accent fill. Orange is light on dark, so this is not onPrimary. */
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
  /** The action colour as trim — the frame round the one display that matters. */
  copper: string;
  copperHi: string;
  copperLo: string;
  /** An action-colour button fill, and the text on it. */
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
  /** The featured tile: its teal plate, the edge round it and the tag on it. */
  featureHi: string;
  featureLo: string;
  featureEdge: string;
  feature: string;
  /** The tab bar along the foot of the tab screens. */
  tabBar: string;
};

// The palette
// -----------
// Two jobs, and they pull opposite ways.
//
// The chrome has to make a man want to open the app. Dark slate, white type
// and one orange for the thing on each screen worth pressing is what a good
// instrument looks like; blue is kept for what is selected and for figures,
// so a state is never mistaken for a button.
//
// The instrument has to be read on a roof at eleven in the morning. So the
// sheen is all in the chrome — a card's top edge, a button — and never in the
// ground a number sits on. Every figure sits in a recess darker than the plate
// round it.
//
// Daylight is the same instrument on cool paper for direct sun. A dark screen
// in sunlight shows you your own face; that is reflectance, not taste.
//
// Every pair here is checked by contrast.test.ts against the WCAG formula, at
// 4.5:1, which is the body-text bar and not the large-text one.

export const palette: Record<Mode, Colors> = {
  light: {
    bg: '#F3F5F8',
    bgSubtle: '#E6EAF0',
    bgSunken: '#DDE3EB',
    bgRaised: '#FFFFFF',
    border: '#CBD3DE',
    borderStrong: '#8A99AB',
    text: '#141C26',
    textMuted: '#42505F',
    textFaint: '#56657A',
    primary: '#1F5FC4',
    primaryPressed: '#17499A',
    onPrimary: '#F6FAFF',
    accent: '#A64A08',
    accentSoft: '#FCEBDB',
    onAccent: '#FFF6EC',
    data: '#1A57B0',
    dataSoft: '#DEE8F6',
    onData: '#F5F9FD',
    warnBg: '#F7EECF',
    warnBorder: '#D9C68A',
    warnText: '#634A09',
    danger: '#A8321F',
    success: '#0F5E45',
    overlay: 'rgba(20,28,38,0.45)',
    metalHi: '#FFFFFF',
    metalLo: '#EEF1F5',
    edgeHi: '#FFFFFF',
    edgeLo: '#C2CBD6',
    well: '#E9EDF2',
    wellEdge: '#C5CED9',
    copper: '#D9701C',
    copperHi: '#F5A15C',
    copperLo: '#9E4A0E',
    copperFill: '#E8781E',
    copperFillHi: '#F5841F',
    copperFillLo: '#D26A15',
    onCopper: '#1A1208',
    slateHi: '#58687B',
    slateLo: '#4A5869',
    onSlate: '#F7F9FB',
    glow: '#F5841F',
    headerHi: '#FFFFFF',
    headerLo: '#EAEEF3',
    chrome: '#141C26',
    featureHi: '#E6F4F5',
    featureLo: '#D4EAEC',
    featureEdge: '#9CCBCF',
    feature: '#0E6A70',
    tabBar: '#FFFFFF',
  },
  dark: {
    bg: '#1A2029',
    bgSubtle: '#222A35',
    bgSunken: '#11161D',
    bgRaised: '#262F3B',
    border: '#344050',
    borderStrong: '#5B6B7F',
    text: '#F1F4F8',
    textMuted: '#B3BDC9',
    textFaint: '#98A5B4',
    primary: '#2F6FD6',
    primaryPressed: '#255AB0',
    onPrimary: '#F6FAFF',
    accent: '#F5841F',
    accentSoft: '#3A2A1A',
    // Orange and the selection blue are the two fills lighter than the text
    // that sits on them in the dark theme, which is why these tokens exist.
    onAccent: '#1A1208',
    data: '#7FB2EE',
    dataSoft: '#15243A',
    onData: '#06121F',
    warnBg: '#2E2A14',
    warnBorder: '#5A4E1C',
    warnText: '#E6CF7A',
    danger: '#F58A7C',
    success: '#5FC9A0',
    overlay: 'rgba(0,0,0,0.66)',
    metalHi: '#2B3441',
    metalLo: '#1F2732',
    edgeHi: '#3B4756',
    edgeLo: '#0C1117',
    well: '#121820',
    wellEdge: '#2C3542',
    copper: '#F5841F',
    copperHi: '#FFA24D',
    copperLo: '#B85E10',
    copperFill: '#F5841F',
    copperFillHi: '#FF9333',
    copperFillLo: '#E0741A',
    onCopper: '#1A1208',
    slateHi: '#3A4757',
    slateLo: '#2C3746',
    onSlate: '#F1F4F8',
    glow: '#F5841F',
    headerHi: '#222A35',
    headerLo: '#1A2029',
    chrome: '#F1F4F8',
    featureHi: '#2B4A52',
    featureLo: '#1E3139',
    featureEdge: '#3A6670',
    feature: '#6FD3D6',
    tabBar: '#141A21',
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
