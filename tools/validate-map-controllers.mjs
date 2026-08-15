import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');

const controllerFiles = [
  'src/map/controllers/controller-types.ts',
  'src/map/controllers/controller-utils.ts',
  'src/map/controllers/index.ts',
  'src/map/controllers/MapLifecycleController.ts',
  'src/map/controllers/MapControllerHost.ts',
  'src/map/controllers/BasemapController.ts',
  'src/map/controllers/LayerStyleController.ts',
  'src/map/controllers/BoundaryController.ts',
  'src/map/controllers/CitiesController.ts',
  'src/map/controllers/RoadsController.ts',
  'src/radar/RadarController.ts',
  'src/map/controllers/AlertsController.ts',
  'src/map/controllers/ObservationsController.ts',
  'src/map/controllers/CameraController.ts',
  'src/map/controllers/InteractionController.ts',
  'src/map/controllers/LayerOrderController.ts',
  'src/map/controllers/ResizeController.ts',
];
for (const relative of controllerFiles) await access(new URL(relative, root), constants.R_OK);

const mapStage = await read('src/map/MapStage.tsx');
const mapStageLines = mapStage.split(/\r?\n/).length;
if (mapStageLines > 140) {
  throw new Error(`MapStage.tsx is ${mapStageLines} lines; it must remain a thin controller composition component.`);
}
for (const forbidden of [
  'fetchStateBoundaries',
  'fetchCountyBoundaries',
  'fetchPlaces',
  'fetchSurfaceObservations',
  'new Map(',
  "map.on('style.load'",
  'queryRenderedFeatures',
  'loadEpochRef',
  'refreshDynamicMapData',
]) {
  if (mapStage.includes(forbidden)) throw new Error(`MapStage owns controller behavior again: ${forbidden}`);
}
for (const required of [
  'new MapControllerHost',
  'host.mount(container)',
  'host.destroy()',
  'updateScene(scene)',
  'updateAlerts(alerts.data)',
  'updateSelectedAlert(selectedAlertId)',
  'updateSelectedObservation(selectedObservation)',
  'refreshObservations(observationRefresh.force)',
]) {
  if (!mapStage.includes(required)) throw new Error(`MapStage composition behavior missing: ${required}`);
}

const lifecycle = await read('src/map/controllers/MapLifecycleController.ts');
for (const required of [
  'new Map({',
  "map.on('style.load'",
  "map.on('moveend'",
  "map.on('click'",
  "map.on('error'",
  'preserveDrawingBuffer: true',
  'attributionControl: { compact: true }',
  'map?.remove()',
]) {
  if (!lifecycle.includes(required)) throw new Error(`Map lifecycle behavior missing: ${required}`);
}

const host = await read('src/map/controllers/MapControllerHost.ts');
const styleReadyBlock = host.match(/isStyleReady\(\): boolean \{([\s\S]*?)\n  \}/)?.[1] ?? '';
if (styleReadyBlock.includes('isStyleLoaded()')) {
  throw new Error('Map controller readiness must not depend on transient MapLibre source loading.');
}
for (const required of [
  'moduleRegistry.createMapControllers()',
  'styleGeneration', 'reloadStyle', 'notifyLayerOrderChanged', 'updateCallbacks',
  'this.lifecycle.map.resize();', 'controller.onMapError',
]) {
  if (!host.includes(required)) throw new Error(`Map controller host contract missing: ${required}`);
}
for (const forbidden of [
  'new BasemapController', 'new BoundaryController', 'new CitiesController',
  'new AlertsController', 'new CameraController', 'new LayerOrderController',
]) {
  if (host.includes(forbidden)) throw new Error(`Map controller host bypasses registry composition: ${forbidden}`);
}
const registryDefinitions = [
  await read('src/modules/builtin/core-definitions.tsx'),
  await read('src/modules/builtin/map-definitions.tsx'),
  await read('src/modules/builtin/weather-definitions.tsx'),
].join('\n');
for (const controller of [
  'basemap', 'layer-style', 'roads', 'boundaries', 'cities', 'radar', 'alerts', 'observations',
  'camera', 'interaction', 'layer-order', 'resize',
]) {
  if (!registryDefinitions.includes(`id: '${controller}'`)) {
    throw new Error(`Module registry does not contribute map controller ${controller}.`);
  }
}
if (!registryDefinitions.includes("requireController<ObservationsController>('observations')")) {
  throw new Error('Interaction controller must receive the registered observation controller rather than create a duplicate.');
}

const boundary = await read('src/map/controllers/BoundaryController.ts');
const cities = await read('src/map/controllers/CitiesController.ts');
const roads = await read('src/map/controllers/RoadsController.ts');
const radar = await read('src/radar/RadarController.ts');
const observations = await read('src/map/controllers/ObservationsController.ts');
for (const [name, source] of [
  ['boundaries', boundary],
  ['cities', cities],
  ['roads', roads],
  ['radar', radar],
  ['observations', observations],
]) {
  if (!source.includes('requestEpoch') && !source.includes('stateEpoch')) {
    throw new Error(`${name} controller lacks an independent request epoch.`);
  }
  for (const token of ['styleGeneration', 'isRequestCurrent', 'reportProviderFailure']) {
    if (!source.includes(token)) throw new Error(`${name} controller lacks stale-request isolation: ${token}`);
  }
}
if (!boundary.includes('fetchStateBoundaries') || !boundary.includes('fetchCountyBoundaries')) {
  throw new Error('Boundary provider ownership is incomplete.');
}
if (!cities.includes('fetchPlaces')) throw new Error('Cities provider ownership is incomplete.');
if (!roads.includes('fetchRoads')) throw new Error('Road provider ownership is incomplete.');
if (!observations.includes('fetchSurfaceObservations')) throw new Error('Observation provider ownership is incomplete.');
if (!observations.includes('TRANSPARENT_FIELD_IMAGE') || !observations.includes('clearData(context)')) {
  throw new Error('Observation controller must clear stale analyzed fields when product/view keys change.');
}

const alerts = await read('src/map/controllers/AlertsController.ts');
for (const required of ['syncAlerts', 'syncSelection', 'syncLeader', 'lastAutoZoomKey']) {
  if (!alerts.includes(required)) throw new Error(`Alert controller behavior missing: ${required}`);
}
const interaction = await read('src/map/controllers/InteractionController.ts');
for (const required of ['sampleDots', 'observationDots', 'alertFill', 'handleFieldSample']) {
  if (!interaction.includes(required)) throw new Error(`Interaction routing missing: ${required}`);
}
const ordering = await read('src/map/controllers/LayerOrderController.ts');
if (!ordering.includes('enforceStudioLayerOrder')) throw new Error('Permanent map layer ordering is not controller-owned.');

console.log(`Map controller validation passed: thin ${mapStageLines}-line MapStage, isolated provider controllers, lifecycle ownership, click routing, resize, camera, and layer-order contracts verified.`);
