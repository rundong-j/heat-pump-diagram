import m from "mithril";
import type { PlaybackState } from "../model/types";

export type PlaybackHudAttrs = {
  playback: PlaybackState;
  onChange: (playback: PlaybackState) => void;
};

export const PlaybackHud: m.Component<PlaybackHudAttrs> = {
  view(vnode) {
    const { playback, onChange } = vnode.attrs;

    return m("div.playback-hud", [
      m(
        "button",
        {
          type: "button",
          class: playback.playing ? "is-active" : "",
          onclick: () => onChange({ ...playback, playing: true }),
        },
        "Play",
      ),
      m(
        "button",
        {
          type: "button",
          class: !playback.playing ? "is-active" : "",
          onclick: () => onChange({ ...playback, playing: false }),
        },
        "Pause",
      ),
      m(
        "button",
        {
          type: "button",
          onclick: () => onChange({ ...playback, playing: false }),
        },
        "Restart",
      ),
      m("label.speed-control", [
        "Speed",
        m("input", {
          type: "range",
          min: "0.25",
          max: "2",
          step: "0.25",
          value: String(playback.speed),
          oninput: (event: InputEvent) => {
            const speed = Number((event.target as HTMLInputElement).value);
            onChange({ ...playback, speed });
          },
        }),
        m("span.speed-value", `${playback.speed.toFixed(2)}×`),
      ]),
    ]);
  },
};
