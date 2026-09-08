import React from 'react';
import { G } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { DIAGRAM_H, DIAGRAM_W, Frame } from './Frame';
import { AngleMark, Dim, Guide, Pipe, Pt, Wedge, beyond, fit } from './primitives';

export function BenderDiagram({
  angleDeg,
  radius,
  setbackLabel,
  arcLabel,
  angleLabel,
}: {
  angleDeg: number;
  radius: number;
  setbackLabel: string;
  arcLabel: string;
  angleLabel: string;
}) {
  const t = useTheme();
  if (!Number.isFinite(angleDeg) || !Number.isFinite(radius) || radius <= 0 || angleDeg <= 0 || angleDeg >= 180)
    return null;

  const a = (angleDeg * Math.PI) / 180;
  const tan = radius * Math.tan(a / 2);
  const lead = Math.max(radius * 0.85, tan * 0.6);

  const pi: Pt = { x: 0, y: 0 };
  const tanIn: Pt = { x: -tan, y: 0 };
  const tanOut: Pt = { x: tan * Math.cos(a), y: -tan * Math.sin(a) };
  const start: Pt = { x: -tan - lead, y: 0 };
  const end: Pt = { x: (tan + lead) * Math.cos(a), y: -(tan + lead) * Math.sin(a) };
  const center: Pt = { x: -tan, y: -radius };

  const all = [start, tanIn, pi, tanOut, end, center];
  const p = fit(all, DIAGRAM_W, DIAGRAM_H, 54);
  const S = p(start);
  const TI = p(tanIn);
  const PI_ = p(pi);
  const TO = p(tanOut);
  const E = p(end);
  const C = p(center);
  const rPix = Math.hypot(TI.x - C.x, TI.y - C.y);


  return (
    <Frame>
      <G>
        <Guide from={TI} to={PI_} t={t} />
        <Guide from={PI_} to={TO} t={t} />

        <Pipe points={[S, PI_, E]} t={t} od={16} elbowRadius={rPix} />

        <Wedge vertex={PI_} a={beyond(PI_, TI)} b={TO} t={t} radius={28} />
        <AngleMark vertex={PI_} a={beyond(PI_, TI)} b={TO} label={angleLabel} t={t} radius={28} />
        <Dim from={TI} to={PI_} label={`Setback ${setbackLabel}`} t={t} offset={30} />
        <Dim from={TI} to={TO} label={`Arc ${arcLabel}`} t={t} color={t.colors.data} offset={-34} />
      </G>
    </Frame>
  );
}
