# Agent handoff — refrigeration cycle diagram generator

Greenfield Vite + Mithril + TypeScript web app that draws a configurable, pauseable split heat-pump cycle as SVG. Thermodynamic overlays are **illustrative** (canned teaching values), not a property library. V2 target is an Office.js **content add-in** so the diagram stays interactive inside a PowerPoint slideshow.

Run locally: `npm install && npm run dev` → [http://localhost:5173/](http://localhost:5173/). Typecheck/build: `npm run build`.

If the UI looks stale after edits, kill stray Vite listeners on 5173–5180 and restart (`rm -rf node_modules/.vite && npm run dev`). Multiple Vite processes have caused “no change” false alarms.

## Status vs original plan

| Phase | Intent | Status |
| --- | --- | --- |
| 0 | Vite/Mithril/TS shell, stable SVG viewport | Done |
| 1 | Mini-split cooling loop, abstract icons, pauseable GSAP flow | Done |
| 1+ | Simple-box style, reversing-valve show/hide, indoor/outdoor flip, layout polish | Done |
| 2 | Independent P/T/phase overlays; heating mode (reverse flow, coil role swap) | Done. Heating reverses particles/arrows, swaps coil roles and high/low pipe colors, flips RV slide + TXV. Overlay checkboxes drive canned badges from `cycleData.ts`. |
| 2+ | Light/dark theme; warm/cool zone fills; diagram font scale; coil label style | Done. Dark = prior look; default **light**. Font size is diagram-only (`− Aa +`). Coil labels: role (Evaporator/Condenser) vs location (Indoor/Outdoor coil). |
| 3 | Ducted-split layout; none vs house background | **House outline done** (default). Ducted still not started — Type stays disabled; Background is enabled (`none` \| `house`). |
| 4 | Icon / sketch / cross-section art swap | Partial. `simpleBox` and `icon` render. `sketch` and `crossSection` options are disabled. |
| 5 | URL-serialized config, presenter chrome, SVG/PNG export | Not started |
| 6 | PowerPoint content add-in host | Not started. Host split sketched (`src/hosts/web.ts` only). |

## Defaults (what you see on first load)

Defined in `src/model/types.ts` `createDefaultConfig()`:

- Mini-split, **heating**, **simple box**, **light** theme, **house** background
- **Reversing valve off** (simplified rectangle loop)
- Indoor unit on the **right**
- Coil labels: **role** (Evaporator / Condenser)
- Font scale **1**
- Labels and direction on; P/T/phase off
- Playback playing at **1×** (`LOOP_SECONDS = 28` in `src/animation/timeline.ts`)

## Architecture

Host-agnostic core. Do not put Office.js in the diagram engine.

```
src/
  model/types.ts                DiagramConfig (single source of truth)
  model/cycleData.ts            Illustrative P/T/phase + coil role/label helpers
  diagram/scene.ts              Mithril SVG root; keyed so it does not remount
  diagram/layouts/minisplit.ts  Paths, boxes, arrows, zone fills, house outline, mirrors
  diagram/icons.ts              Geometric icons + simple-box helper
  animation/timeline.ts         GSAP flow (MotionPath) + machine tweens
  ui/controls.ts                Config HUD; unimplemented options disabled/grayed
  ui/playback.ts                Play / pause / restart / speed / scrub
  hosts/web.ts                  Web mount only
  app.ts                        App state; sets documentElement data-theme
  style.css                     Theme tokens; house + font-scale rules
```

Layer order **back → front**: zone fills → **house outline** → refrigerant **lines** → **particles** → **arrows** → **component boxes** → overlay labels → P/T/phase badges.

`circuitLayout()` owns pipe `d` strings and box centers. Heating reverses arrow rotations (normalize `% 360` before `flipRotation`). `mirrorLayout()` flips X for `indoorSide: "right"`. Icon equipment flips with `translate(960 0) scale(-1 1)`.

**Simple-box loop (RV off):** compressor and expansion valve share outdoor x before mirror (`660`); expansion under compressor on the bottom span. Paired top/bottom arrows at x=`370` (indoor side, inset from the house wall). Outdoor/indoor vertical arrows at the coils (`840` / `145`).

Rebuild GSAP **flow** when `topologyKey` changes (`showReversingValve`, `componentStyle`, `indoorSide`, `mode`). Overlay, theme, font scale, background, and coil-label toggles must **not** rebuild the timeline.

Theme: `document.documentElement.dataset.theme`. Font scale: `--font-scale` on the SVG only. House: always in the DOM; shown via `[data-background="house"]` (visibility CSS). Particles stay white in both themes.

## Hard rules (easy to break)

1. **Mithril vs GSAP:** SVG scene created once (`key: "diagram-scene"`). Destroying SVG nodes kills tweens. Prefer CSS / `data-*` / in-place attribute patches.
2. **Fragment keys:** children of one parent must **all** have keys or **none** do. Putting `key: "house"` only on the house vnode crashed the scene (`In fragments, vnodes must either all have keys or none have keys`).
3. **Do not put labels inside a group that inherits `stroke`.** Box labels: `fill: var(--label); stroke: none`.
4. **Simple box vs overlay labels:** `[data-component-style="simpleBox"] .layer-labels { visibility: hidden }`. Prefer CSS on `data-component-style` / `.labels-off` / `.hide-reversing-valve` / `data-background`.
5. **`prefers-reduced-motion`:** no particles; static arrows stay visible.
6. **Arrow reverse + mirror:** normalize rotations after heating reverse or indoor-right flip breaks left/right arrows.
7. **Icon equipment coords** are canonical (indoor-left) inside the flip group; simple-box boxes use already-mirrored `circuit.*` positions.

## Remaining work (priority)

1. **Phase 3 — ducted.** Second layout sharing the same loop topology. Re-enable Type when ready. House is a simple outline today; richer 2D section can wait.
2. **Phase 4 — art.** Sketch SVGs with shared pipe anchors; cross-section later (compressor-only first). Re-enable those style options when ready.
3. **Phase 5 — share/present.** Serialize `DiagramConfig` to the URL; compact presenter chrome; SVG/PNG export fallback.
4. **Phase 6 — PowerPoint.** Second HTML entry, add-in-only XML manifest (`ContentApp`), HTTPS host, `Office.context.document.settings` + `saveAsync` on every change, `getActiveViewAsync` (web slideshow is a new session so `ActiveViewChanged` will not fire). Controls in the content frame only. Pad top-right for the Office personality menu.

## Out of scope until after V2 shell

VRF, geothermal, packaged units, aux heat, defrost animation, live psychrometrics, AppSource listing.

## Product decisions already made

- Audience: teaching / slide decks, not engineering design software.
- Refrigerant: generic label; no property lookup.
- Expansion device: TXV/EEV-style, not capillary-only.
- V2 embed path: Office.js **content add-in**, not a task pane or third-party web viewer.
- Default presentation: heating, indoor right, light theme, house background, role-based coil labels.
