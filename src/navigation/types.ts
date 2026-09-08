export type RootStackParamList = {
  Home: undefined;
  SimpleOffset: undefined;
  RollingOffset: undefined;
  CutLength: undefined;
  SaddleBend: undefined;
  MiterBend: undefined;
  ThreadEngagement: undefined;
  HandBender: undefined;
  Settings: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
