import {
  SQUARE_WITHIN,
  TWIST_FROM,
  Viewport,
  bounds,
  contained,
  fitViewport,
  handWindow,
  holding,
  rotPt,
  settleTurn,
  toPage,
  toView,
  turnDegrees,
  turnOver,
  wrapAngle,
  zoomAbout,
} from '../calc/iso';
import { Stroke, sketchBounds } from '../state/sketchStore';

// Turning the paper on the desk
// -----------------------------
// Two fingers turn the page to any angle. It is only ever the view: the finger
// has to land on the page point it is over, whatever the turn, and turning
// back has to give the page exactly as it was.

const deg = (d: number) => (d * Math.PI) / 180;
const near = (a: number[], b: number[]) => a.forEach((x, i) => expect(x).toBeCloseTo(b[i]!, 6));

describe('the window, turned', () => {
  const v: Viewport = { scale: 1.7, tx: 120, ty: -40, rot: deg(37) };

  test('screen to page and back is the same point at any turn', () => {
    for (const r of [0, deg(1), deg(37), deg(90), deg(180), deg(-123)]) {
      const w = { ...v, rot: r };
      for (const p of [[0, 0], [412, 915], [-30, 77]] as [number, number][]) near(toView(toPage(p, w), w), p);
    }
  });

  test('a quarter turn clockwise on screen sends east to down', () => {
    const q = rotPt([1, 0], deg(90));
    near(q, [0, 1]);
  });

  test('a window with no turn is the old window exactly', () => {
    const old = { scale: 2, tx: 10, ty: 20 };
    expect(toPage([50, 60], old)).toEqual([20, 20]);
    expect(toView([20, 20], old)).toEqual([50, 60]);
  });

  test('holding puts the page point under the screen point', () => {
    const w = holding(v, [33, -8], [200, 300]);
    near(toView([33, -8], w), [200, 300]);
    expect(w.rot).toBe(v.rot);
    expect(w.scale).toBe(v.scale);
  });

  test('zooming keeps the turn', () => {
    expect(zoomAbout(v, 1.25, [100, 100]).rot).toBe(v.rot);
  });

  test('turning the sheet over keeps the turn and the middle', () => {
    const w = turnOver(v, 400, 600, { mirror: false, upside: false }, { mirror: true, upside: false });
    expect(w.rot).toBe(v.rot);
    const mid = toPage([200, 300], v);
    near(toView([-mid[0], mid[1]], w), [200, 300]);
  });
});

describe('two fingers', () => {
  const start: Viewport = { scale: 1, tx: 200, ty: 300, rot: 0 };
  const at0: [number, number] = [150, 260];

  test('the page point under the fingers stays under them through a pinch and a twist', () => {
    const page = toPage(at0, start);
    const w = handWindow(start, at0, [180, 240], 1.6, deg(40));
    near(toView(page, w), [180, 240]);
    expect(w.scale).toBeCloseTo(1.6);
    expect(turnDegrees(w.rot!)).toBe(40);
  });

  test('with no twist the page does not turn', () => {
    expect(handWindow({ ...start, rot: deg(20) }, at0, at0, 1.2, 0).rot).toBeCloseTo(deg(20));
  });

  test('zoom is held to its limits', () => {
    expect(handWindow(start, at0, at0, 100, 0).scale).toBe(3);
    expect(handWindow(start, at0, at0, 0.001, 0).scale).toBe(0.15);
    expect(handWindow(start, at0, at0, NaN, 0).scale).toBe(1);
  });

  test('near square it settles square; elsewhere it goes where the fingers put it', () => {
    expect(settleTurn(deg(3))).toBe(0);
    expect(settleTurn(deg(-4))).toBe(0);
    expect(settleTurn(deg(92))).toBeCloseTo(deg(90));
    expect(settleTurn(deg(178))).toBeCloseTo(deg(180));
    expect(settleTurn(deg(-87))).toBeCloseTo(deg(-90));
    expect(settleTurn(deg(30))).toBeCloseTo(deg(30));
    expect(settleTurn(deg(45))).toBeCloseTo(deg(45));
    expect(SQUARE_WITHIN).toBeLessThan(TWIST_FROM);
  });

  test('turns wrap, and read as 0 to 359 degrees', () => {
    expect(wrapAngle(deg(270))).toBeCloseTo(deg(-90));
    expect(wrapAngle(deg(-190))).toBeCloseTo(deg(170));
    expect(turnDegrees(deg(-90))).toBe(270);
    expect(turnDegrees(deg(360))).toBe(0);
    expect(turnDegrees(deg(179.6))).toBe(180);
  });
});

describe('fitting a turned drawing', () => {
  const strokes: Stroke[] = [{ kind: 'run', from: [0, 0, 0], to: [12, 0, 0] }];

  test('a long run turned a quarter fits on its side, bigger than it fits upright', () => {
    const w = 360;
    const h = 700;
    const up = sketchBounds(strokes, 'SW', 20, undefined, 0)!;
    const side = sketchBounds(strokes, 'SW', 20, undefined, deg(-60))!;
    const fitUp = fitViewport(up, w, h, 28, 3);
    const fitSide = fitViewport(side, w, h, 28, 3, deg(-60));
    expect(fitSide.rot).toBeCloseTo(deg(-60));
    expect(fitSide.scale).toBeGreaterThan(fitUp.scale);
    expect(contained(side, fitSide, w, h, 27)).toBe(true);
  });

  test('turned bounds are the points turned, not the upright box turned', () => {
    const b = bounds([[0, 0], [100, 0]].map((p) => rotPt(p as [number, number], deg(90))))!;
    expect(b.maxX - b.minX).toBeCloseTo(0);
    expect(b.maxY - b.minY).toBeCloseTo(100);
  });
});
