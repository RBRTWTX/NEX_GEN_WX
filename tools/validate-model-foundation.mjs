import { readFile, access } from 'node:fs/promises';

const required = [
  'src/models/model-types.ts',
  'src/models/model-provider.ts',
  'src/models/model-runtime-store.ts',
  'src/models/ModelController.ts',
  'src-tauri/src/weather_engine/providers/models.rs',
];

for (const path of required) await access(path);

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const weatherDefinitions = await readFile('src/modules/builtin/weather-definitions.tsx', 'utf8');
const provider = await readFile('src/models/model-provider.ts', 'utf8');
const modelTypes = await readFile('src/models/model-types.ts', 'utf8');
const nativeProvider = await readFile('src-tauri/src/weather_engine/providers/models.rs', 'utf8');
const tauriCommands = await readFile('src/engine/tauri-commands.ts', 'utf8');
const nativeLib = await readFile('src-tauri/src/lib.rs', 'utf8');

if (packageJson.version !== '0.8.5') throw new Error(`Expected package version 0.8.5, got ${packageJson.version}.`);
if (!weatherDefinitions.includes("id: 'models'")) throw new Error('Models module is not registered.');
if (!weatherDefinitions.includes("id: 'model-hrrr-nodd'")) throw new Error('NOAA NODD HRRR provider contribution is not registered.');
if (!weatherDefinitions.includes("new ModelController()")) throw new Error('ModelController is not registered.');
if (!provider.includes('noaa-hrrr-bdp-pds.s3.amazonaws.com')) throw new Error('Direct NOAA HRRR NODD source is missing.');
if (!nativeProvider.includes('noaa-hrrr-bdp-pds.s3.amazonaws.com')) throw new Error('Native HRRR catalog source is missing.');
if (!modelTypes.includes("parameter: 'TMP'") || !modelTypes.includes("level: '2 m above ground'")) {
  throw new Error('Initial HRRR 2 m temperature field contract is missing.');
}
if (!tauriCommands.includes('fetch_model_hrrr_cycle_catalog')) throw new Error('Frontend Tauri model command is missing.');
if (!nativeLib.includes('fetch_model_hrrr_cycle_catalog')) throw new Error('Native Tauri model command is missing.');

const forbiddenRoots = [
  'package.json',
  'src/models/model-types.ts',
  'src/models/model-provider.ts',
  'src/models/model-runtime-store.ts',
  'src/models/ModelController.ts',
  'src/modules/builtin/weather-definitions.tsx',
  'src-tauri/src/weather_engine/providers/models.rs',
];
for (const path of forbiddenRoots) {
  const text = await readFile(path, 'utf8');
  if (/aguacero/i.test(text)) throw new Error(`Aguacero reference found in active 0.8.5 model foundation: ${path}`);
}

console.log('Model foundation validation passed: provider-neutral model state + direct NOAA NODD HRRR catalog boundary verified.');
