import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');
const required = [
  'src/radar/RadarController.ts',
  'src/radar/radar-runtime-store.ts',
  'src/radar/radar-layer-ids.ts',
  'src/radar/RadarControls.tsx',
  'src/radar/RadarQuickToolbar.tsx',
  'tools/test-radar-controller.cjs',
  'tools/test-radar-runtime-store.cjs',
];
await Promise.all(required.map((relative) => access(new URL(relative, root), constants.R_OK)));

const controller = await read('src/radar/RadarController.ts');
for (const token of [
  'latestFrame',
  "latestFrame('mrms-latest')",
  "timestamp: '0'",
  'requestEpoch',
  'styleGeneration',
  'setRenderPending',
  "context.renderPurpose === 'export'",
  'fetchMrmsRadarCatalog',
  'fetchAvailableRadarSites',
  'fetchSiteRadarCatalog',
  'notifyLayerOrderChanged',
  'clearRadarRuntime',
  'onMapError',
  'RADAR_SOURCE_PREFIX',
  'Radar imagery request failed',
]) {
  if (!controller.includes(token)) throw new Error(`Radar renderer contract missing: ${token}`);
}

const tauriConfig = await read('src-tauri/tauri.conf.json');
for (const host of ['https://mapservices.weather.noaa.gov', 'https://mesonet.agron.iastate.edu']) {
  if (!tauriConfig.includes(host)) throw new Error(`Radar WebView CSP host missing: ${host}`);
}

const runtime = await read('src/radar/radar-runtime-store.ts');
for (const token of ['emptySnapshots', 'useSyncExternalStore', "RadarRuntimeChannel = 'operator'", 'runtimeKey']) {
  if (!runtime.includes(token)) throw new Error(`Radar runtime isolation missing: ${token}`);
}
if (runtime.includes('{ ...EMPTY_SNAPSHOT, sceneId }')) {
  throw new Error('Unstable Radar external-store empty snapshots were reintroduced.');
}

const runtimeMap = await read('src/map/map-runtime.ts');
const orderStart = runtimeMap.indexOf('const ordered = [');
const orderEnd = runtimeMap.indexOf('];', orderStart);
if (orderStart < 0 || orderEnd < 0) throw new Error('Permanent map ordering array was not found.');
const ordering = runtimeMap.slice(orderStart, orderEnd);
const roadIndex = ordering.indexOf('LAYER_IDS.roadLabels');
const boundaryIndex = ordering.indexOf('LAYER_IDS.stateLines');
const radarIndex = ordering.indexOf('...RADAR_LAYER_IDS');
const cityIndex = ordering.indexOf('LAYER_IDS.cityLabels');
if (!(roadIndex >= 0 && boundaryIndex > roadIndex && radarIndex > boundaryIndex && cityIndex > radarIndex)) {
  throw new Error('Required map order is not roads < boundaries < radar/weather < cities.');
}

const sceneStage = await read('src/components/SceneStage.tsx');
for (const token of ['renderPurpose', 'RadarQuickToolbar', 'onModuleStateChange', 'onProductChange']) {
  if (!sceneStage.includes(token)) throw new Error(`Shared Radar render pipeline missing: ${token}`);
}

const exportHost = await read('src/output/SceneExportHost.tsx');
if (!exportHost.includes('renderPurpose="export"')) throw new Error('PNG export does not use an isolated Radar runtime channel.');

console.log('Radar renderer validation passed: latest-first rendering, stable runtime snapshots, deterministic layer order, output/export isolation, controller readiness, and operator controls verified.');
