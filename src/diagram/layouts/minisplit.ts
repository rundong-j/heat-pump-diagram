import m from "mithril";
import {
  badgeText,
  coilLabel,
  CYCLE_READINGS,
  heatFlowLabel,
  indoorCoilRole,
  type StationId,
} from "../../model/cycleData";
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

type Point = { x: number; y: number };

type CircuitLayout = {
  loop: string;
  high: string;
  low: string;
  indoorCoil: Point;
  outdoorCoil: Point;
  compressor: Point;
  expansion: Point;
  reversingValve: Point;
  arrows: { x: number; y: number; rotation: number }[];
  stations: Record<StationId, Point>;
};

const VIEWBOX_WIDTH = 960;

const STATION_ORDER: StationId[] = ["discharge", "liquid", "twoPhase", "suction"];

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
  const n = ((rotation % 360) + 360) % 360;
  if (n === 0) {
    return 180;
  }
  if (n === 180) {
    return 0;
  }
  return rotation;
}

function flipPoint(point: Point): Point {
  return { x: flipX(point.x), y: point.y };
}

function reverseArrows(
  arrows: CircuitLayout["arrows"],
): CircuitLayout["arrows"] {
  return arrows.map((arrow) => ({
    ...arrow,
    rotation: ((arrow.rotation + 180) % 360 + 360) % 360,
  }));
}

function assignStations(
  corners: {
    indoorTop: Point;
    outdoorTop: Point;
    indoorBottom: Point;
    outdoorBottom: Point;
  },
  heating: boolean,
): Record<StationId, Point> {
  if (heating) {
    return {
      discharge: corners.indoorTop,
      liquid: corners.indoorBottom,
      twoPhase: corners.outdoorBottom,
      suction: corners.outdoorTop,
    };
  }
  return {
    discharge: corners.outdoorTop,
    liquid: corners.outdoorBottom,
    twoPhase: corners.indoorBottom,
    suction: corners.indoorTop,
  };
}

function mirrorLayout(layout: CircuitLayout): CircuitLayout {
  return {
    loop: flipPath(layout.loop),
    high: flipPath(layout.high),
    low: flipPath(layout.low),
    indoorCoil: flipPoint(layout.indoorCoil),
    outdoorCoil: flipPoint(layout.outdoorCoil),
    compressor: flipPoint(layout.compressor),
    expansion: flipPoint(layout.expansion),
    reversingValve: flipPoint(layout.reversingValve),
    arrows: layout.arrows.map((arrow) => ({
      x: flipX(arrow.x),
      y: arrow.y,
      rotation: flipRotation(arrow.rotation),
    })),
    stations: {
      discharge: flipPoint(layout.stations.discharge),
      liquid: flipPoint(layout.stations.liquid),
      twoPhase: flipPoint(layout.stations.twoPhase),
      suction: flipPoint(layout.stations.suction),
    },
  };
}

function reversingValveLayout(heating: boolean): CircuitLayout {
  return {
    loop: "M690,370 V250 H840 V405 H145 V220 H720 V370 H690 Z",
    high: heating
      ? "M690,370 H720 V220 H145 V405 H705"
      : "M690,370 V250 H840 V405 H705",
    low: heating
      ? "M705,405 H840 V250 H690"
      : "M705,405 H145 V220 H720 V370 H690",
    indoorCoil: { x: 145, y: 280 },
    outdoorCoil: { x: 840, y: 328 },
    compressor: { x: 705, y: 370 },
    expansion: { x: 705, y: 405 },
    reversingValve: { x: 700, y: 250 },
    arrows: [
      { x: 690, y: 310, rotation: -90 },
      { x: 840, y: 328, rotation: 90 },
      { x: 370, y: 405, rotation: 180 },
      { x: 145, y: 328, rotation: -90 },
      { x: 370, y: 220, rotation: 0 },
      { x: 720, y: 310, rotation: 90 },
    ],
    stations: assignStations(
      {
        indoorTop: { x: 320, y: 204 },
        outdoorTop: { x: 840, y: 210 },
        indoorBottom: { x: 145, y: 460 },
        outdoorBottom: { x: 700, y: 460 },
      },
      heating,
    ),
  };
}

function simpleBoxLayout(heating: boolean): CircuitLayout {
  return {
    loop: "M660,250 H840 V405 H145 V250 H660 Z",
    high: heating
      ? "M660,250 H145 V405 H660"
      : "M660,250 H840 V405 H660",
    low: heating
      ? "M660,405 H840 V250 H660"
      : "M660,405 H145 V250 H660",
    indoorCoil: { x: 145, y: 328 },
    outdoorCoil: { x: 840, y: 328 },
    compressor: { x: 660, y: 250 },
    expansion: { x: 660, y: 405 },
    reversingValve: { x: 700, y: 250 },
    arrows: [
      { x: 370, y: 250, rotation: 0 },
      { x: 840, y: 328, rotation: 90 },
      { x: 370, y: 405, rotation: 180 },
      { x: 145, y: 328, rotation: -90 },
    ],
    stations: assignStations(
      {
        indoorTop: { x: 400, y: 210 },
        outdoorTop: { x: 840, y: 210 },
        indoorBottom: { x: 145, y: 460 },
        outdoorBottom: { x: 700, y: 460 },
      },
      heating,
    ),
  };
}

function iconLayout(heating: boolean): CircuitLayout {
  return {
    loop: "M700,390 V250 H840 V405 H145 V220 H700 V390 Z",
    high: heating
      ? "M700,390 V220 H145 V405 H705"
      : "M700,390 V250 H840 V405 H705",
    low: heating
      ? "M705,405 H840 V250 H700"
      : "M705,405 H145 V220 H700 V390",
    indoorCoil: { x: 145, y: 280 },
    outdoorCoil: { x: 840, y: 328 },
    compressor: { x: 705, y: 370 },
    expansion: { x: 705, y: 405 },
    reversingValve: { x: 700, y: 250 },
    arrows: [
      { x: 700, y: 320, rotation: -90 },
      { x: 840, y: 328, rotation: 90 },
      { x: 370, y: 405, rotation: 180 },
      { x: 145, y: 312, rotation: -90 },
      { x: 370, y: 220, rotation: 0 },
    ],
    stations: assignStations(
      {
        indoorTop: { x: 320, y: 204 },
        outdoorTop: { x: 840, y: 210 },
        indoorBottom: { x: 145, y: 460 },
        outdoorBottom: { x: 700, y: 460 },
      },
      heating,
    ),
  };
}

export function circuitLayout(config: DiagramConfig): CircuitLayout {
  const heating = config.mode === "heating";
  let layout: CircuitLayout;

  if (config.showReversingValve) {
    layout = reversingValveLayout(heating);
  } else if (config.componentStyle === "simpleBox") {
    layout = simpleBoxLayout(heating);
  } else {
    layout = iconLayout(heating);
  }

  if (heating) {
    layout = { ...layout, arrows: reverseArrows(layout.arrows) };
  }

  return config.indoorSide === "right" ? mirrorLayout(layout) : layout;
}

export function topologyKey(config: DiagramConfig): string {
  return `${config.showReversingValve}:${config.componentStyle}:${config.indoorSide}:${config.mode}`;
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

function houseContext(flip: boolean): m.Children {
  // Canonical indoor-left geometry; mirrored when indoor is on the right.
  // Body runs past the paired arrows so indoor coil + feed lines read as inside.
  return m(
    "g.house-context",
    {
      "data-role": "house",
      transform: flip ? `translate(${VIEWBOX_WIDTH} 0) scale(-1 1)` : undefined,
    },
    [
      m("path.house-body", {
        d: "M48,188 H412 V468 H48 Z",
      }),
      m("path.house-roof", {
        d: "M36,188 L230,78 L424,188 Z",
      }),
    ],
  );
}

function overlayBadge(
  text: string,
  x: number,
  y: number,
  key: string,
  fontScale: number,
): m.Vnode {
  const width = Math.max(72, text.length * 6.6 + 16) * fontScale;
  const height = 22 * fontScale;
  return m("g.overlay-badge", { key, transform: `translate(${x} ${y})` }, [
    m("rect.overlay-badge-bg", {
      x: -width / 2,
      y: -height / 2,
      width,
      height,
      rx: 4,
    }),
    m(
      "text.overlay-badge-text",
      { "text-anchor": "middle", dy: "0.35em" },
      text,
    ),
  ]);
}

export function minisplitScene(config: DiagramConfig): m.Children {
  const circuit = circuitLayout(config);
  const heating = config.mode === "heating";
  const indoorRole = indoorCoilRole(config.mode);
  const outdoorRole = indoorRole === "evaporator" ? "condenser" : "evaporator";
  const readings = CYCLE_READINGS[config.mode];
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

  const overlayBadges = STATION_ORDER.flatMap((station) => {
    const text = badgeText(readings[station], config.overlays);
    if (!text) {
      return [];
    }
    const point = circuit.stations[station];
    return [overlayBadge(text, point.x, point.y, `badge-${station}`, config.fontScale)];
  });

  const indoorZoneX = flip ? 480 : 0;
  const outdoorZoneX = flip ? 0 : 480;

  return [
    m("g.layer-background", { key: "background" }, [
      m("rect.zone-fill.zone-indoor", {
        x: indoorZoneX,
        y: 0,
        width: 480,
        height: 540,
      }),
      m("rect.zone-fill.zone-outdoor", {
        x: outdoorZoneX,
        y: 0,
        width: 480,
        height: 540,
      }),
      houseContext(flip),
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
        `Mini-split heat pump · ${heating ? "heating" : "cooling"}`,
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
            "g.indoor-coil",
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
            "g.outdoor-coil",
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
            reversingValveIcon(heating),
          ),
        ]),

        m(
          "g.expansion-valve",
          {
            transform: heating
              ? "translate(705 405) scale(-1 1)"
              : "translate(705 405)",
          },
          expansionValveIcon(),
        ),
      ]),

      m("g.simple-box-equipment", { key: "simple-box-equipment" }, [
        componentBox({
          id: "indoorCoil",
          x: circuit.indoorCoil.x,
          y: circuit.indoorCoil.y,
          width: 132,
          height: 52,
          label: coilLabel(indoorRole),
        }),
        componentBox({
          id: "outdoorCoil",
          x: circuit.outdoorCoil.x,
          y: circuit.outdoorCoil.y,
          width: 132,
          height: 52,
          label: coilLabel(outdoorRole),
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
      label(
        coilLabel(indoorRole),
        placeX(160),
        352,
        placeAnchor("middle"),
      ),
      label("Outdoor unit", placeX(755), 108, placeAnchor("middle")),
      label(
        coilLabel(outdoorRole),
        placeX(855),
        328,
        placeAnchor("middle"),
      ),
      label("Compressor", placeX(700), 452, placeAnchor("middle")),
      label(
        "Reversing valve",
        placeX(618),
        246,
        placeAnchor("end"),
        "reversing-valve-label",
      ),
      label(
        "Expansion valve",
        circuit.expansion.x,
        circuit.expansion.y + 40,
        "middle",
      ),
      label("Vapor line", placeX(320), 206, placeAnchor("middle")),
      label("Liquid line", placeX(250), 392, placeAnchor("middle")),
      label(
        heatFlowLabel(indoorRole),
        placeX(195),
        455,
        placeAnchor("middle"),
      ),
      label(
        heatFlowLabel(outdoorRole),
        placeX(755),
        475,
        placeAnchor("middle"),
      ),
    ]),

    m(
      "g.layer-overlays",
      { key: "overlays", "data-role": "overlays" },
      overlayBadges,
    ),
  ];
}
