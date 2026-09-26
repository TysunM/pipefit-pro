import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { HOME, HOME_PAIRS, type Tool, type ToolRoute } from '../navigation/groups';
import { Screen } from '../components/Screen';
import { CalcTile, CountBadge, FeatureArrow, FeatureTag, GridLabel, ToolGrid, ToolTile, WideTile } from '../components/ToolTile';
import { ProjectCard } from '../components/ProjectCard';
import { TabBar } from '../components/TabBar';
import { LevelBadge } from '../components/LevelBadge';
import { useTheme } from '../theme/ThemeProvider';
import { useSpools } from '../state/spools';
import { useJoints } from '../state/joints';
import { useHeats } from '../state/heats';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

/**
 * The front page.
 *
 * The job and its pipe across the top; every tool under it, one tap away, in
 * the order the work comes: what a man works with down the left, what he
 * keeps and looks up down the right, the sketch pad across the width, and the
 * everyday calculations at the foot. What sits where is in groups.ts.
 *
 * The record tiles say how many they hold, because the first question a
 * foreman asks of a register is whether anything is in it.
 */
export function HomeScreen({ navigation }: Props) {
  const t = useTheme();
  const { shelf, hydrated: spoolsIn } = useSpools();
  const { register, hydrated: jointsIn } = useJoints();
  const { book, hydrated: heatsIn } = useHeats();
  const open = (route: ToolRoute) => navigation.navigate(route as never);

  const count: Partial<Record<ToolRoute, number | null>> = {
    OrderSheet: spoolsIn ? shelf.spools.length : null,
    Joints: jointsIn ? register.joints.length : null,
    Heats: heatsIn ? book.heats.length : null,
  };

  const tile = (tool: Tool) => {
    const n = count[tool.route];
    if (tool.route === 'SpoolBuilder')
      return (
        <ToolTile key={tool.route} tool={tool} featured badge={<FeatureTag text="Explore" />} corner={<FeatureArrow />} onPress={() => open(tool.route)} />
      );
    if (tool.route === 'Level') return <ToolTile key={tool.route} tool={tool} badge={<LevelBadge />} onPress={() => open(tool.route)} />;
    if (tool.route === 'Calculator')
      return (
        <ToolTile
          key={tool.route}
          tool={tool}
          corner={<Ionicons name="swap-horizontal" size={18} color={t.colors.textFaint} />}
          onPress={() => open(tool.route)}
        />
      );
    return (
      <ToolTile
        key={tool.route}
        tool={tool}
        corner={typeof n === 'number' ? <CountBadge n={n} /> : undefined}
        onPress={() => open(tool.route)}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <Screen tabbed>
        <ProjectCard onEdit={() => navigation.navigate('Settings')} />

        <GridLabel text="Work tools" right="Records & calcs" />
        <ToolGrid>{HOME_PAIRS.map(tile)}</ToolGrid>

        <View style={{ paddingHorizontal: t.layout.screenPadding, marginTop: 14 }}>
          <WideTile tool={HOME.wide} onPress={() => open(HOME.wide.route)} />
        </View>

        <GridLabel text="Common calcs" />
        <ToolGrid>
          {HOME.calcs.map((c) => (
            <CalcTile key={c.route} tool={c} onPress={() => open(c.route)} />
          ))}
        </ToolGrid>
      </Screen>
      <TabBar active="home" />
    </View>
  );
}
