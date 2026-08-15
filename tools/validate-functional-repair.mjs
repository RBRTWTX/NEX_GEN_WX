import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');
const exists = (relative) => access(new URL(relative, root), constants.R_OK);

const required = [
  'src/map/basemap-styles.ts',
  'src/map/MapStage.tsx',
  'src/scene-editing/SceneEditingContext.tsx',
  'src/scene-editing/EditableSceneText.tsx',
  'src/scene-editing/SceneElementStylePanel.tsx',
  'src/state/scene-element-selection.ts',
  'src/app/StudioDialogs.tsx',
  'src/graphics/GraphicHeader.tsx',
  'src/graphics/GraphicText.tsx',
  'src/graphics/templates/SevenDayGraphic.tsx',
  'src/graphics/templates/PlannerGraphic.tsx',
  'src/graphics/templates/TwoPanelGraphic.tsx',
  'src/graphics/templates/HourlyGraphic.tsx',
  'src/graphics/templates/NeedToKnowGraphic.tsx',
  'src/graphics/templates/MuggyMeterGraphic.tsx',
  'src/output/export-scene.ts',
];
await Promise.all(required.map(exists));

const basemap = await read('src/map/basemap-styles.ts');
for (const token of [
  'export function createBasemapStyle',
  'export function createBasemapFallbackStyle',
  'https://tiles.openfreemap.org/styles/liberty',
  'https://tiles.openfreemap.org/styles/dark',
  'World_Imagery/MapServer/tile/{z}/{y}/{x}',
  'nexgen-osm-fallback',
  'tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
]) {
  if (!basemap.includes(token)) throw new Error(`Basemap independence requirement missing: ${token}`);
}

const mapStage = await read('src/map/MapStage.tsx');
for (const token of ['new MapControllerHost', 'host.mount(container)', 'host.destroy()']) {
  if (!mapStage.includes(token)) throw new Error(`MapStage composition repair missing: ${token}`);
}
for (const forbidden of ['Map data issues', 'providerIssues.map', 'map-provider-error']) {
  if (mapStage.includes(forbidden)) throw new Error(`Operator provider error leaked into broadcast canvas: ${forbidden}`);
}
const lifecycle = await read('src/map/controllers/MapLifecycleController.ts');
const host = await read('src/map/controllers/MapControllerHost.ts');
const boundaryController = await read('src/map/controllers/BoundaryController.ts');
const citiesController = await read('src/map/controllers/CitiesController.ts');
const observationsController = await read('src/map/controllers/ObservationsController.ts');
for (const [sourceName, source, tokens] of [
  ['lifecycle', lifecycle, ['new Map({', "map.on('style.load'", 'preserveDrawingBuffer: true', 'new NavigationControl']],
  ['host', host, ['createBasemapStyle', "reportProviderStatus('basemap'", 'styleGeneration']],
  ['boundaries', boundaryController, ["reportProviderStatus('states', 'loading'", "reportProviderStatus('counties', 'loading'", 'fetchStateBoundaries', 'fetchCountyBoundaries']],
  ['cities', citiesController, ["reportProviderStatus('cities', 'loading'", 'fetchPlaces']],
  ['observations', observationsController, ["reportProviderStatus('observations', 'loading'", 'fetchSurfaceObservations', 'renderObservationField']],
]) {
  for (const token of tokens) if (!source.includes(token)) throw new Error(`Map ${sourceName} repair missing: ${token}`);
}

const census = await read('src-tauri/src/weather_engine/providers/census.rs');
for (const token of [
  'const STATE_LAYER: u8 = 6',
  'const COUNTY_LAYER: u8 = 7',
  'const INCORPORATED_PLACE_LAYER: u8 = 26',
  'const CENSUS_DESIGNATED_PLACE_LAYER: u8 = 28',
  'GEOID,NAME,BASENAME,LSADC,STATE,INTPTLAT,INTPTLON,POP100,AREALAND',
  'polygon_feature_to_point',
  'arcgis_record_to_point',
  '.append_pair("f", "json")',
  'labelRank',
]) {
  if (!census.includes(token)) throw new Error(`Census functional repair missing: ${token}`);
}
if (!census.includes('population(right)')) {
  throw new Error('Census places must be ranked by population before land area.');
}
if (!census.includes('orderByFields') || !census.includes('POP100 DESC')) {
  throw new Error('Census places must request provider-side population ordering.');
}

const roadsProvider = await read('src-tauri/src/weather_engine/providers/roads.rs');
for (const token of ['TIGERweb/Transportation', 'PRIMARY_ROADS_LAYER: u8 = 2', 'SECONDARY_ROADS_LAYER: u8 = 6', 'LOCAL_ROADS_LAYER: u8 = 8']) {
  if (!roadsProvider.includes(token)) throw new Error(`Road provider repair missing: ${token}`);
}

const domain = await read('src/types/domain.ts');
const migration = await read('src/core/project-migration.ts');
const reducer = `${await read('src/state/project/scene-reducer.ts')}\n${await read('src/state/project/scene-object-reducer.ts')}`;
for (const token of ['SceneElementStyle', 'SceneElementOverride', 'elementOverrides', 'schemaVersion: 8']) {
  if (!domain.includes(token)) throw new Error(`Scene editing schema missing: ${token}`);
}
for (const token of ['normalizeElementStyle', 'normalizeElementOverrides', 'schemaVersion: 8']) {
  if (!migration.includes(token)) throw new Error(`Scene editing migration missing: ${token}`);
}
for (const token of ["case 'scene/set-element-style'", "case 'scene/reset-element-style'", 'compact<SceneElementStyle>']) {
  if (!reducer.includes(token)) throw new Error(`Immutable scene style reducer missing: ${token}`);
}

const sceneStage = await read('src/components/SceneStage.tsx');
const header = await read('src/components/BroadcastHeader.tsx');
const graphicText = await read('src/graphics/GraphicText.tsx');
for (const token of ['SceneEditingProvider', 'selectedElementId', 'onElementStyleChange']) {
  if (!sceneStage.includes(token)) throw new Error(`Shared scene editing host missing: ${token}`);
}
if (!header.includes('EditableSceneText') || !graphicText.includes('EditableSceneText')) {
  throw new Error('Map and graphic authored text must share the universal editable-text component.');
}

const graphicStage = await read('src/components/GraphicStage.tsx');
const allGraphicSource = [
  graphicStage,
  await read('src/graphics/GraphicHeader.tsx'),
  await read('src/graphics/templates/GenericGraphic.tsx'),
  await read('src/graphics/templates/HourlyGraphic.tsx'),
  await read('src/graphics/templates/MuggyMeterGraphic.tsx'),
  await read('src/graphics/templates/NeedToKnowGraphic.tsx'),
  await read('src/graphics/templates/PlannerGraphic.tsx'),
  await read('src/graphics/templates/SevenDayGraphic.tsx'),
  await read('src/graphics/templates/TwoPanelGraphic.tsx'),
].join('\n');
for (const forbidden of ['graphic-footer', 'DATA MODULE NOT CONNECTED', '· NEX GEN WX']) {
  if (allGraphicSource.includes(forbidden)) throw new Error(`Unwanted graphic-scene footer/placeholder remains: ${forbidden}`);
}
if (!graphicStage.includes('<GraphicHeader') || !graphicStage.includes('<GraphicBody')) {
  throw new Error('Graphic scene renderer is not split into reusable header and body components.');
}

const exporter = await read('src/output/export-scene.ts');
for (const token of ['export-capture-mode', 'document.fonts', "node.dataset.operatorOnly === 'true'", 'expectedWidth', 'readImageDimensions']) {
  if (!exporter.includes(token)) throw new Error(`Exact scene export behavior missing: ${token}`);
}

const css = await read('src/styles/nex-gen-wx.css');
for (const token of [
  'NEX GEN WX 0.6.5 — thumbnails, transitions, output and export verification',
  '.scene-stage--graphic',
  '.graphic-stage',
  '.graphic-content',
  '.broadcast-header',
  '.scene-editable-text.is-selected',
  '.scene-element-style-window',
]) {
  if (!css.includes(token)) throw new Error(`Functional-repair layout/style missing: ${token}`);
}
if (css.includes('.graphic-footer')) throw new Error('Obsolete graphic footer CSS remains in the active stylesheet.');

const packageJson = JSON.parse(await read('package.json'));
if (
  !packageJson.scripts?.validate?.includes('validate:release-version')
  || packageJson.scripts?.['validate:release-version'] !== 'node tools/validate-release-version.mjs'
) {
  throw new Error('Functional repair validation requires the shared release-version consistency validator.');
}
if (!packageJson.scripts?.validate?.includes('validate:functional-repair')) {
  throw new Error('Functional repair validation is not part of the release validation pipeline.');
}

console.log('Functional repair validation passed: independent basemap lifecycle, current Census adapters, editable scene text/styles, full-stage graphics, clean exports, schema 8, and shared release-version validation verified.');
