# NEX GEN WX 0.6.5 — Scene thumbnails, transitions, output, and export verification

## Purpose

Version 0.6.5 strengthens the presentation workflow without adding a new weather-data module or changing the R3-derived interface. It treats scene previews, live output, transitions, and PNG slides as one verified rendering system.

## Scene thumbnails

- Captures the actual current `SceneStage`, not a separately designed thumbnail template.
- Hides selection boxes and operator-only controls during capture.
- Uses a deterministic scene-and-branding signature to prevent unnecessary recaptures.
- Stores previews in IndexedDB outside the project document.
- Removes cached records when scenes are deleted.
- Retains the category fallback preview until a scene has been rendered successfully.

## Transitions

`SceneTransitionViewport` owns presentation transitions and keeps `SceneStage` focused on rendering one scene. Supported transitions are:

- Cut
- Dissolve
- Ease
- Fly

The incoming scene is mounted before animation starts. The outgoing scene remains noninteractive and is removed after the configured duration. Reduced-motion system preferences force a cut.

## Clean output verification

The output bridge now uses versioned scene and control channels. Each render receives:

- a unique render ID
- sequence number
- scene signature
- transition configuration
- timestamp

The output window waits for fonts, images, map idle state, and valid stage dimensions, then sends an acknowledgement containing the rendered scene, signature, dimensions, readiness, and detail. Stale acknowledgements are ignored by presentation state.

## PNG export verification

PNG export no longer captures the variable-size editor canvas. `SceneExportHost` mounts a noninteractive 1920×1080 `SceneStage` offscreen and verifies:

- exact source dimensions
- renderer readiness
- absence of visible operator-only nodes
- decoded PNG dimensions
- scene render signature

The selected show can be exported sequentially as numbered PNG slides.

## Architecture boundaries

```text
Rendering
├── SceneStage
├── SceneTransitionViewport
├── render-signature
└── capture-readiness

Thumbnails
├── use-scene-thumbnails
├── capture-thumbnail
└── scene-thumbnail-store

Output
├── OutputApp
├── output-bridge
└── use-output-controller

Export
├── SceneExportHost
├── export-scene
└── use-export-controller
```

No thumbnail, transition, output acknowledgement, or export-capture logic was added to weather providers or map-layer controllers.
