import m from "mithril";
import {
  coilFins,
  componentBox,
  compressorIcon,
  expansionValveIcon,
  fanIcon,
  flowArrow,
  reversingValveIcon,
} from "../icons";

export const REFRIGERANT_LOOP_PATH =
  "M690,350 V250 H840 V405 H145 V220 H720 V350 H690 Z";

export const HIGH_PRESSURE_PATH = "M690,350 V250 H840 V405 H400";
export const LOW_PRESSURE_PATH = "M400,405 H145 V220 H720 V350 H690";

const PARTICLE_COUNT = 8;

function particles(): m.Children {
  const dots: m.Children[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    dots.push(
      m("circle.particle", {
        key: `p-${i}`,
        r: 4.5,
        cx: 0,
        cy: 0,
      }),
    );
  }
  return dots;
}

function label(
  text: string,
  x: number,
  y: number,
  anchor = "middle",
  extraClass?: string,
): m.Vnode {
  return m(
    extraClass ? `text.diagram-label.${extraClass}` : "text.diagram-label",
    { x, y, "text-anchor": anchor },
    text,
  );
}

export function minisplitCoolingScene(): m.Children {
  return [
    m("g.layer-background", { key: "background" }, [
      m("line.wall", { x1: 480, y1: 72, x2: 480, y2: 500 }),
      m(
        "text.zone-title",
        { x: 210, y: 54, "text-anchor": "middle" },
        "Indoor",
      ),
      m(
        "text.zone-title",
        { x: 750, y: 54, "text-anchor": "middle" },
        "Outdoor",
      ),
      m(
        "text.scene-caption",
        { "data-role": "caption", x: 480, y: 28, "text-anchor": "middle" },
        "Mini-split heat pump · cooling",
      ),
    ]),

    m("g.layer-circuit", { key: "circuit" }, [
      m("path.pipe.pipe-high", {
        d: HIGH_PRESSURE_PATH,
        fill: "none",
      }),
      m("path.pipe.pipe-low", {
        d: LOW_PRESSURE_PATH,
        fill: "none",
      }),
      m("path.refrigerant-loop", {
        id: "refrigerant-loop",
        d: REFRIGERANT_LOOP_PATH,
        fill: "none",
      }),
      m("g.static-arrows", { "data-role": "static-arrows" }, [
        flowArrow(690, 305, -90),
        flowArrow(840, 328, 90),
        flowArrow(560, 405, 180),
        flowArrow(145, 312, -90),
        flowArrow(400, 220, 0),
        flowArrow(720, 300, 90),
      ]),
    ]),

    m("g.layer-equipment", { key: "equipment" }, [
      m("g.icon-equipment", { key: "icon-equipment" }, [
        m("g.indoor-unit", [
          m("rect.unit-body", { x: 70, y: 185, width: 250, height: 145, rx: 14 }),
          m("rect.unit-face", { x: 86, y: 204, width: 148, height: 108, rx: 8 }),
          m(
            "g.evaporator-coil",
            coilFins({
              x: 98,
              y: 218,
              width: 124,
              height: 80,
              count: 6,
              axis: "horizontal",
            }),
          ),
          m("rect.unit-vent", { x: 90, y: 314, width: 210, height: 8, rx: 2 }),
          m("g.indoor-fan", { transform: "translate(282 257)" }, fanIcon(30)),
        ]),

        m("g.outdoor-unit", [
          m("rect.unit-body", { x: 630, y: 120, width: 250, height: 330, rx: 12 }),
          m("circle.fan-shroud", { cx: 755, cy: 185, r: 52 }),
          m("g.outdoor-fan", { transform: "translate(755 185)" }, fanIcon(40)),
          m(
            "g.condenser-coil",
            coilFins({
              x: 800,
              y: 248,
              width: 58,
              height: 150,
              count: 8,
              axis: "vertical",
            }),
          ),
          m("g.compressor", { transform: "translate(700 390)" }, compressorIcon()),
          m(
            "g.reversing-valve",
            { transform: "translate(700 250)" },
            reversingValveIcon(),
          ),
        ]),

        m(
          "g.expansion-valve",
          { transform: "translate(400 405)" },
          expansionValveIcon(),
        ),
      ]),

      m("g.simple-box-equipment", { key: "simple-box-equipment" }, [
        componentBox({
          id: "evaporator",
          x: 145,
          y: 280,
          width: 132,
          height: 52,
          label: "Evaporator",
        }),
        componentBox({
          id: "condenser",
          x: 840,
          y: 328,
          width: 132,
          height: 52,
          label: "Condenser",
        }),
        componentBox({
          id: "compressor",
          x: 705,
          y: 370,
          width: 132,
          height: 52,
          label: "Compressor",
          pulse: true,
        }),
        componentBox({
          id: "expansionValve",
          x: 400,
          y: 405,
          width: 150,
          height: 52,
          label: "Expansion valve",
        }),
        componentBox({
          id: "reversingValve",
          x: 700,
          y: 250,
          width: 150,
          height: 52,
          label: "Reversing valve",
        }),
      ]),
    ]),

    m(
      "g.layer-particles",
      { key: "particles", "data-role": "particles" },
      particles(),
    ),

    m("g.layer-labels", { key: "labels", "data-role": "labels" }, [
      label("Indoor unit", 195, 172),
      label("Evaporator", 160, 352),
      label("Outdoor unit", 755, 108),
      label("Condenser", 855, 328),
      label("Compressor", 700, 452),
      label("Reversing valve", 618, 246, "end", "reversing-valve-label"),
      label("Expansion valve", 400, 438),
      label("Vapor line", 320, 206),
      label("Liquid line", 250, 392),
      label("Heat absorbed", 195, 455),
      label("Heat rejected", 755, 475),
    ]),
  ];
}
