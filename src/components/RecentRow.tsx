import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { useRecents } from '../state/recents';
import { tool } from '../navigation/groups';
import { Plate } from './metal';
import { GridLabel } from './ToolTile';

/**
 * The tools you opened last, across the top.
 *
 * Grouping the rest behind tiles costs a tap. This is where that tap comes
 * back: a man works two or three tools in a shift, and those are one tap from
 * the front page whatever tile they live under.
 *
 * Nothing is shown until something has been opened. An empty strip with three
 * grey slots in it is furniture, and a home screen full of furniture is what
 * the grouping was for.
 */
export function RecentRow({ onOpen }: { onOpen: (route: string) => void }) {
  const t = useTheme();
  const { recent } = useRecents();
  const tools = recent.map((r) => tool(r)).filter((x): x is NonNullable<typeof x> => Boolean(x));
  if (tools.length === 0) return null;

  return (
    <View>
      <GridLabel text="Last used" />
      <View style={{ flexDirection: 'row', gap: t.space.sm, paddingHorizontal: t.layout.screenPadding }}>
        {tools.map((x) => (
          <Pressable
            key={x.route}
            onPress={() => onOpen(x.route)}
            accessibilityRole="button"
            accessibilityLabel={`${x.title}, used recently`}
            style={{ flex: 1 }}
          >
            {({ pressed }) => (
              <Plate
                sunk={pressed}
                radius={t.radius.md}
                style={{ height: 52, paddingHorizontal: t.space.sm, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
              >
                <Ionicons name={x.icon} size={16} color={t.colors.accent} />
                <Text style={[t.type.captionStrong, { color: t.colors.text, fontSize: 14, flexShrink: 1 }]} numberOfLines={2}>
                  {x.title}
                </Text>
              </Plate>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}
