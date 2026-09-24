import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { group } from '../navigation/groups';
import { Screen } from '../components/Screen';
import { GridLabel, ToolGrid, ToolTile } from '../components/ToolTile';
import { HintRow } from '../components/HintRow';
import { FooterNote } from '../components/Results';

type Props = NativeStackScreenProps<RootStackParamList, 'Group'>;

/**
 * One tile's worth of tools.
 *
 * The same tiles as the home screen, drawing and all, so a man who has
 * learned the front page has learned this too. The list is short enough to
 * read rather than scroll, which is the whole point of having it.
 */
export function GroupScreen({ route, navigation }: Props) {
  const g = group(route.params.id);
  if (!g) return <Screen><FooterNote text="That group is not in this build." /></Screen>;

  return (
    <Screen>
      <HintRow text={g.subtitle} />
      <GridLabel text={g.title} meta={`${g.tools.length} tools`} />
      <ToolGrid>
        {g.tools.map((tool) => (
          <ToolTile
            key={tool.route}
            art={tool.route}
            title={tool.title}
            subtitle={tool.subtitle}
            icon={tool.icon}
            onPress={() => navigation.navigate(tool.route as never)}
          />
        ))}
      </ToolGrid>
    </Screen>
  );
}
