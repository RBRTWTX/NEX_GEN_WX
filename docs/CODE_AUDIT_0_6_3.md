# NEX GEN WX 0.6.3 code audit

## Scope

The audit focused on the old metadata-only module list, central dialog/tool conditionals, provider-ID coupling, root reducer responsibilities, project reducer size, and map-controller construction.

## Removed

- obsolete `ToolDialog.tsx`
- module-specific dialog branching from the central dialog host
- hardcoded settings-tab ownership
- hardcoded map-controller construction in `MapControllerHost`
- closed provider-ID union in the weather context
- scene/show mutation logic from the root studio reducer

## Added boundaries

- `types/module.ts` — public module contract
- `modules/module-registry.ts` — dependency-safe contribution registry
- `modules/module-context.tsx` — React registry access
- `modules/builtin/` — built-in module definitions and panels
- `state/project/` — scene/show project reducers
- `state/reducers/` — project, presentation, UI, status, and coordination reducers
- `data/provider-health-store.ts` — dynamic provider health store
- `data/alerts-store.ts` and `data/cross-window-weather-state.ts` — focused weather stores

## Guardrails

Validation now rejects duplicate module/contribution IDs, missing/circular dependencies, hardcoded controller construction, obsolete central tool dialogs, schema drift, module state mutation, and missing module regression tests.
