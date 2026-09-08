export type UnitSystem = 'imperial' | 'metric';

export const MM_PER_INCH = 25.4;

export const toInches = (value: number, system: UnitSystem): number =>
  system === 'metric' ? value / MM_PER_INCH : value;

export const fromInches = (inches: number, system: UnitSystem): number =>
  system === 'metric' ? inches * MM_PER_INCH : inches;

export const unitLabel = (system: UnitSystem): string => (system === 'metric' ? 'mm' : 'inch');

export const unitSuffix = (system: UnitSystem): string => (system === 'metric' ? 'mm' : '"');

export const deg = (rad: number): number => (rad * 180) / Math.PI;

export const rad = (degrees: number): number => (degrees * Math.PI) / 180;

export const LB_PER_KG = 2.2046226218;

export const weightLabel = (system: UnitSystem): string => (system === 'metric' ? 'kg' : 'lb');

export const convertWeight = (lb: number, system: UnitSystem): number =>
  system === 'metric' ? lb / LB_PER_KG : lb;
