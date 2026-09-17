export type RootStackParamList = {
  Home: undefined;
  SimpleOffset: undefined;
  RollingOffset: undefined;
  CutLength: undefined;
  SaddleBend: undefined;
  MiterBend: undefined;
  ThreadEngagement: undefined;
  HandBender: undefined;
  /** Which joint in the register is being worked. Absent means the unnamed one. */
  FlangeBoltUp: { jointId?: string } | undefined;
  Joints: undefined;
  Calculator: undefined;
  SpoolBuilder: undefined;
  Reference: undefined;
  ReferenceTable: { id: string };
  Settings: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
