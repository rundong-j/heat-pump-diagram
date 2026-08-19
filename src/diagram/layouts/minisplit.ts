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
import { dashArrowGroups } from "../dashArrows";
import { layer } from "../layer";
import { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from "../viewport";

type Point = { x: number; y: number };

type CircuitLayout = {
  loop: string;
  hot: string;
  warm: string;
  cold: string;
  cool: string;
  indoorCoil: Point;
  outdoorCoil: Point;
  compressor: Point;
  expansion: Point;
  reversingValve: Point;
  arrows: { x: number; y: number; rotation: number }[];
  stations: Record<StationId, Point>;
};

const STATION_ORDER: StationId[] = ["discharge", "liquid", "twoPhase", "suction"];
const ZONE_WIDTH = VIEWPORT_WIDTH / 2;
const SIMPLE_BOX_WIDTH = 140;
const SIMPLE_BOX_HEIGHT = 52;
const SIMPLE_BOX_LOOP_TOP = 250;
const SIMPLE_BOX_LOOP_BOTTOM = 405;
const SIMPLE_BOX_COIL_Y = 328;

/** X along a simple-box coil. Fraction 0 is the left edge, 1 is the right. */
function boxXAtFraction(centerX: number, fraction: number): number {
  return Math.round(
    centerX - SIMPLE_BOX_WIDTH / 2 + SIMPLE_BOX_WIDTH * fraction,
  );
}

/**
 * Canonical fraction that lands at `screenFromLeft` of a coil after optional
 * mirroring (0 = left edge in screen space).
 */
function canonicalFractionForScreen(flip: boolean, screenFromLeft: number): number {
  return flip ? 1 - screenFromLeft : screenFromLeft;
}

/**
 * Heat-transfer overlay insets the loop: left coil at 2/3 from the left in
 * screen space, right coil at 1/3, regardless of evap/cond or indoor/outdoor.
 * With the overlay off, both risers stay on the box centers.
 */
function coilRiserX(
  centerX: number,
  isLeftCoil: boolean,
  flip: boolean,
  compact: boolean,
): number {
  if (!compact) {
    return centerX;
  }
  return boxXAtFraction(
    centerX,
    canonicalFractionForScreen(flip, isLeftCoil ? 2 / 3 : 1 / 3),
  );
}

function flipX(x: number): number {
  return VIEWPORT_WIDTH - x;
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
    hot: flipPath(layout.hot),
    warm: flipPath(layout.warm),
    cold: flipPath(layout.cold),
    cool: flipPath(layout.cool),
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
    hot: heating ? "M690,370 H720 V220 H145 V280" : "M690,370 V250 H840 V328",
    warm: heating ? "M145,280 V405 H705" : "M840,328 V405 H705",
    cold: heating ? "M705,405 H840 V328" : "M705,405 H145 V280",
    cool: heating ? "M840,328 V250 H690" : "M145,280 V220 H720 V370 H690",
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

function simpleBoxLayout(
  heating: boolean,
  flip: boolean,
  compact: boolean,
): CircuitLayout {
  const indoorCx = 145;
  const outdoorCx = 840;
  const indoorPipe = coilRiserX(indoorCx, !flip, flip, compact);
  const outdoorPipe = coilRiserX(outdoorCx, flip, flip, compact);
  const top = SIMPLE_BOX_LOOP_TOP;
  const bot = SIMPLE_BOX_LOOP_BOTTOM;
  const mid = SIMPLE_BOX_COIL_Y;

  return {
    loop: `M660,${top} H${outdoorPipe} V${bot} H${indoorPipe} V${top} H660 Z`,
    hot: heating
      ? `M660,${top} H${indoorPipe} V${mid}`
      : `M660,${top} H${outdoorPipe} V${mid}`,
    warm: heating
      ? `M${indoorPipe},${mid} V${bot} H660`
      : `M${outdoorPipe},${mid} V${bot} H660`,
    cold: heating
      ? `M660,${bot} H${outdoorPipe} V${mid}`
      : `M660,${bot} H${indoorPipe} V${mid}`,
    cool: heating
      ? `M${outdoorPipe},${mid} V${top} H660`
      : `M${indoorPipe},${mid} V${top} H660`,
    indoorCoil: { x: indoorCx, y: mid },
    outdoorCoil: { x: outdoorCx, y: mid },
    compressor: { x: 660, y: top },
    expansion: { x: 660, y: bot },
    reversingValve: { x: 700, y: top },
    arrows: [
      { x: 370, y: top, rotation: 0 },
      { x: outdoorPipe, y: mid, rotation: 90 },
      { x: 370, y: bot, rotation: 180 },
      { x: indoorPipe, y: mid, rotation: -90 },
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
    hot: heating ? "M700,390 V220 H145 V280" : "M700,390 V250 H840 V328",
    warm: heating ? "M145,280 V405 H705" : "M840,328 V405 H705",
    cold: heating ? "M705,405 H840 V328" : "M705,405 H145 V280",
    cool: heating ? "M840,328 V250 H700" : "M145,280 V220 H700 V390",
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
    layout = simpleBoxLayout(
      heating,
      config.indoorSide === "right",
      config.overlays.heatTransfer,
    );
  } else {
    layout = iconLayout(heating);
  }

  if (heating) {
    layout = { ...layout, arrows: reverseArrows(layout.arrows) };
  }

  return config.indoorSide === "right" ? mirrorLayout(layout) : layout;
}

export function topologyKey(config: DiagramConfig): string {
  return `${config.showReversingValve}:${config.componentStyle}:${config.indoorSide}:${config.mode}:${config.overlays.heatTransfer}`;
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
  key?: string,
): m.Vnode {
  return m(
    extraClass ? `text.diagram-label.${extraClass}` : "text.diagram-label",
    { x, y, "text-anchor": anchor, key },
    text,
  );
}

const AIR_FLOW_SHAFT = 26;
const AIR_FLOW_HEAD_WIDTH = 42;
const AIR_FLOW_HEAD_HEIGHT = 24;
/** How far both ends sit from the arc vertex (away from the loop). */
const AIR_FLOW_SAGITTA = 24;

function roundCoord(n: number): number {
  return Math.round(n);
}

type AirFlowKind = "reject" | "absorb";

function airFlowFadeDefs(): m.Vnode {
  return m("defs", { key: "air-flow-shared-defs" }, [
    m(
      "linearGradient",
      {
        key: "air-flow-fade-grad",
        id: "air-flow-fade-grad",
        gradientUnits: "userSpaceOnUse",
        x1: "0",
        y1: String(SIMPLE_BOX_LOOP_TOP),
        x2: "0",
        y2: String(SIMPLE_BOX_LOOP_BOTTOM),
      },
      [
        m("stop", {
          offset: "0%",
          "stop-color": "#fff",
          "stop-opacity": "0",
        }),
        m("stop", {
          offset: "16%",
          "stop-color": "#fff",
          "stop-opacity": "1",
        }),
        m("stop", {
          offset: "84%",
          "stop-color": "#fff",
          "stop-opacity": "1",
        }),
        m("stop", {
          offset: "100%",
          "stop-color": "#fff",
          "stop-opacity": "0",
        }),
      ],
    ),
    m(
      "mask",
      {
        key: "air-flow-fade-mask",
        id: "air-flow-fade-mask",
        maskUnits: "userSpaceOnUse",
        maskContentUnits: "userSpaceOnUse",
      },
      m("rect", {
        x: 0,
        y: 0,
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
        fill: "url(#air-flow-fade-grad)",
      }),
    ),
  ]);
}

/**
 * Uniform circular ring-section arrow on the outside of the refrigerant loop.
 * Left coil: 1/3 mark, bulge right `)` . Right coil: 2/3 mark, bulge left `(` .
 * Indoor always travels down; outdoor always travels up (head-unit / outdoor discharge).
 * Reject (condenser): solid warm dart into the box, solid hot dart out.
 * Absorb (evaporator): solid cool dart into the box, solid cold dart out.
 */
function coilAirFlow(opts: {
  coil: Point;
  onLeft: boolean;
  pointUp: boolean;
  kind: AirFlowKind;
}): m.Vnode {
  const { coil, onLeft, pointUp, kind } = opts;
  const loopTop = SIMPLE_BOX_LOOP_TOP;
  const loopBot = SIMPLE_BOX_LOOP_BOTTOM;
  const chord = loopBot - loopTop;
  const s = AIR_FLOW_SAGITTA;
  const radius = s / 2 + (chord * chord) / (8 * s);
  const alpha = Math.acos(Math.min(1, (radius - s) / radius));
  const xMid = boxXAtFraction(coil.x, onLeft ? 1 / 3 : 2 / 3);
  const yMid = (loopTop + loopBot) / 2;
  const bulgeLeft = !onLeft;
  const goingDown = !pointUp;
  const cx = bulgeLeft ? xMid + radius : xMid - radius;
  const cy = yMid;
  const thetaTop = bulgeLeft ? Math.PI + alpha : -alpha;
  const thetaBot = bulgeLeft ? Math.PI - alpha : alpha;
  const thetaStart = goingDown ? thetaTop : thetaBot;
  const thetaTip = goingDown ? thetaBot : thetaTop;
  const headDelta = AIR_FLOW_HEAD_HEIGHT / radius;
  const thetaIncreases =
    (bulgeLeft && pointUp) || (!bulgeLeft && goingDown);
  const thetaBase = thetaIncreases
    ? thetaTip - headDelta
    : thetaTip + headDelta;
  const hs = AIR_FLOW_SHAFT / 2;
  const hw = AIR_FLOW_HEAD_WIDTH / 2;
  const r = roundCoord;
  const outerSweep = bulgeLeft === goingDown ? 0 : 1;
  const innerSweep = 1 - outerSweep;

  const polar = (rad: number, theta: number): Point => ({
    x: cx + rad * Math.cos(theta),
    y: cy + rad * Math.sin(theta),
  });

  const outerStart = polar(radius + hs, thetaStart);
  const innerStart = polar(radius - hs, thetaStart);
  const outerBase = polar(radius + hs, thetaBase);
  const innerBase = polar(radius - hs, thetaBase);
  const wingOuter = polar(radius + hw, thetaBase);
  const wingInner = polar(radius - hw, thetaBase);
  const tip = polar(radius, thetaTip);

  const d = [
    `M${r(outerStart.x)},${r(outerStart.y)}`,
    `A${r(radius + hs)} ${r(radius + hs)} 0 0 ${outerSweep} ${r(outerBase.x)},${r(outerBase.y)}`,
    `L${r(wingOuter.x)},${r(wingOuter.y)}`,
    `L${r(tip.x)},${r(tip.y)}`,
    `L${r(wingInner.x)},${r(wingInner.y)}`,
    `L${r(innerBase.x)},${r(innerBase.y)}`,
    `A${r(radius - hs)} ${r(radius - hs)} 0 0 ${innerSweep} ${r(innerStart.x)},${r(innerStart.y)}`,
    "Z",
  ].join(" ");

  const boxTop = SIMPLE_BOX_COIL_Y - SIMPLE_BOX_HEIGHT / 2;
  const boxBot = SIMPLE_BOX_COIL_Y + SIMPLE_BOX_HEIGHT / 2;

  function thetaAtY(targetY: number): number {
    const ratio = Math.min(1, Math.max(-1, (targetY - cy) / radius));
    const asinY = Math.asin(ratio);
    return bulgeLeft ? Math.PI - asinY : asinY;
  }

  function centerlineBetween(t0: number, t1: number): string {
    const a = polar(radius, t0);
    const b = polar(radius, t1);
    return [
      `M${a.x.toFixed(2)},${a.y.toFixed(2)}`,
      `A${radius.toFixed(2)} ${radius.toFixed(2)} 0 0 ${outerSweep} ${b.x.toFixed(2)},${b.y.toFixed(2)}`,
    ].join(" ");
  }

  function shaftClipBetween(t0: number, t1: number): string {
    const outer0 = polar(radius + hs, t0);
    const inner0 = polar(radius - hs, t0);
    const outer1 = polar(radius + hs, t1);
    const inner1 = polar(radius - hs, t1);
    return [
      `M${outer0.x.toFixed(2)},${outer0.y.toFixed(2)}`,
      `A${(radius + hs).toFixed(2)} ${(radius + hs).toFixed(2)} 0 0 ${outerSweep} ${outer1.x.toFixed(2)},${outer1.y.toFixed(2)}`,
      `L${inner1.x.toFixed(2)},${inner1.y.toFixed(2)}`,
      `A${(radius - hs).toFixed(2)} ${(radius - hs).toFixed(2)} 0 0 ${innerSweep} ${inner0.x.toFixed(2)},${inner0.y.toFixed(2)}`,
      "Z",
    ].join(" ");
  }

  const thetaInEnd = thetaAtY(goingDown ? boxTop : boxBot);
  const thetaOutStart = thetaAtY(goingDown ? boxBot : boxTop);
  const inboundPath = centerlineBetween(thetaStart, thetaInEnd);
  const outboundPath = centerlineBetween(thetaOutStart, thetaTip);
  const inboundClip = shaftClipBetween(thetaStart, thetaInEnd);
  const outboundClip = shaftClipBetween(thetaOutStart, thetaTip);

  const gradientId =
    kind === "reject"
      ? "air-flow-condenser-gradient"
      : "air-flow-evaporator-gradient";
  const groupKey =
    kind === "reject" ? "air-flow-condenser" : "air-flow-evaporator";
  const tailStop =
    kind === "reject" ? "air-flow-grad-warm" : "air-flow-grad-cool";
  const tipStop =
    kind === "reject" ? "air-flow-grad-hot" : "air-flow-grad-cold";
  const yTail = pointUp ? loopBot : loopTop;
  const yTipGrad = pointUp ? loopTop : loopBot;

  function dartGroup(part: "in" | "out", pathD: string): m.Vnode {
    const partClipId = `air-flow-clip-${kind}-${part}`;
    return m(
      `g.air-flow-motion.air-flow-motion-${kind}-${part}`,
      {
        key: `${groupKey}-motion-${part}`,
        mask: "url(#air-flow-fade-mask)",
      },
      [
        m(
          `g.air-flow-stem-clip.air-flow-stem-clip-${kind}-${part}`,
          {
            key: `${groupKey}-stem-clip-${part}`,
            "clip-path": `url(#${partClipId})`,
          },
          m(`path.air-flow-stem.air-flow-stem-${kind}-${part}`, {
            key: `${groupKey}-stem-${part}`,
            d: pathD,
            fill: "none",
          }),
        ),
        m(`polygon.air-flow-head.air-flow-head-${kind}-${part}`, {
          key: `${groupKey}-head-${part}`,
          points: "0,0 0,0 0,0",
          visibility: "hidden",
        }),
      ],
    );
  }

  const gapLen = radius * Math.abs(thetaOutStart - thetaInEnd);

  return m(`g.${groupKey}`, { key: groupKey, "data-air-gap": String(gapLen) }, [
    m("defs", { key: `${groupKey}-defs` }, [
      m(
        "linearGradient",
        {
          key: `${groupKey}-grad`,
          id: gradientId,
          gradientUnits: "userSpaceOnUse",
          x1: String(xMid),
          y1: String(yTail),
          x2: String(xMid),
          y2: String(yTipGrad),
        },
        [
          m(`stop.${tailStop}`, {
            offset: "0%",
            "stop-opacity": "0",
          }),
          m(`stop.${tipStop}`, {
            offset: "45%",
            "stop-opacity": "1",
          }),
        ],
      ),
      m(
        "clipPath",
        {
          key: `${groupKey}-clip-in`,
          id: `air-flow-clip-${kind}-in`,
          clipPathUnits: "userSpaceOnUse",
        },
        m("path", { key: `${groupKey}-clip-path-in`, d: inboundClip }),
      ),
      m(
        "clipPath",
        {
          key: `${groupKey}-clip-out`,
          id: `air-flow-clip-${kind}-out`,
          clipPathUnits: "userSpaceOnUse",
        },
        m("path", { key: `${groupKey}-clip-path-out`, d: outboundClip }),
      ),
    ]),
    m(`path.air-flow-arrow.air-flow-arrow-${kind}`, {
      key: `${groupKey}-arrow`,
      d,
    }),
    dartGroup("in", inboundPath),
    dartGroup("out", outboundPath),
  ]);
}

function houseContext(flip: boolean): m.Children {
  // Canonical indoor-left geometry; mirrored when indoor is on the right.
  // Body runs past the paired arrows so indoor coil + feed lines read as inside.
  return m(
    "g.house-context",
    {
      "data-role": "house",
      transform: flip ? `translate(${VIEWPORT_WIDTH} 0) scale(-1 1)` : undefined,
    },
    [
      m("path.house-body", {
        d: "M48,188 H412 V492 H48 Z",
      }),
      m("path.house-roof", {
        d: "M36,188 L230,78 L424,188 Z",
      }),
    ],
  );
}

function snowflakeMark(x: number, y: number, size: number): m.Vnode {
  const diag = size * 0.72;
  return m("g.weather-flake", { transform: `translate(${x} ${y})` }, [
    m("line", { x1: 0, y1: -size, x2: 0, y2: size }),
    m("line", { x1: -size, y1: 0, x2: size, y2: 0 }),
    m("line", { x1: -diag, y1: -diag, x2: diag, y2: diag }),
    m("line", { x1: diag, y1: -diag, x2: -diag, y2: diag }),
  ]);
}

function outdoorWeather(flip: boolean): m.Children {
  // Canonical outdoor-right (indoor-left); mirrored with the outdoor zone.
  const sunX = 888;
  const sunY = 86;
  const sunR = 16;
  const rayInner = sunR + 5;
  const rayOuter = sunR + 13;
  const rays = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return m("line", {
      x1: sunX + Math.cos(rad) * rayInner,
      y1: sunY + Math.sin(rad) * rayInner,
      x2: sunX + Math.cos(rad) * rayOuter,
      y2: sunY + Math.sin(rad) * rayOuter,
    });
  });

  return m(
    "g.outdoor-weather",
    {
      transform: flip ? `translate(${VIEWPORT_WIDTH} 0) scale(-1 1)` : undefined,
    },
    [
      m("g.weather-sun", [
        m("circle.weather-sun-disc", { cx: sunX, cy: sunY, r: sunR }),
        m("g.weather-sun-rays", rays),
      ]),
      m("g.weather-snow", [
        snowflakeMark(530, 90, 11),
        snowflakeMark(572, 152, 9),
        snowflakeMark(618, 78, 13),
        snowflakeMark(662, 176, 10),
        snowflakeMark(708, 108, 12),
        snowflakeMark(754, 196, 9),
        snowflakeMark(798, 74, 11),
        snowflakeMark(838, 144, 10),
        snowflakeMark(878, 96, 13),
        snowflakeMark(918, 178, 9),
        snowflakeMark(640, 122, 8),
        snowflakeMark(782, 124, 9),
        snowflakeMark(548, 210, 8),
        snowflakeMark(894, 218, 8),
      ]),
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
  const condenserCoil =
    indoorRole === "condenser" ? circuit.indoorCoil : circuit.outdoorCoil;
  const evaporatorCoil =
    indoorRole === "evaporator" ? circuit.indoorCoil : circuit.outdoorCoil;
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

  const indoorZoneX = flip ? ZONE_WIDTH : 0;
  const outdoorZoneX = flip ? 0 : ZONE_WIDTH;

  return [
    layer("background", [
      m("rect.zone-fill.zone-indoor", {
        x: indoorZoneX,
        y: 0,
        width: ZONE_WIDTH,
        height: VIEWPORT_HEIGHT,
      }),
      m("rect.zone-fill.zone-outdoor", {
        x: outdoorZoneX,
        y: 0,
        width: ZONE_WIDTH,
        height: VIEWPORT_HEIGHT,
      }),
      outdoorWeather(flip),
      houseContext(flip),
      m("line.wall", { x1: ZONE_WIDTH, y1: 72, x2: ZONE_WIDTH, y2: 500 }),
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
        { "data-role": "caption", x: ZONE_WIDTH, y: 28, "text-anchor": "middle" },
        `Mini-split heat pump · ${heating ? "heating" : "cooling"}`,
      ),
    ]),

    layer("circuit", [
      m("path.pipe.pipe-hot", {
        key: "pipe-hot",
        d: circuit.hot,
        fill: "none",
      }),
      m("path.pipe.pipe-warm", {
        key: "pipe-warm",
        d: circuit.warm,
        fill: "none",
      }),
      m("path.pipe.pipe-cold", {
        key: "pipe-cold",
        d: circuit.cold,
        fill: "none",
      }),
      m("path.pipe.pipe-cool", {
        key: "pipe-cool",
        d: circuit.cool,
        fill: "none",
      }),
      m("path.refrigerant-loop", {
        key: "refrigerant-loop",
        id: "refrigerant-loop",
        d: circuit.loop,
        fill: "none",
      }),
      dashArrowGroups(),
    ]),

    layer("particles", particles()),

    layer(
      "arrows",
      m(
        "g.static-arrows",
        { key: "static-arrows", "data-role": "static-arrows" },
        circuit.arrows.map((arrow, index) =>
          flowArrow(arrow.x, arrow.y, arrow.rotation, `arrow-${index}`),
        ),
      ),
    ),

    layer("air-flow", [
      airFlowFadeDefs(),
      coilAirFlow({
        coil: condenserCoil,
        onLeft: condenserCoil.x < ZONE_WIDTH,
        pointUp: condenserCoil === circuit.outdoorCoil,
        kind: "reject",
      }),
      coilAirFlow({
        coil: evaporatorCoil,
        onLeft: evaporatorCoil.x < ZONE_WIDTH,
        pointUp: evaporatorCoil === circuit.outdoorCoil,
        kind: "absorb",
      }),
    ]),

    layer("equipment", [
      m("g.icon-equipment", {
        key: "icon-equipment",
        transform: flip ? `translate(${VIEWPORT_WIDTH} 0) scale(-1 1)` : undefined,
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
          width: SIMPLE_BOX_WIDTH,
          height: SIMPLE_BOX_HEIGHT,
          label: coilLabel("indoor", indoorRole, config.coilLabels),
        }),
        componentBox({
          id: "outdoorCoil",
          x: circuit.outdoorCoil.x,
          y: circuit.outdoorCoil.y,
          width: SIMPLE_BOX_WIDTH,
          height: SIMPLE_BOX_HEIGHT,
          label: coilLabel("outdoor", outdoorRole, config.coilLabels),
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

    layer("labels", [
      label("Indoor unit", placeX(195), 172, placeAnchor("middle")),
      label(
        coilLabel("indoor", indoorRole, config.coilLabels),
        placeX(160),
        352,
        placeAnchor("middle"),
      ),
      label("Outdoor unit", placeX(755), 108, placeAnchor("middle")),
      label(
        coilLabel("outdoor", outdoorRole, config.coilLabels),
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
    ]),

    layer("heat-transfer", [
      label(
        heatFlowLabel(indoorRole),
        circuit.indoorCoil.x,
        475,
        "middle",
        undefined,
        "heat-indoor",
      ),
      label(
        heatFlowLabel(outdoorRole),
        circuit.outdoorCoil.x,
        475,
        "middle",
        undefined,
        "heat-outdoor",
      ),
    ]),

    layer("overlays", overlayBadges),
  ];
}
