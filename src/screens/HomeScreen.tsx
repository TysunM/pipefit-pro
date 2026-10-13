import React from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { START, tool, type Tool } from '../navigation/groups';
import { Screen } from '../components/Screen';
import { GridLabel } from '../components/ToolTile';
import { LiveTile } from '../components/LiveTile';
import { ProjectCard } from '../components/ProjectCard';
import { BackupNudge } from '../components/BackupNudge';
import { TabBar } from '../components/TabBar';
import { ReorderZone, type Hold } from '../components/Reorder';
import { useTheme } from '../theme/ThemeProvider';
import { useRecents } from '../state/recents';
import { SHOW_RECENT } from '../state/recent';
import { HOME_ZONE, applyOrder, orderOf } from '../state/layout';
import { useLayout } from '../state/layouts';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const routeOf = (x: Tool) => x.route;

/**
 * The front page: the job and its pipe against the shop wall, and under it
 * the tools this man used last. A fitter uses two or three tools a shift, not
 * fifteen; those are the ones worth a tap from here. Everything else is a tab
 * away. Before anything has been used, the four field tools stand in, and
 * until four have been used they fill the gap under their own heading.
 *
 * Either grid can be rearranged by holding a tile. The field tools keep the
 * order they are put in; the recently-used strip keeps it until a tool is
 * opened, which puts that one first, as it always has.
 */
export function HomeScreen({ navigation }: Props) {
  const t = useTheme();
  const { recent, hydrated, reorder } = useRecents();
  const { layout, move } = useLayout();
  const used = recent.map(tool).filter((x): x is Tool => !!x);
  const fresh = hydrated && used.length === 0;
  const field = applyOrder(START, routeOf, orderOf(layout, HOME_ZONE));
  // Until there are four to remember, the field tools fill the rest, under
  // their own heading so nothing is called recent that was not.
  const more = fresh ? [] : field.filter((x) => !used.some((u) => u.route === x.route)).slice(0, Math.max(0, SHOW_RECENT - used.length));
  const tile = (x: Tool, hold: Hold) => <LiveTile tool={x} onPress={() => navigation.navigate(x.route as never)} hold={hold} />;
  const pad = { paddingHorizontal: t.layout.screenPadding };
  /** A move among the tiles on screen, landed in the whole order of the field tools. */
  const moveField = (list: Tool[]) => (from: number, to: number) => {
    const a = list[from];
    const b = list[to];
    if (a && b) move(HOME_ZONE, a.route, b.route);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <Screen tabbed>
        <ProjectCard onEdit={() => navigation.navigate('Settings')} />
        <BackupNudge />
        <GridLabel text={fresh ? 'Start here' : 'Recently used'} meta="hold a tile to move it" />
        {fresh ? (
          <ReorderZone items={field} idOf={routeOf} layout="grid" onMove={moveField(field)} render={tile} style={pad} />
        ) : (
          <ReorderZone
            items={used}
            idOf={routeOf}
            layout="grid"
            onMove={(from, to) => {
              const a = used[from];
              const b = used[to];
              if (a && b) reorder(a.route, b.route);
            }}
            render={tile}
            style={pad}
          />
        )}
        {hydrated && more.length ? (
          <>
            <GridLabel text="Field tools" />
            <ReorderZone items={more} idOf={routeOf} layout="grid" onMove={moveField(more)} render={tile} style={pad} />
          </>
        ) : null}
      </Screen>
      <TabBar active="home" />
    </View>
  );
}
