# Agent handoff — refrigeration cycle diagram generator

Greenfield Vite + Mithril + TypeScript web app that draws a configurable, pauseable split heat-pump cycle as SVG. Thermodynamic overlays are **illustrative** (canned teaching values), not a property library. V2 target is an Office.js **content add-in** so the diagram stays interactive inside a PowerPoint slideshow.

Run locally: `npm install && npm run dev` → [http://localhost:5173/](http://localhost:5173/). Typecheck/build: `npm run build`.

## Status vs original plan

| Phase | Intent | Status |
| --- | --- | --- |
| 0 | Vite/Mithril/TS shell, stable SVG viewport | Done |
| 1 | Mini-split cooling loop, abstract icons, pauseable GSAP flow | Done |
| 1+ | Simple-box style, reversing-valve show/hide, indoor/outdoor flip, layout polish | Done |
| 2 | Independent P/T/phase overlays; heating mode (reverse flow, coil role swap) | Done. Heating reverses particles/arrows, swaps indoor/outdoor coil roles and high/low pipe colors, flips RV slide + TXV. Overlay checkboxes drive canned badges from `cycleData.ts`. |
| 2+ | Light/dark theme; warm/cool indoor–outdoor zone fills by mode | Done (not in the original phase list). Current look preserved as **dark**; default is **light**. |
| 3 | Ducted-split layout; none vs house 2D-section background | Not started. Type and Background dropdowns are disabled (only one implemented option each); ducted / house options are grayed. |
| 4 | Icon / sketch / cross-section art swap | Partial. `simpleBox` and `icon` render. `sketch` and `crossSection` options are disabled until art exists. |
| 5 | URL-serialized config, presenter chrome, SVG/PNG export | Not started |
| 6 | PowerPoint content add-in host | Not started. Host split is sketched (`src/hosts/web.ts` only). |

## Defaults (what you see on first load)

Defined in `src/model/types.ts` `createDefaultConfig()`:

- Mini-split, **heating**, **simple box**, **light** theme
- Background none
- **Reversing valve off** (simplified rectangle loop)
- Indoor unit on the **right**
- Labels and direction on; P/T/phase off
- Playback playing at **1×**, where 1× is the old 0.25× pace (`LOOP_SECONDS = 28` in `src/animation/timeline.ts`)

## Architecture

Host-agnostic core. Do not put Office.js in the diagram engine.

```
src/
  model/types.ts                DiagramConfig (single source of truth)
  model/cycleData.ts            Illustrative P/T/phase readings + coil role helpers
  diagram/scene.ts              Mithril SVG root; keyed so it does not remount
  diagram/layouts/minisplit.ts  Paths, boxes, arrows, zone fills, mode/indoor mirror
  diagram/icons.ts              Geometric icons + simple-box helper
  animation/timeline.ts         GSAP flow (MotionPath) + machine tweens (fans, compressor pulse)
  ui/controls.ts                Config HUD (may redraw freely); unimplemented options disabled
  ui/playback.ts                Play / pause / restart / speed / scrub
  hosts/web.ts                  Web mount only
  app.ts                        App state; sets documentElement data-theme
  style.css                     Theme tokens under :root[data-theme=light|dark]
```

Layer order **back → front** (must stay this way): zone fills → refrigerant **lines** → **particles** → **arrows** → **component boxes** → overlay labels → P/T/phase badges.

`circuitLayout()` in `minisplit.ts` owns pipe `d` strings and box centers. Heating swaps high/low pipe routing conceptually via path strings and reverses arrow rotations (normalize to 0–360 so `flipRotation` still works). `mirrorLayout()` flips X for `indoorSide: "right"` (viewBox width 960). Icon-mode equipment is flipped with `translate(960 0) scale(-1 1)`.

Rebuild the GSAP **flow** timeline when `topologyKey(config)` changes (`showReversingValve`, `componentStyle`, `indoorSide`, **`mode`**). Overlay and theme toggles must **not** rebuild the timeline. Do not remount the SVG; Mithril `view()` may patch path `d` and box transforms in place.

Theme is CSS-variable driven: `document.documentElement.dataset.theme` + `.app[data-theme]`. Particles stay white in both themes.

## Hard rules (easy to break)

1. **Mithril vs GSAP:** the SVG scene is created once (`key: "diagram-scene"`). HUD redraws are fine. Destroying SVG nodes kills tweens. Prefer CSS/`data-*`/in-place attribute patches for visibility.
2. **Do not put labels inside a group that inherits `stroke`.** `.compressor-pulse` used to stroke the compressor name a different color. Box labels use `fill: var(--label); stroke: none`. Compressor pulse may scale the label (size pulse is intended).
3. **Simple box vs overlay labels:** `[data-component-style="simpleBox"] .layer-labels { visibility: hidden }` so names are only inside boxes. Icon style uses the overlay label layer. Mithril will strip classes you add in `onupdate` if they are not on the vnode — prefer CSS on `data-component-style` / `.labels-off` / `.hide-reversing-valve`.
4. **Reversing valve off (simple box):** rectangle loop; indoor/outdoor coils centered on the verticals (y=328); compressor centered on the top outdoor span → (660, 250) before mirror; expansion valve on the bottom indoor span → (313, 405) before mirror. No arrow immediately beside the compressor. Coil **labels** swap with mode (indoor = condenser in heating).
5. **`prefers-reduced-motion`:** no particles; static arrows stay visible.
6. **Arrow reverse + mirror:** after heating reverse, normalize rotations with `% 360` before `flipRotation`, or left/right arrows break when indoor is on the right.

## Remaining work (priority)

1. **Phase 3 — ducted + house.** Second layout sharing the same loop topology; 2D house section background. Re-enable Type / Background controls when ready.
2. **Phase 4 — art.** Sketch SVGs with shared pipe anchors; cross-section later (compressor-only is enough at first). Re-enable those style options when ready.
3. **Phase 5 — share/present.** Serialize `DiagramConfig` to the URL; compact presenter chrome; SVG/PNG export as a static fallback.
4. **Phase 6 — PowerPoint.** Second HTML entry, add-in-only XML manifest (`ContentApp`), HTTPS host, `Office.context.document.settings` + `saveAsync` on every change, `getActiveViewAsync` (web slideshow is a new session so `ActiveViewChanged` will not fire). All controls live in the content frame (no task pane in the same add-in). Pad top-right for the Office personality menu.

## Out of scope until after V2 shell

VRF, geothermal, packaged units, aux heat, defrost animation, live psychrometrics, AppSource listing.

## Product decisions already made

- Audience: teaching / slide decks, not engineering design software.
- Refrigerant: generic label; no property lookup.
- Expansion device: TXV/EEV-style, not capillary-only.
- V2 embed path: Office.js **content add-in**, not a task pane or third-party web viewer.
- Default presentation: heating, indoor right, light theme.
