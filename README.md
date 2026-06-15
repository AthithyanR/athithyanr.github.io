# Athithyan's Personal Website

This project is the source code for Athithyan's personal portfolio website. It is a modern, high-performance static site designed to showcase professional skills and a data-driven travel atlas.

## 🚀 Features

- **Modern Portfolio**: A minimalist "Deep Obsidian" themed landing page featuring a Bento-grid layout, interactive tech stack tags, and subtle micro-interactions.
- **Manifest-Driven Travel Atlas**: A high-performance SPA (Single Page Application) powered by Alpine.js that decouples travel data from the presentation layer.
- **Automated Data Engine**: 
    - Scans `public/travel/` for trip folders.
    - Supports optional `trip.json` files for rich storytelling (custom titles, descriptions, tags).
    - Automatically extracts EXIF metadata (Date, Camera, GPS) using `exifr`.
    - Generates a JSON manifest for ultra-fast client-side rendering.
- **Advanced Travel UI**:
    - **Explorer Mode**: Filterable grid of trips.
    - **Gallery Mode**: Responsive masonry layout for photos.
    - **Detail Mode**: Full-screen lightbox with metadata and direct Google Maps integration.

## 📁 Project Structure

- `build.js`: Build orchestrator.
- `src/`:
    - `index.html`: Main portfolio landing page (source).
    - `travel.html`: The Travel Atlas SPA (source).
    - `input.css`: Tailwind CSS source file.
- `scripts/`:
    - `generate-manifest.js`: Generates `public/data/travel-manifest.json` from travel folders.
- `public/`:
    - `data/`: Contains the generated `travel-manifest.json`.
    - `css/`: Contains the compiled `style.css`.
    - `travel/`: Trip folders containing images and optional `trip.json` overrides.
    - `athi.webp` & `resume.pdf`: Core assets.
- `tools/`: Utility scripts and legacy templates.

## 🛠️ Tech Stack

- **Frontend**: 
    - [Alpine.js](https://alpinejs.dev/) (Reactivity & State)
    - [Tailwind CSS](https://tailwindcss.com/) (Styling)
- **Build Tooling**: 
    - Node.js
    - [exifr](https://github.com/h Payload/exifr) (EXIF extraction)
    - Tailwind CLI

## ⚙️ Development

### Installation

```bash
npm install
```

### Building the Site

To generate the travel manifest and compile the CSS, run:

```bash
npm run build
```

This process:
1. Scans `public/travel/` and generates `public/data/travel-manifest.json`.
2. Compiles `src/input.css` into `public/css/style.css`.

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
