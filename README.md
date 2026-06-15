# Athithyan's Personal Website

This project is the source code for Athithyan's personal portfolio website. It is a modern, high-performance static site designed to showcase professional skills and a data-driven travel atlas.

## Features

- **Modern Portfolio**: A minimalist "Deep Obsidian" themed landing page featuring a Bento-grid layout, interactive tech stack tags, and subtle micro-interactions.
- **Manifest-Driven Travel Atlas**: A high-performance SPA powered by Alpine.js that decouples travel data from the presentation layer.
- **Automated Data Engine**:
    - Scans `public/travel/` for trip folders.
    - Supports optional `trip.json` files for rich storytelling (custom titles, descriptions, tags).
    - Automatically extracts EXIF metadata (Date, Camera, GPS) using `exifr`.
    - Generates a JSON manifest for ultra-fast client-side rendering.
- **Advanced Travel UI**:
    - **Explorer Mode**: Filterable grid of trips.
    - **Gallery Mode**: Responsive masonry layout for photos.
    - **Detail Mode**: Full-screen lightbox with metadata and direct Google Maps integration.

## Project Structure

```
src/
  components/         # Shared EJS partials (nav, footer, hero, tech-stack)
  pages/              # Page entry points (index.html, travel.html)
  scripts/            # Alpine.js bootstrap + components
  styles/             # Tailwind CSS v4 entry point
scripts/
  generate-manifest.js  # Generates public/data/travel-manifest.json from travel folders
public/               # Static assets (served at /)
  data/               # Generated travel manifest + trip data
  travel/             # Trip folders with images + optional trip.json
  athi.webp
  resume.pdf
vite.config.js        # Vite build configuration
```

## Tech Stack

- **Frontend**: [Alpine.js](https://alpinejs.dev/) (Reactivity), [Tailwind CSS v4](https://tailwindcss.com/) (Styling)
- **Build**: [Vite](https://vite.dev/) (Dev server & bundler), EJS (Templating), exifr (EXIF extraction)

## Development

### Installation

```bash
npm install
```

### Dev Server

Starts the manifest generator and Vite dev server with hot reload:

```bash
npm run dev
```

### Production Build

Generates the travel manifest and builds the site to `dist/`:

```bash
npm run build
```

### Adding New Trips

1. Create a new folder in `public/travel/` (Format: `YYYY-MM-location`).
2. Drop your images into the folder.
3. (Optional) Add a `trip.json` file for a custom title and description:
   ```json
   {
     "title": "My Amazing Trip",
     "description": "A brief story about this journey...",
     "tags": ["Adventure", "Culture"]
   }
   ```
4. Run `npm run build`.
