# NEX GEN WX module authoring contract

A new module belongs in its own folder and exports one `StudioModuleDefinition`.

## Required manifest

Declare a stable module ID, name, domain, maturity, supported scene kinds, dependencies, legacy references, and operator capabilities.

## Optional contributions

A module may contribute:

- `providers` for operator provider-health reporting
- `settingsTabs` for scene settings
- `dialogs` for floating R3-style tool windows
- `tools` for dock, quick, or hidden context controls
- `mapControllers` for focused MapLibre behavior
- `defaultSceneState` and `migrateSceneState`

## State rule

Store module-owned scene data only in:

```text
scene.moduleState[moduleId]
```

Use the declared module-state actions. Do not add module-owned fields to unrelated scene types or mutate another module's state.

## Map rule

A map module contributes a focused controller. It must declare its phase and order, own its request epochs and cleanup, reject stale style generations, and request layer-order enforcement rather than moving unrelated layers itself.

## UI rule

Do not add module-specific conditions to `StudioApp`, `SettingsDialog`, `StudioDialogs`, `BottomDock`, or `MapStage`. Register a contribution instead. Preserve the RBRTW Studio 1.6.1 R3 visual language.

## Provider rule

External requests belong in a Rust provider adapter and typed Tauri command. Frontend components consume normalized data and report health through the registered provider ID.

## Registration

Export the definition from the relevant built-in definition file and include that definition array once in `src/modules/registry.ts`. This is the only central registration touchpoint.

## Tests

Add tests for dependency resolution, state migration, provider failure isolation, map lifecycle/style reload, interaction ownership, clean output, and layer order as applicable.
