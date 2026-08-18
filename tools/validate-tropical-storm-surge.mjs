import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');

for (const relative of [
  'src-tauri/src/weather_engine/providers/tropical.rs',
  'src-tauri/src/lib.rs',
  'src/engine/tauri-commands.ts',
  'src/tropical/tropical-storm-surge-types.ts',
  'src/tropical/tropical-storm-surge-provider.ts',
  'src/tropical/tropical-storm-surge-renderer.ts',
  'src/tropical/TropicalStormSurgeController.ts',
  'src/tropical/TropicalStormSurgeControls.tsx',
  'src/tropical/tropical-storm-surge-runtime-store.ts',
  'src/tropical/tropical-storm-surge-layer-ids.ts',
  'src/modules/builtin/weather-definitions.tsx',
  'src/map/map-runtime.ts',
]) {
  await access(new URL(relative, root), constants.R_OK);
}

const rust = await read('src-tauri/src/weather_engine/providers/tropical.rs');
const lib = await read('src-tauri/src/lib.rs');
const commands = await read('src/engine/tauri-commands.ts');
const types = await read('src/tropical/tropical-storm-surge-types.ts');
const provider = await read('src/tropical/tropical-storm-surge-provider.ts');
const renderer = await read('src/tropical/tropical-storm-surge-renderer.ts');
const controller = await read('src/tropical/TropicalStormSurgeController.ts');
const definitions = await read('src/modules/builtin/weather-definitions.tsx');
const runtime = await read('src/map/map-runtime.ts');

for (const token of [
  'const INUNDATION_FOOTPRINT_LAYER: u8 = 23;',
  'const INUNDATION_IMAGE_LAYER: u8 = 24;',
  'const PEAK_SURGE_POINTS_LAYER: u8 = 0;',
  'const PEAK_SURGE_LINES_LAYER: u8 = 1;',
  'const PEAK_SURGE_POLYGONS_LAYER: u8 = 2;',
  'NHC_PeakStormSurge',
  'pub async fn tropical_storm_surge_catalog',
]) {
  if (!rust.includes(token)) throw new Error(`Storm-surge native provider missing: ${token}`);
}
for (const token of [
  'fetch_tropical_storm_surge_catalog',
  'tropical_storm_surge_catalog(&product, force)',
]) {
  if (!lib.includes(token)) throw new Error(`Storm-surge Tauri command missing: ${token}`);
}
if (!commands.includes("product: 'potential' | 'peak'")) {
  throw new Error('Typed storm-surge Tauri boundary is missing.');
}
for (const product of ['nhc-surge-inundation', 'nhc-peak-storm-surge']) {
  if (!types.includes(`'${product}'`)) throw new Error(`Storm-surge scene mapping missing ${product}.`);
}
for (const token of [
  'ngwxSurgeClass',
  'ngwxSurgeLabel',
  'peakPayload',
  'peakLabel',
  'peak_surge_range',
  "return 'purple'",
  "return 'red'",
  "return 'orange'",
  "return 'yellow'",
  "return 'blue'",
]) {
  if (!provider.includes(token)) throw new Error(`Storm-surge normalization missing: ${token}`);
}
for (const token of [
  '{bbox-epsg-3857}',
  'NHC_tropical_weather_summary/MapServer/export',
  '&layers=show%3A24',
  "greaterThan1Ft: '#005ce6'",
  "greaterThan3Ft: '#ffff00'",
  "greaterThan6Ft: '#ffaa00'",
  "greaterThan9Ft: '#ff0000'",
  "purple: '#c500ff'",
]) {
  if (!renderer.includes(token)) throw new Error(`Storm-surge renderer contract missing: ${token}`);
}
for (const token of [
  "readonly id = 'tropical-storm-surge'",
  'tropicalStormSurgeProductForScene',
  'requestEpoch',
  'context.notifyLayerOrderChanged()',
]) {
  if (!controller.includes(token)) throw new Error(`Storm-surge controller contract missing: ${token}`);
}
if (!definitions.includes("{ id: 'tropical-storm-surge', phase: 'data', order: 29")) {
  throw new Error('Storm-surge controller is not registered at data order 29.');
}
if (!runtime.includes('...TROPICAL_STORM_SURGE_LAYER_IDS')) {
  throw new Error('Storm-surge layers are missing from centralized layer order.');
}

console.log('Tropical storm-surge validation passed: official NHC potential footprint/raster layers 23/24, separate Peak Storm Surge point/line/polygon service, structured peak-range label normalization, typed provider boundary, exact category colors, isolated runtime/controller, and centralized layer order verified.');
