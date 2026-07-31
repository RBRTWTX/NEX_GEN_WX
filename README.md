# NEX GEN WX 0.6.5

NEX GEN WX is a local broadcast-weather presentation authoring and rendering workstation. Its visible operator layout and workflow remain based on RBRTW Studio 1.6.1 R3, while TypeScript, Rust, Tauri, registered modules, and isolated render services provide the maintainable internal architecture.

## 0.6.5 focus

This release completes the first presentation-output pipeline:

- actual scene thumbnails captured from the shared scene renderer and cached locally
- Cut, Dissolve, Ease, and Fly transitions with incoming-scene preloading
- clean-output synchronization acknowledgements and render signatures
- verified canonical PNG export at 1920×1080
- export of the selected show as numbered PNG slides
- map-idle, image, font, size, and operator-control readiness checks
- separation of output, export, thumbnail, and transition code from `StudioApp` and `MapStage`

## Setup

Apply the 0.6.5 patch to a working 0.6.4 folder and run:

```text
apply-nex-gen-wx-0.6.5-upgrade.bat
```

After setup passes, run:

```text
run-nex-gen-wx.bat
```

Do not run `npm audit fix --force`; forced dependency upgrades can move the application outside its validated Tauri and Vite version ranges.

## Thumbnails

The active scene is captured after the renderer becomes stable. The preview is stored in a local IndexedDB cache and shown in the R3 scene library. Unvisited scenes retain their existing fallback preview until opened and rendered.

## Output and export

The clean output uses the same `SceneStage` renderer as the editor and export surface. The output window reports its rendered scene ID, signature, size, and readiness back to the operator application. PNG exports are rendered on a separate canonical 1920×1080 surface rather than capturing the variable-size editor canvas.

The **PNG** button exports the current scene. **PNG Show** exports the selected rundown as numbered PNG slides in order.

## Documentation

- `docs/RELEASE_0_6_5.md`
- `docs/VALIDATION.md`
- `docs/ARCHITECTURE.md`
- `docs/MODULE_AUTHORING.md`
- `docs/R3_FRONTEND_SPEC.md`
