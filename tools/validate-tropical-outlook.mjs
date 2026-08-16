import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');

for (const relative of [
  'src/tropical/TropicalOutlookController.ts',
  'src/tropical/TropicalOutlookControls.tsx',
  'src/tropical/tropical-outlook-provider.ts',
  'src/tropical/tropical-outlook-renderer.ts',
  'src/tropical/tropical-outlook-runtime-store.ts',
  'src/tropical/tropical-outlook-types.ts',
  'src/styles/tropical-outlook.css',
]) {
  await access(new URL(relative, root), constants.R_OK);
}

const rust = await read('src-tauri/src/weather_engine/providers/tropical.rs');
for (const token of [
  'const OUTLOOK_TWO_DAY_LOCATION_LAYER: u8 = 1',
  'const OUTLOOK_SEVEN_DAY_LOCATION_LAYER: u8 = 2',
  'const OUTLOOK_SEVEN_DAY_REGION_LAYER: u8 = 3',
  'const OUTLOOK_SEVEN_DAY_MOTION_LAYER: u8 = 33',
  'pub async fn tropical_outlook_catalog',
  'NHC_tropical_weather_summary',
  'f", "geojson"',
]) {
  if (!rust.includes(token)) throw new Error(`Native NHC outlook contract missing: ${token}`);
}

const commands = await read('src/engine/tauri-commands.ts');
const lib = await read('src-tauri/src/lib.rs');
if (!commands.includes('fetchTropicalOutlookCatalog')) throw new Error('Typed NHC outlook Tauri command missing.');
if (!lib.includes('fetch_tropical_outlook_catalog')) throw new Error('Native NHC outlook command is not registered.');

const types = await read('src/tropical/tropical-outlook-types.ts');
for (const token of ["'nhc-outlook-2day'", "'nhc-outlook-7day'", "scene.moduleState['tropical-outlook']"]) {
  if (!types.includes(token)) throw new Error(`Tropical outlook state contract missing: ${token}`);
}

const provider = await read('src/tropical/tropical-outlook-provider.ts');
for (const token of ['ngwxProbability', 'prob2day', 'prob7day', 'risk2day', 'risk7day']) {
  if (!provider.includes(token)) throw new Error(`Tropical outlook normalization missing: ${token}`);
}

const controller = await read('src/tropical/TropicalOutlookController.ts');
for (const token of [
  "readonly id = 'tropical-outlook'",
  'requestEpoch',
  'styleGeneration',
  'isRequestCurrent',
  'setRenderPending',
  'fetchTropicalOutlookCatalog',
  'publishTropicalOutlookRuntime',
  "reportProviderStatus('tropical-nhc'",
]) {
  if (!controller.includes(token)) throw new Error(`Tropical outlook controller contract missing: ${token}`);
}
for (const forbidden of ['RadarController', 'SatelliteController', '../radar/', '../satellite/', 'AlertsController']) {
  if (controller.includes(forbidden)) throw new Error(`Tropical outlook crossed an accepted module boundary: ${forbidden}`);
}

const renderer = await read('src/tropical/tropical-outlook-renderer.ts');
for (const token of [
  '#f1c84b',
  '#e69800',
  '#e60000',
  'ngwxProbability',
  'TROPICAL_OUTLOOK_LAYERS.regionFill',
  'TROPICAL_OUTLOOK_LAYERS.motionLine',
  'TROPICAL_OUTLOOK_LAYERS.locationProbability',
]) {
  if (!renderer.includes(token)) throw new Error(`Tropical outlook renderer missing: ${token}`);
}

const layerIds = await read('src/tropical/tropical-layer-ids.ts');
const mapRuntime = await read('src/map/map-runtime.ts');
if (!layerIds.includes('TROPICAL_OUTLOOK_LAYER_IDS')) throw new Error('Tropical outlook layer IDs are not isolated.');
if (!mapRuntime.includes('...TROPICAL_OUTLOOK_LAYER_IDS')) {
  throw new Error('Central layer ordering does not include Tropical Outlook graphics.');
}

const definitions = await read('src/modules/builtin/weather-definitions.tsx');
if (!definitions.includes("id: 'tropical-outlook'")) throw new Error('Tropical Outlook controller is not registry-owned.');
const dialog = await read('src/modules/builtin/panels/TropicalDialogPanel.tsx');
if (!dialog.includes('TropicalOutlookControls')) throw new Error('Tropical dialog does not expose Outlook controls.');

console.log('Tropical outlook validation passed: official NHC layers 1/2/3/33, isolated controller/provider/runtime, NHC risk styling, registry controls, and centralized layer order verified.');
