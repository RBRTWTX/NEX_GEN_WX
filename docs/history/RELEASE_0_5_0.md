# NEX GEN WX 0.5.0 — R3 frontend rebase

Version 0.5.0 removes the experimental redesigned shell and rebuilds the operator experience around the authoritative `RBRTW_Studio_1_6_1_R3` layout.

## Purpose

The language migration was intended to improve reliability, weather-data collection, processing, rendering and code organization. It was not intended to redesign the product. This release corrects that scope.

## Rebuilt interface systems

- operator shell and CSS design system
- top status/navigation bar
- left scene library
- active layer stack
- bottom Layers/Tools dock
- broadcast map header and legend
- hidden context-sensitive map controls
- lower-right quick tools
- draggable floating dialogs
- product browser
- settings workspace
- graphic-scene builder
- save-scene workflow
- show builder and rundown controls
- scene/show state and playback actions

## State schema 4

The project document now includes:

- scene categories and search tags
- header opacity, scale and legend configuration
- show definitions and selected show
- project branding
- typed UI dialog state
- show playback state

Older schema 1–3 project data is migrated on load.

## Preserved backend work

The existing Tauri/Rust provider engine, local caching, project persistence, Census geographic layers, NWS alerts and NOAA surface-observation processing remain in place.

## Honest module status

The R3 control locations for radar, satellite, tropical, drawing, assets, color tables and model tools are present. Those controls do not claim that unfinished data/rendering modules are complete.

## Validation

The release validation checks:

- 31 R3 map-scene references
- 16 R3 graphic references
- 113 R3 product references
- schema version 4 and migration support
- all R3 shell components and CSS regions
- scene/show reducer actions
- shared output/export rendering
- existing Rust providers and layer-order rules
- synchronized package, Tauri and Rust versions
- Windows build-cache protection for both old and new package names
