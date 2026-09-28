import { PALM_EDGE, TOGETHER_MS, onEdge, startsTwoFingers } from '../calc/palm';

// A finger or a palm
// ------------------

describe('a touch on the edge of the screen', () => {
  test('within the edge band on either side it is a palm', () => {
    expect(onEdge(0, 412)).toBe(true);
    expect(onEdge(PALM_EDGE - 1, 412)).toBe(true);
    expect(onEdge(412 - PALM_EDGE + 1, 412)).toBe(true);
  });

  test('anywhere in from the edge it is a finger', () => {
    expect(onEdge(PALM_EDGE, 412)).toBe(false);
    expect(onEdge(206, 412)).toBe(false);
    expect(onEdge(412 - PALM_EDGE, 412)).toBe(false);
  });
});

describe('a second touch', () => {
  test('with nothing being drawn, or nothing drawn yet, it is two fingers', () => {
    expect(startsTwoFingers(false, true, 5000)).toBe(true);
    expect(startsTwoFingers(true, false, 5000)).toBe(true);
  });

  test('landing with the first it is two fingers, even if the first has already moved a hair', () => {
    expect(startsTwoFingers(true, true, TOGETHER_MS - 1)).toBe(true);
  });

  test('once a stroke is under way it is a hand resting, and the stroke goes on', () => {
    expect(startsTwoFingers(true, true, TOGETHER_MS)).toBe(false);
    expect(startsTwoFingers(true, true, 2000)).toBe(false);
  });
});
