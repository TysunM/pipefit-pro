import { EDGE, TAP_SLOP, clampPoint, isTap, micArea, parseMicPlace, placeToPoint, pointToPlace, serialiseMicPlace } from '../voice/micPlace';

const SIZE = 64;
const phone = micArea(412, 915, { top: 24, bottom: 16 }, SIZE);

describe('where the mic can stand', () => {
  test('inside the screen, clear of the status bar and the home indicator', () => {
    expect(phone).toEqual({ left: EDGE, top: 24 + EDGE, right: 412 - SIZE - EDGE, bottom: 915 - 16 - SIZE - EDGE });
  });
  test('a screen too small to move in pins it rather than turning the room inside out', () => {
    const tiny = micArea(60, 60, { top: 0, bottom: 0 }, SIZE);
    expect(tiny.right).toBe(tiny.left);
    expect(tiny.bottom).toBe(tiny.top);
    expect(pointToPlace({ x: 30, y: 30 }, tiny)).toEqual({ fx: 0, fy: 0 });
  });
  test('a drop past the edge stops at the edge', () => {
    expect(clampPoint({ x: -50, y: 2000 }, phone)).toEqual({ x: phone.left, y: phone.bottom });
  });
});

describe('the place is kept as a share of the room, so it survives another screen size', () => {
  test('a point goes to a place and back to the same point', () => {
    const p = { x: 100, y: 400 };
    const back = placeToPoint(pointToPlace(p, phone), phone);
    expect(back.x).toBeCloseTo(100, 6);
    expect(back.y).toBeCloseTo(400, 6);
  });
  test('top-left stays top-left and bottom-right stays bottom-right on a tablet', () => {
    const tablet = micArea(1024, 1366, { top: 24, bottom: 20 }, SIZE);
    expect(placeToPoint(pointToPlace({ x: phone.left, y: phone.top }, phone), tablet)).toEqual({ x: tablet.left, y: tablet.top });
    expect(placeToPoint(pointToPlace({ x: phone.right, y: phone.bottom }, phone), tablet)).toEqual({ x: tablet.right, y: tablet.bottom });
  });
  test('turning the phone keeps it on the screen', () => {
    const landscape = micArea(915, 412, { top: 0, bottom: 0 }, SIZE);
    const p = placeToPoint({ fx: 0.9, fy: 0.95 }, landscape);
    expect(p.x).toBeLessThanOrEqual(landscape.right);
    expect(p.y).toBeLessThanOrEqual(landscape.bottom);
  });
});

test('a press that wanders less than the slop is a tap; more is a drag', () => {
  expect(isTap(0, 0)).toBe(true);
  expect(isTap(6, 6)).toBe(true);
  expect(isTap(TAP_SLOP, 0)).toBe(true);
  expect(isTap(TAP_SLOP + 1, 0)).toBe(false);
  expect(isTap(8, 8)).toBe(false);
});

describe('kept on the phone', () => {
  test('goes round and back', () => expect(parseMicPlace(serialiseMicPlace({ fx: 0.25, fy: 0.75 }))).toEqual({ fx: 0.25, fy: 0.75 }));
  test('nothing kept, or anything damaged, stands it where it shipped', () => {
    expect(parseMicPlace(null)).toBeNull();
    expect(parseMicPlace('nonsense')).toBeNull();
    expect(parseMicPlace(JSON.stringify({ v: 2, fx: 0.5, fy: 0.5 }))).toBeNull();
    expect(parseMicPlace(JSON.stringify({ v: 1, fx: 'left', fy: 0.5 }))).toBeNull();
  });
  test('a place off the room is brought back onto it', () => expect(parseMicPlace(JSON.stringify({ v: 1, fx: -3, fy: 9 }))).toEqual({ fx: 0, fy: 1 }));
});
