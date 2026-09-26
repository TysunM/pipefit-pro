import React from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { group } from '../navigation/groups';
import { Screen } from '../components/Screen';
import { GridLabel, ToolGrid, ToolTile } from '../components/ToolTile';
import { HintRow } from '../components/HintRow';
import { FooterNote } from '../components/Results';
import { TabBar } from '../components/TabBar';
import { useTheme } from '../theme/ThemeProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'Group'>;

/**
 * One tab's worth of tools.
 *
 * The same tiles as the front page, drawing and all, so a man who has
 * learned the front page has learned this too. The list is short enough to
 * read rather than scroll, which is the whole point of having it.
 */
export function GroupScreen({ route, navigation }: Props) {
  const t = useTheme();
  const g = group(route.params.id);
  if (!g) return <Screen><FooterNote text="That tab is not in this build." /></Screen>;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <Screen tabbed>
        <HintRow text={g.subtitle} />
        <GridLabel text={g.title} meta={`${g.tools.length} tools`} />
        <ToolGrid>
          {g.tools.map((tool) => (
            <ToolTile key={tool.route} tool={tool} onPress={() => navigation.navigate(tool.route as never)} />
          ))}
        </ToolGrid>
      </Screen>
      <TabBar active={g.id} />
    </View>
  );
}
