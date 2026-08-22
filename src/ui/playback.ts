import m from "mithril";
import type { PlaybackState } from "../model/types";
import { hudIcon } from "./hudIcon";
import { saveDiagramScreenshot } from "./screenshot";

export type PlaybackHudAttrs = {
  playback: PlaybackState;
  onChange: (playback: PlaybackState) => void;
};

function playPauseIcon(playing: boolean): m.Children {
  if (playing) {
    return hudIcon(
      [
        m("rect", { x: 6.5, y: 5.5, width: 3.8, height: 13, rx: 0.8 }),
        m("rect", { x: 13.7, y: 5.5, width: 3.8, height: 13, rx: 0.8 }),
      ],
      { filled: true },
    );
  }

  return hudIcon(
    m("path", {
      d: "M8.4 5.8 L17.4 12 8.4 18.2 Z",
    }),
    { filled: true },
  );
}

export const PlaybackHud: m.Component<PlaybackHudAttrs> = {
  view(vnode) {
    const { playback, onChange } = vnode.attrs;

    return m("div.playback-hud", [
      m(
        "button.playback-toggle",
        {
          type: "button",
          "aria-label": playback.playing ? "Pause" : "Play",
          onclick: () => onChange({ ...playback, playing: !playback.playing }),
        },
        playPauseIcon(playback.playing),
      ),
      m("label.speed-control", [
        "Speed",
        m("input", {
          type: "range",
          min: "0.125",
          max: "1",
          step: "0.125",
          value: String(playback.speed),
          oninput: (event: InputEvent) => {
            const speed = Number((event.target as HTMLInputElement).value);
            onChange({ ...playback, speed });
          },
        }),
        m("span.speed-value", `${playback.speed.toFixed(2)}×`),
      ]),
      m(
        "button.screenshot-button",
        {
          type: "button",
          title: "Save a high-resolution JPEG of the diagram",
          "aria-label": "Screenshot. Save a high-resolution JPEG of the diagram.",
          onclick: () => {
            void saveDiagramScreenshot().catch((error: unknown) => {
              console.error(error);
            });
          },
        },
        "screenshot",
      ),
    ]);
  },
};
