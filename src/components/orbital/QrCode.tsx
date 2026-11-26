import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import qrcode from 'qrcode-generator';

// A code drawn as a QR: black on white whatever the theme (a scanner reads
// dark on light), with the four-module quiet margin a reader needs round it.
// Error correction L, the lightest: the code carries its own checksum, and
// the fewer the modules the larger each one is on the screen.

export function qrMatrix(text: string): boolean[][] {
  const qr = qrcode(0, 'L');
  qr.addData(text, 'Byte');
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

export function QrCode({ text, size }: { text: string; size: number }) {
  const { path, total } = useMemo(() => {
    const m = qrMatrix(text);
    const quiet = 4;
    let d = '';
    m.forEach((row, r) => {
      // Each run of dark modules in a row as one rectangle: a far shorter path than one per module.
      let c = 0;
      while (c < row.length) {
        if (!row[c]) {
          c += 1;
          continue;
        }
        const start = c;
        while (c < row.length && row[c]) c += 1;
        d += `M${start + quiet} ${r + quiet}h${c - start}v1h${start - c}z`;
      }
    });
    return { path: d, total: m.length + quiet * 2 };
  }, [text]);
  return (
    <View style={{ width: size, height: size, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 8 }} accessible accessibilityRole="image" accessibilityLabel="Program code, as a QR">
      <Svg width={size} height={size} viewBox={`0 0 ${total} ${total}`}>
        <Rect x={0} y={0} width={total} height={total} fill="#fff" />
        <Path d={path} fill="#000" />
      </Svg>
    </View>
  );
}
