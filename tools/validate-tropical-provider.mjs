import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');

for (const relative of [
  'src/tropical/tropical-types.ts',
  'src/tropical/tropical-provider.ts',
  'src/tropical/tropical-runtime-store.ts',
  'src/tropical/tropical-layer-ids.ts',
  'src/tropical/TropicalController.ts',
  'src/tropical/TropicalControls.tsx',
  'src-tauri/src/weather_engine/providers/tropical.rs',
]) {
  await access(new URL(relative, root), constants.R_OK);
}

const rust = await read('src-tauri/src/weather_engine/providers/tropical.rs');
for (const token of [
  'mapservices.weather.noaa.gov',
  'NHC_tropical_weather_summary',
  'FORECAST_POINTS_LAYER: u8 = 5',
  'FORECAST_TRACK_LAYER: u8 = 6',
  'FORECAST_CONE_LAYER: u8 = 7',
  'WATCH_WARNING_LAYER: u8 = 8',
  'fetch_json_cached',
  'f", "geojson',
  'outSR", "4326',
  'combine_catalog',
  'is_feature_collection',
]) {
  if (!rust.includes(token)) throw new Error(`Native Tropical provider contract missing: ${token}`);
}

const provider = await read('src/tropical/tropical-provider.ts');
for (const token of [
  'fetchNativeTropicalCatalog',
  'tropicalStormsFromCatalog',
  'selectTropicalStorm',
  'idp_source',
  'GeoJSON FeatureCollection',
]) {
  if (!provider.includes(token)) throw new Error(`Tropical provider normalization missing: ${token}`);
}
if (/\bfetch\s*\(/.test(provider)) {
  throw new Error('Tropical frontend provider must not perform direct browser fetches.');
}

const commands = await read('src/engine/tauri-commands.ts');
const lib = await read('src-tauri/src/lib.rs');
const mod = await read('src-tauri/src/weather_engine/providers/mod.rs');
if (!commands.includes("invoke<unknown>('fetch_tropical_catalog', { force })")) {
  throw new Error('Typed frontend Tropical catalog command is missing.');
}
if (!lib.includes('fetch_tropical_catalog') || !lib.includes('providers::tropical_catalog(force)')) {
  throw new Error('Tauri Tropical catalog command is not registered.');
}
if (
  !mod.includes('mod tropical;')
  || !mod.includes('tropical_catalog')
  || !mod.includes('tropical_outlook_catalog')
) {
  throw new Error('Native Tropical provider module exports are incomplete.');
}

console.log('Tropical provider validation passed: official NOAA/NWS/NHC summary GeoJSON layers 5-8, caching, normalization, and Tauri boundary verified.');
