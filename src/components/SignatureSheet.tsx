import React, { useMemo, useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { AccentButton, GhostButton } from './Buttons';
import { Pt, SIG_H, SIG_W, decodeSig, encodeSig, strokePath } from '../calc/signature';

/**
 * A signature, drawn with a finger, in a sheet of its own.
 *
 * Its own sheet rather than a box on the form, because a box on a scrolling
 * page is a box the page scrolls under the finger, and a signature drawn while
 * the page moves is not the signature. Here nothing moves but the pen.
 *
 * Touches are read as page positions less the pad's corner, never as
 * positions inside the view: on Android those are measured from whatever the
 * finger is over, and near an edge that is not the pad.
 */
export function SignatureSheet({
  visible,
  title,
  name,
  onCancel,
  onDone,
}: {
  visible: boolean;
  /** What the signature is for: "Examined by (QC)". */
  title: string;
  /** Who is signing, printed under the line. */
  name: string;
  onCancel: () => void;
  onDone: (sig: string) => void;
}) {
  const t = useTheme();
  const { width: winW, height: winH } = useWindowDimensions();
  const w = Math.min(winW - t.layout.screenPadding * 2, 720);
  const h = Math.min(Math.round((w * SIG_H) / SIG_W), Math.round(winH * 0.45));
  const scale = SIG_W / w;

  const [strokes, setStrokes] = useState<Pt[][]>([]);
  const [, setTick] = useState(0);
  const live = useRef<Pt[] | null>(null);
  const finger = useRef<string | null>(null);
  const origin = useRef<Pt>([0, 0]);
  const size = useRef({ w, h });
  size.current = { w, h };

  const clampPt = (x: number, y: number): Pt => [Math.min(size.current.w, Math.max(0, x)), Math.min(size.current.h, Math.max(0, y))];

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const ne = e.nativeEvent;
          origin.current = [ne.pageX - ne.locationX, ne.pageY - ne.locationY];
          finger.current = String(ne.identifier ?? 0);
          live.current = [clampPt(ne.locationX, ne.locationY)];
          setTick((n) => n + 1);
        },
        onPanResponderMove: (e) => {
          if (!live.current) return;
          const f = e.nativeEvent.touches.find((x) => String(x.identifier ?? 0) === finger.current) ?? e.nativeEvent.touches[0];
          if (!f) return;
          const p = clampPt(f.pageX - origin.current[0], f.pageY - origin.current[1]);
          const last = live.current[live.current.length - 1]!;
          if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.5) return;
          live.current.push(p);
          setTick((n) => n + 1);
        },
        onPanResponderRelease: () => {
          const done = live.current;
          live.current = null;
          finger.current = null;
          if (done?.length) setStrokes((s) => [...s, done]);
        },
        onPanResponderTerminate: () => {
          live.current = null;
          finger.current = null;
          setTick((n) => n + 1);
        },
      }),
    [],
  );

  const all = live.current ? [...strokes, live.current] : strokes;
  const d = all.map(strokePath).join('');
  const ink = '#111';
  const close = () => {
    setStrokes([]);
    live.current = null;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} supportedOrientations={['portrait', 'landscape']}>
      <View style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: w + t.space.lg * 2, backgroundColor: t.colors.bgRaised, borderRadius: t.radius.lg, padding: t.space.lg, gap: t.space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
            <Ionicons name="create-outline" size={19} color={t.colors.textMuted} />
            <Text style={[t.type.bodyStrong, { color: t.colors.text, flex: 1 }]} numberOfLines={1}>
              {title}
            </Text>
            <Pressable onPress={() => { close(); onCancel(); }} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cancel signing">
              <Ionicons name="close" size={22} color={t.colors.textMuted} />
            </Pressable>
          </View>

          {/* Paper is white whatever the theme: it is what the signature prints on. */}
          <View
            {...pan.panHandlers}
            accessibilityLabel={`Signature pad for ${name || title}`}
            style={{ width: w, height: h, backgroundColor: '#FFFFFF', borderRadius: t.radius.md, overflow: 'hidden' }}
          >
            <Svg width={w} height={h} pointerEvents="none">
              <Line x1={w * 0.06} y1={h * 0.78} x2={w * 0.94} y2={h * 0.78} stroke="#B8B8B8" strokeWidth={1} />
              <Path d={`M${w * 0.06} ${h * 0.62}l${h * 0.1} ${h * 0.1}m0 -${h * 0.1}l-${h * 0.1} ${h * 0.1}`} stroke="#B8B8B8" strokeWidth={1.4} />
              {d ? <Path d={d} stroke={ink} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
            </Svg>
          </View>
          <Text style={[t.type.caption, { color: t.colors.textMuted }]} numberOfLines={1}>
            {name ? `${name} — sign above the line` : 'Sign above the line'}
          </Text>

          <View style={{ flexDirection: 'row', gap: t.space.md }}>
            <GhostButton label="Clear" icon="refresh-outline" style={{ flex: 1 }} onPress={() => setStrokes([])} />
            <AccentButton
              label="Done"
              icon="checkmark"
              style={{ flex: 1 }}
              onPress={() => {
                const sig = encodeSig(strokes.map((s) => s.map(([x, y]) => [x * scale, y * scale] as Pt)));
                close();
                if (decodeSig(sig).length) onDone(sig);
                else onCancel();
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** A kept signature, drawn small: on the form beside the name. */
export function SignatureView({ sig, height = 44 }: { sig: string; height?: number }) {
  const d = useMemo(() => decodeSig(sig).map(strokePath).join(''), [sig]);
  if (!d) return null;
  const width = (height * SIG_W) / SIG_H;
  return (
    <View style={{ width, height, backgroundColor: '#FFFFFF', borderRadius: 6 }}>
      <Svg width={width} height={height} viewBox={`0 0 ${SIG_W} ${SIG_H}`}>
        <Path d={d} stroke="#111" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
