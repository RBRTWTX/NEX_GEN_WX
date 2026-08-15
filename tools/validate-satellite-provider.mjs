import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');

for (const relative of [
  'src/satellite/satellite-types.ts',
  'src/satellite/satellite-provider.ts',
  'src/satellite/satellite-runtime-store.ts',
  'src/satellite/satellite-layer-ids.ts',
  'src/satellite/SatelliteController.ts',
  'src/satellite/SatelliteControls.tsx',
  'src-tauri/src/weather_engine/providers/satellite.rs',
]) {
  await access(new URL(relative, root), constants.R_OK);
}

const provider = await read('src/satellite/satellite-provider.ts');
for (const token of [
  'IEM_CHANNEL',
  "'goes-visible': '02'",
  "'goes-infrared': '13'",
  "'goes-water-vapor': '09'",
  'goes_${source}_conus_ch${channel}',
  'goes_product',
  'radmap.php',
  'archive-image',
  'MERGEDGC_Last_24hr',
  'exportImage',
  'fetchNoaaGeoColorCatalog',
]) {
  if (!provider.includes(token)) throw new Error(`Satellite provider repair contract missing: ${token}`);
}
if (provider.includes('realearth.ssec.wisc.edu')) {
  throw new Error('Rejected RealEarth tiled imagery path must not remain in Satellite provider.');
}

const rust = await read('src-tauri/src/weather_engine/providers/satellite.rs');
for (const token of [
  'satellitemaps.nesdis.noaa.gov',
  'MERGEDGC_Last_24hr',
  'fetch_json_cached',
  'Start_Time,End_Time',
  'combine_catalog',
]) {
  if (!rust.includes(token)) throw new Error(`Native GeoColor provider contract missing: ${token}`);
}

const commands = await read('src/engine/tauri-commands.ts');
const lib = await read('src-tauri/src/lib.rs');
if (!commands.includes("invoke<unknown>('fetch_satellite_catalog', { force })")) {
  throw new Error('Typed frontend GeoColor catalog command is missing.');
}
if (!lib.includes('fetch_satellite_catalog') || !lib.includes('providers::satellite_catalog(force)')) {
  throw new Error('Tauri GeoColor catalog command is not registered.');
}

const config = await read('src-tauri/tauri.conf.json');
if (config.includes('realearth.ssec.wisc.edu')) {
  throw new Error('Rejected RealEarth domain still exists in CSP.');
}
if (!config.includes('mesonet.agron.iastate.edu') || !config.includes('https://*.noaa.gov')) {
  throw new Error('IEM/NOAA Satellite providers are not permitted by CSP.');
}

console.log('Satellite provider validation passed: IEM East/West live tiles, IEM historical VIS/IR/WV images, NOAA timestamped GeoColor, caching, and Tauri boundary verified.');