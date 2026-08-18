import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');

for (const relative of [
  'src-tauri/src/weather_engine/providers/tropical.rs',
  'src-tauri/src/lib.rs',
  'src/engine/tauri-commands.ts',
  'src/tropical/tropical-arrival-time-types.ts',
  'src/tropical/tropical-arrival-time-provider.ts',
  'src/tropical/tropical-arrival-time-renderer.ts',
  'src/tropical/TropicalArrivalTimeController.ts',
  'src/tropical/TropicalArrivalTimeControls.tsx',
  'src/tropical/tropical-arrival-time-runtime-store.ts',
  'src/tropical/tropical-arrival-time-layer-ids.ts',
  'src/modules/builtin/weather-definitions.tsx',
  'src/map/map-runtime.ts',
]) {
  await access(new URL(relative, root), constants.R_OK);
}

const rust = await read('src-tauri/src/weather_engine/providers/tropical.rs');
const lib = await read('src-tauri/src/lib.rs');
const commands = await read('src/engine/tauri-commands.ts');
const types = await read('src/tropical/tropical-arrival-time-types.ts');
const provider = await read('src/tropical/tropical-arrival-time-provider.ts');
const renderer = await read('src/tropical/tropical-arrival-time-renderer.ts');
const controller = await read('src/tropical/TropicalArrivalTimeController.ts');
const definitions = await read('src/modules/builtin/weather-definitions.tsx');
const runtime = await read('src/map/map-runtime.ts');

for (const token of [
  'const ARRIVAL_EARLIEST_LAYER: u8 = 18;',
  'const ARRIVAL_MOST_LIKELY_LAYER: u8 = 19;',
  'pub async fn tropical_arrival_time_catalog',
  '"earliest"',
  '"most-likely"',
]) {
  if (!rust.includes(token)) throw new Error(`Arrival-time native provider missing: ${token}`);
}
for (const token of [
  'fetch_tropical_arrival_time_catalog',
  'tropical_arrival_time_catalog(&mode, force)',
]) {
  if (!lib.includes(token)) throw new Error(`Arrival-time Tauri command missing: ${token}`);
}
if (!commands.includes("mode: 'earliest' | 'most-likely'")) {
  throw new Error('Typed arrival-time Tauri boundary is missing.');
}
for (const product of ['nhc-arrival-earliest', 'nhc-arrival-most-likely']) {
  if (!types.includes(`'${product}'`)) throw new Error(`Arrival-time scene mapping missing ${product}.`);
}
for (const token of [
  'ngwxArrivalLabel',
  'ngwxArrivalTime',
  'ngwxWallet',
  'fetchTropicalWindProbabilityCatalog(34, force)',
]) {
  if (!provider.includes(token)) throw new Error(`Arrival-time normalization missing: ${token}`);
}
for (const color of [
  '#267300', '#38a800', '#55ff00', '#e6e600', '#ffd37f',
  '#e69800', '#ffaa00', '#e60000', '#a83800', '#a900e6',
]) {
  if (!renderer.includes(`'${color}'`)) {
    throw new Error(`Arrival 34-kt probability background is missing NHC color ${color}.`);
  }
}
for (const token of [
  "'line-color': '#000000'",
  "'line-color': '#ffffff'",
  "'symbol-placement': 'line'",
  "['get', 'ngwxArrivalLabel']",
]) {
  if (!renderer.includes(token)) throw new Error(`Arrival contour rendering missing: ${token}`);
}
for (const token of [
  "readonly id = 'tropical-arrival-time'",
  'tropicalArrivalTimeModeForScene',
  'requestEpoch',
  'context.notifyLayerOrderChanged()',
]) {
  if (!controller.includes(token)) throw new Error(`Arrival controller contract missing: ${token}`);
}
if (!definitions.includes("{ id: 'tropical-arrival-time', phase: 'data', order: 29.5")) {
  throw new Error('Arrival-time controller is not registered at data order 29.5.');
}
if (!runtime.includes('...TROPICAL_ARRIVAL_TIME_LAYER_IDS')) {
  throw new Error('Arrival-time layers are missing from centralized layer order.');
}

console.log('Tropical arrival-time validation passed: official NHC layers 18/19, typed provider boundary, labeled contours, optional exact 34-kt probability background, isolated runtime/controller, and centralized layer order verified.');
