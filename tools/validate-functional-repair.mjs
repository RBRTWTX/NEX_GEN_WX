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
  "type: 'raster'",
  "type: 'background'",
  'tile.openstreetmap.org/{z}/{x}/{y}.png',
  '© OpenStreetMap contributors',
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
  'const INCORPORATED_PLACE_LAYER: u8 = 4',
  'const CENSUS_DESIGNATED_PLACE_LAYER: u8 = 5',
  'GEOID,NAME,BASENAME,LSADC,STATE,INTPTLAT,INTPTLON,AREALAND',
  'polygon_feature_to_point',
  'arcgis_record_to_point',
  '.append_pair("f", "json")',
  'labelRank',
]) {
  if (!census.includes(token)) throw new Error(`Census functional repair missing: ${token}`);
}
if (census.includes('GEOID,NAME,BASENAME,LSADC,POP100')) {
  throw new Error('Unsupported Census POP100 field remains in the places query.');
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
const tauri = JSON.parse(await read('src-tauri/tauri.conf.json'));
const cargo = await read('src-tauri/Cargo.toml');
if (packageJson.version !== '0.6.5' || tauri.version !== '0.6.5' || !cargo.includes('version = "0.6.5"')) {
  throw new Error('0.6.5 version is not synchronized across npm, Tauri, and Cargo.');
}
if (!packageJson.scripts?.validate?.includes('validate:functional-repair')) {
  throw new Error('Functional repair validation is not part of the release validation pipeline.');
}

console.log('Functional repair validation passed: independent basemap lifecycle, current Census adapters, editable scene text/styles, full-stage graphics, clean exports, schema 8, and synchronized 0.6.5 versions verified.');
