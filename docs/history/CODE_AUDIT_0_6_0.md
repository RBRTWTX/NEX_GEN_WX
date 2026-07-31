# NEX GEN WX 0.6.0 code audit

## Scope

The audit covered every TypeScript, TSX, Rust, validation, launcher, and project-migration file present in the 0.5.0 source package. The purpose was to stabilize the current foundation before any new weather module is added.

## Critical findings corrected

### Blank map lifecycle

The React map host used `map-stage`, while the inherited stylesheet only guaranteed geometry for `.map`. The map canvas therefore had no dependable rendered size. Version 0.6.0 gives `map-stage` an absolute full-canvas geometry and keeps map initialization independent from optional providers.

### Raw provider errors in the scene

Provider failure text was rendered above the stage and could appear over the broadcast composition. Provider health is now operator-only inside the Sources dialog. Clean output and PNG export filter any node explicitly marked `data-operator-only`.

### Census adapter drift

The Census implementation depended on outdated layer/field assumptions. The provider is now split into a dedicated Rust adapter with validated bounding boxes, current state/county/place layer identifiers, current fields, independent incorporated-place/CDP requests, partial-result warnings, and stale-cache recovery.

### Provider monolith

The previous Rust provider file combined HTTP setup, alerts, Census queries, METAR parsing, station thinning, and field analysis. It is now divided into:

```text
weather_engine/provider_client.rs
weather_engine/providers/alerts.rs
weather_engine/providers/census.rs
weather_engine/providers/observations.rs
weather_engine/providers/types.rs
weather_engine/providers/mod.rs
```

### Mixed application state

The 0.5.0 reducer mixed project data, operator dialogs, playback, and status messages. State is now separated into:

```text
ProjectState
PresentationState
OperatorUiState
OperatorStatusState
WeatherDataContext provider/cache state
```

Scene/map/layer/module settings remain versioned inside the project document, while temporary operator controls remain outside it.

### Obsolete redesigned components

The following unused components from the abandoned interface direction were removed:

- `ModuleInspector.tsx`
- `SceneBuilder.tsx`
- `MapModuleControls.tsx`
- `ObservationModuleControls.tsx`
- old `app/studio-reducer.ts`
- old combined `styles/app.css`

### Oversized responsibilities

`MapStage.tsx` no longer owns all MapLibre source/layer construction. Reusable source/layer styling moved to `map-runtime.ts`. The Rust provider module boundary is now a small export file rather than a provider implementation.

## Reliability rules established

- one Rust adapter per provider family
- one shared HTTP client
- validated provider arguments before native invocation
- connection timeout and total request timeout
- bounded retries for connection, timeout, HTTP 429, and server failures
- Retry-After support
- fresh disk cache and expired-cache fallback
- predictable feature-collection responses
- independent provider health states
- no optional provider may prevent the map or header from rendering
- no operator error may enter clean output or PNG export
- provider warnings are concise and visible only through operator controls

## R3 interface hardening

The R3 visual specification remains unchanged. Version 0.6.0 corrects geometry rather than introducing a new design:

- fixed 50-pixel top bar
- independently scrolling scene library and layer stack
- full remaining-space broadcast canvas
- bounded and draggable floating dialogs
- broadcast header constrained to the canvas
- quick tools kept above the bottom dock
- bottom toolbar prevented from creating a page-level horizontal scrollbar
- responsive compression at narrower workstation widths

## Deferred intentionally

No new radar, satellite, tropical, drawing, fronts, or model implementation was added. Those modules remain deferred until the current foundation passes Windows runtime verification.
