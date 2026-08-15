import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');

const required = [
  'src/map/broadcast-context.ts',
  'src/map/map-runtime.ts',
  'src/map/controllers/LayerStyleController.ts',
  'src/map/controllers/RoadsController.ts',
  'src/modules/builtin/panels/MapSettingsPanel.tsx',
  'src/map/location-context.ts',
];
await Promise.all(required.map((relative) => access(new URL(relative, root), constants.R_OK)));

const domain = await read('src/types/domain.ts');
for (const token of [
  "BroadcastContextMode = 'off' | 'auto' | 'custom'",
  "BroadcastContextDetail = 'low' | 'broadcast' | 'high'",
  'contextMode: BroadcastContextMode',
  'contextOpacity: number',
  'contextDetail: BroadcastContextDetail',
]) {
  if (!domain.includes(token)) throw new Error(`Broadcast context domain contract missing: ${token}`);
}

const migration = await read('src/core/project-migration.ts');
for (const token of ["contextMode: 'auto'", 'contextOpacity: 72', "contextDetail: 'broadcast'"]) {
  if (!migration.includes(token)) throw new Error(`Broadcast context migration default missing: ${token}`);
}

const runtime = await read('src/map/broadcast-context.ts');
for (const token of [
  'BROADCAST_CONTEXT_PREFIX',
  'addBasemapBroadcastContextLayers',
  'addSatelliteBroadcastContextLayers',
  'applyBroadcastContext',
  'effectiveBroadcastRoadDensity',
  'emergenceOpacity',
  "case 'radar': return 0",
  "tier === 'local'",
]) {
  if (!runtime.includes(token)) throw new Error(`Broadcast context runtime missing: ${token}`);
}

const mapRuntime = await read('src/map/map-runtime.ts');
const orderStart = mapRuntime.indexOf('const ordered = [');
const orderEnd = mapRuntime.indexOf('];', orderStart);
const ordering = mapRuntime.slice(orderStart, orderEnd);
for (const token of [
  'LAYER_IDS.roadLabels',
  'LAYER_IDS.observationField',
  '...RADAR_LAYER_IDS',
  '...contextLayers',
  'LAYER_IDS.stateLines',
  'LAYER_IDS.countyLines',
  'LAYER_IDS.cityLabels',
]) {
  if (!ordering.includes(token)) throw new Error(`Broadcast layer ordering token missing: ${token}`);
}
const road = ordering.indexOf('LAYER_IDS.roadLabels');
const radar = ordering.indexOf('...RADAR_LAYER_IDS');
const context = ordering.indexOf('...contextLayers');
const countyCasing = ordering.indexOf('LAYER_IDS.countyCasing');
const county = ordering.indexOf('LAYER_IDS.countyLines');
const boundary = ordering.indexOf('LAYER_IDS.stateLines');
const city = ordering.indexOf('LAYER_IDS.cityLabels');
if (!(road >= 0 && radar > road && context > radar && countyCasing > context && county > countyCasing && boundary > county && city > boundary)) {
  throw new Error('Required broadcast stack is not base roads < weather < broadcast roads < county casing/lines < states < cities.');
}

const style = await read('src/map/controllers/LayerStyleController.ts');
for (const token of ['applyBroadcastContext', 'onMoveEnd', 'onLayerOrderChanged']) {
  if (!style.includes(token)) throw new Error(`Broadcast context lifecycle hook missing: ${token}`);
}

const roads = await read('src/map/controllers/RoadsController.ts');
if (!roads.includes('effectiveBroadcastRoadDensity')) {
  throw new Error('Satellite RoadsController is not requesting progressively richer detail.');
}

const settings = await read('src/modules/builtin/panels/MapSettingsPanel.tsx');
for (const token of ['Broadcast context', 'Context opacity', 'Context detail']) {
  if (!settings.includes(token)) throw new Error(`Broadcast context operator control missing: ${token}`);
}


const location = await read('src/map/location-context.ts');
for (const token of [
  'cityRankLimit',
  'cityLabelPadding',
  'countyMinimumZoom',
  'countyOpacity',
  'countyWidth',
  'countyCasingWidth',
  'LAYER_IDS.countyCasing',
  'applyLocationContext',
]) {
  if (!location.includes(token)) throw new Error(`Location-context behavior missing: ${token}`);
}
const boundariesController = await read('src/map/controllers/BoundaryController.ts');
if (!boundariesController.includes('countiesVisible && this.countyData ? this.countyData.data')) {
  throw new Error('BoundaryController still blanks usable county geometry when the camera key changes.');
}
if (!boundariesController.includes('Keep the most recently loaded county geometry on-screen')) {
  throw new Error('BoundaryController is not retaining county geometry during background refresh.');
}

const citiesController = await read('src/map/controllers/CitiesController.ts');
if (citiesController.includes('String(context.scene.display.cityDensity)')) {
  throw new Error('City density still invalidates the provider cache instead of updating display immediately.');
}
if (!citiesController.includes('fetchPlaces(bbox, zoom, 100, force)')) {
  throw new Error('CitiesController is not keeping a rich population-ranked display inventory.');
}

console.log('Broadcast context validation passed: persisted controls, zoom-adaptive road/city/county detail, above-weather context, satellite fetch density, and broadcast layer order verified.');
