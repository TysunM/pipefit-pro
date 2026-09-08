import React from 'react';
import { G, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { DIAGRAM_H, DIAGRAM_W, Frame } from './Frame';
import { Dim, Pt, fit, pipeShades } from './primitives';

export function MiterDiagram({
  totalAngle,
  segments,
  radius,
  od,
  cutLabel,
  throatLabel,
  backLabel,
}: {
  totalAngle: number;
  segments: number;
  radius: number;
  od: number;
  cutLabel: string;
  throatLabel: string;
  backLabel: string;
}) {
  const t = useTheme();
  if (!Number.isFinite(totalAngle) || segments < 2 || !Number.isFinite(radius) || radius <= od / 2) return null;

  const total = (totalAngle * Math.PI) / 180;
  const cuts = segments - 1;
  const step = total / cuts;
  const rIn = radius - od / 2;
  const rOut = radius + od / 2;

  const faces: { inner: Pt; outer: Pt }[] = [];
  for (let i = 0; i <= cuts; i += 1) {
    const ang = -Math.PI / 2 + i * step;
    faces.push({
      inner: { x: rIn * Math.cos(ang), y: rIn * Math.sin(ang) },
      outer: { x: rOut * Math.cos(ang), y: rOut * Math.sin(ang) },
    });
  }

  const all = faces.flatMap((f) => [f.inner, f.outer]);
  const p = fit(all, DIAGRAM_W, DIAGRAM_H, 56);
  const proj = faces.map((f) => ({ inner: p(f.inner), outer: p(f.outer) }));
  const sh = pipeShades(t);

  return (
    <Frame>
      <G>
        {proj.slice(0, -1).map((f, i) => {
          const n = proj[i + 1]!;
          return (
            <Polygon
              key={i}
              points={`${f.inner.x},${f.inner.y} ${f.outer.x},${f.outer.y} ${n.outer.x},${n.outer.y} ${n.inner.x},${n.inner.y}`}
              fill={i % 2 === 0 ? sh.steel.mid : sh.steel.light}
              stroke={sh.steel.edge}
              strokeWidth={1}
            />
          );
        })}
        {proj.map((f, i) => (
          <Line
            key={`c${i}`}
            x1={f.inner.x}
            y1={f.inner.y}
            x2={f.outer.x}
            y2={f.outer.y}
            stroke={i === 0 || i === proj.length - 1 ? t.colors.text : t.colors.accent}
            strokeWidth={i === 0 || i === proj.length - 1 ? 1.4 : 2.2}
          />
        ))}

        <Dim from={proj[0]!.inner} to={proj[1]!.inner} label={`Throat ${throatLabel}`} t={t} color={t.colors.data} offset={-30} />
        <Dim from={proj[0]!.outer} to={proj[1]!.outer} label={`Back ${backLabel}`} t={t} offset={32} />
        <SvgText
          x={DIAGRAM_W / 2}
          y={22}
          fontSize={10.5}
          fontWeight="700"
          fill={t.colors.accent}
          textAnchor="middle"
        >
          {`${segments} SEGMENTS · ${cuts} CUTS AT ${cutLabel}`}
        </SvgText>
      </G>
    </Frame>
  );
}
