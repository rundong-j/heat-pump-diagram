# Heat pump diagram

Interactive mini-split heat pump cycle diagram for teaching and slide decks. Draws a configurable, pauseable refrigeration loop as SVG with optional thermodynamic overlays.

**Live demo:** https://rundong-j.github.io/heat-pump-diagram/

Thermodynamic values are illustrative teaching aids, not a refrigerant property library.

## Features

- Mini-split cooling and heating modes with animated refrigerant flow
- Simple box and abstract icon component styles
- Light/dark theme, font scale, and indoor-unit placement
- Optional house outline with outdoor weather hints and warm/cool zone fills
- Overlays for labels, direction, pressure, temperature, and phase
- Play/pause and playback speed controls

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173/

```bash
npm run build    # typecheck + production build
npm run preview  # preview production build
```

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
  ui/             Control panel and playback HUD
  hosts/          Web mount
```

## Defaults

On first load the diagram shows a mini-split in heating mode with a simple-box style, light theme, house and weather background, indoor unit on the right, and role-based coil labels (Evaporator / Condenser).

## Roadmap

- Ducted-split layout
- Additional art styles (sketch, cross-section)
- URL-serialized config and SVG/PNG export
- PowerPoint content add-in host
