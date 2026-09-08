import React from 'react';
import { Circle, G, Line, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { Theme } from '../../theme/ThemeProvider';

export type Pt = { x: number; y: number };

export const ARROW = 7;

export function fit(points: Pt[], width: number, height: number, pad: number) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
  const offX = pad + (width - pad * 2 - spanX * scale) / 2 - minX * scale;
  const offY = pad + (height - pad * 2 - spanY * scale) / 2 - minY * scale;
  return (p: Pt): Pt => ({ x: p.x * scale + offX, y: p.y * scale + offY });
}

export function Pipe({ points, t, od = 13 }: { points: Pt[]; t: Theme; od?: number }) {
  const d = points.map((p) => `${p.x},${p.y}`).join(' ');
  return (
    <G>
      <Polyline
        points={d}
        fill="none"
        stroke={t.colors.borderStrong}
        strokeWidth={od}
        strokeLinejoin="round"
        strokeLinecap="butt"
      />
      <Polyline
        points={d}
        fill="none"
        stroke={t.mode === 'dark' ? '#5C7A8C' : '#B7C4CC'}
        strokeWidth={od - 3}
        strokeLinejoin="round"
        strokeLinecap="butt"
      />
      <Polyline
        points={d}
        fill="none"
        stroke={t.colors.textFaint}
        strokeWidth={0.8}
        strokeLinejoin="round"
        strokeDasharray="4 4"
        opacity={0.55}
      />
    </G>
  );
}

export function Elbow({ at, t, od = 13 }: { at: Pt; t: Theme; od?: number }) {
  return <Circle cx={at.x} cy={at.y} r={od / 2} fill={t.colors.data} opacity={0.9} />;
}

function arrowHead(from: Pt, to: Pt, color: string, key: string) {
  const a = Math.atan2(to.y - from.y, to.x - from.x);
  const w = 0.42;
  const p1 = { x: to.x - ARROW * Math.cos(a - w), y: to.y - ARROW * Math.sin(a - w) };
  const p2 = { x: to.x - ARROW * Math.cos(a + w), y: to.y - ARROW * Math.sin(a + w) };
  return <Path key={key} d={`M${to.x},${to.y} L${p1.x},${p1.y} L${p2.x},${p2.y} Z`} fill={color} />;
}

export function Dim({
  from,
  to,
  label,
  t,
  color,
  offset = 0,
  fontSize = 11,
}: {
  from: Pt;
  to: Pt;
  label: string;
  t: Theme;
  color?: string;
  offset?: number;
  fontSize?: number;
}) {
  const c = color ?? t.colors.text;
  const a = Math.atan2(to.y - from.y, to.x - from.x);
  const nx = -Math.sin(a) * offset;
  const ny = Math.cos(a) * offset;
  const f = { x: from.x + nx, y: from.y + ny };
  const s = { x: to.x + nx, y: to.y + ny };
  const mid = { x: (f.x + s.x) / 2, y: (f.y + s.y) / 2 };
  let deg = (a * 180) / Math.PI;
  if (deg > 90) deg -= 180;
  if (deg < -90) deg += 180;
  const w = label.length * fontSize * 0.56 + 8;

  return (
    <G>
      {offset !== 0 ? (
        <>
          <Line x1={from.x} y1={from.y} x2={f.x} y2={f.y} stroke={c} strokeWidth={0.7} opacity={0.45} />
          <Line x1={to.x} y1={to.y} x2={s.x} y2={s.y} stroke={c} strokeWidth={0.7} opacity={0.45} />
        </>
      ) : null}
      <Line x1={f.x} y1={f.y} x2={s.x} y2={s.y} stroke={c} strokeWidth={1.1} />
      {arrowHead(s, f, c, 'a')}
      {arrowHead(f, s, c, 'b')}
      <G transform={`rotate(${deg} ${mid.x} ${mid.y})`}>
        <Rect
          x={mid.x - w / 2}
          y={mid.y - fontSize * 0.78}
          width={w}
          height={fontSize * 1.55}
          rx={3}
          fill={t.colors.bgSubtle}
        />
        <SvgText
          x={mid.x}
          y={mid.y + fontSize * 0.37}
          fontSize={fontSize}
          fontWeight="700"
          fill={c}
          textAnchor="middle"
        >
          {label}
        </SvgText>
      </G>
    </G>
  );
}

export function beyond(vertex: Pt, from: Pt): Pt {
  return { x: 2 * vertex.x - from.x, y: 2 * vertex.y - from.y };
}

export function AngleMark({
  vertex,
  a,
  b,
  label,
  t,
  radius = 26,
}: {
  vertex: Pt;
  a: Pt;
  b: Pt;
  label: string;
  t: Theme;
  radius?: number;
}) {
  const a1 = Math.atan2(a.y - vertex.y, a.x - vertex.x);
  const a2 = Math.atan2(b.y - vertex.y, b.x - vertex.x);
  const p1 = { x: vertex.x + radius * Math.cos(a1), y: vertex.y + radius * Math.sin(a1) };
  const p2 = { x: vertex.x + radius * Math.cos(a2), y: vertex.y + radius * Math.sin(a2) };
  let delta = a2 - a1;
  while (delta <= -Math.PI) delta += Math.PI * 2;
  while (delta > Math.PI) delta -= Math.PI * 2;
  const sweep = delta > 0 ? 1 : 0;
  const midA = a1 + delta / 2;
  const lp = { x: vertex.x + (radius + 16) * Math.cos(midA), y: vertex.y + (radius + 16) * Math.sin(midA) };
  const w = label.length * 6.4 + 9;

  return (
    <G>
      <Path
        d={`M${p1.x},${p1.y} A${radius},${radius} 0 0 ${sweep} ${p2.x},${p2.y}`}
        fill="none"
        stroke={t.colors.accent}
        strokeWidth={1.4}
      />
      <Rect x={lp.x - w / 2} y={lp.y - 8} width={w} height={16} rx={3} fill={t.colors.bgSubtle} />
      <SvgText x={lp.x} y={lp.y + 4} fontSize={11} fontWeight="700" fill={t.colors.accent} textAnchor="middle">
        {label}
      </SvgText>
    </G>
  );
}

export function Guide({ from, to, t }: { from: Pt; to: Pt; t: Theme }) {
  return (
    <Line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={t.colors.textFaint}
      strokeWidth={0.9}
      strokeDasharray="5 5"
      opacity={0.7}
    />
  );
}

export function Tick({ at, label, t, color }: { at: Pt; label: string; t: Theme; color?: string }) {
  const c = color ?? t.colors.data;
  return (
    <G>
      <Line x1={at.x} y1={at.y - 13} x2={at.x} y2={at.y + 13} stroke={c} strokeWidth={1.6} />
      <Circle cx={at.x} cy={at.y - 20} r={8} fill={c} />
      <SvgText x={at.x} y={at.y - 16.5} fontSize={10} fontWeight="700" fill={t.colors.bg} textAnchor="middle">
        {label}
      </SvgText>
    </G>
  );
}
