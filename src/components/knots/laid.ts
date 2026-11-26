import { layout, type Laid } from '../../calc/knots/rope';
import type { Knot } from '../../calc/knots/knots';

// A knot is laid out once (its crossings found, its rope measured) and kept: the hub draws them all.
const cache = new Map<string, Laid>();
export function laidOf(k: Knot): Laid {
  let l = cache.get(k.id);
  if (!l) {
    l = layout(k.ropes, k.cross);
    cache.set(k.id, l);
  }
  return l;
}
