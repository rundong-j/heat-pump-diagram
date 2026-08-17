import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import type { DiagramConfig, PlaybackState } from "../model/types";
import { PIPE_COLOR_IDS } from "../diagram/dashArrows";
import { topologyKey } from "../diagram/layouts/minisplit";

gsap.registerPlugin(MotionPathPlugin);

const LOOP_SECONDS = 28;
const DASH_LENGTH = 16;
const DASH_GAP = 12;
const DASH_CYCLE = DASH_LENGTH + DASH_GAP;
const HIGH_DASH_LENGTH = 8;
const HIGH_DASH_GAP = 6;
const HIGH_DASH_CYCLE = HIGH_DASH_LENGTH + HIGH_DASH_GAP;
const DASH_SPEED_VS_PARTICLES = 0.5;

export class SceneAnimation {
  private mm: ReturnType<typeof gsap.matchMedia> | null = null;
  private flow: gsap.core.Timeline | null = null;
  private dashes: gsap.core.Timeline | null = null;
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
      this.machines = null;
      gsap.set(svg.querySelector("[data-role='particles']"), { autoAlpha: 0 });
      gsap.set(svg.querySelector("[data-role='static-arrows']"), { autoAlpha: 1 });
      applyDashOffset(svg, 0);
      return () => undefined;
    });

    this.mm.add("(prefers-reduced-motion: no-preference)", () => {
      this.applyParticleVisibility(config.lineStyle);
      this.machines = buildMachineTimeline(svg);
      this.flow = buildFlowTimeline(svg, config.mode === "heating");
      this.dashes = buildDashTimeline(svg);
      this.applyPlayback(config.playback);
      return () => {
        this.machines?.kill();
        this.flow?.kill();
        this.dashes?.kill();
        this.machines = null;
        this.flow = null;
        this.dashes = null;
      };
    });
  }

  applyConfig(config: DiagramConfig): void {
    if (!this.svg) {
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const simpleBox = config.componentStyle === "simpleBox";
    const labels = this.svg.querySelector("[data-role='labels']");
    const arrows = this.svg.querySelector("[data-role='static-arrows']");
    const heatTransfer = this.svg.querySelector("[data-role='heat-transfer']");

    labels?.classList.toggle("is-hidden", !config.overlays.labels || simpleBox);
    arrows?.classList.toggle("is-hidden", !(config.overlays.direction || reduced));
    heatTransfer?.classList.toggle("is-hidden", !config.overlays.heatTransfer);
    this.svg.classList.toggle("labels-off", !config.overlays.labels);
    this.svg.classList.toggle("hide-reversing-valve", !config.showReversingValve);
    this.svg.dataset.componentStyle = config.componentStyle;
    this.svg.dataset.mode = config.mode;
    this.svg.dataset.background = config.background;
    this.svg.dataset.lineStyle = config.lineStyle;
    this.svg.dataset.lineColor = config.lineColor;
    this.svg.dataset.lineWidth = config.lineWidth;
    if (!reduced) {
      this.applyParticleVisibility(config.lineStyle);
    }

    const nextTopology = topologyKey(config);
    if (this.topology !== nextTopology) {
      this.topology = nextTopology;
      this.rebuildFlow(config);
    } else {
      this.applyPlayback(config.playback);
    }
    applyDashOffset(this.svg, (this.dashes?.progress() ?? 0) * DASH_CYCLE);
  }

  private rebuildFlow(config: DiagramConfig): void {
    if (!this.svg) {
      return;
    }

    const progress = this.flow?.progress() ?? 0;
    const dashProgress = this.dashes?.progress() ?? 0;
    const wasPlaying = config.playback.playing;
    this.flow?.kill();
    this.dashes?.kill();
    this.flow = buildFlowTimeline(this.svg, config.mode === "heating");
    this.dashes = buildDashTimeline(this.svg);
    this.flow.progress(progress);
    this.dashes.progress(dashProgress);
    this.applyPlayback({ ...config.playback, playing: wasPlaying });
  }

  applyPlayback(playback: PlaybackState): void {
    for (const tl of this.timelines()) {
      tl.timeScale(playback.speed);
      if (playback.playing) {
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
    this.machines = null;
    this.svg = null;
    this.topology = null;
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
    return [this.flow, this.dashes, this.machines].filter(
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

function isHighPressurePipe(id: string): boolean {
  return id === "hot" || id === "warm";
}

function layoutDashArrows(svg: SVGSVGElement, offset: number): void {
  const pressure = svg.dataset.lineWidth === "pressureBased";

  for (const id of PIPE_COLOR_IDS) {
    const path = svg.querySelector<SVGPathElement>(`.pipe-${id}`);
    const marks = svg.querySelectorAll<SVGPolygonElement>(
      `.pipe-dash-arrows-${id} .pipe-dash-arrow`,
    );
    if (!path || marks.length === 0) {
      continue;
    }

    const pathLen = path.getTotalLength();
    const high = isHighPressurePipe(id);
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
  svg.querySelectorAll(".pipe").forEach((pipe) => {
    pipe.setAttribute("stroke-dashoffset", String(-offset));
  });
  layoutDashArrows(svg, offset);
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
