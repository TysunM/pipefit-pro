// Every store, ready to back up or restore into
// ---------------------------------------------
// Shared by the backup screen and the nudge on Home, so a backup made from
// either is the same file. The reasoning is in backup.ts.

import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useSettings } from './settings';
import { useJoints } from './joints';
import { useHeats } from './heats';
import { useSpools } from './spools';
import { useSketches } from './sketches';
import { useLevels } from './levels';
import { usePressureTests } from './pressureTests';
import { useShifts } from './shifts';
import { useFittings } from './fittings';
import { useCuts } from './cuts';
import { backupFileName, backupSummary, makeBackup } from './backup';
import { shareBackup, type FileOutcome } from './backupFile';
import { useLastBackup } from './lastBackup';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type StoreHandle = { value: any; apply: (f: (v: any) => any) => void };

export function useBackupNow() {
  const { settings } = useSettings();
  const joints = useJoints();
  const heats = useHeats();
  const spools = useSpools();
  const sketches = useSketches();
  const levels = useLevels();
  const tests = usePressureTests();
  const shifts = useShifts();
  const fittings = useFittings();
  const cuts = useCuts();
  const last = useLastBackup();
  const [busy, setBusy] = useState(false);

  const stores: Record<string, StoreHandle> = {
    'pipefit.pressure.v1': { value: tests.log, apply: tests.apply as any },
    'pipefit.joints.v1': { value: joints.register, apply: joints.apply as any },
    'pipefit.heats.v1': { value: heats.book, apply: heats.apply as any },
    'pipefit.spools.v1': { value: spools.shelf, apply: spools.apply as any },
    'pipefit.sketches.v1': { value: sketches.book, apply: sketches.apply as any },
    'pipefit.levels.v1': { value: levels.log, apply: levels.apply as any },
    'pipefit.shifts.v1': { value: shifts.log, apply: shifts.apply as any },
    'pipefit.fittings.v1': { value: fittings.library, apply: fittings.apply as any },
    'pipefit.cuts.v1': { value: cuts.log, apply: cuts.apply as any },
  };
  const values = Object.fromEntries(Object.entries(stores).map(([k, s]) => [k, s.value]));
  const summary = backupSummary(values);
  const total = summary.reduce((n, s) => n + s.count, 0);

  const backUp = async (): Promise<FileOutcome> => {
    setBusy(true);
    const now = new Date();
    const out = await shareBackup(makeBackup(values, settings, now), backupFileName(now, settings.projectId));
    setBusy(false);
    if (out.ok) {
      last.mark(now.getTime());
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
    return out;
  };

  return { stores, values, summary, total, backUp, busy, lastAt: last.at };
}
