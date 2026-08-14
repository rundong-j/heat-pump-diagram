import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import type { DiagramConfig, PlaybackState } from "../model/types";

gsap.registerPlugin(MotionPathPlugin);

const LOOP_SECONDS = 7;

let active: SceneAnimation | null = null;

export function restartPlayback(): void {
  active?.restart();
}

export function seekPlayback(progress: number): void {
  active?.seek(progress);
}

export class SceneAnimation {
  private mm: ReturnType<typeof gsap.matchMedia> | null = null;
  private flow: gsap.core.Timeline | null = null;
  private machines: gsap.core.Timeline | null = null;
  private svg: SVGSVGElement | null = null;

  attach(svg: SVGSVGElement, playback: PlaybackState): void {
    this.destroy();
    this.svg = svg;
    active = this;
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
      this.flow = buildFlowTimeline(svg);
      this.applyPlayback(playback);
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
    const labels = this.svg.querySelector("[data-role='labels']");
    const arrows = this.svg.querySelector("[data-role='static-arrows']");

    labels?.classList.toggle("is-hidden", !config.overlays.labels);
    arrows?.classList.toggle("is-hidden", !(config.overlays.direction || reduced));

    this.applyPlayback(config.playback);
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

  restart(): void {
    for (const tl of this.timelines()) {
      tl.restart();
    }
  }

  seek(progress: number): void {
    this.flow?.progress(progress);
    this.flow?.pause();
    this.machines?.pause();
  }

  destroy(): void {
    if (active === this) {
      active = null;
    }
    this.mm?.revert();
    this.mm = null;
    this.flow = null;
    this.machines = null;
    this.svg = null;
  }

  private timelines(): gsap.core.Timeline[] {
    return [this.flow, this.machines].filter(
      (tl): tl is gsap.core.Timeline => tl !== null,
    );
  }
}

function buildFlowTimeline(svg: SVGSVGElement): gsap.core.Timeline {
  const loop = svg.querySelector<SVGPathElement>("#refrigerant-loop");
  const particles = svg.querySelectorAll(".particle");
  const tl = gsap.timeline({
    paused: true,
    repeat: -1,
    onUpdate: () => syncScrubber(tl),
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
          end: offset + 1,
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
  const compressor = svg.querySelector(".compressor-pulse");

  if (outdoorBlades) {
    tl.to(
      outdoorBlades,
      {
        rotation: 360,
        duration: 0.8,
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
        duration: 1.35,
        ease: "none",
        repeat: -1,
        transformOrigin: "0px 0px",
      },
      0,
    );
  }

  if (compressor) {
    tl.to(
      compressor,
      {
        scale: 1.06,
        duration: 0.4,
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

function syncScrubber(flow: gsap.core.Timeline): void {
  const input = document.querySelector<HTMLInputElement>("[data-role='scrubber']");
  if (!input || document.activeElement === input) {
    return;
  }
  input.value = String(flow.progress());
}
