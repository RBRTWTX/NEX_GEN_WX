# NextGen Weather Studio 0.4.0

Version 0.4.0 is the **R3 broadcast-workstation parity phase**.

The rebuild remains modular TypeScript/Rust/Tauri internally, but the operator interface now deliberately follows `RBRTW_Studio_1_6_1_R3` rather than introducing a generic dashboard or GIS layout.

## Direction locked in this release

- R3 is the authoritative visual and interaction reference.
- The goal is not to redesign the workstation.
- New code may improve organization, safety, performance and maintainability without replacing the familiar broadcast workflow.
- The large scene canvas remains the center of the application.
- Tools remain compact, contextual and capable of hiding away from the broadcast composition.

## Implemented interface parity

- R3-style 50-pixel operator top bar with Home, Products, Show, Sources, Settings and Present actions.
- R3-style left scene library with search, category filters, two-column scene thumbnails and hover actions.
- Active layer stack under the scene library.
- R3-style full-width broadcast header with shaped logo/control trigger, editable title, subtitle and valid label.
- Context-sensitive hidden map menu opened from the shaped header logo.
- Right-side scene inspector that overlays the canvas rather than permanently shrinking it.
- Bottom presentation dock with transport, scene-builder access, transitions, manual/automatic advance and hold timing.
- Minimisable horizontal scene builder that behaves like a weather-presentation slide strip.
- Direct scene-header editing that persists with the project.
- Broadcast-oriented graphic-scene layout instead of a generic application placeholder.
- Clean output and PNG export continue to use the same scene renderer.

## Code organization

The interface is separated into explicit components:

- `TopBar`
- `SceneLibrary`
- `LayerStack`
- `BroadcastHeader`
- `ContextToolsMenu`
- `ModuleInspector`
- `SceneBuilder`
- `BottomDock`
- `SceneStage`

The scene reducer now owns header, transition, advance and hold-time updates. Visual controls do not directly mutate scene objects.

## Intentionally unchanged

The 0.2/0.3 native providers, boundaries, cities, roads, alerts, observations and temperature analysis remain intact. Radar, real satellite imagery, tropical products and drawing tools are still not represented as operational.

## Next implementation phase

The next weather module should be migrated only after this R3 parity shell is tested on Windows. Radar remains the likely next data module, but it must be added inside this broadcast-workstation workflow rather than changing the layout again.
