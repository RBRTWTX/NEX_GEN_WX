# NEX GEN WX 0.6.4 code audit

## Scope

Version 0.6.4 adds the universal scene-object editing system without merging editing behavior back into `StudioApp`, graphic templates, or the map controllers.

## Boundaries added

- `scene-object-reducer.ts` owns persisted object styles, transforms, and custom object CRUD.
- `SceneEditingContext.tsx` exposes the active scene editing contract.
- `SceneObject.tsx` registers non-text authored elements.
- `EditableSceneText.tsx` owns direct text editing without owning project state.
- `SceneObjectOverlay.tsx` owns pointer movement, scaling, rotation, keyboard nudging, and selection handles.
- `CustomSceneObjectLayer.tsx` renders user-created text, shapes, and images.
- `SceneObjectControls.tsx` owns transform, appearance, and text controls.
- `SceneObjectsDialogPanel.tsx` owns custom-object creation and navigation.

## State audit

Project state now stores:

- authored element style overrides
- stage-relative object transforms
- custom text, shape, and image records
- lock, hide, and layer order state

Operator selection and editing handles remain in operator UI state and are never stored in the broadcast project document.

## Output audit

The editor, clean output, and PNG export use the same scene renderer. Selection handles carry `data-operator-only="true"` and are removed from export. Hidden objects remain faintly visible only while editing and are hidden from clean output and PNGs.

## Dependency audit

Tauri versions are aligned by major/minor:

- Rust `tauri` 2.11.5
- npm `@tauri-apps/api` 2.11.1
- npm `@tauri-apps/cli` 2.11.4

`validate-tauri-versions.mjs` prevents version drift from passing setup.
