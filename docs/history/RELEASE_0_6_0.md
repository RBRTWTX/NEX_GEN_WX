# NEX GEN WX 0.6.0 — Foundation hardening

Version 0.6.0 pauses feature expansion and stabilizes the TypeScript, Rust, Tauri, MapLibre, project-state, provider, output, and R3 operator-interface foundation created through 0.5.0.

## User-visible corrections

- restores a dependable full-size map canvas
- removes raw provider messages from the broadcast scene
- keeps the map/header available when cities, boundaries, alerts, or observations fail
- prevents the bottom dock from creating horizontal page scrolling
- constrains broadcast headers and floating windows to the operator viewport
- keeps scene thumbnails and the active layer stack independently scrollable
- preserves the R3 layout and control placement

## Data-provider corrections

- current Census state and county adapters
- current incorporated-place and census-designated-place adapters
- validated request arguments
- predictable GeoJSON feature collections
- per-provider health state
- retries, timeouts, rate-limit handling, and expired-cache fallback
- independent partial failure handling for Census place layers

## Internal refactor

- modular nested state and immutable project reducer
- provider/cache health context
- shared native HTTP/cache adapter
- split Rust provider modules
- split MapLibre runtime/lifecycle responsibilities
- obsolete redesigned-interface code removed
- R3 base CSS preserved separately from NEX GEN WX hardening rules

## Validation

The release includes static audit, TypeScript state-runtime regression tests, and native Rust unit tests covering legacy reference inventory, source organization, provider isolation, map lifecycle, project schema, layer order, clean output, PNG filtering, layout guards, immutable state behavior, show playback, project migration/round trips, and synchronized version metadata.
