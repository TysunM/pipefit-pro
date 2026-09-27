import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import type { ToolRoute } from '../navigation/groups';
import { Screen } from '../components/Screen';
import { HintRow } from '../components/HintRow';
import { TabBar } from '../components/TabBar';
import { ToolArt } from '../components/ToolArt';
import { Plate } from '../components/metal';
import { useTheme } from '../theme/ThemeProvider';
import { useJoints } from '../state/joints';
import { useSketches } from '../state/sketches';
import { useSpools } from '../state/spools';
import { useLevels } from '../state/levels';
import { claimUntagged, sameProject, untagged } from '../state/project';
import { JobChips, useJobFilter } from '../components/JobChips';
import { isDone, isScratch, isSettled, jointFlange, jointProgress, listed, sinceLabel, sortJoints } from '../state/register';
import { sortSketches } from '../state/sketchStore';
import { sortSpools } from '../state/spoolStore';
import { findSize } from '../calc/pipe';
import { inchesPerFoot } from '../calc/sight';

type Props = NativeStackScreenProps<RootStackParamList, 'Projects'>;

/** How many of each kind a card lists before "see all". */
const SHOWN = 3;

type Row = { key: string; title: string; sub: string; when: string; job?: string; tint?: string; onPress: () => void };

/**
 * Everything saved on the phone, one card per kind: the bolt-ups, the isos,
 * the spools and the level readings. Each card lists the newest few, opens
 * any of them where it was left, and starts a new one.
 *
 * This is the page a foreman is shown. It answers "what have you got on this
 * job" without opening four tools to find out. So it opens on the job that is
 * active in Settings, and the chips across the top switch to another job, to
 * everything, or to what was saved with no job at all. See state/project.ts.
 */
export function ProjectsScreen({ navigation }: Props) {
  const t = useTheme();
  const now = Date.now();
  const { register, hydrated: jIn, apply: applyJoints } = useJoints();
  const { book, hydrated: kIn, apply: applySketches } = useSketches();
  const { shelf, hydrated: sIn, apply: applySpools } = useSpools();
  const { log, hydrated: lIn, apply: applyLevels } = useLevels();
  const go = (route: ToolRoute) => navigation.navigate(route as never);

  const everything = [...listed(register), ...book.sketches, ...shelf.spools, ...log.readings];
  const f = useJobFilter(everything);
  const { active, filter, mine } = f;
  const loose = untagged(everything);
  const [claiming, setClaiming] = useState(false);

  const joints = sortJoints(mine(listed(register)));
  const sketches = sortSketches(mine(book.sketches));
  const spools = sortSpools(mine(shelf.spools));
  const readings = mine(log.readings);
  const showJob = filter.kind === 'all';
  const jobOf = (p: string) => (showJob ? p || 'No project' : undefined);

  const claim = () => {
    if (!active) return;
    applyJoints((r) => ({ ...r, joints: r.joints.map((j) => (isScratch(j) || j.project ? j : { ...j, project: active })) }));
    applySketches((b) => ({ ...b, sketches: claimUntagged(b.sketches, active) }));
    applySpools((sh) => ({ ...sh, spools: claimUntagged(sh.spools, active) }));
    applyLevels((l) => ({ ...l, readings: claimUntagged(l.readings, active) }));
    setClaiming(false);
  };

  const jointRows: Row[] = joints.slice(0, SHOWN).map((j) => ({
    key: j.id,
    title: j.tag || 'Untitled joint',
    sub: `${jointFlange(j)}\n${jointProgress(j)}`,
    when: sinceLabel(j.updatedAt, now),
    job: jobOf(j.project),
    tint: isSettled(j) ? t.colors.success : isDone(j) ? t.colors.accent : t.colors.data,
    onPress: () => navigation.navigate('FlangeBoltUp', { jointId: j.id }),
  }));

  const sketchRows: Row[] = sketches.slice(0, SHOWN).map((s) => ({
    key: s.id,
    title: s.name,
    sub: s.place || `${s.strokes.length} ${s.strokes.length === 1 ? 'line' : 'lines'}`,
    when: sinceLabel(s.updatedAt, now),
    job: jobOf(s.project),
    onPress: () => navigation.navigate('IsoDraw', { id: s.id }),
  }));

  const spoolRows: Row[] = spools.slice(0, SHOWN).map((s) => ({
    key: s.id,
    title: s.name,
    sub: `${findSize(s.nps).label} SCH ${s.schedule} · ${s.legs.length} legs${s.place ? ` · ${s.place}` : ''}`,
    when: sinceLabel(s.updatedAt, now),
    job: jobOf(s.project),
    onPress: () => navigation.navigate('SpoolBuilder', { spoolId: s.id }),
  }));

  const levelRows: Row[] = readings.slice(0, SHOWN).map((r) => {
    const f = inchesPerFoot(r.slope);
    return {
      key: r.id,
      title: r.tag,
      sub: `${Math.abs(r.slope) < 0.05 ? '0.0' : `${r.slope < 0 ? '−' : ''}${Math.abs(r.slope).toFixed(1)}`}° · ${f < 0 ? '−' : ''}${Math.abs(f).toFixed(2)}″/ft`,
      when: sinceLabel(r.createdAt, now),
      job: jobOf(r.project),
      onPress: () => go('Level'),
    };
  });

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <Screen tabbed>
        <HintRow
          text={
            active
              ? `New work is saved to ${active}. Tap a job below to see its work, or All jobs for everything on this phone.`
              : 'No Project ID is set, so new work is not tagged to a job. Set one in Settings to keep each job apart.'
          }
        />
        <JobChips f={f} />

        {active && loose > 0 && filter.kind === 'one' && sameProject(filter.id, active) ? (
          <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.md }}>
            <Plate tone="slate" radius={t.radius.lg} style={{ padding: 12, gap: 10 }}>
              <Text style={[t.type.caption, { color: t.colors.onSlate }]}>
                {claiming
                  ? `Put all ${loose} under ${active}? Work already tagged to another job stays where it is.`
                  : `${loose} saved before jobs were tagged ${loose === 1 ? 'is' : 'are'} under No project.`}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <SmallButton label={claiming ? `Yes, add to ${active}` : `Add to ${active}`} onPress={claiming ? claim : () => setClaiming(true)} strong />
                {claiming ? <SmallButton label="Cancel" onPress={() => setClaiming(false)} /> : null}
              </View>
            </Plate>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.lg, gap: 16 }}>
          <Card
            art="FlangeBoltUp"
            title="Flange bolt-ups"
            count={jIn ? joints.length : null}
            rows={jointRows}
            empty="No joints logged yet. Name a bolt-up to keep it here."
            onNew={() => go('FlangeBoltUp')}
            more={{ label: 'Joint log', onPress: () => go('Joints') }}
          />
          <Card
            art="IsoSketch"
            title="Iso drawings"
            count={kIn ? sketches.length : null}
            rows={sketchRows}
            empty="No isos yet. Start one on iso paper."
            onNew={() => go('IsoSketch')}
            more={{ label: 'Sketch book', onPress: () => go('IsoSketch') }}
          />
          <Card
            art="SpoolBuilder"
            title="3D spools"
            count={sIn ? spools.length : null}
            rows={spoolRows}
            empty="No spools saved yet. Build one and save it by its mark."
            onNew={() => go('SpoolBuilder')}
            more={{ label: 'Order sheet', onPress: () => go('OrderSheet') }}
          />
          <Card
            art="Level"
            title="Level readings"
            count={lIn ? readings.length : null}
            rows={levelRows}
            empty="No readings saved yet. Lay the phone on a pipe and save it by tag."
            onNew={() => go('Level')}
            more={{ label: 'All readings', onPress: () => go('Level') }}
          />
        </View>
      </Screen>
      <TabBar active="projects" />
    </View>
  );
}

function Card({
  art,
  title,
  count,
  rows,
  empty,
  onNew,
  more,
}: {
  art: ToolRoute;
  title: string;
  count: number | null;
  rows: Row[];
  empty: string;
  onNew: () => void;
  more: { label: string; onPress: () => void };
}) {
  const t = useTheme();
  const c = t.colors;
  return (
    <Plate radius={t.radius.xl} style={{ overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <View
          style={{
            width: 60,
            height: 52,
            borderRadius: t.radius.md,
            backgroundColor: c.well,
            borderWidth: 1,
            borderColor: c.wellEdge,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ToolArt route={art} height={42} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[t.type.tileTitle, { color: c.text }]} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          <Text style={[t.type.caption, { color: c.textMuted, marginTop: 2 }]}>
            {count === null ? ' ' : count === 0 ? 'Nothing saved' : `${count} saved`}
          </Text>
        </View>
        <Pressable onPress={onNew} accessibilityRole="button" accessibilityLabel={`New in ${title}`} hitSlop={6}>
          {({ pressed }) => (
            <Plate tone="copper" sunk={pressed} radius={t.radius.sm} style={{ height: 40, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="add" size={18} color={c.onCopper} />
              <Text style={[t.type.labelSmall, { color: c.onCopper, fontFamily: t.font.sans, fontSize: 13 }]}>New</Text>
            </Plate>
          )}
        </Pressable>
      </View>

      {rows.length === 0 ? (
        <Text style={[t.type.caption, { color: c.textFaint, paddingHorizontal: 14, paddingBottom: 14 }]}>{count === null ? ' ' : empty}</Text>
      ) : (
        rows.map((r) => (
          <Pressable
            key={r.key}
            onPress={r.onPress}
            accessibilityRole="button"
            accessibilityLabel={`Open ${r.title}`}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingHorizontal: 14,
              paddingVertical: 11,
              borderTopWidth: t.hairline,
              borderTopColor: c.border,
              backgroundColor: pressed ? c.metalLo : 'transparent',
            })}
          >
            {r.tint ? <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: r.tint }} /> : null}
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[t.type.bodyStrong, { color: c.text }]} numberOfLines={1}>
                {r.title}
              </Text>
              <Text style={[t.type.caption, { color: c.textMuted }]} numberOfLines={2}>
                {r.sub}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2, maxWidth: 120 }}>
              {r.job !== undefined ? (
                <Text style={[t.type.labelSmall, { color: r.job === 'No project' ? c.textFaint : c.accent, fontSize: 11 }]} numberOfLines={1}>
                  {r.job}
                </Text>
              ) : null}
              <Text style={[t.type.caption, { color: c.textFaint }]}>{r.when}</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={c.textFaint} />
          </Pressable>
        ))
      )}

      <Pressable
        onPress={more.onPress}
        accessibilityRole="button"
        accessibilityLabel={more.label}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 14,
          height: 46,
          borderTopWidth: t.hairline,
          borderTopColor: c.border,
          backgroundColor: pressed ? c.metalLo : 'transparent',
        })}
      >
        <Text style={[t.type.captionStrong, { color: c.accent }]}>
          {count !== null && count > SHOWN ? `${more.label} · all ${count}` : more.label}
        </Text>
        <Ionicons name="arrow-forward" size={17} color={c.accent} />
      </Pressable>
    </Plate>
  );
}

function SmallButton({ label, onPress, strong = false }: { label: string; onPress: () => void; strong?: boolean }) {
  const t = useTheme();
  const c = t.colors;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {({ pressed }) => (
        <Plate tone={strong ? 'copper' : 'metal'} sunk={pressed} radius={t.radius.sm} style={{ height: 40, paddingHorizontal: 14, justifyContent: 'center' }}>
          <Text style={[t.type.captionStrong, { color: strong ? c.onCopper : c.text }]} numberOfLines={1}>
            {label}
          </Text>
        </Plate>
      )}
    </Pressable>
  );
}
