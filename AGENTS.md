# Agent Guide

## Project Overview

Personal portfolio site (GitHub Pages). Static SPA built with Vite, EJS, Alpine.js, Tailwind CSS v4, and Three.js.

## Key Commands

```bash
npm install          # Install dependencies
npm run dev          # Generate manifest + start Vite dev server
npm run build        # Generate manifest + build to dist/
npm run manifest     # Regenerate travel manifest only
npm run preview      # Preview production build locally
```

`npm run dev` and `npm run build` both run the manifest generator first — never skip it.

## Architecture

- **Entry points**: `src/pages/index.html` (portfolio), `src/pages/travel.html` (travel atlas)
- **EJS partials**: `src/components/` (nav, footer, hero, tech-stack, html-head)
- **Alpine.js data**: `src/scripts/components/travel-atlas.js` — fetches manifest + trip JSON
- **Three.js scenes**: `src/scripts/three/` — particle-field, hero-scene, travel-globe, photo-viewer
- **Styles**: `src/styles/main.css` — Tailwind v4 entry point with custom `.glass`, `.accent-*` classes
- **Manifest generator**: `scripts/generate-manifest.js` — reads `public/travel/` folders, extracts EXIF via `exifr`, writes `public/data/travel-manifest.json` and `public/data/trips/*.json`

## Data Flow

1. Trip folders live in `public/travel/` with format `YYYY-MM-location`
2. Optional `trip.json` in each folder provides title, description, tags
3. `generate-manifest.js` scans folders, extracts EXIF (date, camera, GPS), writes JSON to `public/data/`
4. At runtime, `travel-atlas.js` fetches the manifest and per-trip JSON
5. Hash routing (`#trip-id`) enables deep linking to individual trips

## Build Quirks

- Vite config (`vite.config.js`) has a `flattenHtmlOutput` plugin that moves HTML from `dist/src/pages/` to `dist/` — if you change page names, this plugin still works but verify the output
- EJS plugin renders templates at build time — `<%- include(...) %>` is processed by Vite, not the browser
- Tailwind v4 uses `@tailwindcss/vite` plugin (not PostCSS) — configured in `vite.config.js`
- No test suite, linter, or type checker in this repo

## Deployment

- Push to `main` triggers GitHub Actions deploy (`.github/workflows/deploy.yml`)
- Uses `actions/deploy-pages@v4` — no manual deploy steps
- Node 20, `npm ci` + `npm run build`

## Adding Trips

1. Create folder in `public/travel/YYYY-MM-location/`
2. Add images (jpg, jpeg, png, gif, webp)
3. Optionally add `trip.json` with `title`, `description`, `tags`
4. Run `npm run manifest` or `npm run build`
