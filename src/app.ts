import m from "mithril";
import { createDefaultConfig, type DiagramConfig } from "./model/types";
import { DiagramScene } from "./diagram/scene";
import { ControlPanel } from "./ui/controls";

type AppState = {
  config: DiagramConfig;
  debugHighlight: boolean;
};

const state: AppState = {
  config: createDefaultConfig(),
  debugHighlight: false,
};

export const App: m.Component = {
  view() {
    return m("div.app", [
      m("div.diagram-stage", [
        m(DiagramScene, {
          key: "diagram-scene",
          config: state.config,
          debugHighlight: state.debugHighlight,
        }),
      ]),
      m(ControlPanel, {
        config: state.config,
        debugHighlight: state.debugHighlight,
        onConfigChange: (config) => {
          state.config = config;
        },
        onDebugHighlightChange: (debugHighlight) => {
          state.debugHighlight = debugHighlight;
        },
      }),
    ]);
  },
};
