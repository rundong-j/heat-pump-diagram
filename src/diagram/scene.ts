import m from "mithril";
import type { DiagramConfig } from "../model/types";
import { SceneAnimation } from "../animation/timeline";
import { minisplitScene } from "./layouts/minisplit";

export type SceneAttrs = {
  config: DiagramConfig;
  debugHighlight: boolean;
};

let mountCount = 0;
let animation: SceneAnimation | null = null;

export function getSceneMountCount(): number {
  return mountCount;
}

function applyHighlight(svg: SVGSVGElement, highlighted: boolean): void {
  svg.classList.toggle("is-highlighted", highlighted);
}

export const DiagramScene: m.Component<SceneAttrs> = {
  oncreate(vnode) {
    mountCount += 1;
    const svg = vnode.dom as SVGSVGElement;
    svg.dataset.mountId = String(mountCount);
    animation = new SceneAnimation();
    animation.attach(svg, vnode.attrs.config);
    animation.applyConfig(vnode.attrs.config);
    applyHighlight(svg, vnode.attrs.debugHighlight);
    m.redraw();
  },

  onupdate(vnode) {
    const svg = vnode.dom as SVGSVGElement;
    animation?.applyConfig(vnode.attrs.config);
    applyHighlight(svg, vnode.attrs.debugHighlight);
  },

  onremove() {
    animation?.destroy();
    animation = null;
  },

  view(vnode) {
    return m(
      "svg.diagram-scene",
      {
        viewBox: "0 0 960 540",
        role: "img",
        "aria-label": `Mini-split heat pump ${vnode.attrs.config.mode} cycle`,
        "data-component-style": vnode.attrs.config.componentStyle,
        "data-indoor-side": vnode.attrs.config.indoorSide,
        "data-mode": vnode.attrs.config.mode,
        "data-background": vnode.attrs.config.background,
        style: {
          "--font-scale": String(vnode.attrs.config.fontScale),
        },
      },
      minisplitScene(vnode.attrs.config),
    );
  },
};
