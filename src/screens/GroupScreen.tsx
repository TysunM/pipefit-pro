import React from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { group, groupTools, type Section, type Tool } from '../navigation/groups';
import { Screen } from '../components/Screen';
import { CalcTile, GridLabel, ToolGrid, WideTile } from '../components/ToolTile';
import { LiveTile } from '../components/LiveTile';
import { HintRow } from '../components/HintRow';
import { FooterNote } from '../components/Results';
import { TabBar } from '../components/TabBar';
import { useTheme } from '../theme/ThemeProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'Group'>;

/**
 * The Tools tab or the Logs tab.
 *
 * The same tiles as the front page, drawing and all, in the sections
 * groups.ts gives: big pictures for the instruments and the books, small
 * tiles for the everyday bends and offsets.
 */
export function GroupScreen({ route, navigation }: Props) {
  const t = useTheme();
  const g = group(route.params.id);
  if (!g) return <Screen><FooterNote text="That tab is not in this build." /></Screen>;

  const open = (x: Tool) => navigation.navigate(x.route as never);
  const section = (s: Section) => (
    <View key={s.title}>
      <GridLabel text={s.title} meta={`${s.tools.length}`} />
      {s.size === 'wide' ? (
        <View style={{ paddingHorizontal: t.layout.screenPadding, gap: 14 }}>
          {s.tools.map((x) => (
            <WideTile key={x.route} tool={x} onPress={() => open(x)} />
          ))}
        </View>
      ) : (
        <ToolGrid>{s.tools.map((x) => (s.size === 'small' ? <CalcTile key={x.route} tool={x} onPress={() => open(x)} /> : <LiveTile key={x.route} tool={x} onPress={() => open(x)} />))}</ToolGrid>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <Screen tabbed>
        <HintRow text={g.subtitle} />
        {g.sections.map(section)}
      </Screen>
      <TabBar active={g.id} />
    </View>
  );
}
