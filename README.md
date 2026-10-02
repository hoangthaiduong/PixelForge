# PixelForge
### The only limit is your imagination

PixelForge is a local-first browser creative application for:

- Pixel Art Studio
- Pixel Animation Studio
- Minecraft Skin Creator

## Features

- Auto-fit drawing canvas for 16×16, 32×32 and 64×64 so the full grid stays visible inside the central drawing area without page/canvas scrolling.

- Real pixel grid editor with Pencil, Eraser, Fill, Eyedropper, Line, Rectangle, Darken, Lighten and Clear.
- 16×16, 32×32 and 64×64 canvases.
- Symmetry, zoom, grid, checkerboard and pixel outlines.
- 30-state undo/redo history.
- PNG import and clean PNG export.
- Frame-by-frame animation with independent frames, timeline drag-reorder, FPS 1–30, playback, loop and onion skin.
- Browser-only animated GIF generation and sprite-sheet export.
- 64×64 Minecraft skin editor with import/export and standard texture mapping.
- Interactive textured 3D character preview with mouse/touch rotation and wheel zoom.
- Native `.htd` JSON project format with validation.
- IndexedDB project storage with a localStorage fallback.
- Light / Dark / System theme.
- Responsive desktop, tablet and mobile layouts.
- No account, backend or API key is required.

## Technology

Plain HTML5, CSS3 and JavaScript. The project intentionally avoids a build-time framework so the app can launch directly from `index.html`.

## Project Structure

```text
PixelForge/
├── index.html
├── README.md
├── manifest.webmanifest
├── sw.js
├── assets/
│   ├── logo.svg
│   └── favicon.svg
├── css/
│   ├── global.css
│   └── editor.css
└── js/
    ├── app.js
    ├── core/
    │   ├── pixel-engine.js
    │   ├── storage.js
    │   ├── export.js
    │   └── gif-encoder.js
    └── three/
        └── character.js
```

## How to Run

No server is required for the core application.

### How to Run by Double-Clicking index.html

1. Download and extract the `PixelForge` folder.
2. Open the folder.
3. Double-click `index.html`.
4. PixelForge opens in the browser.

The application uses classic browser scripts rather than ES-module imports, so the direct `file:///` workflow does not depend on a development server.

## Development

A development server is optional. For example, any static server can serve the folder, but there is no required `npm install` step for the shipped app.

## Production / Vercel

PixelForge is a static site. Upload the project directory to Vercel and use the default static deployment with no server runtime and no environment variables.

## GitHub Pages

Push the project to a repository and enable GitHub Pages for the branch/folder containing `index.html`. All application asset paths are relative, so repository subpaths do not require root `/` URLs.

## HTD Format

PixelForge projects use `.htd` files containing JSON:

```json
{
  "format": "PixelForge",
  "version": 1,
  "type": "pixel-art",
  "name": "My Project",
  "width": 32,
  "height": 32,
  "fps": 8,
  "frames": []
}
```

Opening a project only parses and validates data. Project contents are never executed as code.

## Offline Support

Core editing and export functions are browser-local. The included service worker and manifest are optional deployment enhancements and are not required for direct `file://` launching.

## Browser Support

Use a modern Chromium-based browser, Firefox or Safari with Canvas, Pointer Events, IndexedDB (when available) and standard File APIs. The local storage layer falls back to localStorage when IndexedDB is unavailable.

## Core Principle

**Create. Edit. Save. Export.**

## Save `.HTD` reliably

The **Save .HTD** action first creates and downloads the native `.htd` project file directly from the button click, then stores the same project in IndexedDB for Recent Projects. This ordering preserves browser download permissions, including direct `file://` launch where supported.

The `.htd` file is JSON-based and contains validated PixelForge project metadata plus pixel frame data. Opening an `.htd` file always parses and validates the JSON instead of executing project contents.
