# Validation

## Automated commands

```text
npm run validate:reference
npm run audit
npm run validate:foundation
npm run validate:stabilization
npm run validate:functional-repair
npm run validate:map-controllers
npm run validate:module-architecture
npm run test:state
npm run test:modules
npm run check
```

`npm run validate` runs all commands in that order.

## 0.6.4 regression gates

- legacy inventory retains 31 scenes, 16 graphics, and 113 products
- obsolete redesigned-interface files are absent
- no direct browser provider fetch exists
- provider endpoints exist only inside Rust adapters
- shared HTTP behavior includes timeouts, bounded retries, Retry-After handling, cache, and stale fallback
- current Census layer identifiers and supported fields are pinned
- local MapLibre style initialization is independent of optional providers
- provider errors are absent from SceneStage and PNG output
- editor and clean output share SceneStage
- PNG export waits for fonts and filters operator-only nodes
- authored map-header and graphic-template text share EditableSceneText
- style overrides are scene-specific, immutable, migratable, and serializable
- graphic templates render without an automatic footer or development placeholder
- R3 map-header and graphic-stage geometry remain inside the broadcast canvas
- roads precede weather data and city labels follow weather data
- project schema is version 8
- package, Cargo, and Tauri application versions are 0.6.4

## Map-controller regression gates

- `MapStage.tsx` remains below its thin-component line budget
- `MapStage.tsx` does not import provider commands, construct MapLibre, register map events, or query rendered features
- `MapLifecycleController` exclusively owns MapLibre creation, event registration, and disposal
- boundaries, cities, and observations have separate request epochs
- responses are rejected when their request epoch or basemap style generation is stale
- observation field changes clear the prior image before new data is applied
- alert presentation and selection are isolated from provider request ownership
- click routing follows samples → observations → alerts → analyzed-field sampling
- layer movement is owned by `LayerOrderController`
- React Strict Mode cleanup/remount produces a new controller host
- map resize is owned by `ResizeController`

## Windows verification still required

The target Windows machine performs the authoritative WebView2 launch, outbound live-provider requests, GPU rendering, clean-output inspection, and PNG visual comparison. The setup launcher runs TypeScript validation and `cargo test --lib` before declaring setup successful.


## Module-architecture regression gates

- dependency resolution rejects missing and circular dependencies
- provider, dialog, settings, tool, and map-controller contribution IDs are unique
- map controllers are created by the registry rather than hardcoded in the host
- settings, module dialogs, dock tools, quick tools, and context tools are registry-driven
- provider health definitions come from module contributions
- scene module state is isolated by module ID and survives migration/serialization
- scene, show, presentation, operator UI, operator status, alerts, and provider health reducers/stores remain separate
- obsolete central `ToolDialog.tsx` is absent


## Universal scene-object regression gates

- authored headers, legends, graphic panels, logos, alert callouts, and observation callouts register through `SceneObject`
- selection overlays are operator-only and absent from clean output, thumbnails, and PNG export
- move, resize, rotate, layer, lock, hide, nudge, duplicate, delete, and reset operations are scene-specific
- custom text, shape, and image objects persist through project migration and serialization
- scene-object state is isolated in `scene-object-reducer.ts`
- project schema is version 8
- Tauri npm and Rust packages share the 2.11 major/minor release line

## 0.6.5 render-pipeline regression gates

- actual scene thumbnails are captured from `SceneStage`
- thumbnail cache keys include project, scene, and deterministic render signature
- stale thumbnails are removed when scenes are deleted
- Cut, Dissolve, Ease, and Fly share one transition viewport
- incoming scenes mount before transition animation begins
- reduced-motion preference disables animation
- output scene messages include render ID, sequence, signature, and transition
- output window sends readiness acknowledgement and rendered dimensions
- stale output acknowledgements cannot mark a newer render ready
- map readiness is based on MapLibre idle state rather than provider success
- canonical export surface is exactly 1920×1080
- PNG dimensions are decoded and verified before success is reported
- visible operator-only controls fail export verification
- selected show scenes export sequentially as numbered PNG slides
- package, Cargo, and Tauri application versions are 0.6.5
