import m from "mithril";
import type { DiagramConfig } from "../../model/types";
import {
  coilFins,
  componentBox,
  compressorIcon,
  expansionValveIcon,
  fanIcon,
  flowArrow,
  reversingValveIcon,
} from "../icons";

type CircuitLayout = {
  loop: string;
  high: string;
  low: string;
  evaporator: { x: number; y: number };
  condenser: { x: number; y: number };
  compressor: { x: number; y: number };
  expansion: { x: number; y: number };
  reversingValve: { x: number; y: number };
  arrows: { x: number; y: number; rotation: number }[];
};

const VIEWBOX_WIDTH = 960;

function flipX(x: number): number {
  return VIEWBOX_WIDTH - x;
}

function flipPath(d: string): string {
  return d.replace(
    /([MH])(-?\d*\.?\d+)/g,
    (_match, cmd: string, num: string) => `${cmd}${flipX(Number(num))}`,
  );
}

function flipRotation(rotation: number): number {
  if (rotation === 0) {
    return 180;
  }
  if (rotation === 180) {
    return 0;
  }
  return rotation;
}

function flipPoint(point: { x: number; y: number }): { x: number; y: number } {
  return { x: flipX(point.x), y: point.y };
}

function mirrorLayout(layout: CircuitLayout): CircuitLayout {
  return {
    loop: flipPath(layout.loop),
    high: flipPath(layout.high),
    low: flipPath(layout.low),
    evaporator: flipPoint(layout.evaporator),
    condenser: flipPoint(layout.condenser),
    compressor: flipPoint(layout.compressor),
    expansion: flipPoint(layout.expansion),
    reversingValve: flipPoint(layout.reversingValve),
    arrows: layout.arrows.map((arrow) => ({
      x: flipX(arrow.x),
      y: arrow.y,
      rotation: flipRotation(arrow.rotation),
    })),
  };
}

export function circuitLayout(config: DiagramConfig): CircuitLayout {
  let layout: CircuitLayout;

  if (config.showReversingValve) {
    layout = {
      loop: "M690,370 V250 H840 V405 H145 V220 H720 V370 H690 Z",
      high: "M690,370 V250 H840 V405 H400",
      low: "M400,405 H145 V220 H720 V370 H690",
      evaporator: { x: 145, y: 280 },
      condenser: { x: 840, y: 328 },
      compressor: { x: 705, y: 370 },
      expansion: { x: 400, y: 405 },
      reversingValve: { x: 700, y: 250 },
      arrows: [
        { x: 690, y: 310, rotation: -90 },
        { x: 840, y: 328, rotation: 90 },
        { x: 560, y: 405, rotation: 180 },
        { x: 145, y: 312, rotation: -90 },
        { x: 400, y: 220, rotation: 0 },
        { x: 720, y: 310, rotation: 90 },
      ],
    };
  } else if (config.componentStyle === "simpleBox") {
    layout = {
      loop: "M660,250 H840 V405 H145 V250 H660 Z",
      high: "M660,250 H840 V405 H313",
      low: "M313,405 H145 V250 H660",
      evaporator: { x: 145, y: 328 },
      condenser: { x: 840, y: 328 },
      compressor: { x: 660, y: 250 },
      expansion: { x: 313, y: 405 },
      reversingValve: { x: 700, y: 250 },
      arrows: [
        { x: 400, y: 250, rotation: 0 },
        { x: 840, y: 328, rotation: 90 },
        { x: 560, y: 405, rotation: 180 },
        { x: 145, y: 328, rotation: -90 },
      ],
    };
  } else {
    layout = {
      loop: "M700,390 V250 H840 V405 H145 V220 H700 V390 Z",
      high: "M700,390 V250 H840 V405 H400",
      low: "M400,405 H145 V220 H700 V390",
      evaporator: { x: 145, y: 280 },
      condenser: { x: 840, y: 328 },
      compressor: { x: 705, y: 370 },
      expansion: { x: 400, y: 405 },
      reversingValve: { x: 700, y: 250 },
      arrows: [
        { x: 700, y: 320, rotation: -90 },
        { x: 840, y: 328, rotation: 90 },
        { x: 560, y: 405, rotation: 180 },
        { x: 145, y: 312, rotation: -90 },
        { x: 400, y: 220, rotation: 0 },
      ],
    };
  }

  return config.indoorSide === "right" ? mirrorLayout(layout) : layout;
}

export function topologyKey(config: DiagramConfig): string {
  return `${config.showReversingValve}:${config.componentStyle}:${config.indoorSide}`;
}

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

export function minisplitCoolingScene(config: DiagramConfig): m.Children {
  const circuit = circuitLayout(config);
  const flip = config.indoorSide === "right";
  const placeX = (x: number) => (flip ? flipX(x) : x);
  const placeAnchor = (anchor: string) => {
    if (!flip) {
      return anchor;
    }
    if (anchor === "end") {
      return "start";
    }
    if (anchor === "start") {
      return "end";
    }
    return anchor;
  };

  return [
    m("g.layer-background", { key: "background" }, [
      m("line.wall", { x1: 480, y1: 72, x2: 480, y2: 500 }),
      m(
        "text.zone-title",
        { x: placeX(210), y: 54, "text-anchor": "middle" },
        "Indoor",
      ),
      m(
        "text.zone-title",
        { x: placeX(750), y: 54, "text-anchor": "middle" },
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
        key: "pipe-high",
        d: circuit.high,
        fill: "none",
      }),
      m("path.pipe.pipe-low", {
        key: "pipe-low",
        d: circuit.low,
        fill: "none",
      }),
      m("path.refrigerant-loop", {
        key: "refrigerant-loop",
        id: "refrigerant-loop",
        d: circuit.loop,
        fill: "none",
      }),
    ]),

    m(
      "g.layer-particles",
      { key: "particles", "data-role": "particles" },
      particles(),
    ),

    m(
      "g.layer-arrows",
      { key: "arrows" },
      m(
        "g.static-arrows",
        { key: "static-arrows", "data-role": "static-arrows" },
        circuit.arrows.map((arrow, index) =>
          flowArrow(arrow.x, arrow.y, arrow.rotation, `arrow-${index}`),
        ),
      ),
    ),

    m("g.layer-equipment", { key: "equipment" }, [
      m("g.icon-equipment", {
        key: "icon-equipment",
        transform: flip ? `translate(${VIEWBOX_WIDTH} 0) scale(-1 1)` : undefined,
      }, [
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
          x: circuit.evaporator.x,
          y: circuit.evaporator.y,
          width: 132,
          height: 52,
          label: "Evaporator",
        }),
        componentBox({
          id: "condenser",
          x: circuit.condenser.x,
          y: circuit.condenser.y,
          width: 132,
          height: 52,
          label: "Condenser",
        }),
        componentBox({
          id: "compressor",
          x: circuit.compressor.x,
          y: circuit.compressor.y,
          width: 132,
          height: 52,
          label: "Compressor",
          pulse: true,
        }),
        componentBox({
          id: "expansionValve",
          x: circuit.expansion.x,
          y: circuit.expansion.y,
          width: 150,
          height: 52,
          label: "Expansion valve",
        }),
        componentBox({
          id: "reversingValve",
          x: circuit.reversingValve.x,
          y: circuit.reversingValve.y,
          width: 150,
          height: 52,
          label: "Reversing valve",
        }),
      ]),
    ]),

    m("g.layer-labels", { key: "labels", "data-role": "labels" }, [
      label("Indoor unit", placeX(195), 172, placeAnchor("middle")),
      label("Evaporator", placeX(160), 352, placeAnchor("middle")),
      label("Outdoor unit", placeX(755), 108, placeAnchor("middle")),
      label("Condenser", placeX(855), 328, placeAnchor("middle")),
      label("Compressor", placeX(700), 452, placeAnchor("middle")),
      label(
        "Reversing valve",
        placeX(618),
        246,
        placeAnchor("end"),
        "reversing-valve-label",
      ),
      label("Expansion valve", placeX(400), 438, placeAnchor("middle")),
      label("Vapor line", placeX(320), 206, placeAnchor("middle")),
      label("Liquid line", placeX(250), 392, placeAnchor("middle")),
      label("Heat absorbed", placeX(195), 455, placeAnchor("middle")),
      label("Heat rejected", placeX(755), 475, placeAnchor("middle")),
    ]),
  ];
}
