import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { group } from '../navigation/groups';
import { Screen } from '../components/Screen';
import { CalculatorCard } from '../components/CalculatorCard';
import { HintRow } from '../components/HintRow';
import { FooterNote } from '../components/Results';
import { useTheme } from '../theme/ThemeProvider';
import { View } from 'react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'Group'>;

/**
 * One card's worth of tools.
 *
 * The same card as the home screen, drawing and all, so a man who has learned
 * the front page has learned this too. The list is short enough to read rather
 * than scroll, which is the whole point of having it.
 */
export function GroupScreen({ route, navigation }: Props) {
  const t = useTheme();
  const g = group(route.params.id);

  if (!g) return <Screen><FooterNote text="That group is not in this build." /></Screen>;

  return (
    <Screen>
      <HintRow text={g.subtitle} />
      <View style={{ paddingHorizontal: t.space.md, paddingTop: t.space.md }}>
        {g.tools.map((tool) => (
          <CalculatorCard
            key={tool.route}
            art={tool.route}
            title={tool.title}
            subtitle={tool.subtitle}
            icon={tool.icon}
            onPress={() => navigation.navigate(tool.route as never)}
          />
        ))}
      </View>
    </Screen>
  );
}
