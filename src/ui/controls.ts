import m from "mithril";
import type {
  BackgroundStyle,
  CoilLabelStyle,
  ComponentStyle,
  CycleMode,
  DiagramConfig,
  IndoorSide,
  OverlayToggles,
  SystemType,
  ThemeMode,
} from "../model/types";
import { getSceneMountCount } from "../diagram/scene";
import { PlaybackHud } from "./playback";

const FONT_SCALE_MIN = 0.85;
const FONT_SCALE_MAX = 1.3;
const FONT_SCALE_STEP = 0.15;

export type ControlPanelAttrs = {
  config: DiagramConfig;
  debugHighlight: boolean;
  onConfigChange: (config: DiagramConfig) => void;
  onDebugHighlightChange: (value: boolean) => void;
};

function fireIcon(): m.Children {
  return m(
    "svg",
    {
      viewBox: "0 0 24 24",
      "aria-hidden": "true",
      focusable: "false",
    },
    [
      m("path", {
        fill: "currentColor",
        d: "M12.8 2c3.4 5.1 7.2 7.6 7.2 12.6 0 4.4-3.6 7.6-8 7.6s-8-3.2-8-7.6c0-3.3 1.8-6 4.2-8.6-1.8 3.8-1.4 6.4.4 8.2C8.4 9.8 10.2 6.8 12.8 2z",
      }),
      m("path", {
        fill: "var(--control-surface)",
        d: "M12.2 11.6c1.5 1.8 2.4 3 2.4 4.8 0 2-1.5 3.4-3.3 3.4s-3.3-1.4-3.3-3.4c0-1.6.8-2.7 2.1-4.1.4 1.4 1.2 2.2 2.1-.7z",
      }),
    ],
  );
}

function snowflakeArm(): m.Children {
  return [
    m("line", { x1: 12, y1: 2.4, x2: 12, y2: 21.6 }),
    m("polyline", { points: "8.6,5.6 12,2.4 15.4,5.6" }),
    m("polyline", { points: "8.6,18.4 12,21.6 15.4,18.4" }),
    m("polyline", { points: "9.4,9.2 12,7.4 14.6,9.2" }),
    m("polyline", { points: "9.4,14.8 12,16.6 14.6,14.8" }),
  ];
}

function snowflakeIcon(): m.Children {
  return m(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 1.7,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
      focusable: "false",
    },
    [0, 60, 120].map((deg) =>
      m("g", { transform: `rotate(${deg} 12 12)` }, snowflakeArm()),
    ),
  );
}

function miniSplitIcon(): m.Children {
  return m(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 1.6,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
      focusable: "false",
    },
    [
      m("rect", { x: 2.2, y: 7.5, width: 9.2, height: 11, rx: 1.2 }),
      m("circle", { cx: 6.8, cy: 13, r: 2.5 }),
      m("rect", { x: 13.2, y: 9.5, width: 8.6, height: 5.2, rx: 1.2 }),
      m("line", { x1: 15, y1: 12.1, x2: 20, y2: 12.1 }),
    ],
  );
}

function ductedIcon(): m.Children {
  return m(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 1.6,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
      focusable: "false",
    },
    [
      m("path", { d: "M4 11 L12 4.2 L20 11" }),
      m("rect", { x: 6, y: 11, width: 12, height: 8.5 }),
      m("rect", { x: 10.2, y: 14.5, width: 3.6, height: 5 }),
    ],
  );
}

function sunThemeIcon(): m.Children {
  const cx = 12;
  const cy = 12;
  const rays = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return m("line", {
      x1: cx + Math.cos(rad) * 6.3,
      y1: cy + Math.sin(rad) * 6.3,
      x2: cx + Math.cos(rad) * 9.5,
      y2: cy + Math.sin(rad) * 9.5,
    });
  });

  return m(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 1.7,
      "stroke-linecap": "round",
      "aria-hidden": "true",
      focusable: "false",
    },
    [m("circle", { cx, cy, r: 3.8 }), ...rays],
  );
}

function moonThemeIcon(): m.Children {
  return m(
    "svg",
    {
      viewBox: "0 0 24 24",
      "aria-hidden": "true",
      focusable: "false",
    },
    m("path", {
      fill: "currentColor",
      d: "M15.2 3.4A9 9 0 1 0 20.6 16.2 7.1 7.1 0 0 1 15.2 3.4Z",
    }),
  );
}

type SquareSwitchOption<T extends string> = {
  value: T;
  label: string;
  icon: () => m.Children;
};

function squareCycleSwitch<T extends string>(opts: {
  name: string;
  value: T;
  options: SquareSwitchOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}): m.Children {
  const index = Math.max(
    0,
    opts.options.findIndex((option) => option.value === opts.value),
  );
  const current = opts.options[index];
  const next = opts.options[(index + 1) % opts.options.length];
  const disabled = Boolean(opts.disabled);

  return m(
    "button.square-switch",
    {
      type: "button",
      disabled,
      "data-value": current.value,
      title: disabled
        ? `${opts.name}: ${current.label} (unavailable)`
        : `${opts.name}: ${current.label}`,
      "aria-label": disabled
        ? `${opts.name}: ${current.label}. Unavailable.`
        : `${opts.name}: ${current.label}. Click to switch to ${next.label}.`,
      onclick: () => {
        if (!disabled) {
          opts.onChange(next.value);
        }
      },
    },
    [
      m("span.square-switch-title", opts.name),
      m("span.square-switch-icon", current.icon()),
      m("span.square-switch-label", current.label),
    ],
  );
}

function overlayToggle(
  overlays: OverlayToggles,
  key: keyof OverlayToggles,
  label: string,
  onChange: (overlays: OverlayToggles) => void,
  disabled = false,
): m.Children {
  return m("label.checkbox", [
    m("input", {
      type: "checkbox",
      checked: overlays[key],
      disabled,
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
        m("h2", "Playback"),
        m(PlaybackHud, {
          playback: config.playback,
          onChange: (playback) => onConfigChange({ ...config, playback }),
        }),
      ]),

      m("section", [
        m("h2", "System"),
        m("div.square-switch-row", [
          squareCycleSwitch<SystemType>({
            name: "Type",
            value: config.systemType,
            disabled: true,
            options: [
              { value: "minisplit", label: "Mini-split", icon: miniSplitIcon },
              { value: "ducted", label: "Ducted", icon: ductedIcon },
            ],
            onChange: (systemType) => onConfigChange({ ...config, systemType }),
          }),
          squareCycleSwitch<CycleMode>({
            name: "Cycle",
            value: config.mode,
            options: [
              { value: "heating", label: "Heating", icon: fireIcon },
              { value: "cooling", label: "Cooling", icon: snowflakeIcon },
            ],
            onChange: (mode) => onConfigChange({ ...config, mode }),
          }),
        ]),
        m("div.square-switch-row", [
          squareCycleSwitch<ThemeMode>({
            name: "Theme",
            value: config.theme,
            options: [
              { value: "light", label: "Light", icon: sunThemeIcon },
              { value: "dark", label: "Dark", icon: moonThemeIcon },
            ],
            onChange: (theme) => onConfigChange({ ...config, theme }),
          }),
        ]),
        m("div.font-size-control", [
          m("span.font-size-label", "Font size"),
          m("div.font-size-buttons", [
            m(
              "button",
              {
                type: "button",
                "aria-label": "Decrease diagram font size",
                disabled: config.fontScale <= FONT_SCALE_MIN,
                onclick: () => {
                  onConfigChange({
                    ...config,
                    fontScale: Math.max(
                      FONT_SCALE_MIN,
                      Math.round((config.fontScale - FONT_SCALE_STEP) * 100) / 100,
                    ),
                  });
                },
              },
              "−",
            ),
            m("span.font-size-mark", { "aria-hidden": "true" }, "Aa"),
            m(
              "button",
              {
                type: "button",
                "aria-label": "Increase diagram font size",
                disabled: config.fontScale >= FONT_SCALE_MAX,
                onclick: () => {
                  onConfigChange({
                    ...config,
                    fontScale: Math.min(
                      FONT_SCALE_MAX,
                      Math.round((config.fontScale + FONT_SCALE_STEP) * 100) / 100,
                    ),
                  });
                },
              },
              "+",
            ),
          ]),
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
              m(
                "option",
                { value: "sketch", disabled: true },
                "Realistic sketch",
              ),
              m(
                "option",
                { value: "crossSection", disabled: true },
                "Cross-section",
              ),
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
          "Coil labels",
          m(
            "select",
            {
              value: config.coilLabels,
              onchange: (event: Event) => {
                const coilLabels = (event.target as HTMLSelectElement)
                  .value as CoilLabelStyle;
                onConfigChange({ ...config, coilLabels });
              },
            },
            [
              m("option", { value: "role" }, "Evaporator / Condenser"),
              m("option", { value: "location" }, "Indoor / Outdoor coil"),
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
        overlayToggle(
          config.overlays,
          "heatTransfer",
          "Heat transfer",
          (overlays) => onConfigChange({ ...config, overlays }),
          true,
        ),
      ]),

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
    ]);
  },
};
