import { LOOK, readSettings } from '../state/readSettings';
import type { Settings } from '../state/settings';

const DEFAULTS: Settings = {
  themePreference: 'dark',
  unitSystem: 'imperial',
  fractionDenominator: 16,
  lengthReadout: 'inches',
  defaultNps: 2,
  defaultKind: 'LR',
  defaultSchedule: '40',
  defaultGap: 0.09375,
  stockLength: 240,
  cutAllowance: 0.125,
  look: LOOK,
};

describe('reading stored settings', () => {
  test('a first launch gets the defaults, bronze included, and writes nothing', () => {
    expect(readSettings(null, DEFAULTS)).toEqual({ settings: DEFAULTS, migrated: false });
  });

  test('settings from before the bronze look are moved onto it once', () => {
    // What the old app wrote the first time a pipe size was changed: a light
    // theme nobody chose, alongside the size somebody did.
    const old = JSON.stringify({ ...DEFAULTS, themePreference: 'light', defaultNps: 1.5, look: undefined });
    const { settings, migrated } = readSettings(old, DEFAULTS);
    expect(migrated).toBe(true);
    expect(settings.themePreference).toBe('dark');
    expect(settings.look).toBe(LOOK);
  });

  test('moving the theme touches nothing else that was stored', () => {
    const old = JSON.stringify({
      themePreference: 'light',
      unitSystem: 'metric',
      defaultNps: 1.5,
      stockLength: 252,
      cutAllowance: 0.0625,
    });
    const { settings } = readSettings(old, DEFAULTS);
    expect(settings.unitSystem).toBe('metric');
    expect(settings.defaultNps).toBe(1.5);
    expect(settings.stockLength).toBe(252);
    expect(settings.cutAllowance).toBe(0.0625);
  });

  test('once stamped, a daylight choice is a real choice and is kept', () => {
    const chosen = JSON.stringify({ ...DEFAULTS, themePreference: 'light', look: LOOK });
    const { settings, migrated } = readSettings(chosen, DEFAULTS);
    expect(migrated).toBe(false);
    expect(settings.themePreference).toBe('light');
  });

  test('match-phone, once chosen under this look, is kept too', () => {
    const chosen = JSON.stringify({ ...DEFAULTS, themePreference: 'system', look: LOOK });
    expect(readSettings(chosen, DEFAULTS).settings.themePreference).toBe('system');
  });

  test('rubbish in storage falls back to the defaults rather than failing the launch', () => {
    for (const raw of ['{not json', '[]', 'null', '42', '"text"']) {
      expect(readSettings(raw, DEFAULTS)).toEqual({ settings: DEFAULTS, migrated: false });
    }
  });
});
