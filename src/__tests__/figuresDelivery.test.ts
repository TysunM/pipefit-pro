import { listenForFigures, publishFigures, takeWaitingFigures } from '../voice/figureBus';

const twelve = { offset: { n: 12, inches: false } };

describe('figures said for a tool reach the screen in front', () => {
  test('a screen in front takes them at once', () => {
    const got: unknown[] = [];
    const stop = listenForFigures('SimpleOffset', (f) => void got.push(f), () => true);
    publishFigures('SimpleOffset', twelve);
    expect(got).toEqual([twelve]);
    stop();
  });

  test('a screen not in front (going out, or under another) does not take them: they wait for the one coming in', () => {
    const old: unknown[] = [];
    const stop = listenForFigures('SimpleOffset', (f) => void old.push(f), () => false);
    publishFigures('SimpleOffset', twelve, 1000);
    expect(old).toEqual([]);
    const fresh: unknown[] = [];
    takeWaitingFigures('SimpleOffset', (f) => void fresh.push(f), 2000);
    expect(fresh).toEqual([twelve]);
    // Taken once: coming in front again later finds nothing.
    takeWaitingFigures('SimpleOffset', (f) => void fresh.push(f), 2500);
    expect(fresh).toHaveLength(1);
    stop();
  });

  test('figures left waiting go stale after ten seconds', () => {
    publishFigures('RollingOffset', twelve, 0);
    const got: unknown[] = [];
    takeWaitingFigures('RollingOffset', (f) => void got.push(f), 10_001);
    expect(got).toEqual([]);
  });

  test('a refusal from the screen in front comes back', () => {
    const stop = listenForFigures('FlangeBoltUp', () => 'Bolts are logged: start a new joint first.', () => true);
    expect(publishFigures('FlangeBoltUp', { bolts: { n: 12, inches: false } })).toMatch(/new joint/);
    stop();
  });
});
