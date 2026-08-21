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
const SIMPLE_BOX_INDOOR_CX = 145;
const SIMPLE_BOX_OUTDOOR_CX = 840;
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
/** Indoor house body: eave/ceiling Y (raised so icon coil captions match heat-label floor gap). */
const HOUSE_CEILING_Y = 176;
const HOUSE_FLOOR_Y = 492;
/** Roof peak rise above the eaves (Indoor title clears peak ≈ top edge). */
const HOUSE_ROOF_RISE = 84;
const HOUSE_ROOF_PEAK_Y = HOUSE_CEILING_Y - HOUSE_ROOF_RISE;
const HOUSE_BODY_INNER_X = 412;
const HOUSE_ROOF_LEFT_X = 36;
const HOUSE_ROOF_RIGHT_X = 424;
const HOUSE_ROOF_RIDGE_X = 230;
/** Shared baseline for Indoor / Outdoor / scene caption (clears the top edge). */
const ZONE_TITLE_Y = 52;
/** Horizontal air-flow: stay inside the viewport after the outdoor coil (icon). */
const ICON_AIR_EDGE_MARGIN = 20;
/** Stop indoor outbound this far inside the house outer wall (icon). */
const ICON_AIR_WALL_INSET = 8;
/** Fade the last stretch of icon outbound so the dart dissolves before the wall. */
const ICON_AIR_WALL_FADE = 36;

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
    ...(iconValve ? iconCompressorStubArrows(sucX, disX, mid) : []),
    { x: vaporLeft, y: top, rotation: vapor },
    { x: vaporRight, y: top, rotation: vapor },
  ];
}

function iconCompressorStubArrows(
  sucX: number,
  disX: number,
  mid: number,
): CircuitLayout["arrows"] {
  const compX = Math.round((sucX + disX) / 2);
  const disDir = disX >= sucX ? 1 : -1;
  const sucJoinX = compX - disDir * COMPRESSOR_TRAP_HALF_WIDTH;
  const disJoinX = compX + disDir * COMPRESSOR_TRAP_HALF_WIDTH;
  const flow = disDir > 0 ? 0 : 180;
  return [
    { x: Math.round((sucX + sucJoinX) / 2), y: mid, rotation: flow },
    { x: Math.round((disJoinX + disX) / 2), y: mid, rotation: flow },
  ];
}

function emptyCoilSegments(): string[] {
  return Array.from({ length: INDOOR_COIL_SEGMENTS }, () => "M0,0");
}

/** Drop each piece's leading M so segments can continue an existing path. */
function coilPathCommands(pieces: string[]): string {
  return pieces
    .map((piece) => piece.replace(/^M-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?\s*/, ""))
    .join("");
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
  const indoorCx = SIMPLE_BOX_INDOOR_CX;
  const outdoorCx = SIMPLE_BOX_OUTDOOR_CX;
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
    const condCoil = coilPathCommands(heating ? indoorPieces : outdoorPieces);
    const evapCoil = coilPathCommands(heating ? outdoorPieces : indoorPieces);
    if (iconRv) {
      const { uncoveredX, coveredX } = iconRv;
      const compX = Math.round((iconRv.midX + iconRv.disX) / 2);
      const disDir = iconRv.disX >= iconRv.midX ? 1 : -1;
      const sucJoinX = compX - disDir * COMPRESSOR_TRAP_HALF_WIDTH;
      const disJoinX = compX + disDir * COMPRESSOR_TRAP_HALF_WIDTH;
      hot = `M${disJoinX},${mid} H${iconRv.disX} V${iconRv.dInY} H${iconRv.midX} V${iconRv.chamberY} H${uncoveredX} V${top} H${condX} V${coilTop}`;
      warm = `M${condX},${coilBot} V${bot} H${warmEnd}`;
      cold = `M${coldStart},${bot} H${evapX} V${coilBot}`;
      cool = `M${evapX},${coilTop} V${top} H${coveredX} V${iconRv.slideY} H${iconRv.midX} V${mid} H${sucJoinX}`;
      loop = `M${disJoinX},${mid} H${iconRv.disX} V${iconRv.dInY} H${iconRv.midX} V${iconRv.chamberY} H${uncoveredX} V${top} H${condX} ${condCoil} H${evapX} ${evapCoil} H${coveredX} V${iconRv.slideY} H${iconRv.midX} V${mid} H${disJoinX} Z`;
    } else {
      hot = `M${machineX},${top} H${condX} V${coilTop}`;
      warm = `M${condX},${coilBot} V${bot} H${warmEnd}`;
      cold = `M${coldStart},${bot} H${evapX} V${coilBot}`;
      cool = `M${evapX},${coilTop} V${top} H${machineX}`;
      // Flow order through serpentine coils (do not reverse in GSAP).
      loop = heating
        ? `M${machineX},${top} H${indoorPipe} ${condCoil} H${outdoorPipe} ${evapCoil} H${machineX} Z`
        : `M${machineX},${top} H${outdoorPipe} ${condCoil} H${indoorPipe} ${evapCoil} H${machineX} Z`;
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

/** Simple-box RV and icon loops are drawn in flow order; do not play them backwards. */
export function reverseParticleLoop(config: DiagramConfig): boolean {
  return (
    config.mode === "heating" &&
    config.componentStyle === "simpleBox" &&
    !config.showReversingValve
  );
}

const PARTICLE_COUNT = 8;
/** Chevron pointing +x; MotionPath autoRotate keeps the tip along travel. */
const PARTICLE_ARROW_POINTS = "-8,-5.5 8,0 -8,5.5 -3.5,0";

function particles(): m.Children {
  const arrows: m.Children[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    arrows.push(
      m("polygon.particle", {
        key: `p-${i}`,
        points: PARTICLE_ARROW_POINTS,
      }),
    );
  }
  return arrows;
}

const LINESET_PARTICLES_PER_PIPE = 4;

function linesetParticles(groupKey: string): m.Vnode {
  const arrows: m.Children[] = [];
  for (let i = 0; i < LINESET_PARTICLES_PER_PIPE; i += 1) {
    arrows.push(
      m("polygon.particle", {
        key: `ls-${groupKey}-${i}`,
        points: PARTICLE_ARROW_POINTS,
      }),
    );
  }
  return m(`g.lineset-particles.lineset-particles-${groupKey}`, {
    key: `particles-${groupKey}`,
  }, arrows);
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

/** Simple-box air-flow arc sits at 1/3 (left coil) or 2/3 (right coil) of the box. */
function heatArrowCenterX(coilCenterX: number): number {
  return boxXAtFraction(
    coilCenterX,
    coilCenterX < ZONE_WIDTH ? 1 / 3 : 2 / 3,
  );
}

/** Same X for simple-box and icon: 1/3·2/3 of the simple-box coil, after indoor-side mirror. */
function heatLabelX(coil: "indoor" | "outdoor", flip: boolean): number {
  const center =
    coil === "indoor" ? SIMPLE_BOX_INDOOR_CX : SIMPLE_BOX_OUTDOOR_CX;
  return heatArrowCenterX(flip ? flipX(center) : center);
}

/** Dy below the expansion device center for the “Expansion valve” caption and heat labels. */
const EXPANSION_LABEL_DY = 40;
/** Icon compressor caption: above the trapezoid (same offset for Evap/Cond captions). */
const COMPRESSOR_LABEL_Y = -(COMPRESSOR_TRAP_LEFT_HALF + 8);
const COMPRESSOR_LABEL_DY = "-0.25em";

function heatTransferLabel(
  text: string,
  x: number,
  y: number,
  key: string,
): m.Vnode {
  const words = text.split(/\s+/).filter(Boolean);
  return m(
    "text.diagram-label.heat-transfer-label",
    { x, y, "text-anchor": "middle", key },
    words.map((word, index) =>
      m(
        "tspan",
        {
          key: `${key}-${index}`,
          x,
          dy: index === 0 ? "0" : "1.15em",
        },
        word,
      ),
    ),
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
  crossSection?: boolean;
  flip?: boolean;
}): m.Vnode {
  if (opts.crossSection) {
    return coilAirFlowCrossSection({
      kind: opts.kind,
      indoor: opts.indoor,
      flip: opts.flip === true,
    });
  }
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
        d: `M${HOUSE_BODY_OUTER_X},${HOUSE_CEILING_Y} H${HOUSE_BODY_INNER_X} V${HOUSE_FLOOR_Y} H${HOUSE_BODY_OUTER_X} Z`,
      }),
      m("path.house-roof", {
        d: `M${HOUSE_ROOF_LEFT_X},${HOUSE_CEILING_Y} L${HOUSE_ROOF_RIDGE_X},${HOUSE_ROOF_PEAK_Y} L${HOUSE_ROOF_RIGHT_X},${HOUSE_CEILING_Y} Z`,
      }),
    ],
  );
}

/**
 * 2.5D cabinet: front rectangle plus top and right parallelograms.
 * `depthX` / `depthY` are the offset from the front face to the back edge
 * (positive depthX = right side visible; negative depthY = top rises on screen).
 * Optional `verticalAt` (0–1) draws a filled front-to-back compartment wall.
 * Optional `cutawayFrontFrom` (0–1) omits the front fill from that fraction to
 * the right; the right-side front vertical is omitted so internals stay clear.
 * Optional `bottomFace` adds a filled floor parallelogram.
 */
function cabinet25d(opts: {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depthX: number;
  depthY: number;
  verticalAt?: number;
  cutawayFrontFrom?: number;
  bottomFace?: boolean;
}): m.Vnode {
  const {
    key,
    x,
    y,
    width,
    height,
    depthX,
    depthY,
    verticalAt,
    cutawayFrontFrom,
    bottomFace,
  } = opts;
  const x2 = x + width;
  const y2 = y + height;
  const tx = x + depthX;
  const ty = y + depthY;
  const tx2 = x2 + depthX;
  const ty2 = y2 + depthY;
  const cutX =
    cutawayFrontFrom != null ? x + width * cutawayFrontFrom : null;
  const frontD =
    cutX != null
      ? `M${x},${y} H${cutX} V${y2} H${x} Z`
      : `M${x},${y} H${x2} V${y2} H${x} Z`;
  // Cutaway: omit the front-right vertical (overlaps the compressor).
  const sideD =
    cutX != null
      ? `M${x2},${y} L${tx2},${ty} V${ty2} L${x2},${y2}`
      : `M${x2},${y} L${tx2},${ty} L${tx2},${ty2} L${x2},${y2} Z`;
  const sideClass =
    cutX != null
      ? "path.cross-section-face.cross-section-face-side.cross-section-face-open"
      : "path.cross-section-face.cross-section-face-side";
  const children: m.Children = [];
  if (bottomFace) {
    children.push(
      m("path.cross-section-face.cross-section-face-bottom", {
        key: `${key}-bottom`,
        d: `M${x},${y2} H${x2} L${tx2},${ty2} L${tx},${ty2} Z`,
      }),
    );
  }
  children.push(
    m(sideClass, {
      key: `${key}-side`,
      d: sideD,
    }),
  );
  // Skip a zero-width front when the whole face is cut away.
  if (cutX == null || cutX > x + 0.5) {
    children.push(
      m("path.cross-section-face.cross-section-face-front", {
        key: `${key}-front`,
        d: frontD,
      }),
    );
  }
  children.push(
    // Hidden back edges: left rear vertical, bottom rear, left-bottom depth.
    m("path.cross-section-back-edges", {
      key: `${key}-back`,
      d: `M${tx},${ty} V${ty2} H${tx2} M${x},${y2} L${tx},${ty2}`,
    }),
  );
  if (verticalAt != null) {
    const vx = x + width * verticalAt;
    const vtx = vx + depthX;
    const vty2 = y2 + depthY;
    children.push(
      m("path.cross-section-face.cross-section-face-divider", {
        key: `${key}-divider-fill`,
        d: `M${vx},${y} L${vtx},${ty} L${vtx},${vty2} L${vx},${y2} Z`,
      }),
    );
    // Front seam + top-face continuation (same depth as the cabinet).
    children.push(
      m("path.cross-section-divider", {
        key: `${key}-divider`,
        d: `M${vx},${y} V${y2} M${vx},${y} L${vtx},${ty}`,
      }),
    );
    // Hidden divider edges: back vertical + bottom depth.
    children.push(
      m("path.cross-section-back-edges", {
        key: `${key}-divider-back`,
        d: `M${vtx},${ty} V${vty2} M${vx},${y2} L${vtx},${vty2}`,
      }),
    );
  }
  // Top after the divider so it reads above the compartment wall.
  children.push(
    m("path.cross-section-face.cross-section-face-top", {
      key: `${key}-top`,
      d: `M${x},${y} L${tx},${ty} L${tx2},${ty} L${x2},${y} Z`,
    }),
  );
  if (cutX != null) {
    // Opening rim: full cutaway gets left + top; partial keeps top of the bay.
    const rimD =
      cutX <= x + 0.5
        ? `M${x},${y} V${y2} M${x},${y} H${x2}`
        : `M${cutX},${y} H${x2}`;
    children.push(
      m("path.cross-section-cutaway-rim", {
        key: `${key}-cutaway-rim`,
        d: rimD,
      }),
    );
  }
  return m(`g.cross-section-unit.${key}`, { key }, children);
}

/** Outdoor condenser front: 4:3 (real mini-split pad unit is low and wide). */
const CROSS_SECTION_OUTDOOR_W = 224;
const CROSS_SECTION_OUTDOOR_H = (CROSS_SECTION_OUTDOOR_W * 3) / 4;
/** Front-face bottom sits on the house floor. */
const CROSS_SECTION_OUTDOOR_BOTTOM = HOUSE_FLOOR_Y;
/** Horizontal centers from the original 168-wide placement (left / right outdoor). */
const CROSS_SECTION_OUTDOOR_CX_LEFT = 148 + 168 / 2;
const CROSS_SECTION_OUTDOOR_CX_RIGHT = 644 + 168 / 2;
const CROSS_SECTION_OUTDOOR_DEPTH_X = 48;
const CROSS_SECTION_OUTDOOR_DEPTH_Y = -35;
const CROSS_SECTION_INDOOR_DEPTH_X = 28;
const CROSS_SECTION_INDOOR_DEPTH_Y = -20;
/** Horizontal offset from the zone wall to the nearer (bottom) vertical riser. */
const CROSS_SECTION_LINESET_WALL_PAD = 12;
/** Centerline gap for the parallel pair (same on horizontals and verticals). */
const CROSS_SECTION_LINESET_PAIR_GAP = 28;
/** Gap between compressor can and expansion valve. */
const CROSS_SECTION_TXV_GAP = 10;
/** Fan fills the left (coil) compartment with a small margin. */
const CROSS_SECTION_OUTDOOR_FAN_PAD = 14;
/** Indoor cross-flow blower: vertical pitch of the moving slot pattern. */
const CROSS_SECTION_BLOWER_SLOT_PITCH = 5;
/** Compressor / blower depth (same oblique as cabinets, smaller scale). */
const CROSS_SECTION_COMPRESSOR_DEPTH_X = 18;
const CROSS_SECTION_COMPRESSOR_DEPTH_Y = -14;
const CROSS_SECTION_BLOWER_DEPTH_X = 22;
const CROSS_SECTION_BLOWER_DEPTH_Y = -16;
/** Clearance from diagram bottom for outdoor outbound tips. */
const CROSS_SECTION_AIR_BOTTOM_CLEARANCE = 24;

/**
 * Face-on axial condenser fan (4 curved blades). Cross-section only —
 * do not reuse parked `fanIcon` (3-blade wedge art).
 */
function crossSectionOutdoorFan(cx: number, cy: number, r: number): m.Vnode {
  const hubR = r * 0.2;
  const root = hubR * 0.95;
  const tip = r * 0.9;
  const n = (v: number) => Math.round(v * 100) / 100;
  // Narrow propeller blade so four reads clearly at 90° spacing.
  const blade = [
    `M${n(root * Math.cos(-0.35))},${n(root * Math.sin(-0.35))}`,
    `C${n(r * 0.45)},${n(-r * 0.42)} ${n(r * 0.72)},${n(-r * 0.38)} ${n(tip * Math.cos(-0.42))},${n(tip * Math.sin(-0.42))}`,
    `Q${n(tip)},0 ${n(tip * Math.cos(0.28))},${n(tip * Math.sin(0.28))}`,
    `C${n(r * 0.7)},${n(r * 0.12)} ${n(r * 0.42)},${n(r * 0.08)} ${n(root * Math.cos(0.35))},${n(root * Math.sin(0.35))}`,
    "Z",
  ].join("");

  return m(
    "g.cross-section-outdoor-fan",
    { key: "outdoor-fan", transform: `translate(${cx} ${cy})` },
    [
      m("circle.cross-section-fan-shroud", { key: "shroud", r }),
      m("g.cross-section-fan-blades", { key: "blades" }, [
        m("path.cross-section-fan-blade", { key: "b0", d: blade }),
        m("path.cross-section-fan-blade", {
          key: "b1",
          d: blade,
          transform: "rotate(90)",
        }),
        m("path.cross-section-fan-blade", {
          key: "b2",
          d: blade,
          transform: "rotate(180)",
        }),
        m("path.cross-section-fan-blade", {
          key: "b3",
          d: blade,
          transform: "rotate(270)",
        }),
      ]),
      m("circle.cross-section-fan-hub", { key: "hub", r: hubR }),
    ],
  );
}

/**
 * 2.5D scroll compressor: seamless cylinder + hemisphere front, with an
 * elliptical base (no top lid, no right-side parallelogram).
 */
function crossSectionCompressor(
  cx: number,
  cy: number,
  bodyW: number,
  bodyH: number,
  _depthX: number,
  depthY: number,
): m.Vnode {
  const halfW = bodyW / 2;
  const r = halfW;
  const bodyTop = cy - bodyH / 2 + r * 0.35;
  const bodyBot = cy + bodyH / 2;
  const left = cx - halfW;
  const right = cx + halfW;
  // Squashed ellipse at the base — replaces the straight bottom edge.
  const baseRy = Math.max(8, Math.abs(depthY) * 0.7);

  return m("g.cross-section-compressor", { key: "outdoor-compressor" }, [
    // Base disk (upper half peeks as the far rim once the front is painted).
    m("ellipse.cross-section-compressor-base", {
      key: "base",
      cx,
      cy: bodyBot,
      rx: halfW,
      ry: baseRy,
    }),
    // Single outline: dome + sides + elliptical bottom (no dividing chord).
    m("path.cross-section-compressor-front", {
      key: "front",
      d: [
        `M${left},${bodyTop}`,
        `A${r},${r} 0 0 1 ${right},${bodyTop}`,
        `V${bodyBot}`,
        // Lower half of the base ellipse (clockwise → bottom bulge).
        `A${halfW},${baseRy} 0 0 1 ${left},${bodyBot}`,
        "Z",
      ].join(""),
    }),
    // Far rim of the elliptical base (upper half), drawn above the fill.
    m("path.cross-section-compressor-base-rim", {
      key: "base-rim",
      d: `M${left},${bodyBot} A${halfW},${baseRy} 0 0 1 ${right},${bodyBot}`,
    }),
  ]);
}

/**
 * 2.5D expansion valve: vertical cylinder with flat sides and elliptical
 * top + base (no hemispherical dome).
 */
function crossSectionExpansionValve(
  cx: number,
  cy: number,
  bodyW: number,
  bodyH: number,
  depthY: number,
): m.Vnode {
  const halfW = bodyW / 2;
  const bodyTop = cy - bodyH / 2;
  const bodyBot = cy + bodyH / 2;
  const left = cx - halfW;
  const right = cx + halfW;
  const endRy = Math.max(5, Math.abs(depthY) * 0.5);

  return m("g.cross-section-expansion", { key: "outdoor-expansion" }, [
    m("ellipse.cross-section-expansion-base", {
      key: "base",
      cx,
      cy: bodyBot,
      rx: halfW,
      ry: endRy,
    }),
    m("path.cross-section-expansion-front", {
      key: "front",
      d: [
        `M${left},${bodyTop}`,
        `V${bodyBot}`,
        `A${halfW},${endRy} 0 0 1 ${right},${bodyBot}`,
        `V${bodyTop}`,
        "Z",
      ].join(""),
    }),
    m("ellipse.cross-section-expansion-top", {
      key: "top",
      cx,
      cy: bodyTop,
      rx: halfW,
      ry: endRy,
    }),
    m("ellipse.cross-section-expansion-top-rim", {
      key: "top-rim",
      cx,
      cy: bodyTop,
      rx: halfW,
      ry: endRy,
    }),
    m("path.cross-section-expansion-base-rim", {
      key: "base-rim",
      d: `M${left},${bodyBot} A${halfW},${endRy} 0 0 1 ${right},${bodyBot}`,
    }),
  ]);
}

/**
 * 2.5D cross-flow blower: horizontal cylinder with elliptical end caps,
 * front-facing arc ribs, equal-length slots ending at the right ellipse.
 */
function crossSectionIndoorBlower(
  x: number,
  y: number,
  w: number,
  h: number,
  depthX: number,
  _depthY: number,
): m.Vnode {
  const r = h / 2;
  const cy = y + r;
  // Foreshortened elliptical ends (same on left and right).
  const endRx = Math.max(r * 0.45, Math.min(r * 0.75, Math.abs(depthX) * 0.85));
  const leftCx = x + endRx;
  const rightCx = x + w - endRx;
  const clipId = "cross-section-blower-clip";
  const pitch = CROSS_SECTION_BLOWER_SLOT_PITCH;
  const arcRx = Math.max(10, r * 0.42);

  // Equal-length slots: left tip of left ellipse → left tip of right ellipse
  // (outer edge of each end’s left half).
  const slotLeft = leftCx - endRx;
  const slotRight = rightCx - endRx;
  const slots: m.Children = [];
  for (let sy = y - pitch; sy <= y + h + pitch; sy += pitch) {
    slots.push(
      m("line.cross-section-blower-slot", {
        key: `slot-${sy}`,
        x1: slotLeft,
        y1: sy,
        x2: slotRight,
        y2: sy,
      }),
    );
  }

  const ribs: m.Children = [];
  for (let i = 0; i < 8; i++) {
    const vx = leftCx + ((i + 0.5) * (rightCx - leftCx)) / 8;
    // Sweep 0 → bulge toward the viewer (front of the cylinder).
    ribs.push(
      m("path.cross-section-blower-rib", {
        key: `rib-${i}`,
        d: `M${vx},${y + 2.5} A${arcRx},${r - 2.5} 0 0 0 ${vx},${y + h - 2.5}`,
      }),
    );
  }

  // Barrel body between the two end ellipses (no arc ends on this path).
  const bodyD = [
    `M${leftCx},${y}`,
    `H${rightCx}`,
    `V${y + h}`,
    `H${leftCx}`,
    "Z",
  ].join("");

  // Clip = left half of left ellipse + barrel up to the left tip of the right
  // ellipse (start of that end’s left half), so every slot shares one length.
  const slotClipD = [
    `M${leftCx},${y}`,
    `A${endRx},${r} 0 0 0 ${leftCx},${y + h}`,
    `H${slotRight}`,
    `V${y}`,
    "Z",
  ].join("");

  const endAttrs = { rx: endRx, ry: r };
  // Left end: only the left half (no diameter through the barrel).
  const leftHalfD = [
    `M${leftCx},${y}`,
    `A${endRx},${r} 0 0 0 ${leftCx},${y + h}`,
    "Z",
  ].join("");

  return m("g.cross-section-indoor-blower", { key: "indoor-blower" }, [
    m("defs", { key: "defs" }, [
      m("clipPath", { id: clipId, key: "clip" }, [
        m("path", { d: slotClipD }),
      ]),
    ]),
    m("path.cross-section-blower-end.cross-section-blower-end-left", {
      key: "end-left",
      d: leftHalfD,
    }),
    m("ellipse.cross-section-blower-end.cross-section-blower-end-right", {
      key: "end-right",
      cx: rightCx,
      cy,
      ...endAttrs,
    }),
    m("path.cross-section-blower-body", {
      key: "body",
      d: bodyD,
    }),
    m(
      "g.cross-section-blower-slots-clip",
      {
        key: "slots-clip",
        // Clip stays fixed on the cylinder; only the inner group scrolls.
        "clip-path": `url(#${clipId})`,
      },
      [
        m(
          "g.cross-section-blower-slots",
          {
            key: "slots",
            "data-slot-pitch": String(pitch),
          },
          slots,
        ),
      ],
    ),
    m("g.cross-section-blower-ribs", { key: "ribs" }, ribs),
    m("line.cross-section-blower-outline", {
      key: "top",
      x1: leftCx,
      y1: y,
      x2: rightCx,
      y2: y,
    }),
    m("line.cross-section-blower-outline", {
      key: "bot",
      x1: leftCx,
      y1: y + h,
      x2: rightCx,
      y2: y + h,
    }),
    // Outer arc only — hides the right half and avoids a vertical chord.
    m("path.cross-section-blower-end-rim", {
      key: "rim-left",
      d: `M${leftCx},${y} A${endRx},${r} 0 0 0 ${leftCx},${y + h}`,
    }),
    m("ellipse.cross-section-blower-end-rim", {
      key: "rim-right",
      cx: rightCx,
      cy,
      ...endAttrs,
    }),
  ]);
}

/**
 * Two square-elbow line-set runs. Path direction is screen-space flow
 * (left-bound vs right-bound). Heating: warm / hot. Cooling: cool / cold.
 */
function linesetRunD(
  outX: number,
  inX: number,
  outY: number,
  inY: number,
  elbowX: number,
  rightBound: boolean,
): string {
  const outToIn = rightBound === inX > outX;
  return outToIn
    ? `M${outX},${outY} H${elbowX} V${inY} H${inX}`
    : `M${inX},${inY} H${elbowX} V${outY} H${outX}`;
}

function crossSectionLineSet(
  outTopX: number,
  outBotX: number,
  inX: number,
  outTopY: number,
  inTopY: number,
  elbowTopX: number,
  elbowBotX: number,
  heating: boolean,
): m.Vnode {
  const gap = CROSS_SECTION_LINESET_PAIR_GAP;
  const outBotY = outTopY + gap;
  const inBotY = inTopY + gap;
  const topKind = heating ? "warm" : "cool";
  const botKind = heating ? "hot" : "cold";
  return m("g.cross-section-lineset", { key: "lineset" }, [
    m(`path.pipe.pipe-${topKind}`, {
      key: "top",
      d: linesetRunD(outTopX, inX, outTopY, inTopY, elbowTopX, false),
      fill: "none",
    }),
    m(`path.pipe.pipe-${botKind}`, {
      key: "bot",
      d: linesetRunD(outBotX, inX, outBotY, inBotY, elbowBotX, true),
      fill: "none",
    }),
    linesetParticles("top"),
    linesetParticles("bot"),
    dashArrowGroups(),
  ]);
}

type CrossSectionFront = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function crossSectionLayout(flip: boolean): {
  outdoorFront: CrossSectionFront;
  indoorFront: CrossSectionFront;
  fanCx: number;
  fanCy: number;
  fanR: number;
  blower: { x: number; y: number; w: number; h: number };
} {
  const outdoorY = CROSS_SECTION_OUTDOOR_BOTTOM - CROSS_SECTION_OUTDOOR_H;
  const outdoorCx = flip
    ? CROSS_SECTION_OUTDOOR_CX_LEFT
    : CROSS_SECTION_OUTDOOR_CX_RIGHT;
  const outdoorFront = {
    x: outdoorCx - CROSS_SECTION_OUTDOOR_W / 2,
    y: outdoorY,
    width: CROSS_SECTION_OUTDOOR_W,
    height: CROSS_SECTION_OUTDOOR_H,
  };
  const leftCompartmentW = outdoorFront.width * (2 / 3);
  const fanCx = outdoorFront.x + leftCompartmentW / 2;
  const fanCy = outdoorFront.y + outdoorFront.height / 2;
  const fanR =
    Math.min(leftCompartmentW, outdoorFront.height) / 2 -
    CROSS_SECTION_OUTDOOR_FAN_PAD;
  const indoorFront = flip
    ? { x: 618, y: 248, width: 210, height: 88 }
    : { x: 132, y: 248, width: 210, height: 88 };
  const blowerPadX = 12;
  const blowerPadY = 14;
  return {
    outdoorFront,
    indoorFront,
    fanCx,
    fanCy,
    fanR,
    blower: {
      x: indoorFront.x + blowerPadX,
      y: indoorFront.y + blowerPadY,
      w: indoorFront.width - blowerPadX * 2 - 6,
      h: indoorFront.height - blowerPadY * 2,
    },
  };
}

function diagonalAxes(
  dx: number,
  dy: number,
): { ux: number; uy: number; px: number; py: number; len: number } {
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return { ux, uy, px: -uy, py: ux, len };
}

function diagonalCenterline(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): string {
  return `M${x0.toFixed(2)},${y0.toFixed(2)} L${x1.toFixed(2)},${y1.toFixed(2)}`;
}

function diagonalShaftClip(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  hs: number,
): string {
  const { px, py } = diagonalAxes(x1 - x0, y1 - y0);
  const ox = px * hs;
  const oy = py * hs;
  return [
    `M${(x0 + ox).toFixed(2)},${(y0 + oy).toFixed(2)}`,
    `L${(x1 + ox).toFixed(2)},${(y1 + oy).toFixed(2)}`,
    `L${(x1 - ox).toFixed(2)},${(y1 - oy).toFixed(2)}`,
    `L${(x0 - ox).toFixed(2)},${(y0 - oy).toFixed(2)}`,
    "Z",
  ].join(" ");
}

function diagonalArrowPath(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  hs: number,
  hw: number,
  hl: number,
): string {
  const { ux, uy, px, py, len } = diagonalAxes(x1 - x0, y1 - y0);
  const head = Math.min(hl, len * 0.45);
  const bx = x1 - ux * head;
  const by = y1 - uy * head;
  const r = roundCoord;
  return [
    `M${r(x0 + px * hs)},${r(y0 + py * hs)}`,
    `L${r(bx + px * hs)},${r(by + py * hs)}`,
    `L${r(bx + px * hw)},${r(by + py * hw)}`,
    `L${r(x1)},${r(y1)}`,
    `L${r(bx - px * hw)},${r(by - py * hw)}`,
    `L${r(bx - px * hs)},${r(by - py * hs)}`,
    `L${r(x0 - px * hs)},${r(y0 - py * hs)}`,
    "Z",
  ].join(" ");
}

/**
 * Cross-section heat-transfer darts: one 45° down-left line through each
 * fan. Inbound ends on the top parallelogram’s far edge (indoor starts at
 * the ceiling); outbound continues from the fan — outdoor stops short of the
 * diagram bottom, indoor matched to that same length. Gap through the unit is
 * zero: outbound emerges when the inbound head has finished fading and
 * the stem starts to fade.
 */
function coilAirFlowCrossSection(opts: {
  kind: AirFlowKind;
  indoor?: boolean;
  flip: boolean;
}): m.Vnode {
  const { kind, indoor, flip } = opts;
  const layout = crossSectionLayout(flip);
  const hs = AIR_FLOW_SHAFT / 2;
  const hw = AIR_FLOW_HEAD_WIDTH / 2;
  const hl = AIR_FLOW_HEAD_HEIGHT;
  const fx = indoor
    ? layout.blower.x + layout.blower.w / 2
    : layout.fanCx;
  const fy = indoor
    ? layout.blower.y + layout.blower.h / 2
    : layout.fanCy;
  // One 45° down-left line (x + y = c) through the fan so in/out look continuous.
  const c = fx + fy;
  const box = indoor ? layout.indoorFront : layout.outdoorFront;
  const depthY = indoor
    ? CROSS_SECTION_INDOOR_DEPTH_Y
    : CROSS_SECTION_OUTDOOR_DEPTH_Y;
  // Far edge of the top parallelogram (not the front face top).
  const in1y = box.y + depthY;
  const in1x = c - in1y;
  let in0y: number;
  let in0x: number;
  if (indoor) {
    in0y = HOUSE_CEILING_Y;
    in0x = c - in0y;
  } else {
    const inSpan = Math.max(56, layout.indoorFront.y - HOUSE_CEILING_Y);
    in0y = in1y - inSpan;
    in0x = in1x + inSpan;
  }
  if (in0x > VIEWPORT_WIDTH - 12) {
    const shift = in0x - (VIEWPORT_WIDTH - 12);
    in0x -= shift;
    in0y += shift;
  }
  if (in0y < 8) {
    const shift = 8 - in0y;
    in0y += shift;
    in0x -= shift;
  }
  // Outdoor outbound stops short of the diagram bottom; indoor matches length.
  const outdoorOutSpan =
    VIEWPORT_HEIGHT - CROSS_SECTION_AIR_BOTTOM_CLEARANCE - layout.fanCy;
  const outSpan = outdoorOutSpan;
  const out0x = fx;
  const out0y = fy;
  const out1x = out0x - outSpan;
  const out1y = out0y + outSpan;

  const inboundPath = diagonalCenterline(in0x, in0y, in1x, in1y);
  const outboundPath = diagonalCenterline(out0x, out0y, out1x, out1y);
  const inboundClip = diagonalShaftClip(in0x, in0y, in1x, in1y, hs);
  const outboundClip = diagonalShaftClip(out0x, out0y, out1x, out1y, hs);
  const inboundLen = Math.hypot(in1x - in0x, in1y - in0y);
  const outboundLen = Math.hypot(out1x - out0x, out1y - out0y);
  // Zero travel through the cabinet. Outbound starts when the inbound head
  // has finished fading and the stem begins to fade (tip at fadeStart + head).
  const hlFade = hl;
  const inFadeOut = Math.max(hlFade, Math.min(36, inboundLen * 0.4));
  const stemFade = inFadeOut - hlFade;
  const outFadeIn = Math.max(hlFade * 0.5, stemFade);
  const gap = hlFade - inFadeOut;
  const { gradientId, groupKey, tailStop, tipStop } = airFlowKindMeta(kind);
  const inFadeId = `${groupKey}-cs-fade-in`;
  const outFadeId = `${groupKey}-cs-fade-out`;
  const inMaskId = `${groupKey}-cs-mask-in`;
  const outMaskId = `${groupKey}-cs-mask-out`;
  const outFadeOut = Math.min(
    indoor ? 48 : 40,
    Math.max(hl, outboundLen * 0.4),
  );

  return m(
    `g.${groupKey}${indoor ? ".air-flow-indoor" : ".air-flow-outdoor"}`,
    { key: groupKey, "data-air-gap": String(gap) },
    [
      m("defs", { key: `${groupKey}-defs` }, [
        m(
          "linearGradient",
          {
            key: `${groupKey}-grad`,
            id: gradientId,
            gradientUnits: "userSpaceOnUse",
            x1: String(in0x),
            y1: String(in0y),
            x2: String(out1x),
            y2: String(out1y),
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
            key: inFadeId,
            id: inFadeId,
            gradientUnits: "userSpaceOnUse",
            x1: String(in0x),
            y1: String(in0y),
            x2: String(in1x),
            y2: String(in1y),
          },
          fadeStopsAlong(inboundLen, hl, inFadeOut),
        ),
        m(
          "linearGradient",
          {
            key: outFadeId,
            id: outFadeId,
            gradientUnits: "userSpaceOnUse",
            x1: String(out0x),
            y1: String(out0y),
            x2: String(out1x),
            y2: String(out1y),
          },
          fadeStopsAlong(outboundLen, outFadeIn, outFadeOut),
        ),
        m(
          "mask",
          {
            key: inMaskId,
            id: inMaskId,
            maskUnits: "userSpaceOnUse",
            maskContentUnits: "userSpaceOnUse",
          },
          m("rect", {
            x: 0,
            y: 0,
            width: VIEWPORT_WIDTH,
            height: VIEWPORT_HEIGHT,
            fill: `url(#${inFadeId})`,
          }),
        ),
        m(
          "mask",
          {
            key: outMaskId,
            id: outMaskId,
            maskUnits: "userSpaceOnUse",
            maskContentUnits: "userSpaceOnUse",
          },
          m("rect", {
            x: 0,
            y: 0,
            width: VIEWPORT_WIDTH,
            height: VIEWPORT_HEIGHT,
            fill: `url(#${outFadeId})`,
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
        key: `${groupKey}-arrow-in`,
        d: diagonalArrowPath(in0x, in0y, in1x, in1y, hs, hw, hl),
      }),
      m(`path.air-flow-arrow.air-flow-arrow-${kind}`, {
        key: `${groupKey}-arrow-out`,
        d: diagonalArrowPath(out0x, out0y, out1x, out1y, hs, hw, hl),
      }),
      airFlowDartGroup(kind, groupKey, "in", inboundPath, `url(#${inMaskId})`),
      airFlowDartGroup(kind, groupKey, "out", outboundPath, `url(#${outMaskId})`),
    ],
  );
}

/** Outdoor condenser + indoor head-unit shells for cross-section style. */
function crossSectionEquipment(flip: boolean, heating: boolean): m.Children {
  // Screen-space placement: outdoor half / indoor half (inside the house body).
  // Front + top + right-side parallelograms (depth always up and to the right).
  // `flip` means indoor is on the right (outdoor left).
  const {
    outdoorFront,
    indoorFront,
    fanCx,
    fanCy,
    fanR,
    blower,
  } = crossSectionLayout(flip);
  const leftCompartmentW = outdoorFront.width * (2 / 3);
  const rightCompartmentX = outdoorFront.x + leftCompartmentW;
  const rightCompartmentW = outdoorFront.width - leftCompartmentW;
  const compressorW = Math.min(rightCompartmentW - 18, 42);
  const compressorHFull = outdoorFront.height * 0.68;
  const compressorH = compressorHFull * (2 / 3);
  // Expansion valve: half the prior cylinder size; flat-top can.
  const txvW = Math.min(13, compressorW * 0.36);
  const txvH = compressorH * 0.45;
  // Elliptical bases share the right-compartment floor; pack both in-bay.
  const compressorBot =
    outdoorFront.y +
    outdoorFront.height +
    CROSS_SECTION_OUTDOOR_DEPTH_Y / 2;
  const bayMidX =
    rightCompartmentX +
    rightCompartmentW / 2 +
    CROSS_SECTION_OUTDOOR_DEPTH_X / 2;
  const pairW = compressorW + CROSS_SECTION_TXV_GAP + txvW;
  const compressorCx = bayMidX - pairW / 2 + compressorW / 2;
  const compressorCy = compressorBot - compressorH / 2;
  const txvCx =
    compressorCx + compressorW / 2 + CROSS_SECTION_TXV_GAP + txvW / 2;
  const txvCy = compressorBot - txvH / 2;
  // Outdoor top run on the right-side centerline; bottom run meets the TXV.
  const outdoorOnLeft = flip;
  const outTopX = outdoorOnLeft
    ? outdoorFront.x + outdoorFront.width + CROSS_SECTION_OUTDOOR_DEPTH_X / 2
    : outdoorFront.x;
  const outBotX = txvCx - txvW / 2;
  const inX = outdoorOnLeft
    ? indoorFront.x
    : indoorFront.x + indoorFront.width + CROSS_SECTION_INDOOR_DEPTH_X;
  const outTopY =
    outdoorFront.y +
    outdoorFront.height * (2 / 3) -
    CROSS_SECTION_LINESET_PAIR_GAP / 2;
  const inTopY = indoorFront.y + indoorFront.height * 0.28;
  const elbowBotX = ZONE_WIDTH - CROSS_SECTION_LINESET_WALL_PAD;
  const elbowTopX = elbowBotX - CROSS_SECTION_LINESET_PAIR_GAP;

  return [
    cabinet25d({
      key: "outdoor-cabinet",
      ...outdoorFront,
      depthX: CROSS_SECTION_OUTDOOR_DEPTH_X,
      depthY: CROSS_SECTION_OUTDOOR_DEPTH_Y,
      verticalAt: 2 / 3,
      cutawayFrontFrom: 2 / 3,
      bottomFace: true,
    }),
    crossSectionOutdoorFan(fanCx, fanCy, fanR),
    crossSectionCompressor(
      compressorCx,
      compressorCy,
      compressorW,
      compressorH,
      CROSS_SECTION_COMPRESSOR_DEPTH_X,
      CROSS_SECTION_COMPRESSOR_DEPTH_Y,
    ),
    crossSectionExpansionValve(
      txvCx,
      txvCy,
      txvW,
      txvH,
      CROSS_SECTION_COMPRESSOR_DEPTH_Y,
    ),
    crossSectionLineSet(
      outTopX,
      outBotX,
      inX,
      outTopY,
      inTopY,
      elbowTopX,
      elbowBotX,
      heating,
    ),
    cabinet25d({
      key: "indoor-cabinet",
      ...indoorFront,
      depthX: CROSS_SECTION_INDOOR_DEPTH_X,
      depthY: CROSS_SECTION_INDOOR_DEPTH_Y,
      cutawayFrontFrom: 0,
      bottomFace: true,
    }),
    crossSectionIndoorBlower(
      blower.x,
      blower.y,
      blower.w,
      blower.h,
      CROSS_SECTION_BLOWER_DEPTH_X,
      CROSS_SECTION_BLOWER_DEPTH_Y,
    ),
  ];
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
  coil: "indoor" | "outdoor",
  text: string,
  flip: boolean,
): m.Vnode {
  // Stay on the top-run baseline (RV-off compressor caption Y); do not follow
  // the compressor when RV-on hangs it at coil Y.
  return m(
    "text.box-label",
    {
      key: `${id}Label`,
      "data-component": id,
      x: heatLabelX(coil, flip),
      y: SIMPLE_BOX_LOOP_TOP + COMPRESSOR_LABEL_Y,
      "text-anchor": "middle",
      dy: COMPRESSOR_LABEL_DY,
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
                y: COMPRESSOR_LABEL_Y,
                dy: COMPRESSOR_LABEL_DY,
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

  const flipIndoor = config.indoorSide === "right";
  const indoorNode =
    indoor === "coil"
      ? iconCoilCaption(
          "indoorCoil",
          "indoor",
          coilLabel("indoor", indoorRole, config.coilLabels),
          flipIndoor,
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
          "outdoor",
          coilLabel("outdoor", outdoorRole, config.coilLabels),
          flipIndoor,
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
        {
          x: indoorZoneX + ZONE_WIDTH / 2,
          y: ZONE_TITLE_Y,
          "text-anchor": "middle",
        },
        "Indoor",
      ),
      m(
        "text.zone-title",
        {
          x: outdoorZoneX + ZONE_WIDTH / 2,
          y: ZONE_TITLE_Y,
          "text-anchor": "middle",
        },
        "Outdoor",
      ),
      m(
        "text.scene-caption",
        {
          "data-role": "caption",
          x: ZONE_WIDTH,
          y: ZONE_TITLE_Y,
          "text-anchor": "middle",
        },
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
      m(
        "g.cross-section-equipment",
        { key: "cross-section-equipment" },
        crossSectionEquipment(flip, heating),
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
        crossSection: config.componentStyle === "crossSection",
        flip,
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
        crossSection: config.componentStyle === "crossSection",
        flip,
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
        circuit.expansion.y + EXPANSION_LABEL_DY,
        "middle",
      ),
      label("Vapor line", placeX(320), 206, placeAnchor("middle")),
      label("Liquid line", placeX(250), 392, placeAnchor("middle")),
    ]),

    layer("heat-transfer", [
      heatTransferLabel(
        heatFlowLabel(indoorRole),
        heatLabelX("indoor", flip),
        circuit.expansion.y + EXPANSION_LABEL_DY,
        "heat-indoor",
      ),
      heatTransferLabel(
        heatFlowLabel(outdoorRole),
        heatLabelX("outdoor", flip),
        circuit.expansion.y + EXPANSION_LABEL_DY,
        "heat-outdoor",
      ),
    ]),

    layer("overlays", overlayBadges),
  ];
}
