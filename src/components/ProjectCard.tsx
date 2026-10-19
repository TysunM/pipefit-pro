import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { material, pipeSpec, sizeLabel, wallLabel } from '../calc/materials';
import { SpoolThumb } from './ToolArt';
import { SHOP, Workshop } from './Workshop';
import { CopperPlate, DarkPlate, SteelPlate } from './plates';

/**
 * The job and the pipe every tool starts from, across the top of the home
 * screen, set against the shop wall, on the plates a machine's nameplates
 * are: the job on a dark plate in a steel bezel, the one button on a copper
 * plate, the figures on steel plates with their values in dark windows
 * (plates.tsx).
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
  const m = material(settings.material);
  // Settings are kept as a set that exists (readSettings), so this is never null in practice.
  const spec = pipeSpec(m.id, settings.defaultNps, settings.wall) ?? pipeSpec('cs', 2, '40')!;
  const metric = settings.unitSystem === 'metric';

  const inch = (v: number) => (metric ? `${(v * 25.4).toFixed(1)} mm` : `${v.toFixed(3)}"`);
  const weight = spec.lbPerFt;
  const perLength = metric ? `${(weight * 1.48816).toFixed(2)} kg/m` : `${weight.toFixed(2)} lb/ft`;

  const facts = [
    { k: 'OD', v: inch(spec.od) },
    { k: 'Wall', v: inch(spec.wall) },
    { k: 'Bore', v: inch(spec.id) },
    { k: 'Wt', v: perLength },
    { k: 'Gap', v: inch(settings.defaultGap) },
  ];

  const project = settings.projectId.trim();

  return (
    <View style={{ overflow: 'hidden', paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.lg, paddingBottom: t.space.lg }}>
      <Workshop />
      <Text
        style={[
          t.type.label,
          { color: SHOP.text, fontFamily: t.font.sans, fontSize: 16, letterSpacing: 0.7, marginBottom: t.space.md, textShadowColor: '#000000', textShadowOffset: { width: 0, height: 1.5 }, textShadowRadius: 2 },
        ]}
        accessibilityRole="header"
      >
        Active project details:
      </Text>

      <DarkPlate style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 10,
            borderWidth: 1.5,
            borderColor: '#8d939b',
            backgroundColor: SHOP.well,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SpoolThumb size={70} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Line t={t} k="Project ID" v={project || 'Not set'} faint={!project} />
          <Line t={t} k="Pipe" v={`${sizeLabel(spec.nps)} ${m.short} ${wallLabel(spec.wallId)} ${settings.defaultKind}`} />
          <Line t={t} k="Spec" v={m.spec.replace(/^ASTM /, '')} />
          <Line t={t} k="Unit" v={metric ? 'Metric' : 'Imperial'} />
        </View>
        <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit project and pipe specs">
          {({ pressed }) => (
            <CopperPlate sunk={pressed} style={{ paddingHorizontal: 12, height: 56, justifyContent: 'center', alignItems: 'center' }}>
              <Text
                style={[
                  t.type.labelSmall,
                  { color: '#2a1606', fontFamily: t.font.sans, fontSize: 12.5, letterSpacing: 0.8, textShadowColor: '#ffd79a', textShadowOffset: { width: 0, height: 0.6 }, textShadowRadius: 0 },
                ]}
              >
                Pipe & material
              </Text>
            </CopperPlate>
          )}
        </Pressable>
      </DarkPlate>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, marginTop: t.space.md }}>
        {facts.map((f) => (
          <SteelPlate key={f.k} style={{ height: 44, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[t.type.labelSmall, { color: '#2b3036', fontSize: 11.5, letterSpacing: 0.7, textShadowColor: '#ffffff', textShadowOffset: { width: 0, height: 0.8 }, textShadowRadius: 0 }]}>{f.k}</Text>
            <View style={{ backgroundColor: '#181c21', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: '#5b6169', borderTopColor: '#0a0c0f' }}>
              <Text style={[t.type.captionStrong, { color: '#f1f4f8', fontFamily: t.font.sans, fontSize: 14 }]}>{f.v}</Text>
            </View>
          </SteelPlate>
        ))}
      </View>
    </View>
  );
}

function Line({ t, k, v, faint = false }: { t: ReturnType<typeof useTheme>; k: string; v: string; faint?: boolean }) {
  return (
    <Text numberOfLines={Platform.OS === 'web' ? 2 : 1} adjustsFontSizeToFit minimumFontScale={0.78}>
      <Text style={[t.type.labelSmall, { color: SHOP.muted, fontSize: 12 }]}>{`${k}: `}</Text>
      <Text style={[t.type.captionStrong, { color: faint ? SHOP.muted : SHOP.text, fontFamily: t.font.sans, fontSize: 14 }]}>
        {v}
      </Text>
    </Text>
  );
}
