import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { HOME } from '../navigation/groups';
import { Screen } from '../components/Screen';
import { GridLabel, ToolGrid, ToolTile } from '../components/ToolTile';
import { ProjectCard } from '../components/ProjectCard';
import { RecentRow } from '../components/RecentRow';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

/**
 * The front page.
 *
 * What is on it, and in what order, is in navigation/groups.ts — this screen
 * only draws it. A tile is either a tool or a group of them, and both look the
 * same on purpose: a man taps the picture of the thing he wants and gets
 * either the tool or the short list of the ones that answer the same question.
 */
export function HomeScreen({ navigation }: Props) {
  return (
    <Screen>
      <ProjectCard onEdit={() => navigation.navigate('Settings')} />
      <RecentRow onOpen={(route) => navigation.navigate(route as never)} />
      <GridLabel text="Tools" meta={`${HOME.length} cards`} />
      <ToolGrid>
        {HOME.map((entry) =>
          entry.kind === 'tool' ? (
            <ToolTile
              key={entry.tool.route}
              art={entry.tool.route}
              title={entry.tool.title}
              subtitle={entry.tool.subtitle}
              icon={entry.tool.icon}
              onPress={() => navigation.navigate(entry.tool.route as never)}
            />
          ) : (
            <ToolTile
              key={entry.id}
              art={entry.art}
              title={entry.title}
              subtitle={entry.subtitle}
              icon={entry.icon}
              onPress={() => navigation.navigate('Group', { id: entry.id })}
            />
          )
        )}
      </ToolGrid>
    </Screen>
  );
}
