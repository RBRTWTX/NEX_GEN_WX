# Module map

The registry in `src/modules/registry.ts` is the authoritative rebuild direction.

## Foundation and working modules

- Scene Engine
- Presentation Engine
- Output Engine
- Map Engine
- Weather Data Engine
- Administrative Boundaries
- Cities and Places
- Roads
- NWS Alerts
- Observations
- Temperature Suite

## Next migration modules

- Radar
- Satellite
- Tropical Weather

## Later modules

- Drawing and Symbols
- Forecast Graphics
- Forecast Data
- Rainfall
- Severe Outlooks
- Fronts and Surface Analysis
- Forecast Models

The context panel is generated from each scene's `activeModuleIds`. A radar scene can therefore expose radar tools without forcing those controls into satellite, temperature or tropical scenes.

## 0.6.0 module ownership rules

- `app/` composes the workstation; it does not perform provider requests.
- `state/` owns reducer actions, immutable project changes, presentation state, UI state, and selectors.
- `data/` owns provider health, alert/observation refresh signals, and cross-window selections.
- `map/MapStage.tsx` is a thin React bridge and owns no provider or MapLibre implementation logic.
- `map/controllers/` owns MapLibre lifecycle, provider-specific map behavior, camera, interactions, resize, styling, and layer order.
- `map/map-runtime.ts` owns reusable NEX GEN WX source/layer definitions and GeoJSON conversion helpers.
- `components/` owns R3 operator controls and broadcast composition components.
- `output/` owns clean-output synchronization and PNG/JSON export.
- `engine/tauri-commands.ts` validates frontend-to-native arguments and response shapes.
- `src-tauri/weather_engine/provider_client.rs` owns HTTP behavior and cache fallback.
- each file under `src-tauri/weather_engine/providers/` owns one provider family.

## 0.6.1 extension contract

A new module is added by composing declared boundaries rather than appending logic to existing components:

1. add normalized domain types and scene settings
2. add one native provider adapter when external data is required
3. add typed Tauri command wrappers
4. add a renderer/layer contribution in the module's assigned layer slot
5. add context-sensitive controls through a module registry contribution
6. add migration defaults and runtime tests
7. add provider, layer-order, output, and failure-isolation regression checks

A module must not modify `StudioApp`, `MapStage`, or another module merely to store its own state. Shared hosts expose explicit extension points instead.


## 0.6.2 map-module extension contract

A future map module must contribute through a focused controller or a declared controller extension point. It may not add provider requests, map event listeners, cache refs, or query-rendered-feature branches directly to `MapStage.tsx`.

A map controller must declare:

1. the scene settings it reads
2. the provider adapter it owns, if any
3. its source/layer identifiers and assigned layer slot
4. its cache key and stale-response rules
5. whether it consumes map clicks and at what interaction priority
6. its style-reload and scene-change behavior
7. its cleanup behavior
8. its regression checks

## 0.6.3 real registry contract

The registry now executes module contributions. `SettingsDialog`, `ModuleDialogHost`, `BottomDock`, `StageQuickTools`, `ContextToolsMenu`, `WeatherDataProvider`, and `MapControllerHost` all read their contributions from the same registry.

Future module work should be self-contained:

1. create the module definition and module-owned UI/controller files
2. register provider IDs and typed native adapters
3. store scene data under `scene.moduleState[moduleId]`
4. register settings/dialog/tool/controller contributions
5. add migration and regression coverage
6. add the module definition to the single built-in registry assembly

No additional central UI branching should be necessary.

## 0.6.4 scene-object contribution

The built-in `scene-objects` module contributes the Objects dock/context command and object-library dialog. Authored scene elements register through `SceneObject`, while custom text, shape, and image assets live in `scene.customObjects`. Appearance and transforms are stored under `scene.elementOverrides`, keeping editing independent from weather-provider and map-controller code.
