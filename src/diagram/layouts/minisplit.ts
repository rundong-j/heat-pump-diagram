import m from "mithril";
import {
  badgeText,
  coilLabel,
  CYCLE_READINGS,
  heatFlowLabel,
  indoorCoilRole,
  type CoilRole,
  type StationId,
} from "../../model/cycleData";
import type { DiagramConfig } from "../../model/types";
import {
  // coilFins,
  componentBox,
  // compressorIcon,
  // expansionValveIcon,
  // fanIcon,
  flowArrow,
  // reversingValveIcon,
  expansionValveSymbol,
  compressorTrapezoid,
  reversingValveSlide,
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
  indoorCoilSegments: string[];
  outdoorCoilSegments: string[];
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
const SIMPLE_BOX_MACHINE_X = 660;
const SIMPLE_BOX_RV_WIDTH = 132;
/** Discharge / suction stub offset from the RV center (canonical indoor-left). */
const SIMPLE_BOX_RV_STUB = 24;
const SIMPLE_BOX_RV_PORT_PAD = 16;
const COMPRESSOR_TRAP_HALF_WIDTH = 22;
const COMPRESSOR_TRAP_LEFT_HALF = 20;
const COMPRESSOR_TRAP_RIGHT_HALF = 13;
/** Icon 4-way: indoor / outdoor ports sit this far from the suction (center) port. */
const ICON_RV_PORT = 34;
/** Horizontal suction/discharge visible on each side of the centered compressor. */
const ICON_RV_PIPE_STUB = 28;
/** Icon 4-way: discharge riser, screen-right of the unflipped compressor. */
const ICON_RV_DISCHARGE_OFFSET =
  COMPRESSOR_TRAP_HALF_WIDTH * 2 + ICON_RV_PIPE_STUB * 2;
/** Icon 4-way: compressor discharge enters the top port this far above the vapor line. */
const ICON_RV_DIN = 42;
/** Icon 4-way: high-pressure chamber path above the vapor line. */
const ICON_RV_CHAMBER = 28;
/** Icon 4-way: sliding suction U (canoe) above the vapor line. */
const ICON_RV_SLIDE = 16;
const ICON_RV_PORT_PAD = 16;
const EXPANSION_SYMBOL_HALF_WIDTH = 16;
const EXPANSION_SYMBOL_HALF_HEIGHT = 13;
const INDOOR_COIL_ROWS = 7;
const INDOOR_COIL_CORNER_STUB = 16;
const INDOOR_COIL_SEGMENTS = INDOOR_COIL_ROWS * 2 + 1;
const INDOOR_COIL_RUN_WIDTH = SIMPLE_BOX_HEIGHT;
const INDOOR_COIL_SPAN = SIMPLE_BOX_WIDTH;
/** Canonical indoor-left house-body outer wall (screen-right when indoor is right). */
const HOUSE_BODY_OUTER_X = 48;
/** Horizontal air-flow: stay inside the viewport after the outdoor coil (icon). */
const ICON_AIR_EDGE_MARGIN = 20;
/** Stop indoor outbound this far inside the house outer wall (icon). */
const ICON_AIR_WALL_INSET = 8;
/** Fade the last stretch of icon outbound so the dart dissolves before the wall. */
const ICON_AIR_WALL_FADE = 36;
/** Icon coil labels: outer top corner of the winding stack. */
const ICON_COIL_LABEL_X_PAD = 8;
const ICON_COIL_LABEL_Y_OFFSET = -(INDOOR_COIL_SPAN / 2) + INDOOR_COIL_CORNER_STUB;

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
    indoorCoilSegments: layout.indoorCoilSegments.map(flipPath),
    outdoorCoilSegments: layout.outdoorCoilSegments.map(flipPath),
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

/* Parked abstract-icon reversing-valve circuit (canonical indoor-left).
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
*/

function iconRvGeom(
  machineX: number,
  top: number,
  heating: boolean,
  flip: boolean,
) {
  const leftX = machineX - ICON_RV_PORT;
  const rightX = machineX + ICON_RV_PORT;
  const coveredX = heating ? rightX : leftX;
  const uncoveredX = heating ? leftX : rightX;
  return {
    leftX,
    midX: machineX,
    rightX,
    coveredX,
    uncoveredX,
    disX: machineX + (flip ? -ICON_RV_DISCHARGE_OFFSET : ICON_RV_DISCHARGE_OFFSET),
    dInY: top - ICON_RV_DIN,
    chamberY: top - ICON_RV_CHAMBER,
    slideY: top - ICON_RV_SLIDE,
  };
}

function simpleBoxArrows(opts: {
  heating: boolean;
  showReversingValve: boolean;
  indoorPipe: number;
  outdoorPipe: number;
  top: number;
  bot: number;
  mid: number;
  machineX: number;
  disX: number;
  sucX: number;
  iconValve?: boolean;
}): CircuitLayout["arrows"] {
  const {
    heating,
    showReversingValve,
    indoorPipe,
    outdoorPipe,
    top,
    bot,
    mid,
    machineX,
    disX,
    sucX,
    iconValve,
  } = opts;
  const loopArrows: CircuitLayout["arrows"] = [
    { x: 370, y: top, rotation: 0 },
    { x: outdoorPipe, y: mid, rotation: 90 },
    { x: 370, y: bot, rotation: 180 },
    { x: indoorPipe, y: mid, rotation: -90 },
  ];
  if (!showReversingValve) {
    return loopArrows;
  }
  const vapor = heating ? 180 : 0;
  const stubY = Math.round((top + mid) / 2);
  const vaporLeft = iconValve
    ? machineX - ICON_RV_PORT - ICON_RV_PORT_PAD
    : machineX - SIMPLE_BOX_RV_WIDTH / 2 - SIMPLE_BOX_RV_PORT_PAD;
  const vaporRight = iconValve
    ? machineX + ICON_RV_PORT + ICON_RV_PORT_PAD
    : machineX + SIMPLE_BOX_RV_WIDTH / 2 + SIMPLE_BOX_RV_PORT_PAD;
  return [
    ...(heating ? reverseArrows(loopArrows) : loopArrows),
    { x: disX, y: stubY, rotation: -90 },
    { x: sucX, y: stubY, rotation: 90 },
    { x: vaporLeft, y: top, rotation: vapor },
    { x: vaporRight, y: top, rotation: vapor },
  ];
}

function emptyCoilSegments(): string[] {
  return Array.from({ length: INDOOR_COIL_SEGMENTS }, () => "M0,0");
}

/**
 * Tall stack of short horizontal runs, centered on `centerX`.
 * Heating winds down from the center; cooling winds up. After each loop
 * corner a short vertical stub runs before the first/last sideways run.
 * First and last runs are half-width so the loop can enter and leave on the riser.
 * `mirrorRuns` swaps left/right so the outdoor coil is a horizontal mirror.
 */
function indoorCoilPieces(
  centerX: number,
  top: number,
  bot: number,
  heating: boolean,
  mirrorRuns = false,
): string[] {
  const left = centerX - INDOOR_COIL_RUN_WIDTH / 2;
  const right = centerX + INDOOR_COIL_RUN_WIDTH / 2;
  const first = mirrorRuns ? left : right;
  const other = mirrorRuns ? right : left;
  const runTop = top + INDOOR_COIL_CORNER_STUB;
  const runBot = bot - INDOOR_COIL_CORNER_STUB;
  const pitch = (runBot - runTop) / (INDOOR_COIL_ROWS - 1);
  const yAt = (row: number) => runTop + row * pitch;
  const pieces: string[] = [];
  const pushV = (x: number, y0: number, y1: number) => {
    pieces.push(`M${Math.round(x)},${Math.round(y0)} V${Math.round(y1)}`);
  };
  const pushH = (x0: number, x1: number, y: number) => {
    pieces.push(`M${Math.round(x0)},${Math.round(y)} H${Math.round(x1)}`);
  };

  if (heating) {
    pushV(centerX, top, runTop);
    for (let i = 0; i < INDOOR_COIL_ROWS; i += 1) {
      const y = yAt(i);
      if (i === 0) {
        pushH(centerX, first, y);
      } else if (i === INDOOR_COIL_ROWS - 1) {
        pushH(other, centerX, y);
      } else if (i % 2 === 0) {
        pushH(other, first, y);
      } else {
        pushH(first, other, y);
      }
      if (i < INDOOR_COIL_ROWS - 1) {
        const arriveX = i % 2 === 0 ? first : other;
        pushV(arriveX, y, yAt(i + 1));
      }
    }
    pushV(centerX, runBot, bot);
  } else {
    pushV(centerX, bot, runBot);
    for (let i = INDOOR_COIL_ROWS - 1; i >= 0; i -= 1) {
      const y = yAt(i);
      if (i === INDOOR_COIL_ROWS - 1) {
        pushH(centerX, other, y);
      } else if (i === 0) {
        pushH(first, centerX, y);
      } else if (i % 2 === 0) {
        pushH(first, other, y);
      } else {
        pushH(other, first, y);
      }
      if (i > 0) {
        const arriveX = i % 2 === 0 ? other : first;
        pushV(arriveX, y, yAt(i - 1));
      }
    }
    pushV(centerX, runTop, top);
  }
  return pieces;
}

function simpleBoxLayout(
  heating: boolean,
  flip: boolean,
  compact: boolean,
  showReversingValve: boolean,
  iconCoils: boolean,
): CircuitLayout {
  const indoorCx = 145;
  const outdoorCx = 840;
  const indoorPipe = coilRiserX(indoorCx, !flip, flip, compact);
  const outdoorPipe = coilRiserX(outdoorCx, flip, flip, compact);
  const top = SIMPLE_BOX_LOOP_TOP;
  const bot = SIMPLE_BOX_LOOP_BOTTOM;
  const mid = SIMPLE_BOX_COIL_Y;
  const machineX = SIMPLE_BOX_MACHINE_X;
  const condPipe = heating ? indoorPipe : outdoorPipe;
  const evapPipe = heating ? outdoorPipe : indoorPipe;
  const iconRv =
    iconCoils && showReversingValve
      ? iconRvGeom(machineX, top, heating, flip)
      : null;
  const disX = iconRv?.disX ?? machineX - SIMPLE_BOX_RV_STUB;
  const sucX = iconRv?.midX ?? machineX + SIMPLE_BOX_RV_STUB;
  const expWest = machineX - EXPANSION_SYMBOL_HALF_WIDTH;
  const expEast = machineX + EXPANSION_SYMBOL_HALF_WIDTH;
  const warmEnd = condPipe < machineX ? expWest : expEast;
  const coldStart = evapPipe < machineX ? expWest : expEast;
  const coilTop = mid - INDOOR_COIL_SPAN / 2;
  const coilBot = mid + INDOOR_COIL_SPAN / 2;
  const indoorPieces = indoorCoilPieces(
    indoorPipe,
    coilTop,
    coilBot,
    heating,
  );
  const outdoorPieces = indoorCoilPieces(
    outdoorPipe,
    coilTop,
    coilBot,
    !heating,
    true,
  );

  let loop: string;
  let hot: string;
  let warm: string;
  let cold: string;
  let cool: string;
  let indoorCoilSegments: string[];
  let outdoorCoilSegments: string[];

  if (iconCoils) {
    indoorCoilSegments = indoorPieces;
    outdoorCoilSegments = outdoorPieces;
    const condX = heating ? indoorPipe : outdoorPipe;
    const evapX = heating ? outdoorPipe : indoorPipe;
    if (iconRv) {
      const { uncoveredX, coveredX } = iconRv;
      hot = `M${iconRv.disX},${mid} V${iconRv.dInY} H${iconRv.midX} V${iconRv.chamberY} H${uncoveredX} V${top} H${condX} V${coilTop}`;
      warm = `M${condX},${coilBot} V${bot} H${warmEnd}`;
      cold = `M${coldStart},${bot} H${evapX} V${coilBot}`;
      cool = `M${evapX},${coilTop} V${top} H${coveredX} V${iconRv.slideY} H${iconRv.midX} V${mid}`;
      loop = `M${iconRv.disX},${mid} V${iconRv.dInY} H${iconRv.midX} V${iconRv.chamberY} H${uncoveredX} V${top} H${condPipe} V${bot} H${evapPipe} V${top} H${coveredX} V${iconRv.slideY} H${iconRv.midX} V${mid} H${iconRv.disX} Z`;
    } else {
      hot = `M${machineX},${top} H${condX} V${coilTop}`;
      warm = `M${condX},${coilBot} V${bot} H${warmEnd}`;
      cold = `M${coldStart},${bot} H${evapX} V${coilBot}`;
      cool = `M${evapX},${coilTop} V${top} H${machineX}`;
      loop = `M${machineX},${top} H${outdoorPipe} V${bot} H${indoorPipe} V${top} H${machineX} Z`;
    }
  } else {
    indoorCoilSegments = emptyCoilSegments();
    outdoorCoilSegments = emptyCoilSegments();
    loop = showReversingValve
      ? `M${disX},${mid} V${top} H${condPipe} V${bot} H${evapPipe} V${top} H${sucX} V${mid} H${disX} Z`
      : `M${machineX},${top} H${outdoorPipe} V${bot} H${indoorPipe} V${top} H${machineX} Z`;
    hot = showReversingValve
      ? `M${disX},${mid} V${top} H${condPipe} V${mid}`
      : `M${machineX},${top} H${condPipe} V${mid}`;
    warm = `M${condPipe},${mid} V${bot} H${warmEnd}`;
    cold = `M${coldStart},${bot} H${evapPipe} V${mid}`;
    cool = showReversingValve
      ? `M${evapPipe},${mid} V${top} H${sucX} V${mid}`
      : `M${evapPipe},${mid} V${top} H${machineX}`;
  }

  return {
    loop,
    hot,
    warm,
    cold,
    cool,
    indoorCoilSegments,
    outdoorCoilSegments,
    indoorCoil: { x: iconCoils ? indoorPipe : indoorCx, y: mid },
    outdoorCoil: { x: iconCoils ? outdoorPipe : outdoorCx, y: mid },
    compressor: {
      x: iconRv ? Math.round((iconRv.midX + iconRv.disX) / 2) : machineX,
      y: showReversingValve ? mid : top,
    },
    expansion: { x: machineX, y: bot },
    reversingValve: { x: machineX, y: iconRv ? iconRv.dInY : top },
    arrows: simpleBoxArrows({
      heating,
      showReversingValve,
      indoorPipe,
      outdoorPipe,
      top,
      bot,
      mid,
      machineX,
      disX,
      sucX,
      iconValve: Boolean(iconRv),
    }),
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

/* Parked abstract-icon loop with the reversing valve hidden (canonical indoor-left).
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
*/

function usesBoxLayout(style: DiagramConfig["componentStyle"]): boolean {
  return style === "simpleBox" || style === "icon";
}

export function circuitLayout(config: DiagramConfig): CircuitLayout {
  const heating = config.mode === "heating";
  let layout: CircuitLayout = simpleBoxLayout(
    heating,
    config.indoorSide === "right",
    config.overlays.heatTransfer,
    config.showReversingValve,
    config.componentStyle === "icon",
  );

  const reverseLoopArrows =
    heating &&
    !(usesBoxLayout(config.componentStyle) && config.showReversingValve);
  if (reverseLoopArrows) {
    layout = { ...layout, arrows: reverseArrows(layout.arrows) };
  }

  return config.indoorSide === "right" ? mirrorLayout(layout) : layout;
}

export function topologyKey(config: DiagramConfig): string {
  return `${config.showReversingValve}:${config.componentStyle}:${config.indoorSide}:${config.mode}:${config.overlays.heatTransfer}`;
}

/** Simple-box RV loops are already drawn in flow order; do not play them backwards. */
export function reverseParticleLoop(config: DiagramConfig): boolean {
  return (
    config.mode === "heating" &&
    !(usesBoxLayout(config.componentStyle) && config.showReversingValve)
  );
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

function airFlowKindMeta(kind: AirFlowKind): {
  gradientId: string;
  groupKey: string;
  tailStop: string;
  tipStop: string;
} {
  if (kind === "reject") {
    return {
      gradientId: "air-flow-condenser-gradient",
      groupKey: "air-flow-condenser",
      tailStop: "air-flow-grad-warm",
      tipStop: "air-flow-grad-hot",
    };
  }
  return {
    gradientId: "air-flow-evaporator-gradient",
    groupKey: "air-flow-evaporator",
    tailStop: "air-flow-grad-cool",
    tipStop: "air-flow-grad-cold",
  };
}

function airFlowDartGroup(
  kind: AirFlowKind,
  groupKey: string,
  part: "in" | "out",
  pathD: string,
  maskUrl: string,
): m.Vnode {
  const partClipId = `air-flow-clip-${kind}-${part}`;
  return m(
    `g.air-flow-motion.air-flow-motion-${kind}-${part}`,
    {
      key: `${groupKey}-motion-${part}`,
      mask: maskUrl,
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

function fadeStopsAlong(
  span: number,
  fadeInPx: number,
  fadeOutPx: number,
): m.Children {
  const inPct = Math.min(40, Math.max(4, (fadeInPx / span) * 100));
  const outPct = Math.min(96, Math.max(inPct + 8, (1 - fadeOutPx / span) * 100));
  const pct = (n: number) => `${n.toFixed(1)}%`;
  return [
    m("stop", {
      offset: "0%",
      "stop-color": "#fff",
      "stop-opacity": "0",
    }),
    m("stop", {
      offset: pct(inPct),
      "stop-color": "#fff",
      "stop-opacity": "1",
    }),
    m("stop", {
      offset: pct(outPct),
      "stop-color": "#fff",
      "stop-opacity": "1",
    }),
    m("stop", {
      offset: "100%",
      "stop-color": "#fff",
      "stop-opacity": "0",
    }),
  ];
}

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

type IconAirTrack = {
  xTail: number;
  xInEnd: number;
  xOutStart: number;
  xTip: number;
};

function coilHorizontalEdges(coil: Point): {
  left: number;
  right: number;
  onLeft: boolean;
} {
  const half = INDOOR_COIL_RUN_WIDTH / 2;
  return {
    left: coil.x - half,
    right: coil.x + half,
    onLeft: coil.x < ZONE_WIDTH,
  };
}

/**
 * Outdoor inbound starts at the midpoint between the outdoor coil's inner edge
 * and the suction column. Indoor inbound matches that length. Indoor outbound
 * stops just inside the house outer wall; outdoor outbound matches that length.
 */
function iconAirFlowTracks(
  indoorCoil: Point,
  outdoorCoil: Point,
  suctionX: number,
): { indoor: IconAirTrack; outdoor: IconAirTrack } {
  const indoor = coilHorizontalEdges(indoorCoil);
  const outdoor = coilHorizontalEdges(outdoorCoil);
  const outdoorInner = outdoor.onLeft ? outdoor.right : outdoor.left;
  const outdoorOuter = outdoor.onLeft ? outdoor.left : outdoor.right;
  const outdoorTail = (outdoorInner + suctionX) / 2;
  const inboundLen = Math.abs(outdoorInner - outdoorTail);

  const indoorInner = indoor.onLeft ? indoor.right : indoor.left;
  const indoorOuter = indoor.onLeft ? indoor.left : indoor.right;
  const indoorTail = indoor.onLeft
    ? indoorInner + inboundLen
    : indoorInner - inboundLen;

  const houseWall = indoor.onLeft
    ? HOUSE_BODY_OUTER_X
    : VIEWPORT_WIDTH - HOUSE_BODY_OUTER_X;
  const indoorTip = indoor.onLeft
    ? houseWall + ICON_AIR_WALL_INSET
    : houseWall - ICON_AIR_WALL_INSET;
  const outboundLen = Math.abs(indoorOuter - indoorTip);
  const outdoorTip = Math.min(
    VIEWPORT_WIDTH - ICON_AIR_EDGE_MARGIN,
    Math.max(
      ICON_AIR_EDGE_MARGIN,
      outdoor.onLeft ? outdoorOuter - outboundLen : outdoorOuter + outboundLen,
    ),
  );

  return {
    indoor: {
      xTail: indoorTail,
      xInEnd: indoorInner,
      xOutStart: indoorOuter,
      xTip: indoorTip,
    },
    outdoor: {
      xTail: outdoorTail,
      xInEnd: outdoorInner,
      xOutStart: outdoorOuter,
      xTip: outdoorTip,
    },
  };
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
  indoor?: boolean;
  icon?: boolean;
  iconTrack?: IconAirTrack;
}): m.Vnode {
  if (opts.icon && opts.iconTrack) {
    return coilAirFlowIcon({ ...opts, iconTrack: opts.iconTrack });
  }
  return coilAirFlowBox(opts);
}

function coilAirFlowBox(opts: {
  coil: Point;
  onLeft: boolean;
  pointUp: boolean;
  kind: AirFlowKind;
  indoor?: boolean;
}): m.Vnode {
  const { coil, onLeft, pointUp, kind, indoor } = opts;
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

  const { gradientId, groupKey, tailStop, tipStop } = airFlowKindMeta(kind);
  const yTail = pointUp ? loopBot : loopTop;
  const yTipGrad = pointUp ? loopTop : loopBot;

  const gapLen = radius * Math.abs(thetaOutStart - thetaInEnd);

  return m(
    `g.${groupKey}${indoor ? ".air-flow-indoor" : ".air-flow-outdoor"}`,
    { key: groupKey, "data-air-gap": String(gapLen) },
    [
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
    airFlowDartGroup(kind, groupKey, "in", inboundPath, "url(#air-flow-fade-mask)"),
    airFlowDartGroup(kind, groupKey, "out", outboundPath, "url(#air-flow-fade-mask)"),
    ],
  );
}

/** Straight horizontal darts through the icon coil stack (52×140), inside → outside. */
function coilAirFlowIcon(opts: {
  coil: Point;
  onLeft: boolean;
  kind: AirFlowKind;
  indoor?: boolean;
  iconTrack: IconAirTrack;
}): m.Vnode {
  const { coil, kind, indoor, iconTrack } = opts;
  const yMid = coil.y;
  const { xTail, xInEnd, xOutStart, xTip } = iconTrack;
  const goingRight = xTip > xTail;
  const gap = Math.abs(xOutStart - xInEnd);
  const inboundLen = Math.abs(xInEnd - xTail);
  const outboundLen = Math.abs(xTip - xOutStart);
  const fadeOut = Math.min(
    ICON_AIR_WALL_FADE,
    Math.max(AIR_FLOW_HEAD_HEIGHT, outboundLen * 0.45),
  );
  const opaqueOut = Math.max(outboundLen - fadeOut, AIR_FLOW_HEAD_HEIGHT);
  const hs = AIR_FLOW_SHAFT / 2;
  const hw = AIR_FLOW_HEAD_WIDTH / 2;
  const hl = AIR_FLOW_HEAD_HEIGHT;
  const r = roundCoord;

  function horizontalArrowPath(fromX: number, toX: number): string {
    const dir = toX >= fromX ? 1 : -1;
    const base = toX - dir * hl;
    return [
      `M${r(fromX)},${r(yMid - hs)}`,
      `H${r(base)}`,
      `L${r(base)},${r(yMid - hw)}`,
      `L${r(toX)},${r(yMid)}`,
      `L${r(base)},${r(yMid + hw)}`,
      `L${r(base)},${r(yMid + hs)}`,
      `H${r(fromX)}`,
      "Z",
    ].join(" ");
  }

  function horizontalCenterline(x0: number, x1: number): string {
    return `M${x0.toFixed(2)},${yMid.toFixed(2)} H${x1.toFixed(2)}`;
  }

  function horizontalShaftClip(x0: number, x1: number): string {
    const left = Math.min(x0, x1);
    const right = Math.max(x0, x1);
    return [
      `M${left.toFixed(2)},${(yMid - hs).toFixed(2)}`,
      `H${right.toFixed(2)}`,
      `V${(yMid + hs).toFixed(2)}`,
      `H${left.toFixed(2)}`,
      "Z",
    ].join(" ");
  }

  const inboundPath = horizontalCenterline(xTail, xInEnd);
  const outboundPath = horizontalCenterline(xOutStart, xTip);
  const inboundClip = horizontalShaftClip(xTail, xInEnd);
  const outboundClip = horizontalShaftClip(xOutStart, xTip);
  const xStaticTip = goingRight ? xOutStart + opaqueOut : xOutStart - opaqueOut;
  const arrowPath = horizontalArrowPath(xTail, xStaticTip);

  const { gradientId, groupKey, tailStop, tipStop } = airFlowKindMeta(kind);
  const fadeGradId = `${groupKey}-fade-grad-h`;
  const fadeMaskId = `${groupKey}-fade-mask-h`;

  return m(
    `g.${groupKey}.air-flow-horizontal${indoor ? ".air-flow-indoor" : ".air-flow-outdoor"}`,
    {
      key: groupKey,
      "data-air-gap": String(gap),
      "data-air-window": String(inboundLen + gap + opaqueOut),
    },
    [
      m("defs", { key: `${groupKey}-defs` }, [
        m(
          "linearGradient",
          {
            key: `${groupKey}-grad`,
            id: gradientId,
            gradientUnits: "userSpaceOnUse",
            x1: String(xTail),
            y1: String(yMid),
            x2: String(xTip),
            y2: String(yMid),
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
          "linearGradient",
          {
            key: fadeGradId,
            id: fadeGradId,
            gradientUnits: "userSpaceOnUse",
            x1: String(xTail),
            y1: String(yMid),
            x2: String(xTip),
            y2: String(yMid),
          },
          fadeStopsAlong(
            Math.abs(xTip - xTail),
            AIR_FLOW_HEAD_HEIGHT,
            fadeOut,
          ),
        ),
        m(
          "mask",
          {
            key: fadeMaskId,
            id: fadeMaskId,
            maskUnits: "userSpaceOnUse",
            maskContentUnits: "userSpaceOnUse",
          },
          m("rect", {
            x: 0,
            y: 0,
            width: VIEWPORT_WIDTH,
            height: VIEWPORT_HEIGHT,
            fill: `url(#${fadeGradId})`,
          }),
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
        d: arrowPath,
      }),
      airFlowDartGroup(kind, groupKey, "in", inboundPath, `url(#${fadeMaskId})`),
      airFlowDartGroup(kind, groupKey, "out", outboundPath, `url(#${fadeMaskId})`),
    ],
  );
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
        d: `M${HOUSE_BODY_OUTER_X},188 H412 V492 H${HOUSE_BODY_OUTER_X} Z`,
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

function iconCoilCaption(
  id: "indoorCoil" | "outdoorCoil",
  coil: Point,
  text: string,
): m.Vnode {
  const onLeft = coil.x < ZONE_WIDTH;
  const outerX = onLeft
    ? coil.x - INDOOR_COIL_RUN_WIDTH / 2 - ICON_COIL_LABEL_X_PAD
    : coil.x + INDOOR_COIL_RUN_WIDTH / 2 + ICON_COIL_LABEL_X_PAD;
  return m(
    "text.box-label",
    {
      key: `${id}Label`,
      "data-component": id,
      x: outerX,
      y: coil.y + ICON_COIL_LABEL_Y_OFFSET,
      "text-anchor": onLeft ? "end" : "start",
      dy: "0.35em",
    },
    text,
  );
}

function boxedEquipment(
  circuit: CircuitLayout,
  config: DiagramConfig,
  heating: boolean,
  indoorRole: CoilRole,
  outdoorRole: CoilRole,
  expansion: "box" | "symbol" = "box",
  compressor: "box" | "symbol" = "box",
  indoor: "box" | "coil" = "box",
  outdoor: "box" | "coil" = "box",
  reversing: "box" | "lines" = "box",
): m.Children {
  const expansionNode =
    expansion === "symbol"
      ? m(
          "g.component-box",
          {
            key: "expansionValve",
            "data-component": "expansionValve",
            transform: `translate(${circuit.expansion.x} ${circuit.expansion.y})`,
          },
          [
            expansionValveSymbol(
              EXPANSION_SYMBOL_HALF_WIDTH,
              EXPANSION_SYMBOL_HALF_HEIGHT,
            ),
            m(
              "text.box-label",
              {
                "text-anchor": "middle",
                y: EXPANSION_SYMBOL_HALF_HEIGHT + 8,
                dy: "0.85em",
              },
              "Expansion valve",
            ),
          ],
        )
      : componentBox({
          id: "expansionValve",
          x: circuit.expansion.x,
          y: circuit.expansion.y,
          width: 150,
          height: 52,
          label: "Expansion valve",
        });

  const compressorNode =
    compressor === "symbol"
      ? m(
          "g.component-box",
          {
            key: "compressor",
            "data-component": "compressor",
            transform: `translate(${circuit.compressor.x} ${circuit.compressor.y})`,
          },
          [
            m(
              "g.compressor-pulse",
              compressorTrapezoid(
                COMPRESSOR_TRAP_HALF_WIDTH,
                COMPRESSOR_TRAP_LEFT_HALF,
                COMPRESSOR_TRAP_RIGHT_HALF,
              ),
            ),
            m(
              "text.box-label",
              {
                "text-anchor": "middle",
                y: -(COMPRESSOR_TRAP_LEFT_HALF + 8),
                dy: "-0.25em",
              },
              "Compressor",
            ),
          ],
        )
      : componentBox({
          id: "compressor",
          x: circuit.compressor.x,
          y: circuit.compressor.y,
          width: 132,
          height: 52,
          label: "Compressor",
          pulse: true,
        });

  const indoorNode =
    indoor === "coil"
      ? iconCoilCaption(
          "indoorCoil",
          circuit.indoorCoil,
          coilLabel("indoor", indoorRole, config.coilLabels),
        )
      : componentBox({
          id: "indoorCoil",
          x: circuit.indoorCoil.x,
          y: circuit.indoorCoil.y,
          width: SIMPLE_BOX_WIDTH,
          height: SIMPLE_BOX_HEIGHT,
          label: coilLabel("indoor", indoorRole, config.coilLabels),
        });

  const outdoorNode =
    outdoor === "coil"
      ? iconCoilCaption(
          "outdoorCoil",
          circuit.outdoorCoil,
          coilLabel("outdoor", outdoorRole, config.coilLabels),
        )
      : componentBox({
          id: "outdoorCoil",
          x: circuit.outdoorCoil.x,
          y: circuit.outdoorCoil.y,
          width: SIMPLE_BOX_WIDTH,
          height: SIMPLE_BOX_HEIGHT,
          label: coilLabel("outdoor", outdoorRole, config.coilLabels),
        });

  const reversingNode =
    reversing === "lines"
      ? m(
          "g.component-box",
          {
            key: "reversingValve",
            "data-component": "reversingValve",
          },
          m(
            "text.box-label",
            {
              x: circuit.reversingValve.x,
              y: circuit.reversingValve.y - 16,
              "text-anchor": "middle",
              dy: "-0.15em",
            },
            "Reversing valve",
          ),
        )
      : componentBox({
          id: "reversingValve",
          x: circuit.reversingValve.x,
          y: circuit.reversingValve.y,
          width: SIMPLE_BOX_RV_WIDTH,
          height: SIMPLE_BOX_HEIGHT,
          label: "Reversing valve",
          ornament: m(
            "g",
            { transform: "translate(0 -17)" },
            reversingValveSlide(heating, 14),
          ),
          labelDy: "1.05em",
        });

  return [
    indoorNode,
    outdoorNode,
    compressorNode,
    expansionNode,
    reversingNode,
  ];
}

function iconCoilGroup(
  key: string,
  segments: string[],
  segClass: string,
): m.Vnode {
  return m(
    `g.pipe-${key}`,
    { key: `pipe-${key}` },
    segments.map((d, index) => {
      const t = (index + 0.5) / INDOOR_COIL_SEGMENTS;
      const fromPct = Math.round((1 - t) * 100);
      const toPct = Math.round(t * 100);
      return m(`path.pipe.${segClass}`, {
        key: `pipe-${key}-${index}`,
        d,
        fill: "none",
        style: {
          "--coil-from-pct": `${fromPct}%`,
          "--coil-to-pct": `${toPct}%`,
        },
      });
    }),
  );
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
  const iconTracks =
    config.componentStyle === "icon"
      ? iconAirFlowTracks(
          circuit.indoorCoil,
          circuit.outdoorCoil,
          circuit.expansion.x,
        )
      : null;
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
      iconCoilGroup(
        "indoor-coil",
        circuit.indoorCoilSegments,
        "pipe-indoor-coil-seg",
      ),
      iconCoilGroup(
        "outdoor-coil",
        circuit.outdoorCoilSegments,
        "pipe-outdoor-coil-seg",
      ),
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

    layer("equipment", [
      /* Parked abstract-icon units (canonical indoor-left, flipped as a group).
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
      */
      m(
        "g.icon-equipment",
        { key: "icon-equipment" },
        boxedEquipment(
          circuit,
          config,
          heating,
          indoorRole,
          outdoorRole,
          "symbol",
          "symbol",
          "coil",
          "coil",
          "lines",
        ),
      ),
      m(
        "g.simple-box-equipment",
        { key: "simple-box-equipment" },
        boxedEquipment(circuit, config, heating, indoorRole, outdoorRole, "box"),
      ),
    ]),

    layer("air-flow", [
      airFlowFadeDefs(),
      coilAirFlow({
        coil: condenserCoil,
        onLeft: condenserCoil.x < ZONE_WIDTH,
        pointUp: condenserCoil === circuit.outdoorCoil,
        kind: "reject",
        indoor: condenserCoil === circuit.indoorCoil,
        icon: config.componentStyle === "icon",
        iconTrack:
          condenserCoil === circuit.indoorCoil
            ? iconTracks?.indoor
            : iconTracks?.outdoor,
      }),
      coilAirFlow({
        coil: evaporatorCoil,
        onLeft: evaporatorCoil.x < ZONE_WIDTH,
        pointUp: evaporatorCoil === circuit.outdoorCoil,
        kind: "absorb",
        indoor: evaporatorCoil === circuit.indoorCoil,
        icon: config.componentStyle === "icon",
        iconTrack:
          evaporatorCoil === circuit.indoorCoil
            ? iconTracks?.indoor
            : iconTracks?.outdoor,
      }),
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
