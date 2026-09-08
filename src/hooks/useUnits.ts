import { useCallback, useMemo } from 'react';
import { useSettings } from '../state/settings';
import { fromInches, toInches, unitLabel, unitSuffix, convertWeight, weightLabel } from '../calc/units';
import { angle, decimal, parseNumber, toFraction } from '../calc/format';

export function useUnits() {
  const { settings } = useSettings();
  const system = settings.unitSystem;
  const denominator = settings.fractionDenominator;

  const parse = useCallback((raw: string) => toInches(parseNumber(raw), system), [system]);

  const num = useCallback(
    (inches: number, places?: number) => {
      if (!Number.isFinite(inches)) return '—';
      const p = places ?? (system === 'metric' ? 1 : 2);
      return fromInches(inches, system).toFixed(p);
    },
    [system]
  );

  const full = useCallback(
    (inches: number, places?: number) => (Number.isFinite(inches) ? `${num(inches, places)} ${unitLabel(system)}` : '—'),
    [num, system]
  );

  const frac = useCallback(
    (inches: number) => {
      if (system !== 'imperial' || !denominator || !Number.isFinite(inches)) return '';
      if (Math.abs(inches - Math.round(inches)) < 1e-9) return '';
      return toFraction(inches, denominator);
    },
    [system, denominator]
  );

  const dual = useCallback(
    (inches: number, places?: number) => {
      const base = num(inches, places);
      const f = frac(inches);
      return f ? `${base}  ·  ${f}` : base;
    },
    [num, frac]
  );

  const weight = useCallback(
    (lb: number, places = 2) =>
      Number.isFinite(lb) ? `${convertWeight(lb, system).toFixed(places)} ${weightLabel(system)}` : '—',
    [system]
  );

  return useMemo(
    () => ({
      system,
      denominator,
      suffix: unitSuffix(system),
      unitName: unitLabel(system),
      parse,
      num,
      full,
      frac,
      dual,
      weight,
      angle,
      decimal,
    }),
    [system, denominator, parse, num, full, frac, dual, weight]
  );
}
