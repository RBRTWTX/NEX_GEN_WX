# NEX GEN WX 0.6.3 — Real module registry and application-state separation

Version 0.6.3 is an internal architecture release. It adds no new weather product and does not change the R3-derived operator design.

## Real module contributions

Every built-in module is now a `StudioModuleDefinition`. A definition can contribute:

- dependency and scene-activation rules
- provider health definitions
- settings tabs
- floating module dialogs
- bottom-dock, quick, and context tools
- map-controller factories and phases
- scene-specific default state and migration

The registry validates duplicate identifiers, missing dependencies, circular dependencies, map-controller identity, and contribution ordering.

## State separation

The previous central reducer has been divided into domain reducers for:

- project persistence
- scene content and module state
- shows/rundowns
- presentation playback
- operator UI
- operator status
- provider health
- alerts
- cross-window observation selection and refresh

Scene-specific module state is stored under `scene.moduleState[moduleId]`. Project schema version 7 migrates older projects to this structure.

## Registry-driven hosts

- `MapControllerHost` creates map controllers from module contributions.
- `SettingsDialog` renders registered settings tabs.
- `ModuleDialogHost` renders registered floating module panels.
- `BottomDock`, `StageQuickTools`, and `ContextToolsMenu` render registered tools.
- provider health entries come from registered provider contributions.

A future module should normally require a new module folder and one registration import, rather than edits across the operator shell, map stage, settings dialog, provider context, and root reducer.

## Compatibility

The R3 visual specification, scene renderer, map lifecycle, output window, PNG exporter, existing project migration, and current provider adapters remain intact.
