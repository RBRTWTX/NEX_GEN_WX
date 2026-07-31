# Requested corrections carried into NEX GEN WX

## Authoritative interface reference

- `RBRTW_Studio_1_6_1_R3` defines the intended operator layout and interaction model.
- The rebuild must look and act like R3 unless a specific change is requested.
- Internal code should be better organized, typed, modular and reliable without replacing the broadcast-workstation design.
- Do not drift into a generic dashboard, GIS application or developer console.
- The scene canvas, left thumbnail library, shaped broadcast header, hidden context controls, right inspector and presentation dock remain the core layout.

### Acceptance checks

- A user familiar with R3 can find the main scene, product, show, context-tool, presentation and export controls without learning an unrelated layout.
- Adding a weather module does not redesign or replace the operator shell.
- Operator panels can hide without changing the clean output composition.

These requirements define direction. They are not assumed complete merely because similar code exists in R2 or R3.

## Map hierarchy and detail

- Roads always render below weather data, regardless of scene or product.
- State and county boundaries remain stable when products change.
- More cities, place names and observation points appear progressively while zooming in.
- City labels remain readable and do not disappear unexpectedly when scenes or products change.
- Local, regional and CONUS scenes use deliberate density rules instead of one global label limit.

### Acceptance checks

- Switching radar, satellite, temperature and tropical products never moves roads above the weather layer.
- Zooming from CONUS to city scale increases useful labels and points without restarting the scene.
- City and road visibility settings persist per scene.

## Context-sensitive tools

- Radar scenes expose radar controls.
- Satellite scenes expose satellite controls.
- Temperature, dew point, humidity and heat-index scenes expose field-specific controls.
- Tropical scenes expose storm, track, cone, point and impact controls.
- Drawing tools remain available without forcing the timeline open.

### Acceptance checks

- No unrelated tool group replaces the active scene.
- Opening a tool does not change the active product.
- The hidden/context menu is derived from the scene's active modules.

## Tropical weather

- Open Track and Open Cone must work.
- NHC data must render as a clean broadcast graphic rather than raw service output.
- Current storms, forecast points, track, cone, watches/warnings, wind radii and impact products remain independently toggleable.
- Storm identity reconciliation prevents duplicate or mismatched cyclones.
- Forecast points and storm graphics are movable/removable only where editing is explicitly enabled.

### Acceptance checks

- Selecting a storm frames the correct basin and storm.
- Track and cone can be toggled independently without losing the storm selection.
- A missing or null storm collection cannot crash startup or scene loading.

## Satellite independence

- Satellite products do not revert to radar.
- Satellite may be a primary scene product or an independent overlay when the product supports it.
- Product, frame, speed, opacity and playback persist with the scene.
- Headers and contextual tools update to the actual selected satellite product.

## Temperature and derived fields

- National temperature, dew point, humidity and heat index use continuous fields where appropriate, not only station dots.
- Observation labels are a separate overlay and remain geographically aligned with the underlying field.
- Highs, lows and derived values use field-specific requests and ranges.
- Point sampling identifies the field, value, units, location, source and valid time.

## Radar

- National MRMS and selected-site NEXRAD remain separate product paths.
- Multi-site blending and best-site selection are explicit, testable services.
- Sweep controls force a real refresh and use a slower configurable default.
- Sharp, balanced and smooth display modes do not change the underlying data values.
- Animation frame loading is cached and cancellation-safe.

## Alerts

- Alert pagination covers the full requested extent.
- Event filters persist.
- Selecting an alert can zoom to the polygon.
- A leader line connects the broadcast detail card to the selected geometry.
- Alert lists can navigate between active products without changing the base scene.

## Drawing and editing

- Drawing, symbol placement, area inspection and point sampling are mutually exclusive pointer modes.
- Active tools capture pointer input without panning or sampling underneath.
- Lines, arrows, boxes, fronts and symbols can be selected, edited and deleted.
- Clicking a symbol tool places the symbol; it does not open a sample graphic.
- All editable text and legends use direct, intentional editing with scene persistence.

## Scene system

- Product selection never replaces the scene library.
- Every scene stores its own camera, product, overlays, module settings, header, drawings, transition and hold behavior.
- Scene application is transactional and rejects stale requests from prior scenes.
- Scene thumbnails represent the actual clean renderer.
- Manual and automatic progression remain distinct.

## Output

- The editor, clean output window and PNG export use one scene renderer.
- PNG export is the primary deliverable path.
- OBS capture is optional and secondary.
- Exported PNGs must match the clean output without missing map canvases, boundaries, labels or overlays.
