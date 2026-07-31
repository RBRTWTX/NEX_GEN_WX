# Release 0.3.0 — observations and current surface fields

## Purpose

This release implements the first complete weather-value path from a live public provider through Rust normalization, scene serialization, MapLibre rendering, clean output and PNG export.

## Native observation provider

- Retrieves the NOAA Aviation Weather Center current METAR compressed CSV cache.
- Decompresses and parses the dataset in Rust.
- Normalizes temperature, dew point, relative humidity, heat index, wind chill, wind speed, gust, direction, visibility, altimeter, weather and flight category.
- Stores the normalized national observation set in the local disk cache for 60 seconds.
- Automatically requests a refreshed observation set once per minute while the application is running.
- Uses expired cached observations when the live provider is temporarily unavailable and reports that condition to the operator.
- Filters and thins station labels according to the current view, zoom, density and display mode.
- Accepts the visibility qualifiers and fractional values commonly present in aviation observations, with Rust unit tests covering header aliases and derived values.

## Temperature and observation renderer

Supported selectable fields:

- Temperature
- Dew point
- Relative humidity
- Heat index
- Wind chill
- Sustained wind
- Wind gust
- Visibility
- Flight category

Numerical fields use a Rust-generated inverse-distance analysis grid and a field-specific broadcast color ramp. Visibility and flight category remain station products because a smooth interpolation would imply detail not supported by the source observations.

## Interaction

- Click a station to show a complete observation card.
- The selected station is highlighted and synchronized to the clean output window.
- Click a supported analyzed field to pin a labeled sample.
- Each map scene owns its samples independently.
- Click an existing sample to remove it, or clear all samples from the observation controls.
- Samples are included in project saves, output rendering and PNG export.

## Scene controls

Every map scene now stores:

- selected field,
- broadcast/standard/detailed station mode,
- station density,
- label scale,
- field visibility and opacity,
- station visibility and identifiers,
- smoothing mode,
- pinned samples.

Project schema version 3 migrates older scene files with safe defaults.

## Default presentation

The default project now includes operational national Current Temperatures and Current Dew Points scenes. The radar scene remains a visual/module placeholder until the radar phase.

## Known limits

- The analyzed field is an observation-based presentation surface, not a model or official gridded analysis.
- Sparse observations can create broad gradients, especially outside the continental United States.
- Heat index and wind chill appear only where their meteorological prerequisites are met.
- Forecast highs, lows and future valid times will be implemented with RTMA/NDFD/model-grid modules rather than inferred from METARs.
