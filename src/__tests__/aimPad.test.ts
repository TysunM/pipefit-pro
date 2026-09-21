import { AXES, flatAxes } from '../calc/aim';
import { dirVector } from '../calc/direction';
import { ISO_CORNERS, ISO_VIEW, PLAN_VIEW, screenAngle, screenScale } from '../components/spool3d/project';

const deg = (r: number) => (r * 180) / Math.PI;
const axis = (id: string) => dirVector(AXES.find((a) => a.id === id)!.dir);

describe('where the pad sits on an isometric', () => {
  it('draws up straight up the page, and down straight down', () => {
    // Screen y counts downward, so straight up is -90.
    expect(deg(screenAngle(axis('UP'), ISO_VIEW)!)).toBeCloseTo(-90, 6);
    expect(deg(screenAngle(axis('DN'), ISO_VIEW)!)).toBeCloseTo(90, 6);
  });

  it('draws all four level axes at the 30 degrees of iso paper', () => {
    for (const id of ['N', 'E', 'S', 'W']) {
      const a = Math.abs(deg(screenAngle(axis(id), ISO_VIEW)!));
      expect(Math.min(a, 180 - a)).toBeCloseTo(30, 6);
    }
  });

  it('spreads the six evenly, 60 degrees apart round the page', () => {
    const angles = AXES.map((a) => deg(screenAngle(dirVector(a.dir), ISO_VIEW)!))
      .map((a) => ((a % 360) + 360) % 360)
      .sort((x, y) => x - y);
    for (let i = 0; i < angles.length; i += 1) {
      const gap = (angles[(i + 1) % angles.length]! - angles[i]! + 360) % 360;
      expect(gap).toBeCloseTo(60, 5);
    }
  });

  it('turns the pad with the view, so a button never disagrees with the drawing', () => {
    const ne = deg(screenAngle(axis('N'), ISO_CORNERS.find((c) => c.id === 'NE')!.cam)!);
    const nw = deg(screenAngle(axis('N'), ISO_CORNERS.find((c) => c.id === 'NW')!.cam)!);
    // North draws up one way from one corner and up the other from the next.
    expect(Math.sign(Math.cos((ne * Math.PI) / 180))).not.toBe(Math.sign(Math.cos((nw * Math.PI) / 180)));
  });

  it('keeps every axis worth a quarter of its length on an isometric', () => {
    for (const a of AXES) expect(screenScale(dirVector(a.dir), ISO_VIEW)).toBeGreaterThan(0.25);
  });
});

describe('where the pad sits in a plan', () => {
  it('collapses up and down to a point, and says so instead of guessing an angle', () => {
    expect(screenAngle(axis('UP'), PLAN_VIEW.cam)).toBeNull();
    expect(screenAngle(axis('DN'), PLAN_VIEW.cam)).toBeNull();
    expect(screenScale(axis('UP'), PLAN_VIEW.cam)).toBeCloseTo(0, 9);
  });

  it('still draws the four level axes square, which is why a plan is read off', () => {
    for (const id of ['N', 'E', 'S', 'W']) {
      expect(screenScale(axis(id), PLAN_VIEW.cam)).toBeCloseTo(1, 9);
    }
  });
});

// A vertical plane is drawn true from square to its side, not from along it.
// The plane a north-running spool lies in is seen face-on from the east or the
// west; from the south it is edge-on and the whole spool draws as one line.
const FACE_ON_TO_NORTH = { yaw: -Math.PI / 2, pitch: 0 };
const ALONG_NORTH = { yaw: Math.PI, pitch: 0 };

describe('where the flat pad sits', () => {
  it('spreads its eight evenly round the page when the plane faces the viewer', () => {
    const cam = FACE_ON_TO_NORTH;
    const angles = flatAxes(0)
      .map((a) => deg(screenAngle(dirVector(a.dir), cam)!))
      .map((a) => ((a % 360) + 360) % 360)
      .sort((x, y) => x - y);
    expect(angles).toHaveLength(8);
    for (let i = 0; i < angles.length; i += 1) {
      const gap = (angles[(i + 1) % angles.length]! - angles[i]! + 360) % 360;
      expect(gap).toBeCloseTo(45, 5);
    }
  });

  it('draws every one of the eight at full length in that elevation', () => {
    for (const a of flatAxes(0)) expect(screenScale(dirVector(a.dir), FACE_ON_TO_NORTH)).toBeCloseTo(1, 6);
  });

  it('collapses the level pair when the same plane is viewed along its length', () => {
    // Not a fault to guard against — it is what an elevation down the run is,
    // and the pad has to be able to say a direction is unreadable from here.
    expect(screenAngle(dirVector(flatAxes(0)[0]!.dir), ALONG_NORTH)).toBeNull();
    // Up and down still draw true, which is why that elevation is worth having.
    expect(screenScale(dirVector(flatAxes(0)[2]!.dir), ALONG_NORTH)).toBeCloseTo(1, 9);
  });
});
