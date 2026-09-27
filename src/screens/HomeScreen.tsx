import React from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { START, tool, type Tool } from '../navigation/groups';
import { Screen } from '../components/Screen';
import { GridLabel, ToolGrid } from '../components/ToolTile';
import { LiveTile } from '../components/LiveTile';
import { ProjectCard } from '../components/ProjectCard';
import { TabBar } from '../components/TabBar';
import { useTheme } from '../theme/ThemeProvider';
import { useRecents } from '../state/recents';
import { SHOW_RECENT } from '../state/recent';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

/**
 * The front page: the job and its pipe against the shop wall, and under it
 * the tools this man used last. A fitter uses two or three tools a shift, not
 * fifteen; those are the ones worth a tap from here. Everything else is a tab
 * away. Before anything has been used, the four field tools stand in, and
 * until four have been used they fill the gap under their own heading.
 */
export function HomeScreen({ navigation }: Props) {
  const t = useTheme();
  const { recent, hydrated } = useRecents();
  const used = recent.map(tool).filter((x): x is Tool => !!x);
  const fresh = hydrated && used.length === 0;
  // Until there are four to remember, the field tools fill the rest, under
  // their own heading so nothing is called recent that was not.
  const more = fresh ? [] : START.filter((x) => !used.some((u) => u.route === x.route)).slice(0, Math.max(0, SHOW_RECENT - used.length));
  const tile = (x: Tool) => <LiveTile key={x.route} tool={x} onPress={() => navigation.navigate(x.route as never)} />;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <Screen tabbed>
        <ProjectCard onEdit={() => navigation.navigate('Settings')} />
        <GridLabel text={fresh ? 'Start here' : 'Recently used'} />
        <ToolGrid>{(fresh ? START : used).map(tile)}</ToolGrid>
        {hydrated && more.length ? (
          <>
            <GridLabel text="Field tools" />
            <ToolGrid>{more.map(tile)}</ToolGrid>
          </>
        ) : null}
      </Screen>
      <TabBar active="home" />
    </View>
  );
}
