import { useCallback, useMemo } from 'react';
import { ISO_GRID, toScreen } from '../calc/iso';
import { IsoReading, readIso } from '../calc/isoPieces';
import { formatFeetInch, parseFeetInch, type FracDen } from '../calc/ftin';
import type { PieceLabel } from '../components/sketch/IsoCanvas';
import type { SavedSketch } from '../state/sketchStore';
import { useUnits } from './useUnits';

/**
 * A sketch read as pieces of pipe, and its dimensions the way they are
 * written on an iso: feet and inches, 4' 6-1/2", or millimetres.
 */
export function useIsoPieces(sketch: SavedSketch | undefined) {
  const u = useUnits();
  const strokes = sketch?.strokes;
  const reading: IsoReading = useMemo(() => readIso((strokes ?? []).flatMap((s) => (s.kind === 'run' ? [s] : []))), [strokes]);
  const dims = useMemo(() => sketch?.dims ?? {}, [sketch?.dims]);

  const dimText = useCallback(
    (inches: number) => (u.system === 'imperial' ? formatFeetInch(inches, (u.denominator || 16) as FracDen) : `${u.num(inches, 0)} ${u.unitName}`),
    [u],
  );
  /** A typed or spoken length: inches as the fields take them, or feet and inches as written on a sheet. */
  const readLength = useCallback(
    (raw: string) => {
      const plain = u.parse(raw);
      if (Number.isFinite(plain)) return plain;
      return u.system === 'imperial' ? parseFeetInch(raw) : NaN;
    },
    [u],
  );

  /** What the paper writes by each piece; numbered when the pieces are being dimensioned. */
  const labels = useCallback(
    (numbered: boolean): PieceLabel[] =>
      reading.pieces.map((p) => {
        const d = dims[p.key];
        const fig = d ? dimText(d) : '?';
        return { key: p.key, a: toScreen(p.from, 'SW', ISO_GRID), b: toScreen(p.to, 'SW', ISO_GRID), from: p.from, to: p.to, text: numbered ? `${p.n}: ${fig}` : fig, missing: !d };
      }),
    [reading, dims, dimText],
  );

  return { reading, dims, dimText, readLength, labels };
}
