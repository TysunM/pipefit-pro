import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { findSize, pipeWeightPerFoot } from '../calc/pipe';
import { TileArt } from './TileArt';
import { Grain, Plate, Well } from './metal';

/**
 * The pipe every tool starts from, across the top of the home screen.
 *
 * Every answer in the app is worked for one size, one wall and one unit, and
 * they are set once in Settings. So they are the first thing on the page: the
 * three lines a man reads before trusting a figure, the button that changes
 * them, and under it the four numbers he otherwise looks up — outside
 * diameter, wall, bore and weight per foot — worked from the same table the
 * calculators use.
 */
export function ProjectCard({ onEdit }: { onEdit: () => void }) {
  const t = useTheme();
  const { settings } = useSettings();
  const size = findSize(settings.defaultNps);
  const wall = size.wall[settings.defaultSchedule];
  const metric = settings.unitSystem === 'metric';

  const inch = (v: number) => (metric ? `${(v * 25.4).toFixed(1)} mm` : `${v.toFixed(3)}"`);
  const weight = pipeWeightPerFoot(size.od, wall);
  const perLength = metric ? `${(weight * 1.48816).toFixed(2)} kg/m` : `${weight.toFixed(2)} lb/ft`;

  const facts = [
    { k: 'OD', v: inch(size.od) },
    { k: 'Wall', v: inch(wall) },
    { k: 'Bore', v: inch(size.od - 2 * wall) },
    { k: 'Weight', v: perLength },
  ];

  return (
    <View style={{ backgroundColor: t.colors.bgSunken, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.lg, paddingBottom: t.space.xl }}>
      <Grain strength={1.6} />
      <Text style={[t.type.label, { color: t.colors.textMuted, marginBottom: t.space.sm, fontSize: 13.5 }]}>
        Active pipe spec
      </Text>

      <Plate radius={t.radius.lg} style={{ flexDirection: 'row', alignItems: 'center', padding: 10, gap: 12 }}>
        <Well style={{ width: 78, height: 78, alignItems: 'center', justifyContent: 'center' }}>
          <TileArt route="SpoolBuilder" size={0.78} />
        </Well>
        <View style={{ flex: 1, gap: 3 }}>
          <Line t={t} k="Pipe" v={`${size.label} ${settings.defaultKind} · SCH ${settings.defaultSchedule}`} />
          <Line t={t} k="Unit" v={metric ? 'Metric' : 'Imperial'} />
          <Line t={t} k="Gap" v={metric ? `${(settings.defaultGap * 25.4).toFixed(1)} mm` : `${settings.defaultGap.toFixed(3)}"`} />
        </View>
        <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit pipe spec in Settings">
          {({ pressed }) => (
            <Plate tone="copper" sunk={pressed} radius={t.radius.md} style={{ paddingHorizontal: 12, height: 40, justifyContent: 'center' }}>
              <Text style={[t.type.labelSmall, { color: t.colors.onCopper }]}>Edit specs</Text>
            </Plate>
          )}
        </Pressable>
      </Plate>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, marginTop: t.space.md }}>
        {facts.map((f) => (
          <Well key={f.k} radius={t.radius.pill} style={{ paddingHorizontal: 12, height: 34, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[t.type.labelSmall, { color: t.colors.textFaint }]}>{f.k}</Text>
            <Text style={[t.type.captionStrong, { color: t.colors.text, fontSize: 14 }]}>{f.v}</Text>
          </Well>
        ))}
      </View>
    </View>
  );
}

function Line({ t, k, v }: { t: ReturnType<typeof useTheme>; k: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
      <Text style={[t.type.labelSmall, { color: t.colors.textFaint, width: 34 }]}>{k}</Text>
      <Text style={[t.type.captionStrong, { color: t.colors.text, fontSize: 15, flexShrink: 1 }]} numberOfLines={1}>
        {v}
      </Text>
    </View>
  );
}
