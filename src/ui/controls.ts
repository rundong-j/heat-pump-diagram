import m from "mithril";
import type {
  BackgroundStyle,
  ComponentStyle,
  CycleMode,
  DiagramConfig,
  IndoorSide,
  OverlayToggles,
  SystemType,
} from "../model/types";
import { getSceneMountCount } from "../diagram/scene";
import { PlaybackHud } from "./playback";

export type ControlPanelAttrs = {
  config: DiagramConfig;
  debugHighlight: boolean;
  onConfigChange: (config: DiagramConfig) => void;
  onDebugHighlightChange: (value: boolean) => void;
};

function overlayToggle(
  overlays: OverlayToggles,
  key: keyof OverlayToggles,
  label: string,
  onChange: (overlays: OverlayToggles) => void,
): m.Children {
  return m("label.checkbox", [
    m("input", {
      type: "checkbox",
      checked: overlays[key],
      onchange: (event: Event) => {
        const checked = (event.target as HTMLInputElement).checked;
        onChange({ ...overlays, [key]: checked });
      },
    }),
    label,
  ]);
}

export const ControlPanel: m.Component<ControlPanelAttrs> = {
  view(vnode) {
    const { config, debugHighlight, onConfigChange, onDebugHighlightChange } =
      vnode.attrs;

    return m("aside.control-panel", [
      m("h1", "Heat pump cycle"),
      m(
        "p.lede",
        "Mini-split heat pump. Heating reverses flow and swaps coil roles. Ducted layout comes next.",
      ),

      m("section", [
        m("h2", "Scene stability"),
        m("p.mount-count", [
          "SVG mounts: ",
          m("strong", String(getSceneMountCount())),
          m("span.hint", " Must stay 1 while toggling highlight or playback."),
        ]),
        m("label.checkbox", [
          m("input", {
            type: "checkbox",
            checked: debugHighlight,
            onchange: (event: Event) => {
              onDebugHighlightChange((event.target as HTMLInputElement).checked);
            },
          }),
          "Highlight viewport (dummy flag)",
        ]),
      ]),

      m("section", [
        m("h2", "Playback"),
        m(PlaybackHud, {
          playback: config.playback,
          onChange: (playback) => onConfigChange({ ...config, playback }),
        }),
      ]),

      m("section", [
        m("h2", "System"),
        m("label", [
          "Type",
          m(
            "select",
            {
              value: config.systemType,
              onchange: (event: Event) => {
                const systemType = (event.target as HTMLSelectElement)
                  .value as SystemType;
                onConfigChange({ ...config, systemType });
              },
            },
            [
              m("option", { value: "minisplit" }, "Mini-split"),
              m("option", { value: "ducted" }, "Ducted split"),
            ],
          ),
        ]),
        m("label", [
          "Cycle",
          m(
            "select",
            {
              value: config.mode,
              onchange: (event: Event) => {
                const mode = (event.target as HTMLSelectElement).value as CycleMode;
                onConfigChange({ ...config, mode });
              },
            },
            [
              m("option", { value: "cooling" }, "Cooling"),
              m("option", { value: "heating" }, "Heating"),
            ],
          ),
        ]),
        m("label", [
          "Component style",
          m(
            "select",
            {
              value: config.componentStyle,
              onchange: (event: Event) => {
                const componentStyle = (event.target as HTMLSelectElement)
                  .value as ComponentStyle;
                onConfigChange({ ...config, componentStyle });
              },
            },
            [
              m("option", { value: "simpleBox" }, "Simple box"),
              m("option", { value: "icon" }, "Abstract icon"),
              m("option", { value: "sketch" }, "Realistic sketch"),
              m("option", { value: "crossSection" }, "Cross-section"),
            ],
          ),
        ]),
        m("label", [
          "Background",
          m(
            "select",
            {
              value: config.background,
              onchange: (event: Event) => {
                const background = (event.target as HTMLSelectElement)
                  .value as BackgroundStyle;
                onConfigChange({ ...config, background });
              },
            },
            [
              m("option", { value: "none" }, "None"),
              m("option", { value: "house" }, "House context"),
            ],
          ),
        ]),
        m("label", [
          "Indoor unit",
          m(
            "select",
            {
              value: config.indoorSide,
              onchange: (event: Event) => {
                const indoorSide = (event.target as HTMLSelectElement)
                  .value as IndoorSide;
                onConfigChange({ ...config, indoorSide });
              },
            },
            [
              m("option", { value: "left" }, "Left"),
              m("option", { value: "right" }, "Right"),
            ],
          ),
        ]),
        m("label.checkbox", [
          m("input", {
            type: "checkbox",
            checked: config.showReversingValve,
            onchange: (event: Event) => {
              onConfigChange({
                ...config,
                showReversingValve: (event.target as HTMLInputElement).checked,
              });
            },
          }),
          "Reversing valve",
        ]),
      ]),

      m("section", [
        m("h2", "Overlays"),
        overlayToggle(config.overlays, "labels", "Labels", (overlays) =>
          onConfigChange({ ...config, overlays }),
        ),
        overlayToggle(config.overlays, "pressure", "Pressure", (overlays) =>
          onConfigChange({ ...config, overlays }),
        ),
        overlayToggle(config.overlays, "temperature", "Temperature", (overlays) =>
          onConfigChange({ ...config, overlays }),
        ),
        overlayToggle(config.overlays, "phase", "Phase", (overlays) =>
          onConfigChange({ ...config, overlays }),
        ),
        overlayToggle(config.overlays, "direction", "Direction", (overlays) =>
          onConfigChange({ ...config, overlays }),
        ),
      ]),
    ]);
  },
};
