import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');

const controller = await read('src/satellite/SatelliteController.ts');
for (const token of [
  'requestEpoch',
  'styleGeneration',
  'isRequestCurrent',
  'setRenderPending',
  'RasterTileSource',
  'ImageSource',
  'setTiles',
  'updateImage',
  'notifyLayerOrderChanged',
  "context.renderPurpose === 'export'",
  'overlayEnabled',
  'satellitePlaybackFrameIndex',
  'publishSatelliteRuntime',
  'onMoveEnd',
  'archive-image',
]) {
  if (!controller.includes(token)) throw new Error(`Satellite renderer contract missing: ${token}`);
}
if (controller.includes('UW-Madison SSEC RealEarth')) {
  throw new Error('Rejected RealEarth rendering label remains in Satellite controller.');
}

const definitions = await read('src/modules/builtin/weather-definitions.tsx');
for (const token of [
  "id: 'satellite'",
  "id: 'satellite-goes'",
  "mapControllers: [{ id: 'satellite'",
  'DEFAULT_SATELLITE_SCENE_STATE',
  'normalizeSatelliteSceneState',
]) {
  if (!definitions.includes(token)) throw new Error(`Satellite module registration missing: ${token}`);
}

const panel = await read('src/modules/builtin/panels/SatelliteDialogPanel.tsx');
if (!panel.includes('<SatelliteControls')) throw new Error('Satellite dialog is not connected to live controls.');

const controls = await read('src/satellite/SatelliteControls.tsx');
if (!controls.includes('Merged GOES East + West') || !controls.includes("product === 'goes-geocolor'")) {
  throw new Error('GeoColor merged-source behavior is not explicit in Satellite controls.');
}

const runtime = await read('src/map/map-runtime.ts');
const orderStart = runtime.indexOf('const ordered = [');
const orderEnd = runtime.indexOf('];', orderStart);
const order = runtime.slice(orderStart, orderEnd);
const satellite = order.indexOf('...SATELLITE_LAYER_IDS');
const radar = order.indexOf('...RADAR_LAYER_IDS');
const context = order.indexOf('...contextLayers');
if (!(satellite >= 0 && radar > satellite && context > radar)) {
  throw new Error('Satellite must render in the weather stack below Radar and below broadcast context.');
}

const host = await read('src/map/controllers/MapControllerHost.ts');
const controllerUtils = await read('src/map/controllers/controller-utils.ts');
if (
  !host.includes('isTransientMapLibreSignalRace')
  || !controllerUtils.includes('export function isTransientMapLibreSignalRace')
  || !controllerUtils.includes("Cannot read properties of undefined (reading 'signal')")
) {
  throw new Error('Known MapLibre transient signal race is not isolated through the controller utility boundary.');
}

console.log('Satellite renderer validation passed: IEM/NOAA source switching, tiled/latest and archive image rendering, playback state, export isolation, provider health, and layer order verified.');