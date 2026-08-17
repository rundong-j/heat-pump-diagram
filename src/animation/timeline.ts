import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import type { DiagramConfig, PlaybackState } from "../model/types";
import { topologyKey } from "../diagram/layouts/minisplit";

gsap.registerPlugin(MotionPathPlugin);

const LOOP_SECONDS = 28;

export class SceneAnimation {
  private mm: ReturnType<typeof gsap.matchMedia> | null = null;
  private flow: gsap.core.Timeline | null = null;
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
      this.machines = null;
      gsap.set(svg.querySelector("[data-role='particles']"), { autoAlpha: 0 });
      gsap.set(svg.querySelector("[data-role='static-arrows']"), { autoAlpha: 1 });
      return () => undefined;
    });

    this.mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.set(svg.querySelector("[data-role='particles']"), { autoAlpha: 1 });
      this.machines = buildMachineTimeline(svg);
      this.flow = buildFlowTimeline(svg, config.mode === "heating");
      this.applyPlayback(config.playback);
      return () => {
        this.machines?.kill();
        this.flow?.kill();
        this.machines = null;
        this.flow = null;
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
    const wasPlaying = config.playback.playing;
    this.flow?.kill();
    this.flow = buildFlowTimeline(this.svg, config.mode === "heating");
    this.flow.progress(progress);
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
    this.machines = null;
    this.svg = null;
    this.topology = null;
  }

  private timelines(): gsap.core.Timeline[] {
    return [this.flow, this.machines].filter(
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
        transformOrigin: "0px 0px",
      },
      0,
    );
  }

  return tl;
}
