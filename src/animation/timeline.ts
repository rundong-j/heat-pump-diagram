import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import type { DiagramConfig, PlaybackState } from "../model/types";
import { PIPE_COLOR_IDS } from "../diagram/dashArrows";
import { reverseParticleLoop, topologyKey } from "../diagram/layouts/minisplit";

gsap.registerPlugin(MotionPathPlugin);

const LOOP_SECONDS = 28;
const DASH_LENGTH = 16;
const DASH_GAP = 12;
const DASH_CYCLE = DASH_LENGTH + DASH_GAP;
const HIGH_DASH_LENGTH = 8;
const HIGH_DASH_GAP = 6;
const HIGH_DASH_CYCLE = HIGH_DASH_LENGTH + HIGH_DASH_GAP;
const DASH_SPEED_VS_PARTICLES = 0.5;
const AIR_FLOW_SPEED_VS_PARTICLES = 1;
const AIR_FLOW_HEAD_LENGTH = 24;
const AIR_FLOW_HEAD_WIDTH = 42;
const AIR_FLOW_KINDS = ["reject", "absorb"] as const;

type DashTrack = {
  path: SVGPathElement;
  marks: SVGPolygonElement[];
  pathLen: number;
  high: boolean;
};

type AnimCache = {
  svg: SVGSVGElement;
  pipes: Element[];
  dashTracks: DashTrack[];
  coils: Array<CoilAirEls | null>;
};

let animCache: AnimCache | null = null;

function refreshAnimCache(svg: SVGSVGElement): void {
  animCache = {
    svg,
    pipes: [...svg.querySelectorAll(".pipe")],
    dashTracks: PIPE_COLOR_IDS.flatMap((id) => {
      const path = svg.querySelector<SVGPathElement>(`.pipe-${id}`);
      if (!path) {
        return [];
      }
      return [
        {
          path,
          marks: [
            ...svg.querySelectorAll<SVGPolygonElement>(
              `.pipe-dash-arrows-${id} .pipe-dash-arrow`,
            ),
          ],
          pathLen: path.getTotalLength(),
          high: id === "hot" || id === "warm",
        },
      ];
    }),
    coils: AIR_FLOW_KINDS.map((kind) => coilAirEls(svg, kind)),
  };
}

function cacheFor(svg: SVGSVGElement): AnimCache {
  if (!animCache || animCache.svg !== svg) {
    refreshAnimCache(svg);
  }
  return animCache as AnimCache;
}

export class SceneAnimation {
  private mm: ReturnType<typeof gsap.matchMedia> | null = null;
  private flow: gsap.core.Timeline | null = null;
  private dashes: gsap.core.Timeline | null = null;
  private airFlow: gsap.core.Timeline | null = null;
  private machines: gsap.core.Timeline | null = null;
  private svg: SVGSVGElement | null = null;
  private topology: string | null = null;

  attach(svg: SVGSVGElement, config: DiagramConfig): void {
    this.destroy();
    this.svg = svg;
    this.topology = topologyKey(config);
    this.mm = gsap.matchMedia();

    this.mm.add("(prefers-reduced-motion: reduce)", () => {
      this.flow = null;
      this.dashes = null;
      this.airFlow = null;
      this.machines = null;
      gsap.set(svg.querySelector("[data-role='particles']"), { autoAlpha: 0 });
      gsap.set(svg.querySelector("[data-role='static-arrows']"), { autoAlpha: 1 });
      refreshAnimCache(svg);
      applyDashOffset(svg, 0);
      layoutAirFlow(svg, 0);
      return () => undefined;
    });

    this.mm.add("(prefers-reduced-motion: no-preference)", () => {
      this.applyParticleVisibility(config.lineStyle);
      refreshAnimCache(svg);
      this.machines = buildMachineTimeline(svg);
      this.flow = buildFlowTimeline(svg, reverseParticleLoop(config));
      this.dashes = buildDashTimeline(svg);
      this.airFlow = buildAirFlowTimeline(svg);
      this.applyPlayback(config.playback);
      return () => {
        this.machines?.kill();
        this.flow?.kill();
        this.dashes?.kill();
        this.airFlow?.kill();
        this.machines = null;
        this.flow = null;
        this.dashes = null;
        this.airFlow = null;
      };
    });
  }

  applyConfig(config: DiagramConfig): void {
    if (!this.svg) {
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const boxed =
      config.componentStyle === "simpleBox" ||
      config.componentStyle === "icon" ||
      config.componentStyle === "crossSection";
    const labels = this.svg.querySelector("[data-role='labels']");
    const arrows = this.svg.querySelector("[data-role='static-arrows']");
    const heatTransfer = this.svg.querySelector("[data-role='heat-transfer']");
    const airFlow = this.svg.querySelector("[data-role='air-flow']");

    labels?.classList.toggle("is-hidden", !config.overlays.labels || boxed);
    arrows?.classList.toggle("is-hidden", !(config.overlays.direction || reduced));
    heatTransfer?.classList.toggle("is-hidden", !config.overlays.heatTransfer);
    airFlow?.classList.toggle("is-hidden", !config.overlays.heatTransfer);
    this.svg.classList.toggle("labels-off", !config.overlays.labels);
    this.svg.classList.toggle("hide-reversing-valve", !config.showReversingValve);
    this.svg.dataset.componentStyle = config.componentStyle;
    this.svg.dataset.mode = config.mode;
    this.svg.dataset.background = config.background;
    this.svg.dataset.lineStyle = config.lineStyle;
    this.svg.dataset.lineColor = config.lineColor;
    this.svg.dataset.lineWidth = config.lineWidth;
    this.svg.dataset.heatTransfer = config.overlays.heatTransfer ? "on" : "off";
    if (!reduced) {
      this.applyParticleVisibility(config.lineStyle);
    }
    if (config.lineStyle !== "arrow") {
      hideDashArrows(this.svg);
    }

    const nextTopology = topologyKey(config);
    if (this.topology !== nextTopology) {
      this.topology = nextTopology;
      this.rebuildFlow(config);
    } else {
      this.applyPlayback(config.playback);
    }
    applyDashOffset(this.svg, (this.dashes?.progress() ?? 0) * DASH_CYCLE);
    layoutAirFlow(this.svg, this.airFlow?.progress() ?? 0);
  }

  private rebuildFlow(config: DiagramConfig): void {
    if (!this.svg) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      refreshAnimCache(this.svg);
      applyDashOffset(this.svg, 0);
      layoutAirFlow(this.svg, 0);
      return;
    }

    const progress = this.flow?.progress() ?? 0;
    const dashProgress = this.dashes?.progress() ?? 0;
    const airProgress = this.airFlow?.progress() ?? 0;
    const wasPlaying = config.playback.playing;
    this.flow?.kill();
    this.dashes?.kill();
    this.airFlow?.kill();
    refreshAnimCache(this.svg);
    this.flow = buildFlowTimeline(this.svg, reverseParticleLoop(config));
    this.dashes = buildDashTimeline(this.svg);
    this.airFlow = buildAirFlowTimeline(this.svg);
    this.flow.progress(progress);
    this.dashes.progress(dashProgress);
    this.airFlow.progress(airProgress);
    layoutAirFlow(this.svg, airProgress);
    this.applyPlayback({ ...config.playback, playing: wasPlaying });
  }

  applyPlayback(playback: PlaybackState): void {
    const heatOn = this.svg?.dataset.heatTransfer === "on";
    for (const tl of this.timelines()) {
      tl.timeScale(playback.speed);
      const run =
        playback.playing && (tl !== this.airFlow || heatOn);
      if (run) {
        tl.play();
      } else {
        tl.pause();
      }
    }
  }

  destroy(): void {
    this.mm?.revert();
    this.mm = null;
    this.flow = null;
    this.dashes = null;
    this.airFlow = null;
    this.machines = null;
    this.svg = null;
    this.topology = null;
    animCache = null;
  }

  private applyParticleVisibility(lineStyle: DiagramConfig["lineStyle"]): void {
    if (!this.svg) {
      return;
    }
    gsap.set(this.svg.querySelector("[data-role='particles']"), {
      autoAlpha: lineStyle === "solid" ? 1 : 0,
    });
  }

  private timelines(): gsap.core.Timeline[] {
    return [this.flow, this.dashes, this.airFlow, this.machines].filter(
      (tl): tl is gsap.core.Timeline => tl !== null,
    );
  }
}

function buildFlowTimeline(svg: SVGSVGElement, reversed: boolean): gsap.core.Timeline {
  const loop = svg.querySelector<SVGPathElement>("#refrigerant-loop");
  const particles = svg.querySelectorAll(".particle");
  const tl = gsap.timeline({
    paused: true,
    repeat: -1,
  });

  if (!loop || particles.length === 0) {
    return tl;
  }

  particles.forEach((particle, index) => {
    const offset = index / particles.length;
    tl.to(
      particle,
      {
        duration: LOOP_SECONDS,
        ease: "none",
        motionPath: {
          path: loop,
          align: loop,
          alignOrigin: [0.5, 0.5],
          autoRotate: true,
          start: offset,
          end: reversed ? offset - 1 : offset + 1,
        },
      },
      0,
    );
  });

  return tl;
}

function dashSecondsForLoop(svg: SVGSVGElement): number {
  const loop = svg.querySelector<SVGPathElement>("#refrigerant-loop");
  const loopLength = loop?.getTotalLength() ?? 0;
  if (loopLength <= 0) {
    return LOOP_SECONDS;
  }
  return (DASH_CYCLE * LOOP_SECONDS) / (loopLength * DASH_SPEED_VS_PARTICLES);
}

function hideDashArrows(svg: SVGSVGElement): void {
  for (const track of cacheFor(svg).dashTracks) {
    for (const mark of track.marks) {
      mark.setAttribute("visibility", "hidden");
    }
  }
}

function layoutDashArrows(svg: SVGSVGElement, offset: number): void {
  if (svg.dataset.lineStyle !== "arrow") {
    return;
  }
  const pressure = svg.dataset.lineWidth === "pressureBased";
  const tracks = cacheFor(svg).dashTracks;

  for (const track of tracks) {
    const { path, marks, pathLen, high } = track;
    const cycle = pressure && high ? HIGH_DASH_CYCLE : DASH_CYCLE;
    const length = pressure && high ? HIGH_DASH_LENGTH : DASH_LENGTH;
    const width = pressure ? (high ? 8 : 3.5) : 6;

    if (pathLen < 2) {
      marks.forEach((mark) => mark.setAttribute("visibility", "hidden"));
      continue;
    }

    const phase = ((offset % cycle) + cycle) % cycle;
    let used = 0;
    for (let start = phase; start < pathLen && used < marks.length; start += cycle) {
      const remaining = pathLen - start;
      if (remaining < length * 0.35) {
        break;
      }
      const arrowLen = Math.min(length, remaining);
      const point = path.getPointAtLength(start);
      const ahead = Math.min(start + Math.max(arrowLen, 1), pathLen - 0.01);
      const next = path.getPointAtLength(ahead);
      const deg = (Math.atan2(next.y - point.y, next.x - point.x) * 180) / Math.PI;
      const height = (width / 2) * (arrowLen / length);
      const notch = Math.min(arrowLen * 0.3, height);
      const mark = marks[used];
      mark.setAttribute(
        "points",
        `0,${-height} ${arrowLen},0 0,${height} ${notch},0`,
      );
      mark.setAttribute(
        "transform",
        `translate(${point.x} ${point.y}) rotate(${deg})`,
      );
      mark.setAttribute("visibility", "visible");
      used += 1;
    }
    for (let i = used; i < marks.length; i += 1) {
      marks[i].setAttribute("visibility", "hidden");
    }
  }
}

function applyDashOffset(svg: SVGSVGElement, offset: number): void {
  const pipes = cacheFor(svg).pipes;
  const dash = String(-offset);
  for (const pipe of pipes) {
    pipe.setAttribute("stroke-dashoffset", dash);
  }
  layoutDashArrows(svg, offset);
}

function dartWindow(fullLen: number): number {
  return Math.max(2 * AIR_FLOW_HEAD_LENGTH, fullLen);
}

type CoilAirEls = {
  inStem: SVGPathElement;
  outStem: SVGPathElement;
  inHead: SVGPolygonElement;
  outHead: SVGPolygonElement;
  inLen: number;
  outLen: number;
  gap: number;
  track: number;
  dartLen: number;
};

function coilAirEls(
  svg: SVGSVGElement,
  kind: (typeof AIR_FLOW_KINDS)[number],
): CoilAirEls | null {
  const inStem = svg.querySelector<SVGPathElement>(
    `.air-flow-stem-${kind}-in`,
  );
  const outStem = svg.querySelector<SVGPathElement>(
    `.air-flow-stem-${kind}-out`,
  );
  const inHead = svg.querySelector<SVGPolygonElement>(
    `.air-flow-head-${kind}-in`,
  );
  const outHead = svg.querySelector<SVGPolygonElement>(
    `.air-flow-head-${kind}-out`,
  );
  const groupName =
    kind === "reject" ? "air-flow-condenser" : "air-flow-evaporator";
  const group = svg.querySelector(`.${groupName}`);
  if (!inStem || !outStem || !inHead || !outHead) {
    return null;
  }
  const inLen = inStem.getTotalLength();
  const outLen = outStem.getTotalLength();
  const gap = Number(group?.getAttribute("data-air-gap"));
  if (inLen < 2 || outLen < 2 || !Number.isFinite(gap) || gap < 0) {
    return null;
  }
  const track = inLen + gap + outLen;
  const windowAttr = Number(group?.getAttribute("data-air-window"));
  const dartLen =
    Number.isFinite(windowAttr) && windowAttr >= 2 * AIR_FLOW_HEAD_LENGTH
      ? windowAttr
      : track;
  return {
    inStem,
    outStem,
    inHead,
    outHead,
    inLen,
    outLen,
    gap,
    track,
    dartLen,
  };
}

function airFlowCycleSeconds(svg: SVGSVGElement): number {
  const coil = cacheFor(svg).coils[0];
  const loop = svg.querySelector<SVGPathElement>("#refrigerant-loop");
  const loopLength = loop?.getTotalLength() ?? 0;
  if (!coil || coil.track <= 0 || loopLength <= 0) {
    return LOOP_SECONDS;
  }
  const travel = coil.track + dartWindow(coil.dartLen);
  return (travel * LOOP_SECONDS) / (loopLength * AIR_FLOW_SPEED_VS_PARTICLES);
}

function layoutAirFlow(svg: SVGSVGElement, progress: number): void {
  const p = ((progress % 1) + 1) % 1;

  for (const coil of cacheFor(svg).coils) {
    if (!coil) {
      continue;
    }

    const windowLen = dartWindow(coil.dartLen);
    const dashStart = p * (coil.track + windowLen) - windowLen;
    const dashEnd = dashStart + windowLen;
    const outShift = coil.inLen + coil.gap;

    layoutDart(coil.inStem, coil.inHead, dashStart, dashEnd, coil.inLen);
    layoutDart(
      coil.outStem,
      coil.outHead,
      dashStart - outShift,
      dashEnd - outShift,
      coil.outLen,
    );
  }
}

function stemTangent(
  stem: SVGPathElement,
  pathLen: number,
  atStart: boolean,
): { x: number; y: number; tx: number; ty: number } {
  const origin = stem.getPointAtLength(atStart ? 0 : pathLen);
  const other = stem.getPointAtLength(
    atStart ? Math.min(pathLen, 2) : Math.max(0, pathLen - 2),
  );
  const tx = atStart ? other.x - origin.x : origin.x - other.x;
  const ty = atStart ? other.y - origin.y : origin.y - other.y;
  const len = Math.hypot(tx, ty) || 1;
  return { x: origin.x, y: origin.y, tx: tx / len, ty: ty / len };
}

function pointOnTrack(
  stem: SVGPathElement,
  s: number,
  pathLen: number,
): { x: number; y: number } {
  if (s > 0 && s < pathLen) {
    return stem.getPointAtLength(s);
  }
  const t = stemTangent(stem, pathLen, s <= 0);
  const along = s <= 0 ? s : s - pathLen;
  return { x: t.x + t.tx * along, y: t.y + t.ty * along };
}

function clipPolyToHalfPlane(
  pts: Array<{ x: number; y: number }>,
  origin: { x: number; y: number },
  nx: number,
  ny: number,
): Array<{ x: number; y: number }> {
  const inside = (p: { x: number; y: number }) =>
    (p.x - origin.x) * nx + (p.y - origin.y) * ny >= -0.05;
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const ia = inside(a);
    const ib = inside(b);
    if (ia) {
      out.push(a);
    }
    if (ia !== ib) {
      const da = (a.x - origin.x) * nx + (a.y - origin.y) * ny;
      const db = (b.x - origin.x) * nx + (b.y - origin.y) * ny;
      const t = da / (da - db);
      out.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      });
    }
  }
  return out;
}

function layoutDart(
  stem: SVGPathElement,
  head: SVGPolygonElement,
  dashStart: number,
  dashEnd: number,
  pathLen: number,
): void {
  if (pathLen < 2) {
    stem.setAttribute("stroke-dasharray", "0 1");
    head.setAttribute("visibility", "hidden");
    return;
  }

  const visStart = Math.max(0, Math.min(pathLen, dashStart));
  const visEnd = Math.max(0, Math.min(pathLen, dashEnd));
  const headBase = dashEnd - AIR_FLOW_HEAD_LENGTH;
  const overlapsPath = dashEnd > 0 && dashStart < pathLen;
  const showHead =
    overlapsPath &&
    dashEnd > 0.5 &&
    dashEnd < pathLen + AIR_FLOW_HEAD_LENGTH;

  const stemEnd =
    showHead && headBase < pathLen
      ? Math.max(visStart, Math.min(visEnd, headBase + 1))
      : visEnd;
  const visLen = Math.max(0, stemEnd - visStart);

  stem.setAttribute("stroke-dasharray", `${visLen} ${pathLen}`);
  stem.setAttribute("stroke-dashoffset", String(-visStart));

  if (!showHead) {
    head.setAttribute("visibility", "hidden");
    return;
  }

  const basePt = pointOnTrack(stem, headBase, pathLen);
  const tipPt = pointOnTrack(stem, Math.max(headBase + 1, dashEnd), pathLen);
  const dx = tipPt.x - basePt.x;
  const dy = tipPt.y - basePt.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const half = AIR_FLOW_HEAD_WIDTH / 2;
  let pts = [
    { x: basePt.x + px * half, y: basePt.y + py * half },
    { x: tipPt.x, y: tipPt.y },
    { x: basePt.x - px * half, y: basePt.y - py * half },
  ];
  if (headBase < 0) {
    const start = stemTangent(stem, pathLen, true);
    pts = clipPolyToHalfPlane(pts, start, start.tx, start.ty);
  }
  if (dashEnd > pathLen) {
    const end = stemTangent(stem, pathLen, false);
    pts = clipPolyToHalfPlane(pts, end, -end.tx, -end.ty);
  }
  if (pts.length < 3) {
    head.setAttribute("visibility", "hidden");
    return;
  }
  head.setAttribute(
    "points",
    pts.map((p) => `${p.x},${p.y}`).join(" "),
  );
  head.setAttribute("visibility", "visible");
}

function buildAirFlowTimeline(svg: SVGSVGElement): gsap.core.Timeline {
  const state = { progress: 0 };
  const tl = gsap.timeline({
    paused: true,
    repeat: -1,
  });

  layoutAirFlow(svg, 0);
  tl.to(
    state,
    {
      progress: 1,
      duration: airFlowCycleSeconds(svg),
      ease: "none",
      onUpdate: () => layoutAirFlow(svg, state.progress),
    },
    0,
  );

  return tl;
}

function buildDashTimeline(svg: SVGSVGElement): gsap.core.Timeline {
  const state = { offset: 0 };
  const tl = gsap.timeline({
    paused: true,
    repeat: -1,
  });

  applyDashOffset(svg, 0);
  tl.to(
    state,
    {
      offset: DASH_CYCLE,
      duration: dashSecondsForLoop(svg),
      ease: "none",
      onUpdate: () => applyDashOffset(svg, state.offset),
    },
    0,
  );

  return tl;
}

function buildMachineTimeline(svg: SVGSVGElement): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true });
  const outdoorBlades = svg.querySelector(".outdoor-fan .fan-blades");
  const crossSectionOutdoorBlades = svg.querySelector(
    ".cross-section-outdoor-fan .cross-section-fan-blades",
  );
  const indoorBlades = svg.querySelector(".indoor-fan .fan-blades");
  const compressor = svg.querySelectorAll(".compressor-pulse");

  if (outdoorBlades) {
    tl.to(
      outdoorBlades,
      {
        rotation: 360,
        duration: 3.2,
        ease: "none",
        repeat: -1,
        transformOrigin: "0px 0px",
      },
      0,
    );
  }

  if (crossSectionOutdoorBlades) {
    tl.to(
      crossSectionOutdoorBlades,
      {
        rotation: 360,
        duration: 3.2,
        ease: "none",
        repeat: -1,
        svgOrigin: "0 0",
        transformOrigin: "0px 0px",
      },
      0,
    );
  }

  if (indoorBlades) {
    tl.to(
      indoorBlades,
      {
        rotation: 360,
        duration: 5.4,
        ease: "none",
        repeat: -1,
        transformOrigin: "0px 0px",
      },
      0,
    );
  }

  const blowerSlots = svg.querySelector(".cross-section-blower-slots");
  if (blowerSlots instanceof SVGGElement) {
    const pitch = Number(blowerSlots.dataset.slotPitch || 5);
    // Scroll slots in Y only — ribs/outline stay put so the drum reads stationary.
    tl.to(
      blowerSlots,
      {
        y: pitch,
        duration: 1.1,
        ease: "none",
        repeat: -1,
      },
      0,
    );
  }

  if (compressor.length > 0) {
    tl.to(
      compressor,
      {
        scale: 1.06,
        duration: 1.6,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        transformOrigin: "50% 50%",
      },
      0,
    );
  }

  return tl;
}
