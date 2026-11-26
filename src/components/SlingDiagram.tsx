import React, { useMemo, useRef } from 'react';
import { PanResponder, Platform, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import type { Band, Leg } from '../calc/sling';
import { useScrollHost } from './scrollHost';
import { endTouch } from './endTouch';

// The lift drawn: the hook, the legs at their angle, the load on its pick
// points. Each leg coloured by its angle (green, amber, red) and labelled with
// its tension. With legs of equal length the hook can be dragged up and down,
// and the angle follows it.

const W = 300;
const H = 236;
const PICK_Y = 178;
const LEG = 150;

let drawn = 0;

type Even = {
  kind: 'even';
  legs: 1 | 2 | 3 | 4;
  carrying: number;
  angle: number | null;
  band: Band | null;
  tension: string;
  load: string;
  onAngle?: (deg: number) => void;
};
type Off = {
  kind: 'off';
  a: Leg;
  b: Leg;
  tensionA: string;
  tensionB: string;
  load: string;
};

export function SlingDiagram(props: (Even | Off) & { size: number }) {
  const t = useTheme();
  const c = t.colors;
  const host = useScrollHost();
  const gid = useRef(`sling-steel-${(drawn += 1)}`).current;
  const ink = (b: Band | null) => (b === 'danger' ? c.danger : b === 'caution' ? c.warnText : b === 'fair' ? c.text : b === 'good' ? c.success : c.textFaint);
  const scale = props.size / W;
  const height = H * scale;

  const live = useRef(props);
  live.current = props;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => live.current.kind === 'even' && !!live.current.onAngle && live.current.legs > 1,
        onMoveShouldSetPanResponder: () => live.current.kind === 'even' && !!live.current.onAngle && live.current.legs > 1,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          host?.lock(true);
          setFrom(e.nativeEvent.locationY);
        },
        onPanResponderMove: (e) => setFrom(e.nativeEvent.locationY),
        onPanResponderRelease: (e) => {
          endTouch(e, Platform.OS);
          host?.lock(false);
        },
        onPanResponderTerminate: () => host?.lock(false),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [host],
  );
  function setFrom(locationY: number) {
    const p = live.current;
    if (p.kind !== 'even' || !p.onAngle) return;
    const y = locationY / (live.current.size / W);
    const s = Math.max(Math.sin((10 * Math.PI) / 180), Math.min(1, (PICK_Y - y) / LEG));
    p.onAngle(Math.round((Math.asin(s) * 180) / Math.PI));
  }

  const steel = (
    <Defs>
      <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#59636e" />
        <Stop offset="0.35" stopColor="#c3cbd4" />
        <Stop offset="0.7" stopColor="#8b97a4" />
        <Stop offset="1" stopColor="#4a535d" />
      </LinearGradient>
    </Defs>
  );
  const hookAt = (x: number, y: number) => (
    <G>
      <Line x1={x} y1={0} x2={x} y2={y - 22} stroke={c.textMuted} strokeWidth={2} />
      <Rect x={x - 9} y={y - 34} width={18} height={14} rx={3} fill={c.bgRaised} stroke={c.textMuted} strokeWidth={1.6} />
      <Path d={`M${x} ${y - 20} v8 a7 7 0 1 1 -7 7`} fill="none" stroke={c.text} strokeWidth={3.2} strokeLinecap="round" />
    </G>
  );
  const label = (x0: number, y: number, text: string, color: string) => {
    const half = text.length * 3.3 + 6;
    const x = Math.max(half + 4, Math.min(W - half - 4, x0));
    return (
      <G>
        <Rect x={x - text.length * 3.3 - 6} y={y - 10} width={text.length * 6.6 + 12} height={18} rx={9} fill={c.bg} stroke={color} strokeWidth={1.2} opacity={0.95} />
        <SvgText x={x} y={y + 3.5} fill={color} fontSize={11} fontWeight="700" textAnchor="middle">
          {text}
        </SvgText>
      </G>
    );
  };
  const load = (x1: number, x2: number, text: string) => (
    <G>
      <Rect x={x1} y={PICK_Y} width={x2 - x1} height={24} rx={6} fill={`url(#${gid})`} stroke="#3e4650" strokeWidth={1.4} />
      <SvgText x={(x1 + x2) / 2} y={PICK_Y + 16} fill="#141a21" fontSize={11} fontWeight="700" textAnchor="middle">
        {text}
      </SvgText>
    </G>
  );
  const arc = (px: number, toward: 1 | -1, a: number, color: string) => {
    const r = 26;
    const rd = (a * Math.PI) / 180;
    const ex = px + toward * r * Math.cos(rd);
    const ey = PICK_Y - r * Math.sin(rd);
    const lx = px + toward * 42 * Math.cos(rd / 2);
    const ly = PICK_Y - 42 * Math.sin(rd / 2) + 4;
    return (
      <G>
        <Line x1={px} y1={PICK_Y} x2={px + toward * (r + 8)} y2={PICK_Y} stroke={c.textFaint} strokeWidth={1} strokeDasharray="3 3" />
        <Path d={`M${px + toward * r} ${PICK_Y} A${r} ${r} 0 0 ${toward === -1 ? 1 : 0} ${ex} ${ey}`} fill="none" stroke={color} strokeWidth={1.6} />
        <SvgText x={lx} y={ly} fill={color} fontSize={11} fontWeight="700" textAnchor="middle">{`${Math.round(a)}°`}</SvgText>
      </G>
    );
  };

  let body: React.ReactNode;
  if (props.kind === 'even') {
    const a = props.legs === 1 ? 90 : (props.angle ?? 60);
    const rd = (a * Math.PI) / 180;
    const dx = LEG * Math.cos(rd);
    const hy = PICK_Y - LEG * Math.sin(rd);
    const col = ink(props.legs === 1 ? 'good' : props.band);
    const ghost = props.angle === null && props.legs > 1;
    const front = props.legs === 1 ? [150] : [150 - dx, 150 + dx];
    const back = props.legs === 3 ? [150] : props.legs === 4 ? [150 - dx * 0.55, 150 + dx * 0.55] : [];
    const half = Math.max(dx, 40) + 28;
    body = (
      <>
        {back.map((x, i) => (
          <Line
            key={`b${i}`}
            x1={150}
            y1={hy}
            x2={x}
            y2={PICK_Y - 12}
            stroke={props.carrying >= props.legs ? col : c.textFaint}
            strokeWidth={props.carrying >= props.legs ? 4 : 2.4}
            strokeDasharray={props.carrying >= props.legs ? undefined : '6 5'}
            opacity={0.55}
          />
        ))}
        {load(150 - half, 150 + half, props.load)}
        {front.map((x, i) => (
          <G key={`f${i}`}>
            <Line x1={150} y1={hy} x2={x} y2={PICK_Y} stroke={col} strokeWidth={5} strokeLinecap="round" opacity={ghost ? 0.35 : 1} />
            <Circle cx={x} cy={PICK_Y} r={4.5} fill={c.bg} stroke={col} strokeWidth={2.2} />
          </G>
        ))}
        {props.legs > 1 && !ghost ? arc(150 + dx, -1, a, col) : null}
        {hookAt(150, hy)}
        {props.onAngle && props.legs > 1 ? <Circle cx={150} cy={hy - 8} r={17} fill="none" stroke={c.glow} strokeWidth={2} strokeDasharray="4 4" /> : null}
        {!ghost && props.tension ? label(props.legs === 1 ? 196 : Math.min(236, 150 + dx / 2 + 24), Math.max(22, (hy + PICK_Y) / 2 - 18), props.tension, col) : null}
      </>
    );
  } else {
    const { a, b } = props;
    const span = Math.max(a.reach, b.reach, 1e-6);
    const hgt = Math.sqrt(a.length ** 2 - a.reach ** 2);
    const k = Math.min(118 / span, (PICK_Y - 28) / hgt);
    const ax = 150 - a.reach * k;
    const bx = 150 + b.reach * k;
    const hy = PICK_Y - hgt * k;
    const ca = ink(a.slack ? null : a.band);
    const cb = ink(b.slack ? null : b.band);
    body = (
      <>
        {load(Math.min(ax, 150) - 26, Math.max(bx, 150) + 26, props.load)}
        <Path d={`M150 ${PICK_Y + 30} l-7 -9 h14 z`} fill={c.glow} />
        <SvgText x={150} y={PICK_Y + 44} fill={c.glow} fontSize={10} fontWeight="700" textAnchor="middle">
          CG
        </SvgText>
        <Line x1={150} y1={hy} x2={150} y2={PICK_Y + 20} stroke={c.textFaint} strokeWidth={1} strokeDasharray="3 4" />
        <Line x1={150} y1={hy} x2={ax} y2={PICK_Y} stroke={ca} strokeWidth={5} strokeLinecap="round" strokeDasharray={a.slack ? '6 5' : undefined} />
        <Line x1={150} y1={hy} x2={bx} y2={PICK_Y} stroke={cb} strokeWidth={5} strokeLinecap="round" strokeDasharray={b.slack ? '6 5' : undefined} />
        <Circle cx={ax} cy={PICK_Y} r={4.5} fill={c.bg} stroke={ca} strokeWidth={2.2} />
        <Circle cx={bx} cy={PICK_Y} r={4.5} fill={c.bg} stroke={cb} strokeWidth={2.2} />
        {!a.slack && a.reach > 0 ? arc(ax, 1, a.angle, ca) : null}
        {!b.slack && b.reach > 0 ? arc(bx, -1, b.angle, cb) : null}
        <SvgText x={ax} y={PICK_Y - 10} fill={c.textMuted} fontSize={11} fontWeight="700" textAnchor="middle">
          A
        </SvgText>
        <SvgText x={bx} y={PICK_Y - 10} fill={c.textMuted} fontSize={11} fontWeight="700" textAnchor="middle">
          B
        </SvgText>
        {hookAt(150, hy)}
        {label((150 + ax) / 2 - 30, (hy + PICK_Y) / 2, props.tensionA, ca)}
        {label((150 + bx) / 2 + 30, (hy + PICK_Y) / 2, props.tensionB, cb)}
      </>
    );
  }

  return (
    <View
      {...pan.panHandlers}
      style={[
        {
          width: props.size,
          height,
          alignSelf: 'center',
          borderRadius: t.radius.lg,
          overflow: 'hidden',
          backgroundColor: c.bgSunken,
        },
        Platform.OS === 'web' ? ({ touchAction: 'none', userSelect: 'none' } as object) : null,
      ]}
      accessible
      accessibilityRole={props.kind === 'even' && props.onAngle ? 'adjustable' : 'image'}
      accessibilityLabel={
        props.kind === 'even'
          ? `Sling diagram: ${props.legs} leg${props.legs === 1 ? '' : 's'}${props.angle !== null ? ` at ${Math.round(props.angle)} degrees from horizontal` : ''}${props.onAngle ? '. Drag the hook up or down to change the angle.' : ''}`
          : 'Sling diagram: two legs, centre of gravity off centre'
      }
    >
      <Svg width={props.size} height={height} viewBox={`0 0 ${W} ${H}`}>
        {steel}
        {body}
      </Svg>
    </View>
  );
}
