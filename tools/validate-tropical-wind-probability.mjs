import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');

for (const relative of [
  'src/tropical/TropicalWindProbabilityController.ts',
  'src/tropical/TropicalWindProbabilityControls.tsx',
  'src/tropical/tropical-wind-probability-provider.ts',
  'src/tropical/tropical-wind-probability-renderer.ts',
  'src/tropical/tropical-wind-probability-runtime-store.ts',
  'src/tropical/tropical-wind-probability-types.ts',
  'src/tropical/tropical-wind-probability-layer-ids.ts',
  'src/styles/tropical-wind-probability.css',
]) {
  await access(new URL(relative, root), constants.R_OK);
}

const rust = await read('src-tauri/src/weather_engine/providers/tropical.rs');
for (const token of [
  'WIND_PROBABILITY_34_LAYER: u8 = 30',
  'WIND_PROBABILITY_50_LAYER: u8 = 31',
  'WIND_PROBABILITY_64_LAYER: u8 = 32',
  'pub async fn tropical_wind_probability_catalog',
  'wind_probability_layer',
  'NHC_tropical_weather_summary',
  'f", "geojson"',
]) {
  if (!rust.includes(token)) throw new Error(`Native NHC wind-probability contract missing: ${token}`);
}

const commands = await read('src/engine/tauri-commands.ts');
const lib = await read('src-tauri/src/lib.rs');
const mod = await read('src-tauri/src/weather_engine/providers/mod.rs');
if (!commands.includes('fetchTropicalWindProbabilityCatalog')) {
  throw new Error('Typed NHC wind-probability Tauri command is missing.');
}
if (!lib.includes('fetch_tropical_wind_probability_catalog')) {
  throw new Error('Native NHC wind-probability command is not registered.');
}
if (!mod.includes('tropical_wind_probability_catalog')) {
  throw new Error('Native NHC wind-probability provider export is missing.');
}

const types = await read('src/tropical/tropical-wind-probability-types.ts');
for (const token of [
  "'nhc-wind-prob-34kt'",
  "'nhc-wind-prob-50kt'",
  "'nhc-wind-prob-64kt'",
  "scene.moduleState['tropical-wind-probability']",
]) {
  if (!types.includes(token)) throw new Error(`Wind-probability state contract missing: ${token}`);
}

const provider = await read('src/tropical/tropical-wind-probability-provider.ts');
for (const token of [
  'percentage',
  'ngwxProbabilityRange',
  'ngwxProbabilityMin',
  'ngwxProbabilityMax',
  'ngwxWallet',
  'windProbabilityStormWallets',
]) {
  if (!provider.includes(token)) throw new Error(`Wind-probability normalization missing: ${token}`);
}
if (/\bfetch\s*\(/.test(provider)) {
  throw new Error('Wind-probability frontend provider must not perform direct browser fetches.');
}

const renderer = await read('src/tropical/tropical-wind-probability-renderer.ts');
for (const token of [
  "'5-10%', '#267300'",
  "'10-20%', '#38a800'",
  "'20-30%', '#55ff00'",
  "'30-40%', '#e6e600'",
  "'40-50%', '#ffd37f'",
  "'50-60%', '#e69800'",
  "'60-70%', '#ffaa00'",
  "'70-80%', '#e60000'",
  "'80-90%', '#a83800'",
  "'>90%', '#a900e6'",
  'TROPICAL_WIND_PROBABILITY_LAYERS.fill',
  'state.showLabels',
]) {
  if (!renderer.includes(token)) throw new Error(`Wind-probability renderer missing: ${token}`);
}

const controller = await read('src/tropical/TropicalWindProbabilityController.ts');
for (const token of [
  "readonly id = 'tropical-wind-probability'",
  'requestEpoch',
  'styleGeneration',
  'isRequestCurrent',
  'setRenderPending',
  'fetchTropicalWindProbabilityCatalog',
  'publishTropicalWindProbabilityRuntime',
  "reportProviderStatus(\n      'tropical-nhc'",
]) {
  if (!controller.includes(token)) throw new Error(`Wind-probability controller contract missing: ${token}`);
}
for (const forbidden of [
  'RadarController',
  'SatelliteController',
  'AlertsController',
  'CameraController',
  '../radar/',
  '../satellite/',
]) {
  if (controller.includes(forbidden)) {
    throw new Error(`Wind-probability controller crossed an accepted module boundary: ${forbidden}`);
  }
}

const definitions = await read('src/modules/builtin/weather-definitions.tsx');
if (!definitions.includes("id: 'tropical-wind-probability'")) {
  throw new Error('Wind-probability controller is not registry-owned.');
}
const dialog = await read('src/modules/builtin/panels/TropicalDialogPanel.tsx');
if (!dialog.includes('TropicalWindProbabilityControls')) {
  throw new Error('Tropical dialog does not expose wind-probability controls.');
}

const mapRuntime = await read('src/map/map-runtime.ts');
const orderStart = mapRuntime.indexOf('const ordered = [');
const orderEnd = mapRuntime.indexOf('];', orderStart);
const order = mapRuntime.slice(orderStart, orderEnd);
const radar = order.indexOf('...RADAR_LAYER_IDS');
const track = order.indexOf('...TROPICAL_LAYER_IDS');
const outlook = order.indexOf('...TROPICAL_OUTLOOK_LAYER_IDS');
const wind = order.indexOf('...TROPICAL_WIND_PROBABILITY_LAYER_IDS');
const county = order.indexOf('LAYER_IDS.countyCasing');
if (!(radar >= 0 && track > radar && outlook > track && wind > outlook && county > wind)) {
  throw new Error('Wind probabilities must stay above accepted weather graphics and below boundary/city context.');
}

const registry = await read('reference/legacy-r3/product-registry.json');
for (const product of ['nhc-wind-prob-34kt', 'nhc-wind-prob-50kt', 'nhc-wind-prob-64kt']) {
  if (!registry.includes(`"id": "${product}"`)) {
    throw new Error(`Existing Tropical product registry is missing ${product}.`);
  }
}

const mapStage = await read('src/map/MapStage.tsx');
if (mapStage.includes('TropicalWindProbabilityController') || mapStage.includes('fetchTropicalWindProbabilityCatalog')) {
  throw new Error('Wind-probability implementation leaked into shared MapStage.');
}

console.log('Tropical wind-probability validation passed: official NHC layers 30/31/32, exact NHC probability colors, isolated controller/provider/runtime, existing product IDs, and centralized layer order verified.');
