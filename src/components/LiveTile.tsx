import React from 'react';
import type { Tool } from '../navigation/groups';
import { CountBadge, FeatureArrow, FeatureTag, ToolTile } from './ToolTile';
import type { Hold } from './Reorder';
import { LevelBadge } from './LevelBadge';
import { useJoints } from '../state/joints';
import { useHeats } from '../state/heats';
import { useSpools } from '../state/spools';
import { usePressureTests } from '../state/pressureTests';
import { listed } from '../state/register';

/**
 * A big tile with what it knows about itself: the 3D spool featured, the
 * level live, and every record-keeping tool with how many it holds. Home and
 * the tabs both draw tools this way, so a tool looks the same wherever it is.
 */
export function LiveTile({ tool, onPress, hold }: { tool: Tool; onPress: () => void; hold?: Hold }) {
  const { register, hydrated: jIn } = useJoints();
  const { book: heats, hydrated: hIn } = useHeats();
  const { shelf, hydrated: sIn } = useSpools();
  const { log: tests, hydrated: tIn } = usePressureTests();

  if (tool.route === 'SpoolBuilder')
    return <ToolTile tool={tool} featured badge={<FeatureTag text="Explore" />} corner={<FeatureArrow />} onPress={onPress} hold={hold} />;
  if (tool.route === 'Level') return <ToolTile tool={tool} badge={<LevelBadge />} onPress={onPress} hold={hold} />;

  const n =
    tool.route === 'Joints' && jIn
      ? listed(register).length
      : tool.route === 'Heats' && hIn
        ? heats.heats.length
        : tool.route === 'OrderSheet' && sIn
          ? shelf.spools.length
          : tool.route === 'PressureTests' && tIn
            ? tests.tests.length
            : null;
  return <ToolTile tool={tool} corner={n === null ? undefined : <CountBadge n={n} />} onPress={onPress} hold={hold} />;
}
