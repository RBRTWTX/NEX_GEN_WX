# Release 0.2.1 — MapLibre attribution type hotfix

This hotfix corrects the strict TypeScript error reported during Windows setup:

```text
TS2322: Type true is not assignable to type false | AttributionControlOptions | undefined
```

## Correction

`MapStage.tsx` now configures MapLibre attribution with an options object:

```ts
attributionControl: { compact: true }
```

Attribution remains enabled in both the editor and clean output. No weather module behavior was removed or changed.
