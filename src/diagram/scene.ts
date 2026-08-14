import m from "mithril";
import type { DiagramConfig } from "../model/types";

export type SceneAttrs = {
  config: DiagramConfig;
  debugHighlight: boolean;
};

let mountCount = 0;

export function getSceneMountCount(): number {
  return mountCount;
}

function applySceneState(svg: SVGSVGElement, attrs: SceneAttrs): void {
  const { config, debugHighlight } = attrs;

  svg.classList.toggle("is-highlighted", debugHighlight);
  svg.dataset.systemType = config.systemType;
  svg.dataset.mode = config.mode;
  svg.dataset.componentStyle = config.componentStyle;
  svg.dataset.background = config.background;
  svg.dataset.playing = String(config.playback.playing);

  const caption = svg.querySelector("[data-role='caption']");
  if (caption) {
    caption.textContent = config.playback.playing
      ? "Viewport ready · playing (stub)"
      : "Viewport ready · paused (stub)";
  }
}

export const DiagramScene: m.Component<SceneAttrs> = {
  oncreate(vnode) {
    mountCount += 1;
    const svg = vnode.dom as SVGSVGElement;
    svg.dataset.mountId = String(mountCount);
    applySceneState(svg, vnode.attrs);
    m.redraw();
  },

  onupdate(vnode) {
    applySceneState(vnode.dom as SVGSVGElement, vnode.attrs);
  },

  onremove() {
    // Phase 1: kill the GSAP timeline owned by this scene.
  },

  view() {
    return m(
      "svg.diagram-scene",
      {
        viewBox: "0 0 960 540",
        role: "img",
        "aria-label": "Heat pump cycle diagram",
      },
      [
        m("g.layer-background", { key: "background" }),
        m("g.layer-equipment", { key: "equipment" }, [
          m("rect.scene-placeholder", {
            key: "placeholder",
            x: 330,
            y: 190,
            width: 300,
            height: 160,
            rx: 10,
          }),
        ]),
        m("g.layer-circuit", { key: "circuit" }),
        m("g.layer-overlays", { key: "overlays" }, [
          m(
            "text.scene-caption",
            {
              key: "caption",
              "data-role": "caption",
              x: 480,
              y: 278,
              "text-anchor": "middle",
            },
            "Viewport ready",
          ),
        ]),
      ],
    );
  },
};
