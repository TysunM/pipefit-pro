import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { findSize, pipeWeightPerFoot } from '../calc/pipe';
import { SpoolThumb } from './ToolArt';
import { SHOP, Workshop } from './Workshop';
import { Plate } from './metal';

/**
 * The job and the pipe every tool starts from, across the top of the home
 * screen, set against the shop wall.
 *
 * Every answer in the app is worked for one size, one wall and one unit, set
 * once in Settings, and read against one job. So they are the first thing on
 * the page: the project, the pipe and the unit a man checks before trusting a
 * figure, the button that changes them, and under it the numbers he otherwise
 * looks up — outside diameter, wall, bore, weight and the root gap — worked
 * from the same table the calculators use.
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
    { k: 'Wt', v: perLength },
    { k: 'Gap', v: inch(settings.defaultGap) },
  ];

  const project = settings.projectId.trim();

  return (
    <View style={{ overflow: 'hidden', paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.lg, paddingBottom: t.space.lg }}>
      <Workshop />
      <Text
        style={[t.type.label, { color: SHOP.text, fontFamily: t.font.sans, fontSize: 16, letterSpacing: 0.7, marginBottom: t.space.md }]}
        accessibilityRole="header"
      >
        Active project details:
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 10,
          borderRadius: t.radius.lg,
          borderWidth: 1,
          borderColor: SHOP.cardEdge,
          backgroundColor: SHOP.card,
        }}
      >
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: SHOP.cardEdge,
            backgroundColor: SHOP.well,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SpoolThumb size={70} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Line t={t} k="Project ID" v={project || 'Not set'} faint={!project} />
          <Line t={t} k="Pipe" v={`${size.label} ${settings.defaultKind} SCH ${settings.defaultSchedule}`} />
          <Line t={t} k="Unit" v={metric ? 'Metric' : 'Imperial'} />
        </View>
        <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit project and pipe specs">
          {({ pressed }) => (
            <Plate tone="copper" sunk={pressed} radius={t.radius.sm} style={{ paddingHorizontal: 12, height: 44, justifyContent: 'center' }}>
              <Text style={[t.type.labelSmall, { color: t.colors.onCopper, fontFamily: t.font.sans, fontSize: 13, letterSpacing: 0.6 }]}>
                Edit specs
              </Text>
            </Plate>
          )}
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, marginTop: t.space.md }}>
        {facts.map((f) => (
          <View
            key={f.k}
            style={{
              height: 32,
              paddingHorizontal: 10,
              borderRadius: t.radius.sm,
              borderWidth: 1,
              borderColor: SHOP.chipEdge,
              backgroundColor: SHOP.chip,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Text style={[t.type.labelSmall, { color: SHOP.muted }]}>{f.k}</Text>
            <Text style={[t.type.captionStrong, { color: SHOP.text, fontFamily: t.font.sans, fontSize: 14.5 }]}>{f.v}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Line({ t, k, v, faint = false }: { t: ReturnType<typeof useTheme>; k: string; v: string; faint?: boolean }) {
  return (
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
      <Text style={[t.type.labelSmall, { color: SHOP.muted, fontSize: 12 }]}>{`${k}: `}</Text>
      <Text style={[t.type.captionStrong, { color: faint ? SHOP.muted : SHOP.text, fontFamily: t.font.sans, fontSize: 14 }]}>
        {v}
      </Text>
    </Text>
  );
}
