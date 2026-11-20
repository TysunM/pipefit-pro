// The unit converter
// ------------------
// The phone calculator's converter, with the trade's units in it: length,
// area, volume, mass, temperature, speed, time and data as the phone has
// them, then pressure, flow, torque, force, power, energy and angle, which a
// fitter reaches for more than he does bytes.
//
// Every unit is held as its size in the category's SI unit, from the exact
// definitions where there is one (an inch is 25.4 mm, a pound 0.45359237 kg,
// a US gallon 231 cubic inches) and the standard figure where there is not
// (water column at 4 °C, mercury at 0 °C, the thermochemical calorie, the
// International Table BTU). Temperature is the one that is not a plain
// multiple, so a unit can carry an offset: kelvin = (value + offset) x size.

import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type ConvUnit = {
  id: string;
  /** What the unit is called on the list. */
  name: string;
  /** What follows a figure: mm, psi, °F. */
  sym: string;
  /** One of this unit in the category's SI unit. */
  size: number;
  /** Added before scaling; temperature only. */
  offset?: number;
};

export type ConvCategory = { id: string; name: string; icon: IconName; units: ConvUnit[]; first: [from: string, to: string] };

const IN = 0.0254;
const FT = 0.3048;
const LB = 0.45359237;
const GAL = 231 * IN ** 3;
const G = 9.80665;
const LBF = LB * G;
const BTU = 1055.05585262;

const u = (id: string, name: string, sym: string, size: number, offset?: number): ConvUnit => (offset === undefined ? { id, name, sym, size } : { id, name, sym, size, offset });

export const CATEGORIES: readonly ConvCategory[] = [
  {
    id: 'length',
    name: 'Length',
    icon: 'resize-outline',
    first: ['in', 'mm'],
    units: [
      u('mm', 'Millimetre', 'mm', 0.001),
      u('cm', 'Centimetre', 'cm', 0.01),
      u('m', 'Metre', 'm', 1),
      u('km', 'Kilometre', 'km', 1000),
      u('in', 'Inch', 'in', IN),
      u('ft', 'Foot', 'ft', FT),
      u('yd', 'Yard', 'yd', 3 * FT),
      u('mi', 'Mile', 'mi', 5280 * FT),
      u('nmi', 'Nautical mile', 'nmi', 1852),
      u('mil', 'Thou (mil)', 'mil', IN / 1000),
      u('um', 'Micrometre', 'µm', 1e-6),
    ],
  },
  {
    id: 'area',
    name: 'Area',
    icon: 'square-outline',
    first: ['ft2', 'm2'],
    units: [
      u('mm2', 'Square millimetre', 'mm²', 1e-6),
      u('cm2', 'Square centimetre', 'cm²', 1e-4),
      u('m2', 'Square metre', 'm²', 1),
      u('ha', 'Hectare', 'ha', 1e4),
      u('km2', 'Square kilometre', 'km²', 1e6),
      u('in2', 'Square inch', 'in²', IN ** 2),
      u('ft2', 'Square foot', 'ft²', FT ** 2),
      u('yd2', 'Square yard', 'yd²', (3 * FT) ** 2),
      u('ac', 'Acre', 'ac', 43560 * FT ** 2),
      u('mi2', 'Square mile', 'mi²', (5280 * FT) ** 2),
    ],
  },
  {
    id: 'volume',
    name: 'Volume',
    icon: 'beaker-outline',
    first: ['gal', 'l'],
    units: [
      u('ml', 'Millilitre', 'mL', 1e-6),
      u('l', 'Litre', 'L', 1e-3),
      u('m3', 'Cubic metre', 'm³', 1),
      u('in3', 'Cubic inch', 'in³', IN ** 3),
      u('ft3', 'Cubic foot', 'ft³', FT ** 3),
      u('yd3', 'Cubic yard', 'yd³', (3 * FT) ** 3),
      u('gal', 'US gallon', 'gal', GAL),
      u('qt', 'US quart', 'qt', GAL / 4),
      u('pt', 'US pint', 'pt', GAL / 8),
      u('cup', 'US cup', 'cup', GAL / 16),
      u('floz', 'US fluid ounce', 'fl oz', GAL / 128),
      u('tbsp', 'US tablespoon', 'tbsp', GAL / 256),
      u('tsp', 'US teaspoon', 'tsp', GAL / 768),
      u('impgal', 'Imperial gallon', 'imp gal', 0.00454609),
      u('bbl', 'Barrel (oil)', 'bbl', 42 * GAL),
    ],
  },
  {
    id: 'mass',
    name: 'Mass',
    icon: 'barbell-outline',
    first: ['lb', 'kg'],
    units: [
      u('mg', 'Milligram', 'mg', 1e-6),
      u('g', 'Gram', 'g', 1e-3),
      u('kg', 'Kilogram', 'kg', 1),
      u('t', 'Tonne', 't', 1000),
      u('oz', 'Ounce', 'oz', LB / 16),
      u('lb', 'Pound', 'lb', LB),
      u('st', 'Stone', 'st', 14 * LB),
      u('ton', 'Short ton (US)', 'ton', 2000 * LB),
      u('lton', 'Long ton (UK)', 'LT', 2240 * LB),
    ],
  },
  {
    id: 'temperature',
    name: 'Temperature',
    icon: 'thermometer-outline',
    first: ['f', 'c'],
    units: [u('c', 'Celsius', '°C', 1, 273.15), u('f', 'Fahrenheit', '°F', 5 / 9, 459.67), u('k', 'Kelvin', 'K', 1, 0), u('r', 'Rankine', '°R', 5 / 9, 0)],
  },
  {
    id: 'speed',
    name: 'Speed',
    icon: 'speedometer-outline',
    first: ['mph', 'kmh'],
    units: [
      u('mps', 'Metre per second', 'm/s', 1),
      u('kmh', 'Kilometre per hour', 'km/h', 1 / 3.6),
      u('mph', 'Mile per hour', 'mph', (5280 * FT) / 3600),
      u('fps', 'Foot per second', 'ft/s', FT),
      u('fpm', 'Foot per minute', 'ft/min', FT / 60),
      u('kn', 'Knot', 'kn', 1852 / 3600),
    ],
  },
  {
    id: 'time',
    name: 'Time',
    icon: 'time-outline',
    first: ['h', 'min'],
    units: [u('ms', 'Millisecond', 'ms', 0.001), u('s', 'Second', 's', 1), u('min', 'Minute', 'min', 60), u('h', 'Hour', 'h', 3600), u('d', 'Day', 'd', 86400), u('wk', 'Week', 'wk', 604800)],
  },
  {
    id: 'data',
    name: 'Data',
    icon: 'server-outline',
    first: ['mb', 'gb'],
    units: [
      u('bit', 'Bit', 'bit', 1 / 8),
      u('b', 'Byte', 'B', 1),
      u('kb', 'Kilobyte', 'kB', 1e3),
      u('mb', 'Megabyte', 'MB', 1e6),
      u('gb', 'Gigabyte', 'GB', 1e9),
      u('tb', 'Terabyte', 'TB', 1e12),
      u('kib', 'Kibibyte', 'KiB', 1024),
      u('mib', 'Mebibyte', 'MiB', 1024 ** 2),
      u('gib', 'Gibibyte', 'GiB', 1024 ** 3),
      u('tib', 'Tebibyte', 'TiB', 1024 ** 4),
    ],
  },
  {
    id: 'pressure',
    name: 'Pressure',
    icon: 'speedometer',
    first: ['psi', 'bar'],
    units: [
      u('psi', 'Pound per square inch', 'psi', LBF / IN ** 2),
      u('ksi', 'Kip per square inch', 'ksi', (1000 * LBF) / IN ** 2),
      u('pa', 'Pascal', 'Pa', 1),
      u('kpa', 'Kilopascal', 'kPa', 1e3),
      u('mpa', 'Megapascal', 'MPa', 1e6),
      u('bar', 'Bar', 'bar', 1e5),
      u('mbar', 'Millibar', 'mbar', 100),
      u('atm', 'Atmosphere', 'atm', 101325),
      u('inhg', 'Inch of mercury (0 °C)', 'inHg', 3386.389),
      u('mmhg', 'Millimetre of mercury', 'mmHg', 133.322387415),
      u('inh2o', 'Inch of water (4 °C)', 'inH₂O', 249.08891),
      u('fth2o', 'Foot of water (4 °C)', 'ft H₂O', 2989.06692),
    ],
  },
  {
    id: 'flow',
    name: 'Flow',
    icon: 'water-outline',
    first: ['gpm', 'lpm'],
    units: [
      u('gpm', 'US gallon per minute', 'gpm', GAL / 60),
      u('gph', 'US gallon per hour', 'gph', GAL / 3600),
      u('lpm', 'Litre per minute', 'L/min', 1e-3 / 60),
      u('lps', 'Litre per second', 'L/s', 1e-3),
      u('m3h', 'Cubic metre per hour', 'm³/h', 1 / 3600),
      u('cfm', 'Cubic foot per minute', 'cfm', FT ** 3 / 60),
      u('bpd', 'Barrel per day', 'bbl/d', (42 * GAL) / 86400),
    ],
  },
  {
    id: 'torque',
    name: 'Torque',
    icon: 'construct-outline',
    first: ['ftlb', 'nm'],
    units: [u('nm', 'Newton metre', 'N·m', 1), u('ftlb', 'Foot-pound', 'ft·lb', LBF * FT), u('inlb', 'Inch-pound', 'in·lb', LBF * IN), u('kgfm', 'Kilogram-force metre', 'kgf·m', G)],
  },
  {
    id: 'force',
    name: 'Force',
    icon: 'arrow-down-outline',
    first: ['lbf', 'kn'],
    units: [u('n', 'Newton', 'N', 1), u('kn', 'Kilonewton', 'kN', 1e3), u('lbf', 'Pound-force', 'lbf', LBF), u('kip', 'Kip', 'kip', 1000 * LBF), u('kgf', 'Kilogram-force', 'kgf', G)],
  },
  {
    id: 'power',
    name: 'Power',
    icon: 'flash-outline',
    first: ['hp', 'kw'],
    units: [
      u('w', 'Watt', 'W', 1),
      u('kw', 'Kilowatt', 'kW', 1e3),
      u('hp', 'Horsepower', 'hp', 550 * LBF * FT),
      u('btuh', 'BTU per hour', 'BTU/h', BTU / 3600),
      u('tr', 'Ton of refrigeration', 'TR', (12000 * BTU) / 3600),
    ],
  },
  {
    id: 'energy',
    name: 'Energy',
    icon: 'battery-half-outline',
    first: ['btu', 'kwh'],
    units: [
      u('j', 'Joule', 'J', 1),
      u('kj', 'Kilojoule', 'kJ', 1e3),
      u('kwh', 'Kilowatt-hour', 'kWh', 3.6e6),
      u('btu', 'British thermal unit', 'BTU', BTU),
      u('therm', 'Therm', 'thm', 1e5 * BTU),
      u('cal', 'Calorie', 'cal', 4.184),
      u('kcal', 'Kilocalorie', 'kcal', 4184),
    ],
  },
  {
    id: 'angle',
    name: 'Angle',
    icon: 'compass-outline',
    first: ['deg', 'rad'],
    units: [
      u('deg', 'Degree', '°', Math.PI / 180),
      u('rad', 'Radian', 'rad', 1),
      u('grad', 'Gradian', 'grad', Math.PI / 200),
      u('arcmin', 'Minute of arc', "'", Math.PI / 10800),
      u('arcsec', 'Second of arc', '"', Math.PI / 648000),
      u('rev', 'Revolution', 'rev', 2 * Math.PI),
    ],
  },
];

export const categoryById = (id: string): ConvCategory => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]!;

export const unitIn = (cat: ConvCategory, id: string): ConvUnit => cat.units.find((x) => x.id === id) ?? cat.units[0]!;

/** A figure in one unit, read in another of the same category. */
export function convert(value: number, from: ConvUnit, to: ConvUnit): number {
  const si = (value + (from.offset ?? 0)) * from.size;
  return si / to.size - (to.offset ?? 0);
}

/** Ten significant figures, commas on the whole part; exponent past what fits. */
export function formatConverted(v: number): string {
  if (!Number.isFinite(v)) return '—';
  if (v === 0 || Math.abs(v) < 1e-12) return '0';
  const a = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (a >= 1e15 || a < 1e-6) {
    const [m, e] = a.toExponential(6).split('e');
    return `${sign}${m!.replace(/0+$/, '').replace(/\.$/, '')}E${Number(e) < 0 ? '-' : '+'}${Math.abs(Number(e))}`;
  }
  const s = String(Number(a.toPrecision(10)));
  const [whole, frac] = s.split('.');
  return `${sign}${whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${frac === undefined ? '' : `.${frac}`}`;
}

// ------------------------------------------------------------ the figure being typed

/** At most this many digits typed into the converter. */
export const MAX_INPUT_DIGITS = 15;

export type ConvKey = { t: 'digit'; d: string } | { t: 'dot' } | { t: 'back' } | { t: 'clear' } | { t: 'sign' };

/** The figure as typed: digits, at most one point, a leading minus. */
export function pressConv(s: string, key: ConvKey): string {
  const neg = s.startsWith('-');
  const body = neg ? s.slice(1) : s;
  switch (key.t) {
    case 'clear':
      return '';
    case 'back':
      return s.slice(0, -1) === '-' ? '' : s.slice(0, -1);
    case 'sign':
      return neg ? body : `-${body}`;
    case 'dot':
      if (body.includes('.')) return s;
      return `${neg ? '-' : ''}${body === '' ? '0' : body}.`;
    case 'digit': {
      if (body.replace('.', '').length >= MAX_INPUT_DIGITS) return s;
      const next = body === '0' ? key.d : body + key.d;
      return `${neg ? '-' : ''}${next}`;
    }
  }
}

/** The typed figure as a number; nothing typed reads as nought. */
export const inputValue = (s: string): number => {
  const v = Number(s === '' || s === '-' ? 0 : s.endsWith('.') ? s.slice(0, -1) : s);
  return Number.isFinite(v) ? v : 0;
};

/** The typed figure as the display shows it, commas on the whole part. */
export function inputText(s: string): string {
  if (s === '' || s === '-') return s === '-' ? '−0' : '0';
  const neg = s.startsWith('-');
  const body = neg ? s.slice(1) : s;
  const [whole, frac] = body.split('.');
  return `${neg ? '−' : ''}${whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${frac === undefined ? '' : `.${frac}`}`;
}
