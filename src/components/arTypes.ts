import type { V3 } from '../calc/spatial';

/** What the AR capture hands back: the points marked, in order, in metres. */
export type ArCaptureProps = {
  /** Called when the camera closes, with whatever was marked. */
  onDone: (points: V3[]) => void;
  /** Inches as the reader has them set: 64-1/4" or 163.2 cm. */
  format: (inches: number) => string;
};
