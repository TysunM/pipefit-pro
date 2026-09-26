import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useSvgIds } from './metal';

// The shop wall behind the project card
// -------------------------------------
// A pegboard with the tools hung on it, a bench along the foot and a length
// of pipe laid on it end-on, drawn rather than photographed: a photo at this
// size is a megabyte of JPEG that goes soft on a large phone, and this is a
// few hundred bytes that stays sharp on any of them.
//
// It is the same in both themes on purpose. It is a picture of a place, and a
// daylight shop wall is still a shop wall. A wash from the left keeps the card
// and its words readable over it.

/** The hero's own colours. It never changes with the theme, so neither do these. */
export const SHOP = {
  text: '#F1F4F8',
  muted: '#BCC5CF',
  card: 'rgba(20,26,33,0.88)',
  cardEdge: 'rgba(255,255,255,0.14)',
  chip: 'rgba(36,43,52,0.92)',
  chipEdge: 'rgba(255,255,255,0.2)',
  well: '#0E1318',
};

export const Workshop = React.memo(function Workshop() {
  const id = useSvgIds('shop');
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" pointerEvents="none">
      <Defs>
        <LinearGradient id={id('a')} x1="0" y1="0" x2="1" y2="0.4">
          <Stop offset="0" stopColor="#4C5158" />
          <Stop offset="0.6" stopColor="#7E838A" />
          <Stop offset="1" stopColor="#686D74" />
        </LinearGradient>
        <Pattern id={id('b')} x="0" y="0" width="13" height="13" patternUnits="userSpaceOnUse">
          <Circle cx="6.5" cy="6.5" r="1.7" fill="#24282D" opacity={0.8} />
        </Pattern>
        <LinearGradient id={id('c')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#9AA2AC" />
          <Stop offset="0.35" stopColor="#E4E8ED" />
          <Stop offset="0.7" stopColor="#7C848E" />
          <Stop offset="1" stopColor="#3B4149" />
        </LinearGradient>
        <RadialGradient id={id('d')} cx="45%" cy="40%" rx="60%" ry="60%">
          <Stop offset="0" stopColor="#C9CFD6" />
          <Stop offset="1" stopColor="#5E6670" />
        </RadialGradient>
        <LinearGradient id={id('e')} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#0C1015" stopOpacity={0.72} />
          <Stop offset="0.5" stopColor="#0C1015" stopOpacity={0.34} />
          <Stop offset="1" stopColor="#0C1015" stopOpacity={0.1} />
        </LinearGradient>
        <LinearGradient id={id('f')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0C1015" stopOpacity={0.45} />
          <Stop offset="0.3" stopColor="#0C1015" stopOpacity={0} />
          <Stop offset="1" stopColor="#0C1015" stopOpacity={0.35} />
        </LinearGradient>
      </Defs>

      {/* Wall, and the pegboard hung on it. */}
      <Rect x="0" y="0" width="400" height="260" fill={`url(#${id('a')})`} />
      <Rect x="110" y="0" width="290" height="196" fill="#747980" opacity={0.28} />
      <Rect x="110" y="0" width="290" height="196" fill={`url(#${id('b')})`} />

      {/* On their hooks: a pipe wrench, a hammer and a combination spanner. */}
      <G>
        {/* Pipe wrench, hung by its heel: a heavy handle, the hook jaw and the nut. */}
        <G transform="rotate(8 212 70)">
          <Rect x="205" y="30" width="13" height="92" rx="5" fill="#B8421F" />
          <Rect x="205" y="30" width="3" height="92" rx="1.5" fill="#E07A52" opacity={0.7} />
          <Rect x="201" y="14" width="21" height="22" rx="3" fill="#3A3F46" />
          <Path d="M201 14 h28 v8 h-8 v-3 h-20 z" fill="#4A5058" />
          <Rect x="203" y="22" width="17" height="5" rx="2.5" fill="#8C939C" />
        </G>
        {/* Hammer. */}
        <Rect x="318" y="30" width="8" height="84" rx="3" fill="#2A2E34" />
        <Rect x="319" y="30" width="2" height="84" rx="1" fill="#6C727A" opacity={0.7} />
        <Rect x="300" y="20" width="44" height="14" rx="2.5" fill="#3C4148" />
        <Rect x="300" y="20" width="44" height="3" rx="1.5" fill="#A2A8B0" opacity={0.7} />
        {/* Combination spanner: open jaw up, ring down. */}
        <G transform="rotate(-6 262 64)">
          <Rect x="258" y="30" width="8" height="66" rx="3" fill="#8D949D" />
          <Rect x="258" y="30" width="2.5" height="66" rx="1.2" fill="#D3D8DE" opacity={0.8} />
          <Path d="M252 20 a10 10 0 1 0 20 0 h-5 a5 5 0 1 1 -10 0 z" fill="#8D949D" transform="rotate(180 262 22)" />
          <Circle cx="262" cy="102" r="8.5" fill="none" stroke="#8D949D" strokeWidth="4.5" />
        </G>
      </G>

      {/* The bench, with two screwdrivers on it. */}
      <Rect x="0" y="196" width="400" height="64" fill="#23272C" />
      <Rect x="0" y="196" width="400" height="2" fill="#7C828A" opacity={0.55} />
      <G transform="rotate(-8 60 222)">
        <Rect x="20" y="216" width="46" height="11" rx="5" fill="#D9701C" />
        <Rect x="66" y="219.5" width="44" height="4" rx="2" fill="#AEB5BD" />
      </G>
      <G transform="rotate(6 120 238)">
        <Rect x="84" y="232" width="40" height="10" rx="5" fill="#C9661A" />
        <Rect x="124" y="235" width="38" height="3.5" rx="1.7" fill="#9BA2AA" />
      </G>

      {/* A length of pipe on the bench, open end to the room. */}
      <Path d="M352 178 L410 162 L410 236 L352 252 Z" fill={`url(#${id('c')})`} />
      <Ellipse cx="352" cy="215" rx="21" ry="37" fill={`url(#${id('d')})`} />
      <Ellipse cx="352" cy="215" rx="15" ry="29" fill="#15191E" />
      <Ellipse cx="349" cy="211" rx="9" ry="19" fill="#0A0D10" />

      {/* The wash that keeps the words readable, and a vignette. */}
      <Rect x="0" y="0" width="400" height="260" fill={`url(#${id('e')})`} />
      <Rect x="0" y="0" width="400" height="260" fill={`url(#${id('f')})`} />
    </Svg>
  );
});
