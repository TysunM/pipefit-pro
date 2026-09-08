import React from 'react';
import { G } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { DIAGRAM_H, DIAGRAM_W, Frame } from './Frame';
import { AngleMark, Dim, Guide, Pipe, Pt, Wedge, beyond, fit } from './primitives';

export function OffsetDiagram({
  run,
  offset,
  angleLabel,
  offsetLabel,
  runLabel,
  travelLabel,
  cutLabel,
}: {
  run: number;
  offset: number;
  angleLabel: string;
  offsetLabel: string;
  runLabel: string;
  travelLabel: string;
  cutLabel: string;
}) {
  const t = useTheme();
  if (!Number.isFinite(run) || !Number.isFinite(offset) || offset <= 0) return null;

  const lead = Math.max(run, offset) * 0.32;
  const a: Pt = { x: 0, y: offset };
  const b: Pt = { x: lead, y: offset };
  const c: Pt = { x: lead + run, y: 0 };
  const d: Pt = { x: lead * 2 + run, y: 0 };

  const project = fit([a, b, c, d], DIAGRAM_W, DIAGRAM_H, 62);
  const [A, B, C, D] = [project(a), project(b), project(c), project(d)];

  return (
    <Frame>
      <G>
        <Guide from={{ x: A.x, y: B.y }} to={{ x: D.x, y: B.y }} t={t} />
        <Guide from={{ x: A.x, y: C.y }} to={{ x: D.x, y: C.y }} t={t} />
        <Guide from={{ x: B.x, y: B.y }} to={{ x: B.x, y: C.y }} t={t} />
        <Guide from={{ x: C.x, y: B.y }} to={{ x: C.x, y: C.y }} t={t} />

        <Pipe points={[A, B, C, D]} t={t} od={16} />

        <Wedge vertex={B} a={beyond(B, A)} b={C} t={t} radius={28} />
        <AngleMark vertex={B} a={beyond(B, A)} b={C} label={angleLabel} t={t} radius={28} />

        <Dim from={B} to={C} label={`Travel ${travelLabel}`} t={t} color={t.colors.text} offset={54} />
        <Dim from={B} to={C} label={`Cut ${cutLabel}`} t={t} color={t.colors.data} offset={-32} />
        <Dim from={{ x: B.x, y: B.y }} to={{ x: C.x, y: B.y }} label={`Run ${runLabel}`} t={t} offset={46} />
        <Dim from={{ x: C.x, y: B.y }} to={{ x: C.x, y: C.y }} label={offsetLabel} t={t} offset={42} />
      </G>
    </Frame>
  );
}
