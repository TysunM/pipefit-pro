import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { reachAfter, reachBefore, type Knot } from '../../calc/knots/knots';
import { lengthTo, type Laid } from '../../calc/knots/rope';

/** The ropes' lengths, shown as far as `to` says (points along each rope). */
export const lengthsAt = (laid: Laid, to: readonly number[]) => to.map((p, i) => lengthTo(laid.samples[i]!, p));

const ease = (f: number) => (f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2);

/**
 * A step played like a short film on a loop: the working end runs from where
 * the step starts to where it ends, holds there a moment, and runs again.
 * Paused, or with Reduce Motion on, the step is shown done.
 */
export function useStepPlayer(knot: Knot, laid: Laid, step: number, playing: boolean) {
  const before = useMemo(() => lengthsAt(laid, reachBefore(knot, step)), [knot, laid, step]);
  const after = useMemo(() => lengthsAt(laid, reachAfter(knot, step)), [knot, laid, step]);
  const moving = knot.steps[step]?.rope ?? 0;
  const [shown, setShown] = useState<number[]>(after);
  const [going, setGoing] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => live && setStill(r))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const dist = (after[moving] ?? 0) - (before[moving] ?? 0);
    if (!playing || still || dist < 1) {
      setShown(after);
      setGoing(false);
      return;
    }
    // About a rope's width every tenth of a second: slow enough to follow over and under.
    const run = Math.min(3600, Math.max(1000, (dist / 115) * 1000));
    const hold = 1300;
    const t0 = Date.now();
    let raf = 0;
    const tick = () => {
      const el = (Date.now() - t0) % (run + hold);
      const f = ease(Math.min(1, el / run));
      setShown(before.map((b, i) => (i === moving ? b + ((after[i] ?? b) - b) * f : (after[i] ?? b))));
      setGoing(el < run);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [before, after, moving, playing, still]);

  return { shown, moving, going };
}
