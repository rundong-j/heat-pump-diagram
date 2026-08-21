# Agent handoff — heat pump diagram

Greenfield Vite + Mithril + TypeScript web app that draws a configurable, pauseable split heat-pump cycle as SVG. Thermodynamic overlays are **illustrative** (canned teaching values), not a property library. V2 target is an Office.js **content add-in** so the diagram stays interactive inside a PowerPoint slideshow.

**Repo:** https://github.com/rundong-j/heat-pump-diagram (public)  
**Live:** https://rundong-j.github.io/heat-pump-diagram/

Run locally: `npm install && npm run dev` → [http://localhost:5173/heat-pump-diagram/](http://localhost:5173/heat-pump-diagram/) (`vite.config.ts` `base` is `/heat-pump-diagram/` for GitHub Pages). Typecheck/build: `npm run build`. Pushes to `main` deploy Pages via `.github/workflows/deploy-pages.yml`.

If the UI looks stale after edits, kill stray Vite listeners on 5173–5180 and restart (`rm -rf node_modules/.vite && npm run dev`). Multiple Vite processes have caused “no change” false alarms. `ERR_CONNECTION_REFUSED` on 5173 means the dev server is not running.

## Status vs original plan

| Phase | Intent | Status |
| --- | --- | --- |
| 0 | Vite/Mithril/TS shell, stable SVG viewport | Done |
| 1 | Mini-split cooling loop, abstract icons, pauseable GSAP flow | Done |
| 1+ | Simple-box style, reversing-valve show/hide, indoor/outdoor flip, layout polish | Done. RV HUD tile **enabled** (default **off**). Simple-box RV on the top run at `660,250`; compressor at `660,328`; stubs `±24`; box width `132` (matches compressor); slide above the label; four port arrows (discharge up / suction down stay fixed; vapor ports follow mode). Coils, liquid, TXV, insets unchanged. |
| 2 | Independent P/T/phase overlays; heating mode (reverse flow, coil role swap) | Done. Heating reverses particles/arrows, swaps coil roles, flips RV slide + TXV. Overlay checkboxes drive canned badges from `cycleData.ts`. **Heat transfer** overlay is enabled (default **on**). |
| 2+ | Light/dark theme; zone fills; diagram font scale; coil label style | Done. Default **light**. Font size is a square switch (Small / Normal / Large / **XL default 1.3**). Coil labels: Evap / Cond vs Outdoor / Indoor. |
| 2++ | Square-switch HUD; simplified playback; outdoor weather | Done. 3-column tiles. Playback is play-pause + speed slider + **screenshot** (4K JPEG save dialog). |
| 2+++ | Four-color refrigerant lines | Done. ColorBrewer RdYlBu: hot / warm / cold / cool. Hot and cold stop at condenser / evaporator centers; warm and cool continue from there. |
| 2++++ | Line appearance HUD | Done. **Line style** Solid (traveling chevrons on solid pipes) \| **Dashed (default)** \| Arrow (static arrowheads along each pipe). **Line color** **Temperature-based (default)** \| Constant (house-outline stroke). **Line width & spacing** Constant \| **Pressure-based (default)**. |
| 3 | Ducted-split layout; none vs house background | **House & weather done** (default). Ducted not started — Type stays disabled. Background tile: `none` (plain white) \| `house` (zones + weather + outline). |
| 4 | Icon / sketch / cross-section art swap | Partial. Tile **enabled**; default temporarily **cross-section** (restore **simple box** later). Abstract icon shares the simple-box loop and paints schematic coils, compressor trapezoid, expansion triangles, and a line-drawn four-way reversing-valve cross-section. **Cross-section** draws 2.5D outdoor + indoor cabinets plus internals: outdoor front **4:3** (224×168, front bottom on house floor `492`), vertical seam at **2/3** width with right-bay front cutaway (filled floor + filled divider painted under the top face; right-side front vertical omitted so the compressor stays clear), dotted back edges (left rear vertical + bottom rear + left-bottom depth; outdoor divider also gets dotted back vertical + bottom depth), 4-blade axial fan (left bay), seamless compressor can with hemispherical top + elliptical base centered on the right-compartment floor parallelogram; indoor cross-flow blower with elliptical ends (left end shows left half only), 8 front-facing arc ribs, equal-length slots clipped to the drum (fixed clip parent; slots scroll in Y); two line-set runs with two square elbows, verticals just left of the center wall; outdoor ends on the right-side centerline at **2/3** height; **heating** top = warm left-bound / bottom = hot right-bound, **cooling** top = cool left-bound / bottom = cold right-bound (same `.pipe` color / width / dash / arrow HUD as the circuit; solid-style chevrons travel each run in flow direction). Heat-transfer darts: one 45° down-left line through each fan; inbound ends on the top parallelogram far edge (indoor starts at the ceiling); outbound from the fan — outdoor to the diagram bottom, indoor matched to that length. Heat-transfer **labels** stay hidden. Parked geometric units / `iconLayout` / `reversingValveLayout` stay commented. `sketch` stays skipped. |
| 5 | URL-serialized config, presenter chrome, export | **JPEG screenshot done** (`src/ui/screenshot.ts`, 3840×2160). URL config and SVG/PNG fallback not started. |
| 6 | PowerPoint content add-in host | Not started. Host split sketched (`src/hosts/web.ts` only). |

## Defaults (what you see on first load)

Defined in `src/model/types.ts` `createDefaultConfig()`:

- Mini-split, **heating**, **cross-section** (temporary default while polishing; restore **simple box** later), **light** theme, **house & weather** background
- **Reversing valve off** (simplified rectangle loop)
- Indoor unit on the **right**
- Coil labels: **role** (Evaporator / Condenser)
- Font scale **1.3** (XL)
- Labels, direction, and **heat transfer** on; P/T/phase off
- **Line style dashed**; **line color temperature-based**; **line width & spacing pressure-based**
- Playback playing at **1×** (`LOOP_SECONDS = 28` in `src/animation/timeline.ts`)

## Architecture

Host-agnostic core. Do not put Office.js in the diagram engine.

```
src/
  model/types.ts                DiagramConfig (single source of truth)
  model/cycleData.ts            Illustrative P/T/phase + coil role/label helpers
  diagram/viewport.ts           Shared 960×540 viewBox constants
  diagram/layer.ts              Always-mounted g.layer-* helper (key + data-role)
  diagram/scene.ts              Mithril SVG root; keyed so it does not remount
  diagram/layouts/minisplit.ts  Paths, boxes, arrows, air-flow, zones, house, weather, mirrors
  diagram/icons.ts              Geometric icons + simple-box helper
  animation/timeline.ts         GSAP flow (MotionPath) + dash offset + air-flow darts + machine tweens
  ui/hudIcon.ts                 Shared 24×24 HUD SVG wrapper
  ui/controls.ts                Config HUD; square switches; debug at bottom
  ui/playback.ts                Play/pause + speed + screenshot button
  ui/screenshot.ts              Clone SVG → 4K JPEG → showSaveFilePicker
  hosts/web.ts                  Web mount only
  app.ts                        App state; sets documentElement data-theme
  style.css                     Theme tokens; pipes; house; weather; square-switch
```

**Control panel** sits to the **right** of the diagram (stacks below at ≤860px). Order: Playback → System → Overlays → Scene stability (debug).

**Square switches:** `squareCycleSwitch()` in `controls.ts`. 3-column grid, title top / icon center / value bottom; click cycles. Icon is optional (Indoor and Coil labels are text-only).

**System rows:**
1. **Type** (disabled) · **Cycle** (fire / snowflake) · **Reversing valve** (Off \| On; default Off)
2. **Component style** (Simple box \| Abstract icon \| Cross-section; sketch skipped) · **Background** (None \| House & weather) · **Coil labels** (Evap / Cond \| Outdoor / Indoor)
3. **Indoor** (Left side \| Right side) · **Theme** (light bulb / moon) · **Font size** (Aa, default XL)
4. **Line style** (Solid = chevrons on pipes \| Dashed \| Arrow) · **Line color** (Temperature-based \| Constant) · **Line width & spacing** (Constant \| Pressure-based)

**Overlays:** Labels · Pressure · Temperature · Phase · Direction · **Heat transfer**. Heat transfer stays mounted; CSS `[data-heat-transfer]` plus `is-hidden` show canned `heatFlowLabel()` text in `layer-heat-transfer` (Heat absorbed / Heat rejected) and air-flow in `layer-air-flow` (above equipment). Heat label X matches simple-box air-flow arcs; Y matches the expansion-valve caption; both component styles stack two one-word lines. Enabling it insets the simple-box loop (left coil 2/3, right coil 1/3); unchecking restores centered risers and rebuilds flow via `topologyKey`. Each coil keeps a filled ring-section (reduced-motion pose) plus two solid darts on one virtual track (inbound + `data-air-gap` + outbound). Dart length equals that track, so when the outbound head reaches the far end the inbound tail is at the outer start (one long arrow for screenshots). Inbound slides into the box; outbound emerges from the other edge after the gap, same speed, next temperature color. One shared `#air-flow-fade-mask` fades the loop top/bottom only. Pause freezes mid-draw. `prefers-reduced-motion` hides `.air-flow-motion` and shows the filled arrow. Independent of Labels, of simple-box hiding `.layer-labels`, and of Line color (air paths are not `.pipe`).

**Layers** use `layer(name, children)` in `diagram/layer.ts`. That helper always returns keyed `<g class="layer-*">` with matching `data-role`. Groups **stay mounted**. Visibility is CSS `data-*` plus a few `classList` toggles in `SceneAnimation`. Do not conditionally create/destroy equipment groups.

Layer order **back → front**: zone fills → outdoor weather → house outline → refrigerant **lines** (hot/warm/cold/cool) → invisible **loop** (particles) → **particles** → **arrows** → **equipment** (icon set AND simple-box set both in DOM) → **air-flow** (condenser/evaporator darts, above equipment) → labels → heat-transfer labels → P/T/phase badges.

`circuitLayout()` owns `loop` plus four colored `d` strings and box centers. **Hot** ends at the condenser Y; **warm** continues to the expansion valve; **cold** ends at the evaporator Y; **cool** continues to the compressor. Heating swaps which coil is condenser vs evaporator. The hidden `loop` path traces the full circuit for GSAP — simple-box uses the rectangle (or RV detour); icon snakes through both coil windings. Rebuild flow (particles, dashes, **and** heat-transfer darts) only when `topologyKey` changes (`showReversingValve`, `componentStyle`, `indoorSide`, `mode`, `overlays.heatTransfer`).

**Line style:** `data-line-style`. **Solid** = static pipes + GSAP chevron arrows (`.particle` polygons) on the hidden loop with MotionPath `autoRotate` so tips follow travel. **Dashed** = hide particles; rectangular `stroke-dasharray` (`16 12`, or `8 6` on high-side when pressure-based) with marching `stroke-dashoffset`. **Arrow** = hide particles and pipe stroke; always-mounted arrowhead polygons along each `.pipe`, pointing in flow direction (readable when paused, screenshot, or reduced motion). Dash/arrow travel is **half** particle speed (`DASH_SPEED_VS_PARTICLES = 0.5`). Play/pause and speed drive the shared offset tween. Keep particle nodes and dash-arrow polygons mounted. Hide `.pipe-dash-arrows` with `display: none` when the style is not arrow — child `visibility: visible` would otherwise show through a `visibility: hidden` group after switching away from arrow.

**Line color:** `data-line-color`. **Temperature-based** uses RdYlBu tokens (light: `--pipe-hot #d73027`, `--pipe-warm #fdae61`, `--pipe-cool #74add1`, `--pipe-cold #313695`; dark hues lightened). **Constant** paints every `.pipe` with `--house-stroke` (`#5c6670` light / `#c5d0da` dark).

**Line width & spacing:** `data-line-width`. **Constant** = 6px stroke and uniform dasharray `16 12` when dashed. **Pressure-based** = high-side (hot/warm) 8px, low-side (cool/cold) 3.5px; when dashed, high-side dashes compress to `8 6` (same pattern, half period). Dash animation period `DASH_CYCLE = 28` is an integer multiple of both patterns. Do not set dashed `stroke-width` in CSS — width comes only from this tile.

Heating reverses arrow rotations (normalize `% 360` before `flipRotation`). `mirrorLayout()` flips X for `indoorSide: "right"`. Icon equipment currently uses the same already-mirrored `circuit.*` boxes as simple-box (no flip group), except: indoor and outdoor coils are tall stacks of 7 short horizontal runs (52×140, swapped from the coil box) centered on each loop riser; outdoor windings are a horizontal mirror of indoor; condenser winds down from hot to warm and evaporator winds up from cold to cool, with a short vertical stub after each loop corner before the first/last sideways run; first and last runs are half-width so the loop can enter and leave on the riser; color steps along the path via `color-mix` segments; both coil boxes are omitted and Evap/Cond captions sit at `heatLabelX` (same X as heat-transfer labels) with Y fixed to the top-run compressor caption (`SIMPLE_BOX_LOOP_TOP + COMPRESSOR_LABEL_Y`, dy `COMPRESSOR_LABEL_DY`) so RV-on does not drag them down with the hanging compressor; `circuit.indoorCoil` / `outdoorCoil` x follow the riser in icon mode; heat-transfer darts are straight horizontal arrows through each icon coil from **inside the loop to outside** (left coil ←, right coil →) with the same two-dart inbound/gap/outbound timing; outdoor inbound starts at the midpoint between the outdoor coil inner edge and the suction column (`circuit.expansion.x`); indoor inbound matches that length; indoor outbound fades `ICON_AIR_WALL_INSET` (`8`) inside the house outer wall (`HOUSE_BODY_OUTER_X` `48`, mirrored when indoor is right) and outdoor outbound matches that length; destination fade is the last `ICON_AIR_WALL_FADE` (`36`) of the outbound run so a full dart stays opaque through the windings before dissolving at the wall; the hidden particle loop follows the serpentine coil windings (same pieces as the painted coils) in **flow order** so solid-style chevrons travel along the coils rather than the straight riser — `reverseParticleLoop()` is false for icon (and for simple-box RV); dash/air-flow timing still scales from that longer loop length; the expansion device is two triangles pointing at each other on the liquid line with the label below; the reversing valve is a line-drawn four-way cross-section on the vapor line (no box): discharge enters the top-center port, three ports sit on the vapor line (indoor / suction / outdoor), and a sliding U always joins suction to the evaporator port so discharge reaches the condenser port; the label sits above the discharge inlet; the compressor is a side-on trapezoid (long vertical on the left) that uses `.compressor-pulse` without the label so the caption stays a fixed size above; when the reversing valve is on it hangs at coil Y, **centered between suction and discharge**, with a cool horizontal stub into the left edge and a hot stub out of the right. Warm and cold stop at the triangle bases (`±16` from the expansion center) so the liquid line meets the glyph. Parked geometric units used canonical indoor-left coords inside `translate(VIEWPORT_WIDTH 0) scale(-1 1)`.

**Simple-box loop (RV off):** compressor and expansion share outdoor x before mirror (`SIMPLE_BOX_MACHINE_X` `660`); expansion under compressor. Coil **box** centers `840` / `145` at y=`328`, width `140`. Default (heat-transfer **on**) insets the loop to make room for arrows: **left-coil** riser at **2/3 from the left**, **right-coil** riser at **1/3 from the left**, in screen space, regardless of evap/cond or indoor/outdoor. Unchecking heat transfer restores risers through **both box centers**. Canonical fractions invert when `indoorSide: "right"` so mirroring does not swap them. Paired arrows at x=`370`. Heat-transfer arrows are **circular ring sections** (constant radius, sagitta `24`) on the **outside** of the loop at **1/3** of a left coil (bulge right `)` ) or **2/3** of a right coil (bulge left `(` ); both ends sit outward. **Indoor** always points **down** (head-unit discharge); **outdoor** always points **up**. Colors still follow coil role (reject warm→hot, absorb cool→cold), not direction. Shaft `26` / head `42`. Span the simple-box loop Y (`250`–`405`). Motion splits each ring at the coil box (`328±26`): inbound solid warm (condenser) or cool (evaporator); outbound solid hot or cold. Outbound is delayed by the box-gap arc so the same dart appears to travel through at constant speed with a color change. Y-masks fade only the outer ends (one shared loop-height mask); heads clip to the flat shaft ends so they slide in/out of the box. No traveling color gradient.

**Simple-box RV on:** same coils, liquid line, TXV, and insets. RV takes the top-run slot (`660,250`); compressor hangs at coil Y (`660,328`). Discharge stub `636`, suction stub `684`. Top run is indoor vapor → RV → outdoor vapor; `hot`/`cool` route through the valve by mode (`condPipe` / `evapPipe`); `warm`/`cold` unchanged. Hidden `loop` detours through the compressor and is already in flow order — `reverseParticleLoop()` is false so GSAP does not play it backwards. Direction overlay: coil/liquid arrows are emitted in flow order (do not run `reverseArrows` on them); discharge stub always **up**, suction always **down**; indoor/outdoor vapor ports follow mode. Simple-box RV box (`SIMPLE_BOX_RV_WIDTH` `132`, same as compressor) puts `reversingValveSlide` in the upper half and the label below (`labelDy`). Do not use `reversingValveLayout()` for simple-box.

**Icon RV on:** same vapor/liquid routing as simple-box, but the refrigerant lines themselves are a four-way cross-section (no box). Discharge enters the **top-center** port; three ports sit on the vapor line (**indoor / suction / outdoor**); a sliding U always joins **suction to the evaporator** so the high-pressure chamber reaches the **condenser** port. The discharge riser is always **screen-right of the compressor** (the trapezoid is not flipped; offset `COMPRESSOR_TRAP_HALF_WIDTH * 2 + ICON_RV_PIPE_STUB * 2` = `100`), in both cycles. The compressor hangs at coil Y and **centers between suction (`machineX`) and discharge**. Cool (`cool`) runs `H` from the suction riser into the trapezoid left; hot (`hot`) runs `H` from the trapezoid right to the discharge riser (`ICON_RV_PIPE_STUB` `28` each). The hidden `loop` still crosses the compressor so GSAP stays in flow order. Direction overlay: vertical discharge **up** / suction **down** stay fixed; two extra arrows on the horizontal stubs always point suction → discharge (do not `reverseArrows` them with heating). Heating keeps the same chamber path after it enters the valve. Paths stay `M`/`H`/`V` so `flipPath` can mirror indoor-right. Label sits above the discharge inlet. Do not use `Q`/`C` on these paths.

**House & weather:** both always in the DOM. Shown only when `data-background="house"` (plain white + no weather/zones/outline when `none`). Weather: `[data-mode="heating"|"cooling"]` on `.weather-snow` / `.weather-sun`. Canonical indoor-left house body is `M48,176 H412 V492 H48 Z` (ceiling **176**, floor **492**) so icon Evap/Cond caption clearance to the ceiling matches heat-label clearance to the floor (~26px at XL). Heat-transfer labels share X/Y in both component styles: `heatLabelX` = `boxXAtFraction` of the simple-box coil centers (`145` / `840`, mirrored) at 1/3 (left coil) / 2/3 (right); Y matches the expansion-valve caption (`circuit.expansion.y + EXPANSION_LABEL_DY`, `405 + 40` → **445**); always two stacked one-word lines (`Heat` / `absorbed|rejected`). Roof `M36,176 L230,92 L424,176 Z` (`HOUSE_ROOF_RISE` **84** so Indoor title clearance to the peak matches clearance to the top edge). Zone titles **Indoor** / **Outdoor** are centered in each half (`zoneX + ZONE_WIDTH/2`) at `ZONE_TITLE_Y` **52**; the scene caption shares that baseline. `houseContext(flip)` mirrors with `translate(VIEWPORT_WIDTH 0) scale(-1 1)`.

Compressor pulse: `transformOrigin: "50% 50%"`. Fan blades still rotate around `"0px 0px"`. Solid-style flow markers stay white chevrons (stroke for contrast on colored pipes). Heat-transfer overlay is enabled (default **on**); canned “Heat absorbed” / “Heat rejected” labels follow coil roles. Air-flow stays mounted in `layer-air-flow` (above equipment). `airFlowFadeDefs()` owns the shared Y-mask. Dart color is `--air-flow-color` on `.air-flow-motion-{reject|absorb}-{in|out}`. A dedicated GSAP timeline (`airFlow`, same pause/speed as the rest, paused when the overlay is off) draws two darts per coil on `.air-flow-stem-{reject|absorb}-{in|out}`, clipped to a constant-width shaft with **flat radial ends**. Dart length equals the virtual track. Travel speed is particle speed (`AIR_FLOW_SPEED_VS_PARTICLES = 1`, twice dash speed). Place the head base and tip on the stem centerline (`getPointAtLength`); do not build the triangle off a tip-only tangent (that wobbles on the arc). Do not remount `layer-air-flow`.

Viewport: `VIEWPORT_WIDTH` / `VIEWPORT_HEIGHT` / `VIEWBOX` in `diagram/viewport.ts` (960×540). Scene, layout mirroring/zones, and 4K screenshot math all import it. HUD glyphs go through `hudIcon()` in `ui/hudIcon.ts`.

Screenshot: clones `.diagram-scene`, inlines CSS variables + stylesheets, rasterizes 3840×2160 JPEG, `showSaveFilePicker` (download fallback). Cancel is a no-op.

## Hard rules (easy to break)

1. **Mithril vs GSAP:** SVG scene created once (`key: "diagram-scene"`). Destroying SVG nodes kills tweens. Prefer CSS / `data-*` / in-place attribute patches. Icon and simple-box equipment must **both** stay in the DOM. Particles stay in the DOM when dashed.
2. **Fragment keys:** children of one parent must **all** have keys or **none** do.
3. **Do not put labels inside a group that inherits `stroke`.** Box labels: `fill: var(--label); stroke: none`.
4. **Simple box vs overlay labels:** `[data-component-style="simpleBox"]`, `[data-component-style="icon"]`, and `[data-component-style="crossSection"]` hide `.layer-labels`. Heat-transfer **labels** stay in `layer-heat-transfer` for simple-box/icon and are hidden in cross-section (darts live in `layer-air-flow`). Cross-section also hides the refrigerant `layer-circuit` / loop particles / direction arrows; its own line-set pipes and solid chevrons live under `.cross-section-equipment`. Air-flow uses the same `data-heat-transfer` / `is-hidden` visibility in all styles. Prefer CSS on `data-component-style` / `.labels-off` / `.hide-reversing-valve` / `data-background` / `data-line-style` / `data-line-color` / `data-line-width` / `data-heat-transfer` / mode-based weather. Hide unused line-style arrowheads with `display: none` on `.pipe-dash-arrows`, not `visibility: hidden`. Keep **simple-box**, **icon**, and **cross-section** equipment groups mounted; show one via `data-component-style`.
5. **`prefers-reduced-motion`:** no particles; static overlay arrows stay visible; heat-transfer stem/head hidden (filled ring-section stays); dashed/arrow pipes stay static (no offset tween).
6. **Arrow reverse + mirror:** normalize rotations after heating reverse or indoor-right flip.
7. **Icon equipment** currently shares simple-box box positions (`circuit.*`, already mirrored). Parked geometric icon art used canonical indoor-left coords inside a flip group.
8. **Control-panel label CSS:** `.control-panel label { flex-direction: column }`. Playback speed uses `.playback-hud label.speed-control { flex-direction: row }`.
9. **Disabled HUD tiles** (Type) are reserved product surface — do not delete. Component style is enabled (simple box / icon / cross-section); sketch stays listed but skipped. Reversing valve is enabled; default remains **off**.
10. **Local URL** must include the Vite `base` path: `/heat-pump-diagram/`. Connection refused on 5173 = server not running.

## Remaining work (priority)

1. **Ducted layout.** Second layout sharing loop topology. Split `minisplit.ts` / layout registry before copying a fourth path set. Re-enable Type when ready.
2. **Phase 4 — art.** Icon reversing valve is a line-drawn four-way cross-section (discharge top-center, sliding U on suction + evaporator). Finish remaining icon equipment (outdoor fan, etc. still unused). Cross-section cabinets + outdoor right-bay cutaway + outdoor fan / compressor / indoor blower + line-set + 45° heat darts are in; next add coil internals. Then sketch SVGs with shared pipe anchors. Mark sketch `available` when ready. Restore default **simple box** when cross-section polish is done.
3. **Phase 5 — share/present.** Serialize `DiagramConfig` to the URL; compact presenter chrome; SVG/PNG export fallback (JPEG screenshot already works).
4. **Phase 6 — PowerPoint.** Second HTML entry, add-in-only XML manifest (`ContentApp`), HTTPS host, `Office.context.document.settings` + `saveAsync` on every change, `getActiveViewAsync` (web slideshow is a new session so `ActiveViewChanged` will not fire). Controls in the content frame only. Pad top-right for the Office personality menu.

## Deferred cleanup (do not rush)

Safe internals already done: dropped unused joined coil `d` strings, shared air-flow dart/kind helpers, cached pipe nodes and path lengths for dash/air-flow ticks.

Leave these until they unblock a feature:

- **Split `minisplit.ts`.** Air-flow, house/weather, and equipment could be modules, but keep `layer()` mount order and fragment keys intact. Best done when adding a ducted layout registry.
- **Delete parked icon comments** (`iconLayout`, `reversingValveLayout`, `fanIcon`, old units) only after icon art is finished or explicitly dropped.
- **Keep equipment sets mounted.** Simple-box, icon, and cross-section groups stay in the DOM; hide via CSS so GSAP/Mithril do not remount the SVG.
- **True along-stroke coil gradient.** SVG `linearGradient` is spatial; `color-mix` segments are the current stand-in. A path-length gradient needs extra geometry or a different renderer.
- **Simple-box air-flow destination fade.** Icon coils already stretch the exit mask; the vertical 16%/84% loop mask is unchanged.
- **Skip tweens on hidden equipment.** `.compressor-pulse` is queried for both icon and simple-box; the hidden set still ticks. Tiny CPU, leave unless profiling says otherwise.
- **Precompute dash-arrow samples.** `getPointAtLength` still runs every dash frame when line style is arrow. Caching samples per topology would help long paths only.
- **CSS pressure/coil selectors.** Indoor vs outdoor segment rules are already grouped; further merging is cosmetic.

## Out of scope until after V2 shell

VRF, geothermal, packaged units, aux heat, defrost animation, live psychrometrics, AppSource listing.

## Product decisions already made

- Audience: teaching / slide decks, not engineering design software.
- Refrigerant: generic label; no property lookup. Default line colors are a 4-stop temperature scale, not a property library. Constant color is the house outline stroke.
- Expansion device: TXV/EEV-style, not capillary-only.
- V2 embed path: Office.js **content add-in**, not a task pane or third-party web viewer.
- Default presentation: heating, indoor right, light theme, house & weather, role-based coil labels, XL font, **dashed** lines, temperature-based color, **pressure-based** width & spacing, **heat transfer on**.
- Layers: keep mounted `g.layer-*` groups via `layer()`; do not build a scene-graph that remounts SVG.
