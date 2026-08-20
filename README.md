# Heat pump diagram

Interactive mini-split heat pump cycle diagram for teaching and slide decks. Draws a configurable, pauseable refrigeration loop as SVG with optional thermodynamic overlays.

**Live demo:** https://rundong-j.github.io/heat-pump-diagram/

Thermodynamic values are illustrative teaching aids, not a refrigerant property library.

## Features

- Mini-split cooling and heating modes with animated refrigerant flow
- Component style: simple box (default) or abstract icon (serpentine coils, schematic compressor / expansion valve / reversing valve)
- Line style: solid pipes with particles, marching dashes (default), or flow arrowheads
- Line color: four-stop temperature scale (default) or constant house-outline stroke
- Line width & spacing: pressure-based (default; thick/short high-side, thin/regular low-side) or uniform
- Light/dark theme, XL default font, indoor unit left or right
- Optional house outline with outdoor weather and warm/cool zone fills
- Overlays for labels, direction, pressure, temperature, and phase
- Heat transfer overlay (on by default): Heat absorbed / Heat rejected labels, plus two-dart air-flow through each coil (curved vertical in simple box, straight horizontal in abstract icon); pause mid-cycle for a full through-coil arrow; the loop insets to leave room for them
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

On first load: mini-split, heating, simple box, light theme, house & weather, indoor unit on the right, role-based coil labels (Evaporator / Condenser), XL font, dashed lines, temperature-based color, pressure-based width & spacing, heat transfer on. Toggle **Component style** to Abstract icon for winding coils and line-drawn reversing valve.

## Roadmap

- Ducted-split layout
- Additional art styles (sketch, cross-section; abstract icon is in progress)
- URL-serialized config and SVG/PNG export
- PowerPoint content add-in host
