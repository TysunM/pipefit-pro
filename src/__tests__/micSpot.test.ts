import { floatingMicHidden, hideFloatingMic, subscribeMicSpot } from '../voice/micSpot';

test('the floating mic steps aside while any screen asks, and comes back when the last ask is returned', () => {
  const seen: boolean[] = [];
  const off = subscribeMicSpot(() => seen.push(floatingMicHidden()));
  expect(floatingMicHidden()).toBe(false);
  const a = hideFloatingMic();
  const b = hideFloatingMic();
  a();
  a(); // returned twice counts once
  expect(floatingMicHidden()).toBe(true);
  b();
  expect(floatingMicHidden()).toBe(false);
  off();
  hideFloatingMic()();
  expect(seen).toEqual([true, true, true, false]);
});
