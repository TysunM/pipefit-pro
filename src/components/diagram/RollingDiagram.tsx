import React from 'react';
import { G, Polyline } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { DIAGRAM_H, DIAGRAM_W, Frame } from './Frame';
import { AngleMark, Dim, Pipe, Pt, Wedge, beyond, fit } from './primitives';

const ISO = Math.PI / 6;

function iso(run: number, roll: number, rise: number): Pt {
  return {
    x: (run - roll) * Math.cos(ISO),
    y: (run + roll) * Math.sin(ISO) - rise,
  };
}

export function RollingDiagram({
  run,
  roll,
  rise,
  angleLabel,
  runLabel,
  riseLabel,
  rollLabel,
  cutLabel,
}: {
  run: number;
  roll: number;
  rise: number;
  angleLabel: string;
  runLabel: string;
  riseLabel: string;
  rollLabel: string;
  cutLabel: string;
}) {
  const t = useTheme();
  if (![run, roll, rise].every(Number.isFinite) || run <= 0) return null;

  const R = Math.max(roll, Math.max(run, rise) * 0.12);
  const H = Math.max(rise, Math.max(run, roll) * 0.12);

  const o = iso(0, 0, 0);
  const x1 = iso(run, 0, 0);
  const z1 = iso(0, R, 0);
  const xz = iso(run, R, 0);
  const oy = iso(0, 0, H);
  const x1y = iso(run, 0, H);
  const z1y = iso(0, R, H);
  const xzy = iso(run, R, H);

  const lead = run * 0.16;
  const inlet = iso(-lead, 0, 0);
  const outlet = iso(run + lead, R, H);

  const all = [o, x1, z1, xz, oy, x1y, z1y, xzy, inlet, outlet];
  const p = fit(all, DIAGRAM_W, DIAGRAM_H, 58);
  const [O, X1, Z1, XZ, OY, X1Y, Z1Y, XZY, IN, OUT] = all.map(p) as Pt[];

  const box = (pts: Pt[], dashed: boolean) => (
    <Polyline
      points={pts.map((q) => `${q.x},${q.y}`).join(' ')}
      fill="none"
      stroke={t.colors.textFaint}
      strokeWidth={0.9}
      strokeDasharray={dashed ? '5 5' : undefined}
      opacity={dashed ? 0.55 : 0.8}
    />
  );

  return (
    <Frame>
      <G>
        {box([O!, X1!, XZ!, Z1!, O!], false)}
        {box([OY!, X1Y!, XZY!, Z1Y!, OY!], true)}
        {box([O!, OY!], true)}
        {box([X1!, X1Y!], false)}
        {box([XZ!, XZY!], false)}
        {box([Z1!, Z1Y!], true)}

        <Pipe points={[IN!, O!, XZY!, OUT!]} t={t} od={15} />

        <Wedge vertex={O!} a={beyond(O!, IN!)} b={XZY!} t={t} radius={30} />
        <AngleMark vertex={O!} a={beyond(O!, IN!)} b={XZY!} label={angleLabel} t={t} radius={30} />

        <Dim from={O!} to={XZY!} label={`Cut ${cutLabel}`} t={t} color={t.colors.data} offset={-26} />
        <Dim from={O!} to={X1!} label={`Run ${runLabel}`} t={t} offset={26} />
        <Dim from={XZ!} to={XZY!} label={riseLabel} t={t} offset={26} />
        <Dim from={X1!} to={XZ!} label={rollLabel} t={t} offset={-22} />
      </G>
    </Frame>
  );
}
