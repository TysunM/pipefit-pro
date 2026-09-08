import React from 'react';
import { G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { DIAGRAM_H, DIAGRAM_W, Frame } from './Frame';
import { Dim, Guide, Pipe, Pt, Tick, fit } from './primitives';

function walk(path: Pt[], distance: number): Pt {
  let travelled = 0;
  for (let i = 1; i < path.length; i += 1) {
    const seg = Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.y - path[i - 1]!.y);
    if (travelled + seg >= distance) {
      const k = seg === 0 ? 0 : (distance - travelled) / seg;
      return {
        x: path[i - 1]!.x + (path[i]!.x - path[i - 1]!.x) * k,
        y: path[i - 1]!.y + (path[i]!.y - path[i - 1]!.y) * k,
      };
    }
    travelled += seg;
  }
  return path[path.length - 1]!;
}

export function SaddleDiagram({
  marks,
  depth,
  width,
  distance,
  angleDeg,
  type,
  depthLabel,
}: {
  marks: number[];
  depth: number;
  width: number;
  distance: number;
  angleDeg: number;
  type: 'three' | 'four';
  depthLabel: string;
}) {
  const t = useTheme();
  if (!marks.length || !Number.isFinite(depth) || depth <= 0 || !Number.isFinite(angleDeg) || angleDeg <= 0) return null;

  const horiz = depth / Math.tan((angleDeg * Math.PI) / 180);
  const w = type === 'four' ? (Number.isFinite(width) && width > 0 ? width : depth) : depth * 0.9;

  const full: Pt[] =
    type === 'three'
      ? [
          { x: 0, y: 0 },
          { x: distance - horiz, y: 0 },
          { x: distance, y: -depth },
          { x: distance + horiz, y: 0 },
          { x: distance + horiz + depth * 4, y: 0 },
        ]
      : [
          { x: 0, y: 0 },
          { x: distance - horiz, y: 0 },
          { x: distance, y: -depth },
          { x: distance + w, y: -depth },
          { x: distance + w + horiz, y: 0 },
          { x: distance + w + horiz + depth * 4, y: 0 },
        ];

  const markPts = marks.map((m) => walk(full, m));
  const obstacle =
    type === 'three'
      ? { x: distance - w / 2, w }
      : { x: distance, w };

  const bendStart = full[1]!.x;
  const bendEnd = full[full.length - 2]!.x;
  const lead = Math.max(depth * 1.6, (bendEnd - bendStart) * 0.14);
  const drawStart = Math.max(0, bendStart - lead);
  const truncated = drawStart > 0.01;

  const draw: Pt[] = [{ x: drawStart, y: 0 }, ...full.slice(1, -1), { x: bendEnd + lead, y: 0 }];

  const bounds: Pt[] = [
    ...draw,
    ...markPts,
    { x: obstacle.x, y: -depth },
    { x: obstacle.x + obstacle.w, y: 0 },
  ];
  const p = fit(bounds, DIAGRAM_W, DIAGRAM_H, 52);
  const drawn = draw.map(p);
  const oTL = p({ x: obstacle.x, y: -depth });
  const oBR = p({ x: obstacle.x + obstacle.w, y: 0 });
  const base = p({ x: drawStart, y: 0 }).y;

  return (
    <Frame>
      <G>
        <Rect
          x={oTL.x}
          y={oTL.y}
          width={Math.max(oBR.x - oTL.x, 8)}
          height={Math.max(oBR.y - oTL.y, 8)}
          fill={t.colors.accent}
          opacity={0.13}
          rx={2}
        />
        <Rect
          x={oTL.x}
          y={oTL.y}
          width={Math.max(oBR.x - oTL.x, 8)}
          height={Math.max(oBR.y - oTL.y, 8)}
          fill="none"
          stroke={t.colors.accent}
          strokeWidth={1.2}
          strokeDasharray="4 3"
          rx={2}
        />
        <SvgText
          x={(oTL.x + oBR.x) / 2}
          y={base + 26}
          fontSize={9.5}
          fontWeight="700"
          fill={t.colors.accent}
          textAnchor="middle"
        >
          OBSTRUCTION
        </SvgText>

        <Guide from={{ x: drawn[0]!.x, y: base }} to={{ x: drawn[drawn.length - 1]!.x, y: base }} t={t} />
        <Pipe points={drawn} t={t} od={13} />

        {truncated ? (
          <Path
            d={`M${drawn[0]!.x + 4},${base - 11} l-7,5 l7,5 l-7,5`}
            fill="none"
            stroke={t.colors.textFaint}
            strokeWidth={1.6}
          />
        ) : null}

        {markPts.map((m, i) => (
          <Tick key={i} at={p(m)} label={String(i + 1)} t={t} />
        ))}

        <Dim
          from={{ x: oTL.x, y: base }}
          to={{ x: oTL.x, y: oTL.y }}
          label={depthLabel}
          t={t}
          offset={-26}
        />
      </G>
    </Frame>
  );
}
