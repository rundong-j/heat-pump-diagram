export type SystemType = "minisplit" | "ducted";
export type CycleMode = "cooling" | "heating";
export type ComponentStyle = "simpleBox" | "icon" | "sketch" | "crossSection";
export type BackgroundStyle = "none" | "house";
export type IndoorSide = "left" | "right";

export type OverlayToggles = {
  labels: boolean;
  pressure: boolean;
  temperature: boolean;
  phase: boolean;
  direction: boolean;
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
  overlays: OverlayToggles;
  playback: PlaybackState;
};

export function createDefaultConfig(): DiagramConfig {
  return {
    systemType: "minisplit",
    mode: "cooling",
    componentStyle: "simpleBox",
    background: "none",
    showReversingValve: false,
    indoorSide: "left",
    overlays: {
      labels: true,
      pressure: false,
      temperature: false,
      phase: false,
      direction: true,
    },
    playback: {
      playing: true,
      speed: 1,
    },
  };
}
