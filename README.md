# Heat pump diagram

Interactive mini-split heat pump cycle diagram for teaching and slide decks. Draws a configurable, pauseable refrigeration loop as SVG with optional thermodynamic overlays.

**Live demo:** https://rundong-j.github.io/heat-pump-diagram/

Thermodynamic values are illustrative teaching aids, not a refrigerant property library.

## Features

- Mini-split cooling and heating modes with animated refrigerant flow
- Component style: simple box (default), abstract icon (serpentine coils that solid-style arrows follow, schematic compressor / expansion valve, and a four-way reversing-valve cross-section when the valve is on), or cross-section (2.5D outdoor + indoor cabinet outlines to start)
- Line style: solid pipes with traveling arrows, marching dashes (default), or flow arrowheads
- Line color: four-stop temperature scale (default) or constant house-outline stroke
- Line width & spacing: pressure-based (default; thick/short high-side, thin/regular low-side) or uniform
- Light/dark theme, XL default font, indoor unit left or right
- Optional house outline with outdoor weather and warm/cool zone fills
- Overlays for labels, direction, pressure, temperature, and phase
- Heat transfer overlay (on by default): two-line Heat absorbed / Heat rejected labels aligned under each air-flow arc, plus two-dart air-flow through each coil (curved vertical in simple box, straight horizontal inside→outside in abstract icon); pause mid-cycle for a full through-coil arrow; the loop insets to leave room for them
- Play/pause, playback speed, and 4K JPEG screenshot (save dialog)

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173/heat-pump-diagram/ (Vite `base` matches the GitHub Pages project path).

```bash
npm run build    # typecheck + production build
npm run preview  # preview production build
```

Pushes to `main` publish GitHub Pages automatically.

## Tech stack

- [Vite](https://vite.dev/)
- [Mithril](https://mithril.js.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [GSAP](https://gsap.com/) for animation

## Project structure

```
src/
  model/          DiagramConfig and illustrative cycle data
  diagram/        SVG scene and mini-split layout
  animation/      GSAP flow timeline
  ui/             Control panel, playback HUD, screenshot export
  hosts/          Web mount
```

## Defaults

On first load: mini-split, heating, simple box, light theme, house & weather, indoor unit on the right, role-based coil labels (Evaporator / Condenser), XL font, dashed lines, temperature-based color, pressure-based width & spacing, heat transfer on. Toggle **Component style** to Abstract icon for winding coils and a line-drawn four-way reversing-valve, or Cross-section for 2.5D outdoor + indoor cabinet outlines.

## Roadmap

- Ducted-split layout
- Cross-section internals and sketch art (cross-section cabinets started; abstract icon in progress)
- URL-serialized config and SVG/PNG export
- PowerPoint content add-in host
