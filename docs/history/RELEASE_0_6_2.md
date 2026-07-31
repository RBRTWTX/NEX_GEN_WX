# NEX GEN WX 0.6.2 — Map controller refactor

Version 0.6.2 is an internal architecture release. It intentionally adds no new weather product. Its purpose is to make the map engine safe to extend without rebuilding or destabilizing unrelated map behavior.

## Refactored

The former multi-purpose `MapStage.tsx` was reduced to a thin React composition boundary. Map behavior is now owned by focused controllers:

```text
MapStage
└── MapControllerHost
    ├── MapLifecycleController
    ├── BasemapController
    ├── LayerStyleController
    ├── BoundaryController
    ├── CitiesController
    ├── AlertsController
    ├── ObservationsController
    ├── CameraController
    ├── InteractionController
    ├── LayerOrderController
    └── ResizeController
```

## Reliability improvements

- each view-dependent provider owns an independent request epoch
- stale requests are rejected per provider rather than through one global map epoch
- basemap style generation is tracked independently from data requests
- changing observation products clears the old analyzed field before the new field arrives
- disabled and out-of-range observation layers clear both station data and the prior image field
- cached county, city, and observation data is reused only when it matches the current quantized view key
- alert selection, leader-line rendering, and auto-zoom are isolated from provider loading
- interaction routing has a deterministic priority: samples, observations, alerts, then field sampling
- React Strict Mode remounts create a fresh map host instead of reusing a disposed runtime
- resize and permanent layer ordering are controller-owned

## Extension rule

A future map module must add its own controller or declared renderer contribution. It may not append provider requests, event wiring, layer state, or interaction logic directly to `MapStage.tsx`.

## Not added in this release

- radar
- satellite
- tropical weather
- drawing/front tools
- model animation
- automatic forecast data population

Those modules remain future work after the controller architecture is verified on Windows.
