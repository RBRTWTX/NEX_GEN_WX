# Migration direction

## Phase 0 — completed in this starter

- Created the Tauri/React/TypeScript/Rust project foundation.
- Established one typed project and scene model.
- Added map and graphic scene rendering shells.
- Added the scene library and PowerPoint-style scene strip.
- Added context-sensitive module inspection based on the active scene.
- Added a separate clean output window using the same scene renderer.
- Added PNG export plumbing and Rust-side file saving.
- Established the required roads-under-weather layer-order contract.
- Preserved the R3 reference catalogs: 31 map scenes, 16 graphics and 113 products.
- Added reference validation.

## Phase 1 — stabilize the application core

1. Project open/save dialogs and schema migration.
2. Persistent thumbnails generated from the clean renderer.
3. Full scene add/update/duplicate/delete/reorder workflow.
4. Clean-output window sizing, fullscreen and monitor selection.
5. Pixel-equivalence export tests.
6. Error boundary, source-health panel and structured logging.

## Phase 2 — map foundation (substantially implemented in 0.2.x)

1. Local/offline-capable basemap strategy.
2. Stable state/county boundaries.
3. Roads permanently below weather data.
4. Zoom-responsive cities with more detail at closer scales.
5. Pointer interaction manager so draw/inspect tools cannot pan the map underneath.
6. Transaction-scoped scene application with cancellation of stale requests.

## Phase 3 — first operational weather modules

Completed:

1. Alerts — 0.2.0
2. Observations and temperature/dew point — 0.3.0

Completed interface correction before additional modules:

3. R3 broadcast-workstation parity shell — 0.4.0

Next weather modules:

4. Radar
5. Satellite
6. Tropical

The R3 operator layout is now a fixed product constraint. Future modules must fit its scene library, hidden/context tools, broadcast header, inspector and presentation dock rather than introducing a new dashboard layout.

## Phase 4 — complete presentation authoring

- All 16 forecast graphic templates
- Direct text editing
- Legends and keys
- Drawings and symbols
- Batch PNG export of all scenes
- Manual and automatic presentation playback
