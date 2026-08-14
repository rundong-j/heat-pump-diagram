export type SystemType = "minisplit" | "ducted";
export type CycleMode = "cooling" | "heating";
export type ComponentStyle = "icon" | "sketch" | "crossSection";
export type BackgroundStyle = "none" | "house";

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
  overlays: OverlayToggles;
  playback: PlaybackState;
};

export function createDefaultConfig(): DiagramConfig {
  return {
    systemType: "minisplit",
    mode: "cooling",
    componentStyle: "icon",
    background: "none",
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
