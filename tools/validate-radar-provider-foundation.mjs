import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');
const required = [
  'src-tauri/src/weather_engine/providers/radar.rs',
  'src/radar/radar-types.ts',
  'src/radar/radar-provider.ts',
  'tools/test-radar-provider.cjs',
];
await Promise.all(required.map((relative) => access(new URL(relative, root), constants.R_OK)));

const rust = await read('src-tauri/src/weather_engine/providers/radar.rs');
for (const token of [
  'radar_base_reflectivity_time/ImageServer',
  'mesonet.agron.iastate.edu/json/radar.py',
  'operation", "available',
  'operation", "list',
  '"N0B", "N0U", "N0S", "NET"',
  'assemble_mrms_catalog',
  'normalize_site',
  'validate_utc_minute',
]) {
  if (!rust.includes(token)) throw new Error(`Radar native provider contract missing: ${token}`);
}

const provider = await read('src/radar/radar-provider.ts');
for (const token of [
  'fetchRadarMrmsCatalog',
  'fetchRadarSites',
  'invokeRadarSiteCatalog',
  'radar_base_reflectivity_time/ImageServer/exportImage',
  'ridge::',
  "timestamp: '0'",
]) {
  if (!provider.includes(token)) throw new Error(`Radar frontend provider contract missing: ${token}`);
}
if (provider.includes("from '@tauri-apps/api/core'")) {
  throw new Error('Radar provider bypasses the typed shared Tauri command boundary.');
}

const commands = await read('src/engine/tauri-commands.ts');
for (const token of [
  'fetchRadarMrmsCatalog',
  'fetchRadarSites',
  'fetchRadarSiteCatalog',
  'fetch_radar_mrms_catalog',
  'fetch_radar_sites',
  'fetch_radar_site_catalog',
  'validateRadarSite',
  'validateRadarProductCode',
  'validateUtcMinute',
]) {
  if (!commands.includes(token)) throw new Error(`Radar Tauri command contract missing: ${token}`);
}

const definitions = await read('src/modules/builtin/weather-definitions.tsx');
for (const token of [
  "id: 'radar-mrms'",
  "id: 'radar-sites'",
  'DEFAULT_RADAR_SCENE_STATE',
  'normalizeRadarSceneState',
]) {
  if (!definitions.includes(token)) throw new Error(`Radar module provider/state registration missing: ${token}`);
}

const packageJson = JSON.parse(await read('package.json'));
const client = await read('src-tauri/src/weather_engine/provider_client.rs');
const expectedUserAgent = `NEX-GEN-WX/${packageJson.version}`;
if (!client.includes(expectedUserAgent)) {
  throw new Error(`Native HTTP User-Agent is not identified as ${expectedUserAgent}.`);
}

console.log('Radar provider foundation validation passed: native MRMS/IEM contracts, typed commands, normalized scene state, latest-frame paths, and provider registration verified.');
