import React, { useId } from 'react';
import { Defs, G, Line, LinearGradient, Polygon, Stop, Text as SvgText } from 'react-native-svg';
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
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  return (
    <Frame>
      <G>
        <Defs>
          {proj.slice(0, -1).map((f, i) => {
            const n = proj[i + 1]!;
            return (
              <LinearGradient
                key={`g${i}`}
                id={`${uid}m${i}`}
                gradientUnits="userSpaceOnUse"
                x1={(f.inner.x + n.inner.x) / 2}
                y1={(f.inner.y + n.inner.y) / 2}
                x2={(f.outer.x + n.outer.x) / 2}
                y2={(f.outer.y + n.outer.y) / 2}
              >
                <Stop offset="0" stopColor={sh.steel.edge} />
                <Stop offset="0.35" stopColor={sh.steel.light} />
                <Stop offset="0.72" stopColor={sh.steel.mid} />
                <Stop offset="1" stopColor={sh.steel.deep} />
              </LinearGradient>
            );
          })}
        </Defs>
        {proj.slice(0, -1).map((f, i) => {
          const n = proj[i + 1]!;
          return (
            <Polygon
              key={i}
              points={`${f.inner.x},${f.inner.y} ${f.outer.x},${f.outer.y} ${n.outer.x},${n.outer.y} ${n.inner.x},${n.inner.y}`}
              fill={`url(#${uid}m${i})`}
              stroke={sh.rim}
              strokeWidth={0.9}
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
