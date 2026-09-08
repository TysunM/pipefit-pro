import React from 'react';
import { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
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

export type PipeShade = { edge: string; mid: string; light: string };

export function pipeShades(t: Theme): { steel: PipeShade; elbow: PipeShade; bore: string } {
  return t.mode === 'dark'
    ? {
        steel: { edge: '#2F4552', mid: '#4E6B7C', light: '#83A2B4' },
        elbow: { edge: '#16405F', mid: '#2E6E9E', light: '#6FAEDA' },
        bore: '#0A1015',
      }
    : {
        steel: { edge: '#8FA0AB', mid: '#C3CED5', light: '#EDF2F5' },
        elbow: { edge: '#1B5E96', mid: '#3E8FD0', light: '#9ECBF0' },
        bore: '#3A4A54',
      };
}

const norm = (a: Pt, b: Pt): Pt => {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.x - a.x) / d, y: (b.y - a.y) / d };
};

type Straight = { a: Pt; b: Pt };
type Fillet = { a: Pt; b: Pt; r: number; sweep: number };

export function buildRun(points: Pt[], radius: number): { straights: Straight[]; fillets: Fillet[] } {
  const straights: Straight[] = [];
  const fillets: Fillet[] = [];
  let cursor = points[0]!;

  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1]!;
    const v = points[i]!;
    const next = points[i + 1]!;
    const u1 = norm(prev, v);
    const u2 = norm(v, next);
    const cross = u1.x * u2.y - u1.y * u2.x;
    const dot = Math.max(-1, Math.min(1, u1.x * u2.x + u1.y * u2.y));
    const theta = Math.acos(dot);

    if (theta < 0.02) continue;

    const maxT = Math.min(Math.hypot(v.x - prev.x, v.y - prev.y), Math.hypot(next.x - v.x, next.y - v.y)) * 0.46;
    const T = Math.min(radius * Math.tan(theta / 2), maxT);
    const r = T / Math.tan(theta / 2);

    const a = { x: v.x - u1.x * T, y: v.y - u1.y * T };
    const b = { x: v.x + u2.x * T, y: v.y + u2.y * T };

    straights.push({ a: cursor, b: a });
    fillets.push({ a, b, r, sweep: cross > 0 ? 1 : 0 });
    cursor = b;
  }

  straights.push({ a: cursor, b: points[points.length - 1]! });
  return { straights, fillets };
}

function Strand({ d, shade, od }: { d: string; shade: PipeShade; od: number }) {
  return (
    <G>
      <Path d={d} fill="none" stroke={shade.edge} strokeWidth={od} strokeLinecap="butt" />
      <Path d={d} fill="none" stroke={shade.mid} strokeWidth={od * 0.74} strokeLinecap="butt" />
      <Path d={d} fill="none" stroke={shade.light} strokeWidth={od * 0.26} strokeLinecap="butt" />
    </G>
  );
}

export function Bore({ at, towards, od, t }: { at: Pt; towards: Pt; od: number; t: Theme }) {
  const sh = pipeShades(t);
  const ang = (Math.atan2(towards.y - at.y, towards.x - at.x) * 180) / Math.PI;
  return (
    <G transform={`rotate(${ang} ${at.x} ${at.y})`}>
      <Ellipse cx={at.x} cy={at.y} rx={od * 0.2} ry={od / 2} fill={sh.steel.edge} />
      <Ellipse cx={at.x} cy={at.y} rx={od * 0.2 * 0.62} ry={(od / 2) * 0.62} fill={sh.bore} />
    </G>
  );
}

export function WeldRing({ at, along, od, t }: { at: Pt; along: Pt; od: number; t: Theme }) {
  const ang = (Math.atan2(along.y - at.y, along.x - at.x) * 180) / Math.PI;
  return (
    <G transform={`rotate(${ang} ${at.x} ${at.y})`}>
      <Ellipse cx={at.x} cy={at.y} rx={od * 0.12} ry={od / 2} fill="none" stroke={t.colors.accent} strokeWidth={1.3} />
    </G>
  );
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

export function Pipe({
  points,
  t,
  od = 15,
  elbowRadius,
  openEnds = true,
}: {
  points: Pt[];
  t: Theme;
  od?: number;
  elbowRadius?: number;
  openEnds?: boolean;
}) {
  const sh = pipeShades(t);
  const r = elbowRadius ?? od * 1.5;
  const { straights, fillets } = buildRun(points, r);
  const straightD = straights.map((s) => `M${s.a.x},${s.a.y} L${s.b.x},${s.b.y}`).join(' ');

  return (
    <G>
      <Strand d={straightD} shade={sh.steel} od={od} />
      {fillets.map((f, i) => (
        <Strand
          key={i}
          d={`M${f.a.x},${f.a.y} A${f.r},${f.r} 0 0 ${f.sweep} ${f.b.x},${f.b.y}`}
          shade={sh.elbow}
          od={od}
        />
      ))}
      {fillets.map((f, i) => (
        <G key={`w${i}`}>
          <WeldRing at={f.a} along={f.b} od={od} t={t} />
          <WeldRing at={f.b} along={f.a} od={od} t={t} />
        </G>
      ))}
      {openEnds && points.length > 1 ? (
        <>
          <Bore at={points[0]!} towards={points[1]!} od={od} t={t} />
          <Bore at={points[points.length - 1]!} towards={points[points.length - 2]!} od={od} t={t} />
        </>
      ) : null}
    </G>
  );
}

export function beyond(vertex: Pt, from: Pt): Pt {
  return { x: 2 * vertex.x - from.x, y: 2 * vertex.y - from.y };
}

export function Wedge({ vertex, a, b, t, radius }: { vertex: Pt; a: Pt; b: Pt; t: Theme; radius: number }) {
  const a1 = Math.atan2(a.y - vertex.y, a.x - vertex.x);
  const a2 = Math.atan2(b.y - vertex.y, b.x - vertex.x);
  let delta = a2 - a1;
  while (delta <= -Math.PI) delta += Math.PI * 2;
  while (delta > Math.PI) delta -= Math.PI * 2;
  const p1 = { x: vertex.x + radius * Math.cos(a1), y: vertex.y + radius * Math.sin(a1) };
  const p2 = { x: vertex.x + radius * Math.cos(a2), y: vertex.y + radius * Math.sin(a2) };
  return (
    <Path
      d={`M${vertex.x},${vertex.y} L${p1.x},${p1.y} A${radius},${radius} 0 0 ${delta > 0 ? 1 : 0} ${p2.x},${p2.y} Z`}
      fill={t.colors.accent}
      opacity={0.17}
    />
  );
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
