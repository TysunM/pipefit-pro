import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';

export const DIAGRAM_W = 340;
export const DIAGRAM_H = 240;

export function Frame({ children, height = DIAGRAM_H }: { children: React.ReactNode; height?: number }) {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.mode === 'dark' ? t.colors.bgSunken : '#FAFBFB',
        borderTopWidth: t.hairline,
        borderBottomWidth: t.hairline,
        borderColor: t.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: t.space.sm,
      }}
    >
      <Svg width="100%" height={height} viewBox={`0 0 ${DIAGRAM_W} ${height}`} preserveAspectRatio="xMidYMid meet">
        <Defs>
          <Pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <Path d="M20 0 L0 0 0 20" fill="none" stroke={t.colors.border} strokeWidth="0.6" opacity={0.55} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width={DIAGRAM_W} height={height} fill="url(#grid)" />
        {children}
      </Svg>
    </View>
  );
}
