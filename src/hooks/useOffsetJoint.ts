import { useMemo } from 'react';
import { useSettings } from '../state/settings';
import { useFittings } from '../state/fittings';
import { lookup } from '../state/fittingLibrary';
import { FITTING_ANGLES, type ElbowRadius } from '../calc/pipe';
import { LIBRARY_FITTINGS } from '../calc/takeoffCatalog';
import { material, pipeSpec, wallLabel } from '../calc/materials';
import { JOINT_ANGLES, JOINT_NAME, jointHasGap, offsetElbow, offsetJoint, type OffsetJoint } from '../calc/offsetFitting';

const LIBRARY_ELBOW_NAME: Record<'socket' | 'nohub', Record<number, string>> = {
  socket: { 90: 'sock90', 45: 'sock45' },
  nohub: { 90: 'nh14', 45: 'nh18', 22.5: 'nh116' },
};

/**
 * The joint an offset screen works in, from the job's material: the elbow
 * each end takes out (calc/offsetFitting.ts), whether a gap comes off, the
 * angles the fittings are made in, and what to call them on screen.
 */
export function useOffsetJoint(nps: number, radius: ElbowRadius) {
  const { settings } = useSettings();
  const fittings = useFittings();
  const joint: OffsetJoint = offsetJoint(settings.material);
  const line = `${settings.material}:${settings.wall}`;
  const elbow = useMemo(
    () => (angle: number) => offsetElbow(joint, nps, radius, angle, (id, n) => lookup(fittings.library, line, id, n)),
    [joint, nps, radius, fittings.library, line],
  );
  const welded = joint === 'welded';
  /** "45° screwed elbow", "PVC 45° elbow", "No-hub 1/8 bend". */
  const fittingName = (angle: number): string => {
    const a = Number(angle.toFixed(2));
    if (joint === 'welded') return `${a}° butt weld elbow`;
    if (joint === 'screwed') return `${a}° screwed elbow`;
    const id = LIBRARY_ELBOW_NAME[joint][a];
    const label = LIBRARY_FITTINGS.find((f) => f.id === id)?.label ?? `${a}°`;
    return joint === 'socket' ? `PVC ${label}` : `No-hub ${label}`;
  };
  return {
    joint,
    welded,
    elbow,
    line,
    /** A weld's root gap or a no-hub coupling's centre stop; nothing for screwed or socket. */
    hasGap: jointHasGap(joint),
    /** The gap when none is typed: the job's weld gap; a no-hub stop is nothing until it is entered. */
    gapDefault: welded ? settings.defaultGap : 0,
    gapLabel: joint === 'nohub' ? 'Centre stop' : 'Gap/joint',
    presets: JOINT_ANGLES[joint] ?? FITTING_ANGLES,
    jointName: JOINT_NAME[joint],
    /** The pipe as the card names it: "PVC SCH 40". */
    pipeName: `${material(settings.material).short} ${wallLabel(settings.wall)}`,
    fittingName,
    /** Empty pipe, lb per foot, in the job's material where it comes in this size. */
    lbPerFt: pipeSpec(settings.material, nps, settings.wall)?.lbPerFt ?? NaN,
  };
}
