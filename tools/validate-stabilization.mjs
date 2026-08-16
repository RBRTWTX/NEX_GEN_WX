import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');

const requiredComponents = [
  'OperatorTopBar:src/components/TopBar.tsx',
  'SceneLibrary:src/components/SceneLibrary.tsx',
  'SceneThumbnail:src/components/SceneLibrary.tsx',
  'LayerStack:src/components/LayerStack.tsx',
  'BroadcastCanvas:src/components/SceneStage.tsx',
  'BroadcastHeader:src/components/BroadcastHeader.tsx',
  'Legend:src/components/BroadcastHeader.tsx',
  'BottomToolDock:src/components/BottomDock.tsx',
  'FloatingDialog:src/components/FloatingWindow.tsx',
  'SettingsDialog:src/components/SettingsDialog.tsx',
  'GraphicBuilder:src/components/GraphicSceneBuilder.tsx',
  'ShowBuilder:src/components/ShowBuilderDialog.tsx',
  'PresentationController:src/state/studio-reducer.ts',
];
for (const entry of requiredComponents) {
  const [, relative] = entry.split(':');
  await access(new URL(relative, root), constants.R_OK);
}

const state = await read('src/state/studio-state.ts');
for (const slice of ['ProjectState', 'PresentationState', 'OperatorUiState', 'OperatorStatusState']) {
  if (!state.includes(`interface ${slice}`) && !state.includes(`export interface ${slice}`)) {
    throw new Error(`State boundary missing: ${slice}`);
  }
}

const weatherContext = await read('src/data/weather-data-context.tsx');
for (const token of ['ProviderHealth', 'reportProviderStatus', 'providerIssues', 'overallState']) {
  if (!weatherContext.includes(token)) throw new Error(`Provider/cache state boundary is missing ${token}.`);
}

const mapStage = await read('src/map/MapStage.tsx');
for (const token of [
  'new MapControllerHost',
  'host.mount(container)',
  'host.destroy()',
  'className="map-stage"',
]) {
  if (!mapStage.includes(token)) throw new Error(`MapStage composition behavior missing: ${token}`);
}
if (mapStage.includes('map-provider-error') || mapStage.includes('providerIssues.map')) {
  throw new Error('Raw provider errors must not render inside the broadcast canvas.');
}
for (const forbidden of [
  'fetchStateBoundaries', 'fetchCountyBoundaries', 'fetchPlaces', 'fetchSurfaceObservations',
  'new Map(', "map.on('error'", 'Promise.allSettled(tasks)',
]) {
  if (mapStage.includes(forbidden)) throw new Error(`MapStage mixed responsibility remains: ${forbidden}`);
}

const controllerHost = await read('src/map/controllers/MapControllerHost.ts');
const lifecycle = await read('src/map/controllers/MapLifecycleController.ts');
for (const token of [
  'moduleRegistry.createMapControllers()', 'styleGeneration', 'reloadStyle',
]) {
  if (!controllerHost.includes(token)) throw new Error(`Map controller host behavior missing: ${token}`);
}
for (const forbidden of ['new BoundaryController', 'new CitiesController', 'new AlertsController', 'new CameraController']) {
  if (controllerHost.includes(forbidden)) throw new Error(`Map controller host bypasses the module registry: ${forbidden}`);
}
for (const token of [
  'new Map({', "map.on('style.load'", "map.on('error'",
  'preserveDrawingBuffer: true', 'attributionControl: options.interactive ? { compact: true } : false',
]) {
  if (!lifecycle.includes(token)) throw new Error(`Independent map lifecycle behavior missing: ${token}`);
}
for (const [relative, tokens] of [
  ['src/map/controllers/BoundaryController.ts', ["reportProviderStatus('states', 'loading'", "reportProviderStatus('counties', 'loading'", 'fetchStateBoundaries', 'fetchCountyBoundaries']],
  ['src/map/controllers/CitiesController.ts', ["reportProviderStatus('cities', 'loading'", 'fetchPlaces']],
  ['src/map/controllers/ObservationsController.ts', ["reportProviderStatus('observations', 'loading'", 'fetchSurfaceObservations']],
]) {
  const source = await read(relative);
  for (const token of tokens) if (!source.includes(token)) throw new Error(`${relative} missing independent provider behavior: ${token}`);
  if (!source.includes('isRequestCurrent') || !source.includes('styleGeneration')) {
    throw new Error(`${relative} lacks stale-response isolation.`);
  }
}

const runtime = await read('src/map/map-runtime.ts');
for (const id of ['stateLines', 'countyLines', 'observationField', 'alertFill', 'cityLabels']) {
  if (!runtime.includes(`LAYER_IDS.${id}`)) throw new Error(`Map runtime layer missing: ${id}`);
}
const layerOrder = runtime.match(
  /export function enforceStudioLayerOrder\(map: MapLibreMap\): void \{[\s\S]*?const ordered = \[([\s\S]*?)\];/,
)?.[1] ?? '';
if (!layerOrder) throw new Error('Unable to inspect the studio layer-order contract.');

const baseRoadPosition = layerOrder.indexOf('LAYER_IDS.roadMajor');
const weatherPosition = layerOrder.indexOf('LAYER_IDS.observationField');
const satellitePosition = layerOrder.indexOf('...SATELLITE_LAYER_IDS');
const radarPosition = layerOrder.indexOf('...RADAR_LAYER_IDS');
const contextPosition = layerOrder.indexOf('...contextLayers');
const tropicalPosition = layerOrder.indexOf('...TROPICAL_LAYER_IDS');
const countyPosition = layerOrder.indexOf('LAYER_IDS.countyLines');
const statePosition = layerOrder.indexOf('LAYER_IDS.stateLines');
const alertPosition = layerOrder.indexOf('LAYER_IDS.alertFill');
const cityPosition = layerOrder.indexOf('LAYER_IDS.cityLabels');

if (!(
  baseRoadPosition >= 0
  && weatherPosition > baseRoadPosition
  && satellitePosition > weatherPosition
  && radarPosition > satellitePosition
  && contextPosition > radarPosition
  && tropicalPosition > contextPosition
  && countyPosition > tropicalPosition
  && statePosition > countyPosition
  && alertPosition > statePosition
  && cityPosition > alertPosition
)) {
  throw new Error(
    'Runtime layer order must keep base roads below weather, Satellite/Radar stable, broadcast roads below Tropical graphics, boundaries above Tropical, alerts above boundaries, and cities above alerts.',
  );
}

const providerClient = await read('src-tauri/src/weather_engine/provider_client.rs');
for (const token of [
  'connect_timeout', '.timeout(', 'MAX_ATTEMPTS', 'RETRY_AFTER', 'TOO_MANY_REQUESTS',
  'read_cached_json_allow_expired', 'cacheWarning', 'clean_status_error',
]) {
  if (!providerClient.includes(token)) throw new Error(`Provider adapter reliability behavior missing: ${token}`);
}

const census = await read('src-tauri/src/weather_engine/providers/census.rs');
for (const token of [
  'const STATE_LAYER: u8 = 6',
  'const COUNTY_LAYER: u8 = 7',
  'const INCORPORATED_PLACE_LAYER: u8 = 26',
  'const CENSUS_DESIGNATED_PLACE_LAYER: u8 = 28',
  'GEOID,NAME,BASENAME,LSADC,STATE,INTPTLAT,INTPTLON,POP100,AREALAND',
  'bbox.validate()?',
]) {
  if (!census.includes(token)) throw new Error(`Current Census adapter requirement missing: ${token}`);
}
if (census.includes('STUSAB')) {
  throw new Error('Current Census adapters must not request obsolete STUSAB fields.');
}
if (!census.includes('population(right)') || !census.includes('POP100 DESC')) {
  throw new Error('Current Census place labels must remain population ranked.');
}

const css = `${await read('src/styles/r3-base.css')}\n${await read('src/styles/nex-gen-wx.css')}`;
for (const token of [
  '.map-stage {', 'overflow: hidden', '.bottom-dock', '.left-panel', '.scene-grid',
  '.current-stack-section', '.broadcast-header', '.floating-window', '.map-corner-controls',
]) {
  if (!css.includes(token)) throw new Error(`R3 layout stabilization style missing: ${token}`);
}
if (!css.includes('max-width: 100vw') || !css.includes('text-overflow: ellipsis')) {
  throw new Error('Dock/header overflow guards are incomplete.');
}

const outputApp = await read('src/output/OutputApp.tsx');
const studioApp = await read('src/app/StudioApp.tsx');
const transitionViewport = await read('src/rendering/SceneTransitionViewport.tsx');
if (!outputApp.includes('<SceneTransitionViewport') || !studioApp.includes('<SceneTransitionViewport') || !transitionViewport.includes('<SceneStage')) {
  throw new Error('Editor and clean output must share SceneTransitionViewport and SceneStage.');
}
const exporter = await read('src/output/export-scene.ts');
if (!exporter.includes("node.dataset.operatorOnly === 'true'")) {
  throw new Error('PNG export must filter operator-only diagnostics.');
}

const domain = await read('src/types/domain.ts');
const migration = await read('src/core/project-migration.ts');
const defaults = await read('src/scenes/default-project.ts');
for (const [name, content] of [['domain', domain], ['migration', migration], ['defaults', defaults]]) {
  if (!content.includes('schemaVersion: 8')) throw new Error(`${name} is not synchronized to project schema 8.`);
}

console.log('Stabilization validation passed: provider isolation, map lifecycle, state boundaries, R3 geometry, layer order, shared output renderer, and operator-only error filtering verified.');
