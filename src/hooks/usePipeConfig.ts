import { useCallback, useState } from 'react';
import { ElbowRadius, Schedule, findSize } from '../calc/pipe';
import { useSettings } from '../state/settings';

export function usePipeConfig() {
  const { settings } = useSettings();
  const [nps, setNps] = useState(settings.defaultNps);
  const [kind, setKind] = useState<ElbowRadius>(settings.defaultKind);
  const [schedule, setSchedule] = useState<Schedule>(settings.defaultSchedule);
  const [sheetOpen, setSheetOpen] = useState(false);

  const change = useCallback((patch: { nps?: number; kind?: ElbowRadius; schedule?: Schedule }) => {
    if (patch.nps !== undefined) setNps(patch.nps);
    if (patch.kind !== undefined) setKind(patch.kind);
    if (patch.schedule !== undefined) setSchedule(patch.schedule);
  }, []);

  return {
    nps,
    kind,
    schedule,
    size: findSize(nps),
    label: findSize(nps).label,
    sheetOpen,
    openSheet: () => setSheetOpen(true),
    closeSheet: () => setSheetOpen(false),
    change,
  };
}
