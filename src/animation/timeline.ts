import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import type { DiagramConfig, PlaybackState } from "../model/types";
import { topologyKey } from "../diagram/layouts/minisplit";

gsap.registerPlugin(MotionPathPlugin);

const LOOP_SECONDS = 28;
const DASH_LENGTH = 16;
const DASH_GAP = 12;
const DASH_CYCLE = DASH_LENGTH + DASH_GAP;
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
      autoAlpha: lineStyle === "dashed" ? 0 : 1,
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

function buildDashTimeline(svg: SVGSVGElement): gsap.core.Timeline {
  const pipes = svg.querySelectorAll(".pipe");
  const tl = gsap.timeline({
    paused: true,
    repeat: -1,
  });

  if (pipes.length === 0) {
    return tl;
  }

  gsap.set(pipes, {
    strokeDashoffset: "",
    attr: { "stroke-dashoffset": 0 },
  });
  tl.to(
    pipes,
    {
      duration: dashSecondsForLoop(svg),
      ease: "none",
      attr: { "stroke-dashoffset": -DASH_CYCLE },
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
