import React from 'react';
import Svg, { Circle, Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';

/** The bubble vial in the corner of the level's tile — the level's own dial, shrunk. */
export function LevelBadge({ size = 28 }: { size?: number }) {
  const t = useTheme();
  const g = t.colors.success;
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={14} cy={14} r={13} fill={g} fillOpacity={0.18} stroke={g} strokeWidth={1.4} />
      <Rect x={6} y={10.5} width={16} height={7} rx={3.5} fill="none" stroke={t.colors.text} strokeWidth={1.4} />
      <Circle cx={14} cy={14} r={2.2} fill={g} />
    </Svg>
  );
}
