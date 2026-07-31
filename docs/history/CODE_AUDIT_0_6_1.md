# NEX GEN WX 0.6.1 code audit

## Scope

The 0.6.1 audit covers all TypeScript/TSX source files, the Tauri command boundary, Rust storage and provider code, map lifecycle, shared scene output, project migration, graphic templates, and release validation.

## Findings and repairs

### Map lifecycle

The renderer depended too heavily on a remote style and optional provider completion. The repaired map starts from a complete local MapLibre style document containing a background and raster source. State, county, city, alert, and observation requests run independently after style initialization. A rejected optional request updates operator provider health but does not remove the basemap or scene header.

### Census places

The previous places query requested a field that is not available on the current TIGERweb places layers. The adapter now uses current layer identifiers and supported location/area fields, converts Census internal points into normalized GeoJSON points, ranks labels deterministically, and treats incorporated-place and census-designated-place failures independently.

### Scene rendering

The graphic renderer mixed template selection, template markup, default values, and an unwanted hardcoded footer. It is now split into:

```text
GraphicStage
├── GraphicHeader
├── GraphicText
└── templates/
    ├── SevenDayGraphic
    ├── PlannerGraphic
    ├── TwoPanelGraphic
    ├── HourlyGraphic
    ├── NeedToKnowGraphic
    ├── MuggyMeterGraphic
    └── GenericGraphic
```

No automatic footer is rendered.

### Scene text and style ownership

Authored scene text now uses one `EditableSceneText` component and one scene-editing context. Text content remains in the map header or graphic settings. Visual overrides remain in `scene.elementOverrides`. Operator selection remains in `OperatorUiState`; selecting text does not alter the project.

### State persistence

Project schema 6 adds scene-specific element overrides. Migration validates and clamps color strings, font size, weight, alignment, opacity, shadow, and letter spacing. Scene duplication deep-clones these values. JSON project round trips retain them.

### Application composition

The main application composer no longer owns all floating-dialog implementations. `StudioDialogs` owns dialog routing and the style inspector. This keeps the shell readable and prevents future modules from adding another monolithic block to `StudioApp`.

## Removed or prohibited patterns

- raw provider error text over the broadcast scene
- direct browser provider fetches
- provider endpoints inside React components
- automatic `NEX GEN WX` footer text on graphic scenes
- placeholder `DATA MODULE NOT CONNECTED` text in output
- obsolete redesigned-interface components
- direct project-array mutation
- undefined style properties retained in scene overrides

## Growth rule

A future module must add its provider adapter, normalized domain type, scene settings, renderer contribution, context tools, and tests without modifying unrelated modules. It may compose through declared registries and actions, but it may not reach into another module's state or renderer.
