export type SystemType = "minisplit" | "ducted";
export type CycleMode = "cooling" | "heating";
export type ComponentStyle = "simpleBox" | "icon" | "sketch" | "crossSection";
export type BackgroundStyle = "none" | "house";
export type IndoorSide = "left" | "right";
export type ThemeMode = "light" | "dark";
export type CoilLabelStyle = "role" | "location";

export type OverlayToggles = {
  labels: boolean;
  pressure: boolean;
  temperature: boolean;
  phase: boolean;
  direction: boolean;
  heatTransfer: boolean;
};

export type PlaybackState = {
  playing: boolean;
  speed: number;
};

export type DiagramConfig = {
  systemType: SystemType;
  mode: CycleMode;
  componentStyle: ComponentStyle;
  background: BackgroundStyle;
  showReversingValve: boolean;
  indoorSide: IndoorSide;
  theme: ThemeMode;
  fontScale: number;
  coilLabels: CoilLabelStyle;
  overlays: OverlayToggles;
  playback: PlaybackState;
};

export function createDefaultConfig(): DiagramConfig {
  return {
    systemType: "minisplit",
    mode: "heating",
    componentStyle: "simpleBox",
    background: "house",
    showReversingValve: false,
    indoorSide: "right",
    theme: "light",
    fontScale: 1.3,
    coilLabels: "role",
    overlays: {
      labels: true,
      pressure: false,
      temperature: false,
      phase: false,
      direction: true,
      heatTransfer: false,
    },
    playback: {
      playing: true,
      speed: 1,
    },
  };
}
