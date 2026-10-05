import { useCallback, useEffect, useRef, useState } from 'react';
import { ElbowRadius, Schedule, findSize } from '../calc/pipe';
import { useSettings } from '../state/settings';
import { specMoved } from './specFollow';

/**
 * The pipe a calculator works: the job's when it opens, then its own. A change
 * to the job's specs while it is open is followed (see specFollow.ts), unless
 * the screen's pipe belongs to something else — a saved spool — and it says
 * `follow: false`.
 */
export function usePipeConfig({ follow = true }: { follow?: boolean } = {}) {
  const { settings } = useSettings();
  const [nps, setNps] = useState(settings.defaultNps);
  const [kind, setKind] = useState<ElbowRadius>(settings.defaultKind);
  const [schedule, setSchedule] = useState<Schedule>(settings.defaultSchedule);
  const [sheetOpen, setSheetOpen] = useState(false);

  const job = { nps: settings.defaultNps, kind: settings.defaultKind, schedule: settings.defaultSchedule };
  const seen = useRef(job);
  useEffect(() => {
    const patch = specMoved(seen.current, job);
    seen.current = job;
    if (!follow) return;
    if (patch.nps !== undefined) setNps(patch.nps);
    if (patch.kind !== undefined) setKind(patch.kind);
    if (patch.schedule !== undefined) setSchedule(patch.schedule);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.defaultNps, settings.defaultKind, settings.defaultSchedule, follow]);

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
