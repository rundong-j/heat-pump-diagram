import m from "mithril";

type HudIconOptions = {
  /** Skip stroke attrs; child paths/fills own the paint (fire, moon, play/pause). */
  filled?: boolean;
  strokeWidth?: number;
};

export function hudIcon(
  children: m.Children,
  options: HudIconOptions = {},
): m.Children {
  const attrs: m.Attributes = {
    viewBox: "0 0 24 24",
    "aria-hidden": "true",
    focusable: "false",
  };

  if (!options.filled) {
    attrs.fill = "none";
    attrs.stroke = "currentColor";
    attrs["stroke-width"] = options.strokeWidth ?? 1.7;
    attrs["stroke-linecap"] = "round";
    attrs["stroke-linejoin"] = "round";
  }

  return m("svg", attrs, children);
}
