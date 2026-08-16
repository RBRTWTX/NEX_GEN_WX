import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');

for (const relative of [
  'src/tropical/TropicalController.ts',
  'src/tropical/TropicalControls.tsx',
  'src/tropical/tropical-layer-ids.ts',
  'src/tropical/tropical-renderer.ts',
  'src/modules/builtin/panels/TropicalDialogPanel.tsx',
]) {
  await access(new URL(relative, root), constants.R_OK);
}

const controller = await read('src/tropical/TropicalController.ts');
const renderer = await read('src/tropical/tropical-renderer.ts');
for (const token of [
  "readonly id = 'tropical'",
  'requestEpoch',
  'styleGeneration',
  'isRequestCurrent',
  'setRenderPending',
  'fetchTropicalCatalog',
  'selectTropicalStorm',
  'notifyLayerOrderChanged',
  'renderTropicalSelection',
  'publishTropicalRuntime',
]) {
  if (!controller.includes(token)) throw new Error(`Tropical renderer contract missing: ${token}`);
}
for (const forbidden of ['RadarController', 'SatelliteController', '../radar/', '../satellite/']) {
  if (controller.includes(forbidden)) throw new Error(`Tropical controller crosses an existing module boundary: ${forbidden}`);
}


for (const token of [
  'TROPICAL_LAYER_IDS',
  "'fill-color': '#e1e1e1'",
  "'line-color': '#e60000'",
  "'HWR', '#ff0000'",
  "'HWA', '#ff7f7f'",
  "'TWR', '#004da8'",
  "'TWA', '#ffff00'",
  "'text-font': ['Noto Sans Regular']",
  'state.showTrack',
  'state.showCone',
  'state.showPoints',
  'state.showWarnings',
]) {
  if (!renderer.includes(token)) throw new Error(`Tropical renderer styling contract missing: ${token}`);
}

const definitions = await read('src/modules/builtin/weather-definitions.tsx');
for (const token of [
  "id: 'tropical'",
  "id: 'tropical-nhc'",
  "id: 'tropical', phase: 'data', order: 26",
  'DEFAULT_TROPICAL_SCENE_STATE',
  'normalizeTropicalSceneState',
  "dialog: 'module:tropical'",
]) {
  if (!definitions.includes(token)) throw new Error(`Tropical module registration missing: ${token}`);
}

const panel = await read('src/modules/builtin/panels/TropicalDialogPanel.tsx');
if (!panel.includes('<TropicalControls')) throw new Error('Tropical dialog is not connected to live controls.');

const controls = await read('src/tropical/TropicalControls.tsx');
for (const token of ['Forecast track', 'Forecast cone', 'Forecast points', 'Watches / warnings', 'Refresh now']) {
  if (!controls.includes(token)) throw new Error(`Tropical operator control missing: ${token}`);
}

const runtime = await read('src/map/map-runtime.ts');
const orderStart = runtime.indexOf('const ordered = [');
const orderEnd = runtime.indexOf('];', orderStart);
const order = runtime.slice(orderStart, orderEnd);
const satellite = order.indexOf('...SATELLITE_LAYER_IDS');
const radar = order.indexOf('...RADAR_LAYER_IDS');
const context = order.indexOf('...contextLayers');
const tropical = order.indexOf('...TROPICAL_LAYER_IDS');
const county = order.indexOf('LAYER_IDS.countyCasing');
const city = order.indexOf('LAYER_IDS.cityLabels');
if (!(satellite >= 0 && radar > satellite && context > radar && tropical > context && county > tropical && city > county)) {
  throw new Error('Tropical graphics must render above weather/broadcast roads and below boundaries/city labels without disturbing Satellite/Radar order.');
}

const mapStage = await read('src/map/MapStage.tsx');
if (mapStage.includes('TropicalController') || mapStage.includes('fetchTropicalCatalog')) {
  throw new Error('Tropical implementation leaked into the shared MapStage lifecycle bridge.');
}

console.log('Tropical renderer validation passed: isolated controller/state, official track/cone/points/warnings controls, output-safe pending state, and protected layer order verified.');
