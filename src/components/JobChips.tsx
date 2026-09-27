import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../state/settings';
import { useJobPick } from '../state/jobPick';
import { ALL, ProjectCount, ProjectFilter, cleanProject, defaultFilter, inProject, only, projectsIn, sameProject, withPicked } from '../state/project';

export type JobFilter = {
  /** The Project ID set in Settings, cleaned; '' when none is. */
  active: string;
  jobs: ProjectCount[];
  filter: ProjectFilter;
  total: number;
  setPicked: (f: ProjectFilter | null) => void;
  /** Keep only what the filter shows. */
  mine: <T extends { project: string }>(xs: readonly T[]) => T[];
  /** What the chosen job is called on a screen or a sheet; '' for all jobs. */
  label: string;
};

/**
 * Which job a screen is showing: the one picked on any screen this session,
 * else the active one, else everything. `records` are what this screen lists,
 * for the chip counts.
 */
export function useJobFilter(records: readonly { project: string }[]): JobFilter {
  const { settings } = useSettings();
  const { picked, setPicked } = useJobPick();
  const active = cleanProject(settings.projectId);
  // Held steady between renders so a screen's memoised lists only rework
  // when the job actually changes.
  const key = picked ? (picked.kind === 'all' ? '*' : `=${picked.id}`) : `default:${active}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filter = useMemo(() => picked ?? defaultFilter(active), [key]);
  const mine = useCallback(<T extends { project: string }>(xs: readonly T[]) => xs.filter((x) => inProject(x.project, filter)), [filter]);
  return {
    active,
    jobs: withPicked(projectsIn(records, active), filter),
    filter,
    total: records.length,
    setPicked,
    mine,
    label: filter.kind === 'all' ? '' : filter.id || 'No project',
  };
}

/**
 * The chips across the top: the active job, all jobs, then the others and
 * "no project". The two a man switches between most sit on screen together.
 */
export function JobChips({ f }: { f: JobFilter }) {
  const t = useTheme();
  const navigation = useNavigation();
  const jobChips = f.jobs.map((j) => (
    <Chip
      key={j.id || '(none)'}
      label={j.id || 'No project'}
      count={j.count}
      dot={!!f.active && sameProject(j.id, f.active)}
      on={f.filter.kind === 'one' && sameProject(f.filter.id, j.id)}
      onPress={() => f.setPicked(only(j.id))}
    />
  ));
  const allChip = <Chip key="(all)" label="All jobs" count={f.total} on={f.filter.kind === 'all'} onPress={() => f.setPicked(ALL)} />;
  const activeFirst = !!f.active && f.jobs[0] !== undefined && sameProject(f.jobs[0].id, f.active);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: t.layout.screenPadding, paddingTop: t.space.lg }}
    >
      {f.active ? null : (
        <Chip label="Set Project ID" icon="create-outline" on={false} onPress={() => navigation.navigate('Settings' as never)} />
      )}
      {activeFirst ? [jobChips[0], allChip, ...jobChips.slice(1)] : [allChip, ...jobChips]}
    </ScrollView>
  );
}

export function Chip({
  label,
  count,
  on,
  dot = false,
  icon,
  onPress,
}: {
  label: string;
  count?: number;
  on: boolean;
  dot?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}) {
  const t = useTheme();
  const c = t.colors;
  const ink = on ? c.onCopper : c.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={count === undefined ? label : `${label}, ${count} saved`}
    >
      {({ pressed }) => (
        <View
          style={{
            height: 40,
            paddingHorizontal: 14,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            borderWidth: 1,
            borderColor: on ? c.copperFill : c.border,
            backgroundColor: on ? (pressed ? c.copperFillLo : c.copperFill) : pressed ? c.metalLo : c.metalHi,
          }}
        >
          {dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: on ? c.onCopper : c.success }} /> : null}
          {icon ? <Ionicons name={icon} size={16} color={ink} /> : null}
          <Text style={[t.type.captionStrong, { color: ink, fontSize: 14 }]} numberOfLines={1}>
            {label}
          </Text>
          {count !== undefined ? <Text style={[t.type.caption, { color: on ? c.onCopper : c.textFaint, fontSize: 13 }]}>{count}</Text> : null}
        </View>
      )}
    </Pressable>
  );
}
