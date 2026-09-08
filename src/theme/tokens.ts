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
  data: string;
  dataSoft: string;
  warnBg: string;
  warnBorder: string;
  warnText: string;
  danger: string;
  success: string;
  overlay: string;
};

export const palette: Record<Mode, Colors> = {
  light: {
    bg: '#FFFFFF',
    bgSubtle: '#F1F4F5',
    bgSunken: '#F7F8F9',
    bgRaised: '#FFFFFF',
    border: '#DDE2E5',
    borderStrong: '#C4CDD3',
    text: '#16232B',
    textMuted: '#5C6B73',
    textFaint: '#8B9AA3',
    primary: '#2B4552',
    primaryPressed: '#1E323C',
    onPrimary: '#FFFFFF',
    accent: '#E8792B',
    accentSoft: '#FDF0E4',
    data: '#0F6CBD',
    dataSoft: '#E8F1FA',
    warnBg: '#FDF4E1',
    warnBorder: '#F0DCB4',
    warnText: '#A8701A',
    danger: '#C0392B',
    success: '#2E7D5B',
    overlay: 'rgba(22,35,43,0.45)',
  },
  dark: {
    bg: '#121A1F',
    bgSubtle: '#1B252C',
    bgSunken: '#0C1216',
    bgRaised: '#18222A',
    border: '#2B3841',
    borderStrong: '#3C4B56',
    text: '#ECF2F5',
    textMuted: '#9BAAB3',
    textFaint: '#6E808A',
    primary: '#4E7E96',
    primaryPressed: '#3D6679',
    onPrimary: '#FFFFFF',
    accent: '#F59247',
    accentSoft: '#33240F',
    data: '#5EA9E8',
    dataSoft: '#132534',
    warnBg: '#2E2413',
    warnBorder: '#4A3A1C',
    warnText: '#E0B266',
    danger: '#E05B4B',
    success: '#4FB489',
    overlay: 'rgba(0,0,0,0.55)',
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
