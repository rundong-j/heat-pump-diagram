import m from "mithril";

export const PIPE_COLOR_IDS = ["hot", "warm", "cold", "cool"] as const;
export type PipeColorId = (typeof PIPE_COLOR_IDS)[number];

export const MAX_DASH_ARROWS = 72;

export function dashArrowGroups(): m.Children {
  return m(
    "g.pipe-dash-arrows",
    { key: "dash-arrows", "data-role": "dash-arrows" },
    PIPE_COLOR_IDS.map((id) =>
      m(
        `g.pipe-dash-arrows-${id}`,
        { key: `dash-arrows-${id}` },
        Array.from({ length: MAX_DASH_ARROWS }, (_, index) =>
          m("polygon.pipe-dash-arrow", {
            key: `dash-arrow-${id}-${index}`,
            points: "0,0 0,0 0,0",
            visibility: "hidden",
          }),
        ),
      ),
    ),
  );
}
