# NEX GEN WX architecture

## Foundation

- **Tauri 2:** local Windows desktop shell and native command bridge.
- **React + TypeScript:** editor, scene library, context-sensitive module panels and presentation controls.
- **Rust:** filesystem operations, weather-provider requests, normalization, caching and later radar/GRIB processing.
- **MapLibre GL JS:** GPU-accelerated base renderer with custom GeoJSON layers now and custom WebGL/WebGPU weather layers later.

## Process responsibilities

### Frontend

- Operator interface and scene authoring
- Presentation controls
- Scene-specific map controls
- Map camera interaction
- Layer rendering from normalized provider results
- Clean-output synchronization
- PNG capture request

### Rust core

- Local directories and project persistence
- PNG file writing
- Provider HTTP requests and response validation
- Disk caching
- Provider credentials kept away from the renderer
- Future background jobs, radar decoding and numerical-grid processing

## Data flow in 0.3.0

```text
NWS / Census / NOAA AWC provider
        ↓
Rust provider client and compressed-data decoder
        ↓
TTL disk cache + normalized GeoJSON / analysis grid
        ↓
Tauri typed command
        ↓
Map module source
        ↓
MapLibre weather/boundary/city layers
        ↓
Editor / clean output / PNG export
```

## Non-negotiable layer order

1. Basemap
2. Terrain or satellite
3. Roads
4. County and state boundaries
5. Weather data
6. Weather graphics
7. City labels
8. User annotations

Roads must never be raised above weather data. Basemap place labels are disabled when the custom Cities module is active so they cannot duplicate or cover NEX GEN WX labels.

## Scene isolation

Every scene owns its complete state, including camera, basemap, projection, overlays, map display settings, alert settings, observation settings and pinned point samples. Product changes do not replace the scene library.

## Provider rules

- Requests are made in Rust, not directly by individual UI components.
- Every provider has a cache time-to-live and may fall back to visibly marked stale data during a temporary outage.
- View-dependent requests use padded, quantized bounds to improve cache reuse.
- UI code receives normalized GeoJSON rather than provider-specific response objects.
- Failures are visible to the operator and do not crash the renderer.

## Module contract

Each weather module must declare:

- data providers,
- normalized data types,
- cache policy,
- renderer and layer slot,
- context tools,
- scene serialization,
- value-sampling rules,
- tests and fallback behavior.

No module may directly modify another module's state.


## Observation analysis path

The native provider keeps one normalized national METAR cache. View requests select a deterministic subset of stations and create a low-resolution inverse-distance grid for the chosen field. The frontend converts that normalized grid into a MapLibre image source using a field-specific color ramp. Numerical values remain in the Rust response, allowing point sampling without reverse-engineering colors from the rendered image.

## Operator shell contract in 0.4.0

The operator shell follows the R3 workstation structure and is separated from weather modules:

```text
TopBar
├── SceneLibrary + LayerStack
├── StageShell
│   ├── SceneStage (shared clean renderer)
│   ├── ContextToolsMenu
│   ├── ModuleInspector
│   └── SceneBuilder
└── BottomDock
```

The `SceneStage` is the only visual surface sent to the clean output window or PNG exporter. Operator-only controls live outside that component or are explicitly filtered from PNG capture. A module may contribute controls to the context menu or inspector, but it may not replace the operator shell.

## 0.6.0 stabilization boundaries

The current application is divided into five explicit runtime layers:

```text
React operator shell
  └─ R3 components and operator-only UI state

Versioned project domain
  └─ scenes, map camera, layer visibility, module settings, shows, branding

Scene renderer
  └─ shared SceneStage used by editor, clean output, and PNG capture

Map runtime
  └─ MapStage lifecycle + map-runtime source/layer definitions

Native weather engine
  └─ typed Tauri commands + Rust provider adapters + cache/storage
```

Provider adapters cannot import or control UI components. Operator dialogs cannot mutate the project unless they dispatch a declared project/scene/show action. Scene output does not render provider diagnostics or operator controls.

## 0.6.1 scene-authoring boundary

Authored text is separated from operator selection and visual styling:

```text
Scene content
  ├─ MapScene.header
  └─ GraphicScene.settings

Scene visual overrides
  └─ BaseScene.elementOverrides

Operator-only selection
  └─ OperatorUiState.selectedSceneElement
```

`SceneStage` provides one editing context to both map and graphic scenes. `EditableSceneText` is the only direct-edit primitive. Clean output receives the same scene document but runs with `interactive=false`, so selection outlines, edit roles, and operator controls are absent.

The basemap starts from `map/basemap-styles.ts`. Optional native providers populate independent GeoJSON/image sources only after MapLibre has loaded. No provider adapter may own or recreate the map.

## 0.6.2 map controller boundary

The map renderer is no longer a single React effect that owns all providers and interactions.

```text
MapStage (React lifecycle bridge)
└── MapControllerHost (current immutable snapshots + notifications)
    ├── MapLifecycleController (MapLibre create/events/dispose)
    ├── BasemapController (style + projection)
    ├── LayerStyleController (scene-driven layout/paint)
    ├── BoundaryController (states/counties)
    ├── CitiesController (places/labels)
    ├── AlertsController (polygons/selection/leader/zoom)
    ├── ObservationsController (stations/field/samples)
    ├── CameraController (scene and user camera)
    ├── InteractionController (click ownership)
    ├── LayerOrderController (broadcast z-order)
    └── ResizeController (container/window sizing)
```

Controller rules:

- `MapStage.tsx` may not import provider commands or create MapLibre directly.
- each asynchronous provider controller owns its request epoch and cache key.
- a style generation invalidates data responses produced for an older style.
- a controller may communicate through `MapControllerContext`; it may not import another controller except where the host explicitly composes a shared interaction dependency.
- map clicks are routed centrally so modules cannot independently consume the same operator action.
- controllers may request a layer-order pass, but only `LayerOrderController` moves layers.
- provider failures update operator status and never replace or remove the map lifecycle.

## 0.6.3 executable module boundary

The module registry is now an active composition system rather than documentation metadata.

```text
StudioModuleDefinition
├── manifest + dependencies
├── scene activation
├── provider contributions
├── settings/dialog/tool contributions
├── map-controller contributions
└── scene defaults + migrations
```

`ModuleRegistry` topologically resolves dependencies, validates contribution IDs, normalizes scene module state, and creates ordered map controllers. Shared hosts query the registry; they do not contain radar-, satellite-, tropical-, alert-, or observation-specific UI branches.

Application state is coordinated as independent domains:

```text
StudioState
├── ProjectState
│   ├── Scene reducer
│   └── Show reducer
├── PresentationState
├── OperatorUiState
└── OperatorStatusState

Weather runtime
├── ProviderHealthStore
├── AlertsStore
└── CrossWindowWeatherState
```

A new module should be introduced through its definition and module-owned files. It must not expand `MapStage`, the root reducer, or the operator shell merely to register controls or state.

## 0.6.4 scene-object boundary

Authored object editing is a core module rather than template-specific code. Template components register editable elements with stable IDs. The editing overlay reads those IDs from the rendered scene, while the project reducer stores only normalized styles, stage-relative transforms, and custom object records. Operator selection handles are not part of output state.

## 0.6.5 verified render pipeline

The editor, clean output, thumbnails, and PNG export all use `SceneStage`. Their orchestration is intentionally separate:

- `SceneTransitionViewport` owns outgoing/incoming scene lifetimes and transition timing.
- `output-bridge` owns cross-window messages, render IDs, signatures, sync requests, and acknowledgements.
- `SceneExportHost` owns the canonical 1920×1080 export surface.
- `use-scene-thumbnails` owns preview capture scheduling and IndexedDB persistence.
- `capture-readiness` provides shared font, image, map-idle, dimension, and operator-node checks.

Weather modules contribute scene content but do not own output windows, transitions, thumbnails, or PNG saving. This prevents future radar, satellite, tropical, or model modules from duplicating presentation infrastructure.
