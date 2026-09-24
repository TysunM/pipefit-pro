import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';

/**
 * A flange face, seen square on, with as many holes as the flange has.
 *
 * So a row of sizes reads as a row of flanges: the eye counts holes long
 * before it reads a fraction. Nothing here is to scale but the count.
 */
export function FlangeIcon({ bolts, size = 34, active = false }: { bolts: number; size?: number; active?: boolean }) {
  const t = useTheme();
  const c = size / 2;
  const rOd = c - 1.5;
  const rBc = rOd * 0.72;
  const rBore = rOd * 0.38;
  const hole = Math.max(1.4, Math.min(2.6, (2 * Math.PI * rBc) / bolts / 3.2));
  const ink = active ? t.colors.onPrimary : t.colors.text;
  return (
    <Svg width={size} height={size}>
      <Circle cx={c} cy={c} r={rOd} fill="none" stroke={ink} strokeWidth={1.6} />
      <Circle cx={c} cy={c} r={rBore} fill="none" stroke={ink} strokeWidth={1.2} />
      {Array.from({ length: bolts }, (_, i) => {
        const a = (i / bolts) * 2 * Math.PI - Math.PI / 2;
        return <Circle key={i} cx={c + rBc * Math.cos(a)} cy={c + rBc * Math.sin(a)} r={hole} fill={ink} />;
      })}
    </Svg>
  );
}
