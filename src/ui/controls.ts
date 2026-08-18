import m from "mithril";
import type {
  BackgroundStyle,
  CoilLabelStyle,
  ComponentStyle,
  CycleMode,
  DiagramConfig,
  IndoorSide,
  LineColorStyle,
  LineStyle,
  LineWidthStyle,
  OverlayToggles,
  SystemType,
  ThemeMode,
} from "../model/types";
import { getSceneMountCount } from "../diagram/scene";
import { hudIcon } from "./hudIcon";
import { PlaybackHud } from "./playback";

const FONT_SCALE_OPTIONS = [
  { value: "0.85", scale: 0.85, label: "Small", iconSize: 11 },
  { value: "1", scale: 1, label: "Normal", iconSize: 14 },
  { value: "1.15", scale: 1.15, label: "Large", iconSize: 17 },
  { value: "1.3", scale: 1.3, label: "XL", iconSize: 20 },
] as const;

type FontScaleStep = (typeof FONT_SCALE_OPTIONS)[number]["value"];

function fontScaleStep(scale: number): FontScaleStep {
  const rounded = Math.round(scale * 100) / 100;
  return FONT_SCALE_OPTIONS.find((option) => option.scale === rounded)?.value ?? "1";
}

export type ControlPanelAttrs = {
  config: DiagramConfig;
  debugHighlight: boolean;
  onConfigChange: (config: DiagramConfig) => void;
  onDebugHighlightChange: (value: boolean) => void;
};

function fireIcon(): m.Children {
  return hudIcon(
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
    { filled: true },
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
  return hudIcon(
    [0, 60, 120].map((deg) =>
      m("g", { transform: `rotate(${deg} 12 12)` }, snowflakeArm()),
    ),
  );
}

function miniSplitIcon(): m.Children {
  return hudIcon(
    [
      m("rect", { x: 2.2, y: 7.5, width: 9.2, height: 11, rx: 1.2 }),
      m("circle", { cx: 6.8, cy: 13, r: 2.5 }),
      m("rect", { x: 13.2, y: 9.5, width: 8.6, height: 5.2, rx: 1.2 }),
      m("line", { x1: 15, y1: 12.1, x2: 20, y2: 12.1 }),
    ],
    { strokeWidth: 1.6 },
  );
}

function ductedIcon(): m.Children {
  return hudIcon(
    [
      m("path", { d: "M4 11 L12 4.2 L20 11" }),
      m("rect", { x: 6, y: 11, width: 12, height: 8.5 }),
      m("rect", { x: 10.2, y: 14.5, width: 3.6, height: 5 }),
    ],
    { strokeWidth: 1.6 },
  );
}

function lightBulbIcon(): m.Children {
  return hudIcon([
    m("path", {
      d: "M8.2 9.2 a3.8 4.6 0 1 1 7.6 0 c0 2.1-1.3 3.3-2.3 4.4 v1.6 H10.5 v-1.6 c-1-1.1-2.3-2.3-2.3-4.4 Z",
    }),
    m("line", { x1: 10.2, y1: 17.4, x2: 13.8, y2: 17.4 }),
    m("line", { x1: 10.8, y1: 19.4, x2: 13.2, y2: 19.4 }),
  ]);
}

function moonThemeIcon(): m.Children {
  return hudIcon(
    m("path", {
      fill: "currentColor",
      d: "M15.2 3.4A9 9 0 1 0 20.6 16.2 7.1 7.1 0 0 1 15.2 3.4Z",
    }),
    { filled: true },
  );
}

function simpleLoopIcon(): m.Children {
  return hudIcon(
    m("path", {
      d: "M7 6.5 H17 A2.5 2.5 0 0 1 19.5 9 V15 A2.5 2.5 0 0 1 17 17.5 H7 A2.5 2.5 0 0 1 4.5 15 V9 A2.5 2.5 0 0 1 7 6.5 Z",
    }),
  );
}

function reversingValveIcon(): m.Children {
  return hudIcon([
    m("rect", { x: 5.5, y: 7.5, width: 13, height: 9, rx: 1.8 }),
    m("path", { d: "M9.5 10.5 L14.5 10.5 L17 13.5 L12 13.5 Z" }),
    m("circle", { cx: 12, cy: 7.5, r: 1.2, fill: "currentColor", stroke: "none" }),
    m("circle", { cx: 12, cy: 16.5, r: 1.2, fill: "currentColor", stroke: "none" }),
    m("circle", { cx: 5.5, cy: 12, r: 1.2, fill: "currentColor", stroke: "none" }),
    m("circle", { cx: 18.5, cy: 12, r: 1.2, fill: "currentColor", stroke: "none" }),
  ]);
}

function fontSizeIcon(sizePx: number): m.Children {
  return m(
    "span.font-scale-icon",
    { style: { fontSize: `${sizePx}px` }, "aria-hidden": "true" },
    "Aa",
  );
}

function simpleBoxStyleIcon(): m.Children {
  return hudIcon(m("rect", { x: 5.5, y: 5.5, width: 13, height: 13, rx: 1.5 }));
}

function abstractIconStyleIcon(): m.Children {
  return hudIcon([
    m("rect", { x: 4.5, y: 8, width: 8, height: 8, rx: 1.2 }),
    m("circle", { cx: 17, cy: 12, r: 3.5 }),
  ]);
}

function sketchStyleIcon(): m.Children {
  return hudIcon(
    m("path", {
      d: "M5.5 17.5 C8 12.5 10 10 12.5 11.5 S16.5 8.5 18.5 6.5",
    }),
  );
}

function crossSectionStyleIcon(): m.Children {
  return hudIcon([
    m("rect", { x: 4.5, y: 6.5, width: 15, height: 11, rx: 1.2 }),
    m("line", {
      x1: 12,
      y1: 6.5,
      x2: 12,
      y2: 17.5,
      "stroke-dasharray": "2.2 2.2",
    }),
    m("path", { d: "M12 8.5 L15.5 12 L12 15.5" }),
  ]);
}

function backgroundNoneIcon(): m.Children {
  return hudIcon([
    m("rect", { x: 5.5, y: 5.5, width: 13, height: 13, rx: 1.5 }),
    m("line", { x1: 8, y1: 16, x2: 16, y2: 8 }),
  ]);
}

function backgroundHouseIcon(): m.Children {
  return hudIcon(
    [
      m("path", { d: "M4 11 L12 4.2 L20 11" }),
      m("rect", { x: 6, y: 11, width: 12, height: 8.5 }),
    ],
    { strokeWidth: 1.6 },
  );
}

const LINE_STYLE_PATH = "M3.5 16.5 H8.5 V7.5 H15.5 V16.5 H20.5";

function solidLineIcon(): m.Children {
  return hudIcon(m("path", { d: LINE_STYLE_PATH }), { strokeWidth: 2 });
}

function dashedLineIcon(): m.Children {
  return hudIcon(
    m("path", { d: LINE_STYLE_PATH, "stroke-dasharray": "3.2 2.4" }),
    { strokeWidth: 2 },
  );
}

function arrowLineIcon(): m.Children {
  return hudIcon(
    [
      m("polygon", { points: "3.2,10.2 8.4,12 3.2,13.8 4.6,12", fill: "currentColor" }),
      m("polygon", { points: "9.6,10.2 14.8,12 9.6,13.8 11,12", fill: "currentColor" }),
      m("polygon", { points: "16,10.2 21.2,12 16,13.8 17.4,12", fill: "currentColor" }),
    ],
    { filled: true },
  );
}

function temperatureColorIcon(): m.Children {
  return hudIcon([
    m("path", { d: "M3.5 16.5 H8.5", stroke: "#d73027", "stroke-width": 2.2 }),
    m("path", { d: "M8.5 16.5 V7.5 H12", stroke: "#fdae61", "stroke-width": 2.2 }),
    m("path", { d: "M12 7.5 H15.5 V16.5", stroke: "#74add1", "stroke-width": 2.2 }),
    m("path", { d: "M15.5 16.5 H20.5", stroke: "#313695", "stroke-width": 2.2 }),
  ]);
}

function constantColorIcon(): m.Children {
  return hudIcon(m("path", { d: LINE_STYLE_PATH }), { strokeWidth: 2 });
}

function constantWidthIcon(): m.Children {
  return hudIcon(
    m("path", { d: LINE_STYLE_PATH, "stroke-dasharray": "3.2 2.4" }),
    { strokeWidth: 2 },
  );
}

function pressureWidthIcon(): m.Children {
  return hudIcon([
    m("path", {
      d: "M3.5 16.5 H8.5 V7.5",
      "stroke-width": 3.4,
      "stroke-dasharray": "2 1.4",
    }),
    m("path", {
      d: "M8.5 7.5 H15.5 V16.5 H20.5",
      "stroke-width": 1.2,
      "stroke-dasharray": "3.2 2.4",
    }),
  ]);
}

type SquareSwitchOption<T extends string> = {
  value: T;
  label: string;
  icon?: () => m.Children;
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
      current.icon
        ? m("span.square-switch-icon", current.icon())
        : m("span.square-switch-icon"),
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
        "Mini-split heat pump. Cooling reverses flow and swaps coil roles. Ducted layout comes next.",
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
          squareCycleSwitch<"off" | "on">({
            name: "Reversing valve",
            value: config.showReversingValve ? "on" : "off",
            disabled: true,
            options: [
              { value: "off", label: "Off", icon: simpleLoopIcon },
              { value: "on", label: "On", icon: reversingValveIcon },
            ],
            onChange: (valve) =>
              onConfigChange({
                ...config,
                showReversingValve: valve === "on",
              }),
          }),
        ]),
        m("div.square-switch-row", [
          squareCycleSwitch<ComponentStyle>({
            name: "Component style",
            value: config.componentStyle,
            disabled: true,
            options: [
              { value: "simpleBox", label: "Simple box", icon: simpleBoxStyleIcon },
              { value: "icon", label: "Abstract icon", icon: abstractIconStyleIcon },
              { value: "sketch", label: "Realistic sketch", icon: sketchStyleIcon },
              {
                value: "crossSection",
                label: "Cross-section",
                icon: crossSectionStyleIcon,
              },
            ],
            onChange: (componentStyle) =>
              onConfigChange({ ...config, componentStyle }),
          }),
          squareCycleSwitch<BackgroundStyle>({
            name: "Background",
            value: config.background,
            options: [
              { value: "none", label: "None", icon: backgroundNoneIcon },
              { value: "house", label: "House & weather", icon: backgroundHouseIcon },
            ],
            onChange: (background) => onConfigChange({ ...config, background }),
          }),
          squareCycleSwitch<CoilLabelStyle>({
            name: "Coil labels",
            value: config.coilLabels,
            options: [
              { value: "role", label: "Evap / Cond" },
              { value: "location", label: "Outdoor / Indoor" },
            ],
            onChange: (coilLabels) => onConfigChange({ ...config, coilLabels }),
          }),
        ]),
        m("div.square-switch-row", [
          squareCycleSwitch<IndoorSide>({
            name: "Indoor",
            value: config.indoorSide,
            options: [
              { value: "left", label: "Left side" },
              { value: "right", label: "Right side" },
            ],
            onChange: (indoorSide) => onConfigChange({ ...config, indoorSide }),
          }),
          squareCycleSwitch<ThemeMode>({
            name: "Theme",
            value: config.theme,
            options: [
              { value: "light", label: "Light", icon: lightBulbIcon },
              { value: "dark", label: "Dark", icon: moonThemeIcon },
            ],
            onChange: (theme) => onConfigChange({ ...config, theme }),
          }),
          squareCycleSwitch<FontScaleStep>({
            name: "Font size",
            value: fontScaleStep(config.fontScale),
            options: FONT_SCALE_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
              icon: () => fontSizeIcon(option.iconSize),
            })),
            onChange: (step) => {
              const scale =
                FONT_SCALE_OPTIONS.find((option) => option.value === step)?.scale ??
                1;
              onConfigChange({ ...config, fontScale: scale });
            },
          }),
        ]),
        m("div.square-switch-row", [
          squareCycleSwitch<LineStyle>({
            name: "Line style",
            value: config.lineStyle,
            options: [
              { value: "solid", label: "Solid", icon: solidLineIcon },
              { value: "dashed", label: "Dashed", icon: dashedLineIcon },
              { value: "arrow", label: "Arrow", icon: arrowLineIcon },
            ],
            onChange: (lineStyle) => onConfigChange({ ...config, lineStyle }),
          }),
          squareCycleSwitch<LineColorStyle>({
            name: "Line color",
            value: config.lineColor,
            options: [
              {
                value: "temperatureBased",
                label: "Temperature-based",
                icon: temperatureColorIcon,
              },
              { value: "constant", label: "Constant", icon: constantColorIcon },
            ],
            onChange: (lineColor) => onConfigChange({ ...config, lineColor }),
          }),
          squareCycleSwitch<LineWidthStyle>({
            name: "Line width & spacing",
            value: config.lineWidth,
            options: [
              { value: "constant", label: "Constant", icon: constantWidthIcon },
              {
                value: "pressureBased",
                label: "Pressure-based",
                icon: pressureWidthIcon,
              },
            ],
            onChange: (lineWidth) => onConfigChange({ ...config, lineWidth }),
          }),
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
