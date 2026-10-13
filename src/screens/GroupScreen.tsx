import React, { useCallback } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { group, type Group, type Section, type Tool } from '../navigation/groups';
import { Screen } from '../components/Screen';
import { CalcTile, GridLabel, WideTile } from '../components/ToolTile';
import { LiveTile } from '../components/LiveTile';
import { HintRow } from '../components/HintRow';
import { FooterNote } from '../components/Results';
import { TabBar } from '../components/TabBar';
import { ReorderZone, type Hold } from '../components/Reorder';
import { useTheme } from '../theme/ThemeProvider';
import { sectionZone } from '../state/layout';
import { useZone } from '../state/layouts';

type Props = NativeStackScreenProps<RootStackParamList, 'Group'>;

const routeOf = (x: Tool) => x.route;

/**
 * The Tools tab, the Logs tab or the Edu tab.
 *
 * The same tiles as the front page, drawing and all, in the sections
 * groups.ts gives: big pictures for the instruments and the books, small
 * tiles for the everyday bends and offsets. Held, a tile lifts and can be
 * carried anywhere in its section; the order is kept.
 */
export function GroupScreen({ route, navigation }: Props) {
  const t = useTheme();
  const g = group(route.params.id);
  if (!g) return <Screen><FooterNote text="That tab is not in this build." /></Screen>;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <Screen tabbed>
        <HintRow text={`${g.subtitle} Hold a tile to move it.`} />
        {g.sections.map((s) => (
          <SectionTiles key={s.id} g={g} s={s} open={(x) => navigation.navigate(x.route as never)} />
        ))}
      </Screen>
      <TabBar active={g.id} />
    </View>
  );
}

function SectionTiles({ g, s, open }: { g: Group; s: Section; open: (x: Tool) => void }) {
  const t = useTheme();
  const { items, move } = useZone(sectionZone(g.id, s.id), s.tools, routeOf);
  const render = useCallback(
    (x: Tool, hold: Hold) =>
      s.size === 'wide' ? (
        <WideTile tool={x} onPress={() => open(x)} hold={hold} />
      ) : s.size === 'small' ? (
        <CalcTile tool={x} onPress={() => open(x)} hold={hold} />
      ) : (
        <LiveTile tool={x} onPress={() => open(x)} hold={hold} />
      ),
    [s.size, open]
  );
  // No wrapper: the zone stands directly among the page's children, so it can
  // stand over the next section while a tile is carried across the edge.
  return (
    <>
      <GridLabel text={s.title} meta={`${s.tools.length}`} />
      <ReorderZone items={items} idOf={routeOf} layout={s.size === 'wide' ? 'stack' : 'grid'} onMove={move} render={render} style={{ paddingHorizontal: t.layout.screenPadding }} />
    </>
  );
}
