export type RootStackParamList = {
  Home: undefined;
  /** The Tools or Logs tab — see navigation/groups.ts. */
  Group: { id: 'tools' | 'logs' };
  /** Everything saved on the phone, one card per kind. */
  Projects: undefined;
  SimpleOffset: undefined;
  RollingOffset: undefined;
  CutLength: undefined;
  SaddleBend: undefined;
  MiterBend: undefined;
  HandBender: undefined;
  /** Which joint in the register is being worked. Absent means the unnamed one. */
  FlangeBoltUp: { jointId?: string } | undefined;
  Joints: undefined;
  Heats: undefined;
  /** The pressure test log: every hydro and pneumatic test on the phone. */
  PressureTests: undefined;
  /** One test's record, open to fill in, time and sign. */
  PressureTest: { testId: string };
  /** The daily shift report: today's, or the day picked on the screen. */
  ShiftReport: undefined;
  OrderSheet: undefined;
  Calculator: undefined;
  Level: undefined;
  /** A saved spool to open on arrival. Absent means the one on screen. */
  SpoolBuilder: { spoolId?: string } | undefined;
  /** The sketch book: every iso drawn on the phone. */
  IsoSketch: undefined;
  /** One sketch, open to draw on. */
  IsoDraw: { id: string };
  Reference: undefined;
  ReferenceTable: { id: string };
  Settings: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
