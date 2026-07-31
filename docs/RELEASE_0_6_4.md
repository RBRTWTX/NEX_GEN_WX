# NEX GEN WX 0.6.4 — Universal scene-object editing

Version 0.6.4 is an editing-system release. It does not redesign the R3-derived operator interface and does not add a new weather-data module.

## Authored object editing

Existing authored objects can be selected directly on map and graphic scenes. Registered objects include:

- map header, logo, copy block, clock, title, subtitle, valid label, legend and legend ramp
- graphic headers, location blocks, content areas, forecast cards, planner cards, hourly columns and bars
- alert and observation callouts
- observation legends
- all existing editable graphic text

Selected objects support:

- direct text editing where the object is authored text
- drag movement
- corner scaling
- rotation
- stage-relative X/Y positioning
- independent X/Y scaling
- layer order
- locking
- hiding from clean output and PNG
- text, solid background, two-color gradient, border, opacity, padding, radius, shadow and typography controls
- appearance, position, or complete reset

## Custom scene objects

The Objects tool can add:

- custom text
- rectangular, rounded, elliptical, or line shapes with an editable shape type
- PNG, JPG, WEBP, GIF, and SVG image assets

Custom objects are scene-specific, duplicable, deletable, movable, styleable, and included in clean output and PNG export. Embedded image assets are limited to 2 MB to protect automatic project persistence.

## Project schema

Project schema 8 adds `customObjects` and persistent object transforms. Existing projects are migrated automatically.

## Tauri correction

The Rust Tauri crate and npm Tauri API/CLI packages now share the 2.11 major/minor release line. Setup fails early with a clear version message if they drift again.
