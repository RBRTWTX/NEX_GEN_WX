# Release 0.2.0 — map foundation modules

## Purpose

This release moves NextGen Weather Studio from an editor shell to a working map-data foundation. It does not attempt to migrate radar, satellite, temperature or tropical rendering prematurely.

## Added modules

### Weather Data Engine

- Rust `reqwest` client with a descriptive NWS-compatible user agent
- Native Tauri commands rather than browser-side cross-origin provider calls
- JSON response validation
- Time-to-live disk cache under the local NextGen Weather Studio workspace
- Expired-cache fallback during temporary provider outages, marked visibly in the operator interface
- Provider errors returned as typed native command failures

### Administrative Boundaries

- Nationwide state boundary source
- County requests limited to the current padded map view
- Zoom-sensitive geometry simplification
- State and county visibility controls
- Scene-specific boundary line-weight control

### Cities and Places

- Incorporated places and census-designated places
- Population threshold derived from zoom and the scene's city-density setting
- Padded and quantized view queries to improve cache reuse
- Custom labels positioned above weather layers
- Basemap place labels suppressed to prevent duplicates
- Basemap attribution remains visible in the clean output and exported PNG
- Scene-specific label-scale control

### Roads

- Existing vector-basemap road layers are classified as major, secondary, minor or local
- Scene-specific road-density control
- Roads remain in the basemap portion of the style and therefore below NGWS weather layers

### NWS Alerts

- Active alert retrieval and one-minute cache policy
- Alert list, text filter and manual refresh
- Scene-specific minimum-severity filter
- Fill and outline controls
- Click polygon or list item to select
- Automatic fit to alert geometry
- Selected polygon emphasis
- Leader line from selected polygon toward the detail callout
- Selected-alert synchronization between the operator and clean-output windows
- Clear indication when an alert has no polygon geometry

### Project persistence

- Project schema version 2
- Migration defaults for map-display and alert settings
- Automatic local save
- Native JSON project save
- Startup compares save timestamps and restores the newest valid project

## Draw order

The enforced order remains:

1. Basemap
2. Terrain or satellite
3. Roads
4. Boundaries
5. Weather data
6. Weather graphics
7. City labels
8. User annotations

The new alert polygons occupy weather-data/weather-graphics positions. Custom city labels are added after those layers. Basemap roads are never raised above them.

## Known limits

- Satellite is a vector fallback in this release.
- NWS alerts without geometry can be read in the list but cannot be drawn or zoomed to.
- The callout is an initial broadcast-style implementation; detailed text layout and user positioning will be refined later.
- The provider cache does not yet have a user-facing cleanup tool.
- Census city centroids are currently calculated from polygon bounds, not cartographic label points.
- Radar, satellite, observation and continuous weather-field modules remain unimplemented.

## Next planned module group

1. Observation ingestion and plot selection
2. Temperature/dew point/humidity/heat-index field foundation
3. Radar source catalog, frame cache and basic MRMS rendering
4. Satellite source catalog and independent overlay behavior
