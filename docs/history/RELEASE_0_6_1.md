# NEX GEN WX 0.6.1 — Functional repair

Version 0.6.1 is a repair and architectural-hardening release. It does not add radar, satellite, tropical, or model modules.

## Repaired

- independent MapLibre basemap startup
- current Census boundaries and places request fields
- isolated optional provider failures
- operator-only provider diagnostics
- responsive map and graphic stage sizing
- R3 broadcast-header geometry
- full-stage graphic composition
- removal of automatic graphic footer text
- direct editing of authored map-header and graphic-template text
- scene-specific color and typography overrides
- shared editor/output/PNG rendering
- schema version 6 migration and persistence
- component and state separation for future module growth

## Not represented as complete

- live radar imagery and animation
- live satellite imagery and animation
- tropical tracks, cones, and advisories
- drawing/front tools
- model timelines
- automatic forecast-template population

The corresponding scene references and control locations may remain visible for migration planning, but the release does not claim those data modules are operational.

## Windows verification

Run `setup-nex-gen-wx.bat`. Setup runs the JavaScript/TypeScript structural validation pipeline, TypeScript compilation, and Rust library tests before the application is launched with `run-nex-gen-wx.bat`.
