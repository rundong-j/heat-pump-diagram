export type SystemType = "minisplit" | "ducted";
export type CycleMode = "cooling" | "heating";
export type ComponentStyle = "simpleBox" | "icon" | "sketch" | "crossSection";
export type BackgroundStyle = "none" | "house";
export type IndoorSide = "left" | "right";
export type ThemeMode = "light" | "dark";
export type CoilLabelStyle = "role" | "location";
export type LineStyle = "solid" | "dashed" | "arrow";
export type LineColorStyle = "temperatureBased" | "constant";
export type LineWidthStyle = "constant" | "pressureBased";

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
  lineStyle: LineStyle;
  lineColor: LineColorStyle;
  lineWidth: LineWidthStyle;
  overlays: OverlayToggles;
  playback: PlaybackState;
};

export function createDefaultConfig(): DiagramConfig {
  return {
    systemType: "minisplit",
    mode: "heating",
    componentStyle: "crossSection", // temporary default while polishing cross-section art
    background: "house",
    showReversingValve: false,
    indoorSide: "right",
    theme: "light",
    fontScale: 1.3,
    coilLabels: "role",
    lineStyle: "dashed",
    lineColor: "temperatureBased",
    lineWidth: "pressureBased",
    overlays: {
      labels: true,
      pressure: false,
      temperature: false,
      phase: false,
      direction: true,
      heatTransfer: true,
    },
    playback: {
      playing: true,
      speed: 1,
    },
  };
}
