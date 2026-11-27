import React, { forwardRef } from 'react';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import type { Art, Face, Prim } from './certArt';

// The certificate picture drawn with react-native-svg: on the phone this is
// what is turned into a PNG (Svg's toDataURL, already in the app's build).

export type Fonts = Record<Face, string>;

function draw(p: Prim, fonts: Fonts, key: string): React.ReactNode {
  switch (p.k) {
    case 'rect':
      return <Rect key={key} x={p.x} y={p.y} width={p.w} height={p.h} rx={p.rx} fill={p.fill ?? 'none'} stroke={p.stroke} strokeWidth={p.sw} strokeDasharray={p.dash?.join(' ')} />;
    case 'circle':
      return <Circle key={key} cx={p.cx} cy={p.cy} r={p.r} fill={p.fill ?? 'none'} stroke={p.stroke} strokeWidth={p.sw} strokeDasharray={p.dash?.join(' ')} />;
    case 'line':
      return <Line key={key} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={p.stroke} strokeWidth={p.sw} />;
    case 'text':
      return (
        <SvgText
          key={key}
          x={p.x}
          y={p.y}
          fill={p.color}
          fontSize={p.size}
          fontFamily={fonts[p.face]}
          textAnchor={p.anchor}
          letterSpacing={p.spacing}
          textDecoration={p.strike ? 'line-through' : undefined}
        >
          {p.text}
        </SvgText>
      );
    case 'group':
      return (
        <G key={key} rotation={p.rotate} origin={`${p.cx}, ${p.cy}`}>
          {p.children.map((c, i) => draw(c, fonts, `${key}.${i}`))}
        </G>
      );
  }
}

/** Drawn at `width` on screen; its PNG is made at the art's own size. */
export const CertArtSvg = forwardRef<Svg, { art: Art; fonts: Fonts; width: number }>(function CertArtSvg({ art, fonts, width }, ref) {
  return (
    <Svg ref={ref} width={width} height={(width * art.h) / art.w} viewBox={`0 0 ${art.w} ${art.h}`}>
      {art.prims.map((p, i) => draw(p, fonts, String(i)))}
    </Svg>
  );
});
