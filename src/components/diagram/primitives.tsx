import React, { useId } from 'react';
import {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
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

export type PipeShade = { edge: string; mid: string; light: string; deep: string };

export function pipeShades(t: Theme): { steel: PipeShade; elbow: PipeShade; bore: string; rim: string } {
  return t.mode === 'dark'
    ? {
        steel: { edge: '#33474F', mid: '#54707C', light: '#95B2C1', deep: '#1F2E35' },
        elbow: { edge: '#2E6C9C', mid: '#4A8FC4', light: '#A8D2EE', deep: '#1B4A6E' },
        bore: '#080D11',
        rim: '#6D8A99',
      }
    : {
        steel: { edge: '#7E9099', mid: '#BAC7CF', light: '#F4F8FA', deep: '#5E7079' },
        elbow: { edge: '#4187BE', mid: '#6FADDD', light: '#E2F1FC', deep: '#2A6396' },
        bore: '#41525C',
        rim: '#5E7079',
      };
}

const norm = (a: Pt, b: Pt): Pt => {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.x - a.x) / d, y: (b.y - a.y) / d };
};

type Straight = { a: Pt; b: Pt };
type Fillet = { a: Pt; b: Pt; c: Pt; r: number; sweep: number };

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

    const px = u2.x - dot * u1.x;
    const py = u2.y - dot * u1.y;
    const pl = Math.hypot(px, py) || 1;
    const c = { x: a.x + (px / pl) * r, y: a.y + (py / pl) * r };

    straights.push({ a: cursor, b: a });
    fillets.push({ a, b, c, r, sweep: cross > 0 ? 1 : 0 });
    cursor = b;
  }

  straights.push({ a: cursor, b: points[points.length - 1]! });
  return { straights, fillets };
}

const cylinderStops = (s: PipeShade) => [
  <Stop key="0" offset="0" stopColor={s.edge} />,
  <Stop key="1" offset="0.16" stopColor={s.mid} />,
  <Stop key="2" offset="0.4" stopColor={s.light} />,
  <Stop key="3" offset="0.66" stopColor={s.mid} />,
  <Stop key="4" offset="1" stopColor={s.deep} />,
];

export function Pipe({
  points,
  t,
  od = 16,
  elbowRadius,
  openEnds = true,
}: {
  points: Pt[];
  t: Theme;
  od?: number;
  elbowRadius?: number;
  openEnds?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const sh = pipeShades(t);
  const r = od / 2;
  const bend = elbowRadius ?? od * 1.6;
  const { straights, fillets } = buildRun(points, bend);

  return (
    <G>
      <Defs>
        {straights.map((sg, i) => {
          const u = norm(sg.a, sg.b);
          const n = { x: -u.y, y: u.x };
          return (
            <LinearGradient
              key={`gs${i}`}
              id={`${uid}s${i}`}
              gradientUnits="userSpaceOnUse"
              x1={sg.a.x + n.x * r}
              y1={sg.a.y + n.y * r}
              x2={sg.a.x - n.x * r}
              y2={sg.a.y - n.y * r}
            >
              {cylinderStops(sh.steel)}
            </LinearGradient>
          );
        })}
        {fillets.map((f, i) => {
          const outer = f.r + r;
          return (
            <RadialGradient
              key={`gf${i}`}
              id={`${uid}f${i}`}
              gradientUnits="userSpaceOnUse"
              cx={f.c.x}
              cy={f.c.y}
              rx={outer}
              ry={outer}
              fx={f.c.x}
              fy={f.c.y}
            >
              <Stop offset={Math.max(0, (f.r - r) / outer)} stopColor={sh.elbow.edge} />
              <Stop offset={Math.max(0, (f.r - r * 0.3) / outer)} stopColor={sh.elbow.light} />
              <Stop offset={(f.r + r * 0.25) / outer} stopColor={sh.elbow.mid} />
              <Stop offset="1" stopColor={sh.elbow.deep} />
            </RadialGradient>
          );
        })}
      </Defs>

      {straights.map((sg, i) => {
        const u = norm(sg.a, sg.b);
        const n = { x: -u.y, y: u.x };
        const p1 = { x: sg.a.x + n.x * r, y: sg.a.y + n.y * r };
        const p2 = { x: sg.b.x + n.x * r, y: sg.b.y + n.y * r };
        const p3 = { x: sg.b.x - n.x * r, y: sg.b.y - n.y * r };
        const p4 = { x: sg.a.x - n.x * r, y: sg.a.y - n.y * r };
        return (
          <G key={`s${i}`}>
            <Path
              d={`M${p1.x},${p1.y} L${p2.x},${p2.y} L${p3.x},${p3.y} L${p4.x},${p4.y} Z`}
              fill={`url(#${uid}s${i})`}
            />
            <Line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={sh.rim} strokeWidth={0.8} />
            <Line x1={p4.x} y1={p4.y} x2={p3.x} y2={p3.y} stroke={sh.rim} strokeWidth={0.8} />
          </G>
        );
      })}

      {fillets.map((f, i) => {
        const inner = f.r - r;
        const outer = f.r + r;
        const a1 = Math.atan2(f.a.y - f.c.y, f.a.x - f.c.x);
        const a2 = Math.atan2(f.b.y - f.c.y, f.b.x - f.c.x);
        const pt = (rad: number, ang: number) => ({ x: f.c.x + rad * Math.cos(ang), y: f.c.y + rad * Math.sin(ang) });
        const oA = pt(outer, a1);
        const oB = pt(outer, a2);
        const iB = pt(inner, a2);
        const iA = pt(inner, a1);
        const sweep = f.sweep;
        const rev = sweep === 1 ? 0 : 1;
        return (
          <G key={`f${i}`}>
            <Path
              d={`M${oA.x},${oA.y} A${outer},${outer} 0 0 ${sweep} ${oB.x},${oB.y} L${iB.x},${iB.y} A${inner},${inner} 0 0 ${rev} ${iA.x},${iA.y} Z`}
              fill={`url(#${uid}f${i})`}
            />
            <Path
              d={`M${oA.x},${oA.y} A${outer},${outer} 0 0 ${sweep} ${oB.x},${oB.y}`}
              fill="none"
              stroke={sh.rim}
              strokeWidth={0.8}
            />
            <Path
              d={`M${iA.x},${iA.y} A${inner},${inner} 0 0 ${sweep} ${iB.x},${iB.y}`}
              fill="none"
              stroke={sh.rim}
              strokeWidth={0.8}
            />
          </G>
        );
      })}

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

export function Bore({ at, towards, od, t }: { at: Pt; towards: Pt; od: number; t: Theme }) {
  const sh = pipeShades(t);
  const ang = (Math.atan2(towards.y - at.y, towards.x - at.x) * 180) / Math.PI;
  return (
    <G transform={`rotate(${ang} ${at.x} ${at.y})`}>
      <Ellipse cx={at.x} cy={at.y} rx={od * 0.19} ry={od / 2} fill={sh.steel.mid} stroke={sh.rim} strokeWidth={0.8} />
      <Ellipse cx={at.x} cy={at.y} rx={od * 0.19 * 0.6} ry={(od / 2) * 0.6} fill={sh.bore} />
    </G>
  );
}

export function WeldRing({ at, along, od, t }: { at: Pt; along: Pt; od: number; t: Theme }) {
  const ang = (Math.atan2(along.y - at.y, along.x - at.x) * 180) / Math.PI;
  return (
    <G transform={`rotate(${ang} ${at.x} ${at.y})`}>
      <Ellipse cx={at.x} cy={at.y} rx={od * 0.1} ry={od / 2} fill="none" stroke={t.colors.accent} strokeWidth={1.2} />
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
