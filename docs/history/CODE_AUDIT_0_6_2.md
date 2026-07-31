# NEX GEN WX 0.6.2 code audit

## Audit target

The 0.6.2 audit focused on `MapStage.tsx`, map event ownership, provider request ownership, stale-response handling, scene-camera synchronization, interaction routing, resize behavior, and permanent layer order.

## Prior risk

`MapStage.tsx` previously created MapLibre, registered all map events, requested four provider families, stored all caches, applied all styles, managed alerts and observations, performed point sampling, persisted the camera, and controlled layer ordering. Even though it was smaller than the legacy JavaScript controller, it still had the same growth pattern: every new map module would have added more effects and branches to one central file.

## Result

`MapStage.tsx` now only:

- creates and destroys the controller host
- updates controller callbacks
- forwards scene changes
- forwards alert and selection changes
- forwards observation refresh requests
- renders the map container

Provider logic no longer appears in the component.

## Controller ownership

- `MapLifecycleController` creates/destroys MapLibre and owns native map event registration.
- `MapControllerHost` coordinates controller notifications and current immutable snapshots.
- `BasemapController` owns basemap and projection changes.
- `LayerStyleController` owns scene-driven paint/layout properties.
- `BoundaryController` owns state and county requests and caches.
- `CitiesController` owns places requests and label data.
- `AlertsController` owns polygon presentation, selection, leader line, and auto-zoom.
- `ObservationsController` owns station data, analyzed fields, selected stations, and pinned samples.
- `CameraController` owns scene-camera application and user-camera persistence.
- `InteractionController` routes map clicks without allowing modules to compete directly for the same click.
- `LayerOrderController` enforces the broadcast layer stack.
- `ResizeController` owns container/window resize observation.

## Prohibited regression

The audit now fails if `MapStage.tsx` contains provider imports, creates MapLibre directly, registers map events, queries rendered features, or grows beyond its thin-component line budget.
