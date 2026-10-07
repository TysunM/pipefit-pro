import { onDay, workedOn } from '../state/today';
import { dayKey } from '../calc/days';

const at = (h: number, d = 7) => new Date(2026, 9, d, h, 30).getTime();
const today = dayKey(at(9));

describe('the Today view', () => {
  test('a time stamp is on a day by the local calendar, from midnight to midnight', () => {
    expect(today).toBe('2026-10-07');
    expect(onDay(new Date(2026, 9, 7, 0, 0).getTime(), today)).toBe(true);
    expect(onDay(new Date(2026, 9, 7, 23, 59).getTime(), today)).toBe(true);
    expect(onDay(new Date(2026, 9, 6, 23, 59).getTime(), today)).toBe(false);
    expect(onDay(null, today)).toBe(false);
    expect(onDay(0, today)).toBe(false);
  });

  test('worked today when any stamp falls today: made, changed, finished, or dated', () => {
    const xs = [
      { id: 'made-today', at: [at(8)] },
      { id: 'old-touched-today', at: [at(8, 1), at(14)] },
      { id: 'finished-today', at: [at(8, 2), null, at(15)] },
      { id: 'dated-today', at: [at(8, 3), '2026-10-07'] },
      { id: 'old', at: [at(8, 6), '2026-10-06'] },
      { id: 'never', at: [undefined, null] },
    ];
    expect(workedOn(xs, today, (x) => x.at).map((x) => x.id)).toEqual(['made-today', 'old-touched-today', 'finished-today', 'dated-today']);
  });

  test('a filter, not a delete: the list given is left whole and its order kept', () => {
    const xs = [{ t: at(9) }, { t: at(9, 5) }, { t: at(7) }];
    const copy = [...xs];
    expect(workedOn(xs, today, (x) => [x.t])).toEqual([xs[0], xs[2]]);
    expect(xs).toEqual(copy);
  });
});
