import type { FracDen } from './ftin';

export type PipeMaterial = 'plastic' | 'copper' | 'steel' | 'stainless' | 'brass' | 'aluminium' | 'castIron';

export const PIPE_MATERIALS: { id: PipeMaterial; label: string; display: string }[] = [
  { id: 'steel', label: 'Steel', display: 'StEEL' },
  { id: 'stainless', label: 'Stainless steel', display: 'S.StEEL' },
  { id: 'brass', label: 'Brass', display: 'brASS' },
  { id: 'aluminium', label: 'Aluminium', display: 'AL.' },
  { id: 'castIron', label: 'Cast iron', display: 'CASt' },
  { id: 'copper', label: 'Copper', display: 'COPPEr' },
  { id: 'plastic', label: 'Plastic', display: 'PLAStIC' },
];

// Which type designations each material offers. Wall and diameter data for a
// type belongs in a sourced table, not here; this is only the menu.
export const PIPE_TYPES: Record<PipeMaterial, string[]> = {
  steel: ['Std', '40', '60', 'XS', '80', '100', '120', '140', '160', 'XSS', '10', '20', '30'],
  brass: ['Std', '40', '60', 'XS', '80', '100', '120', '140', '160', 'XSS', '10', '20', '30'],
  aluminium: ['Std', '40', '60', 'XS', '80', '100', '120', '140', '160', 'XSS', '10', '20', '30'],
  castIron: ['Std', '40', '60', 'XS', '80', '100', '120', '140', '160', 'XSS', '10', '20', '30'],
  stainless: ['40-S', '80-S', '160', '5-S', '10-S'],
  plastic: ['40', '80', '120', 'SDR 21', 'SDR 26', 'SDR 32.5', 'SDR 41'],
  copper: ['Type L', 'Type K', 'Type M', 'Type DWV', 'Medical L', 'Medical K', 'ACR annealed', 'ACR drawn'],
};

export type ElbowType = 'lrButtWeld' | 'srButtWeld' | 'threaded';

export type AreaDisplay = 'standard' | 'sqFeet' | 'sqInch' | 'sqMetre';
export type VolumeDisplay = 'standard' | 'cuFeet' | 'cuMetre';
export type FractionalMode = 'standard' | 'constant';
export type MathMode = 'orderOfOperations' | 'chain';

export type Prefs = {
  fractionalResolution: FracDen;
  areaDisplay: AreaDisplay;
  volumeDisplay: VolumeDisplay;
  metreDecimals: 3 | 'float';
  degreeDecimals: number;
  fractionalMode: FractionalMode;
  mathMode: MathMode;
};

// Appendix C of the device's user guide.
export const DEFAULT_PREFS: Prefs = {
  fractionalResolution: 16,
  areaDisplay: 'standard',
  volumeDisplay: 'standard',
  metreDecimals: 3,
  degreeDecimals: 2,
  fractionalMode: 'standard',
  mathMode: 'orderOfOperations',
};

export const FRACTION_CHOICES: FracDen[] = [16, 32, 64, 2, 4, 8];

export type StoredDefaults = {
  material: PipeMaterial;
  pipeType: string;
  elbowType: ElbowType;
  weightPerCubicFoot: number;
  weldersGap: number;
  unitCost: number;
};

// Appendix B of the device's user guide. Clear All returns to these.
export const CLEAR_ALL_DEFAULTS: StoredDefaults = {
  material: 'steel',
  pipeType: 'Std',
  elbowType: 'lrButtWeld',
  weightPerCubicFoot: 62.42796,
  weldersGap: 1 / 8,
  unitCost: 0,
};

export const ELBOW_TYPES: { id: ElbowType; label: string }[] = [
  { id: 'lrButtWeld', label: 'Long radius butt weld' },
  { id: 'srButtWeld', label: 'Short radius butt weld' },
  { id: 'threaded', label: 'Threaded' },
];
