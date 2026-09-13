import {
  CUBIC_INCHES_PER_GALLON, PSI_PER_FOOT_OF_WATER, areaFromFlowAndVelocity, areaFromForceAndPressure,
  circleFromArea, circleFromCircumference, circleFromDiameter, flowFromVelocity, forceFromPressure,
  headToPressure, pressureFromForce, pressureToHead, velocityFromFlow,
} from '../calc/hydraulics';
import { pipeDims } from '../calc/pipeData';

const near = (a: number, b: number, tol: number) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe('circle', () => {
  // Rows taken from printed circumference and area tables.
  const PRINTED: [number, number, number][] = [
    [7, 21.9911, 38.4845], [10, 31.4159, 78.5398], [25, 78.5398, 490.874],
    [31, 97.3894, 754.768], [39, 122.5221, 1194.59], [40, 125.6637, 1256.64],
    [43, 135.0885, 1452.20], [15.125, 47.5166, 179.672], [46.875, 147.2622, 1725.73],
  ];

  test.each(PRINTED)('diameter %s', (d, c, a) => {
    const s = circleFromDiameter(d)!;
    near(s.circumference, c, 1e-3);
    near(s.area, a, 1e-2);
  });

  test('the three ways in agree', () => {
    for (const d of [0.5, 2, 6.625, 40]) {
      const byD = circleFromDiameter(d)!;
      near(circleFromCircumference(byD.circumference)!.diameter, d, 1e-9);
      near(circleFromArea(byD.area)!.diameter, d, 1e-9);
    }
  });

  test('radius is half the diameter', () => near(circleFromDiameter(9)!.radius, 4.5, 1e-12));

  test('nothing from nothing', () => {
    for (const bad of [0, -1, NaN]) {
      expect(circleFromDiameter(bad)).toBeUndefined();
      expect(circleFromCircumference(bad)).toBeUndefined();
      expect(circleFromArea(bad)).toBeUndefined();
    }
  });
});

describe('flow and velocity', () => {
  test('a gallon is 231 cubic inches', () => expect(CUBIC_INCHES_PER_GALLON).toBe(231));

  test('flow and velocity invert through the same bore', () => {
    const area = pipeDims(6, '40')!.boreArea;
    for (const v of [2, 5, 8, 12]) near(velocityFromFlow(area, flowFromVelocity(area, v)), v, 1e-9);
  });

  test('a six inch schedule 40 line at 5 feet per second', () => {
    const area = pipeDims(6, '40')!.boreArea;
    // 28.89 sq in x 5 ft/s x 12 in/ft x 60 s/min / 231 = about 450 gpm
    near(flowFromVelocity(area, 5), 450.3, 0.5);
  });

  test('area comes back from flow and velocity', () => {
    const area = pipeDims(4, '40')!.boreArea;
    near(areaFromFlowAndVelocity(flowFromVelocity(area, 6), 6), area, 1e-9);
  });

  test('doubling the bore area at the same velocity doubles the flow', () => {
    near(flowFromVelocity(20, 5), 2 * flowFromVelocity(10, 5), 1e-9);
  });

  test('no bore, no answer', () => {
    expect(Number.isFinite(flowFromVelocity(0, 5))).toBe(false);
    expect(Number.isFinite(velocityFromFlow(-1, 5))).toBe(false);
    expect(Number.isFinite(areaFromFlowAndVelocity(100, 0))).toBe(false);
  });
});

describe('pressure and force', () => {
  test('force is pressure over the area', () => near(forceFromPressure(10, 150), 1500, 1e-12));

  test('the three invert', () => {
    near(pressureFromForce(10, forceFromPressure(10, 150)), 150, 1e-12);
    near(areaFromForceAndPressure(forceFromPressure(10, 150), 150), 10, 1e-12);
  });

  test('a 150 psi test on a six inch schedule 40 bore', () => {
    const area = pipeDims(6, '40')!.boreArea;
    near(forceFromPressure(area, 150), 4333.4, 1);
  });

  test('a foot of water is 0.4335 psi', () => {
    near(PSI_PER_FOOT_OF_WATER, 0.4335275, 1e-7);
    near(headToPressure(100), 43.35275, 1e-5);
    near(pressureToHead(headToPressure(37.5)), 37.5, 1e-9);
  });

  test('no area, no pressure', () => {
    expect(Number.isFinite(pressureFromForce(0, 500))).toBe(false);
    expect(Number.isFinite(areaFromForceAndPressure(500, 0))).toBe(false);
  });
});
