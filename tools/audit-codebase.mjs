import { access, readFile, readdir, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(root, 'src');

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else files.push(absolute);
  }
  return files;
}

async function text(relative) {
  return readFile(path.join(root, relative), 'utf8');
}

async function mustNotExist(relative) {
  try {
    await access(path.join(root, relative), constants.F_OK);
  } catch {
    return;
  }
  throw new Error(`Obsolete file still exists: ${relative}`);
}

const obsoleteFiles = [
  'src/app/studio-reducer.ts',
  'src/styles/app.css',
  'src/components/ModuleInspector.tsx',
  'src/components/SceneBuilder.tsx',
  'src/components/MapModuleControls.tsx',
  'src/components/ObservationModuleControls.tsx',
  'src/components/ToolDialog.tsx',
];
await Promise.all(obsoleteFiles.map(mustNotExist));

const codeFiles = (await walk(sourceRoot)).filter((file) => /\.(ts|tsx)$/.test(file));
const contents = new Map(await Promise.all(codeFiles.map(async (file) => [file, await readFile(file, 'utf8')])));

const forbiddenFrontendProviderTokens = [
  'api.weather.gov/alerts/active',
  'tigerweb.geo.census.gov/arcgis',
  'aviationweather.gov/data/cache/metars',
];
for (const [file, content] of contents) {
  for (const token of forbiddenFrontendProviderTokens) {
    if (content.includes(token)) {
      throw new Error(`Provider endpoint leaked into frontend code: ${path.relative(root, file)} (${token})`);
    }
  }
  if (/\bfetch\s*\(/.test(content)) {
    throw new Error(`Direct browser fetch found in ${path.relative(root, file)}; provider I/O belongs in Rust adapters.`);
  }
}

const forbiddenPresentationTokens = ['Map data issues', 'DATA MODULE NOT CONNECTED', 'graphic-footer'];
for (const [file, content] of contents) {
  for (const token of forbiddenPresentationTokens) {
    if (content.includes(token)) throw new Error(`Obsolete presentation output remains in ${path.relative(root, file)}: ${token}`);
  }
}

const oldArchitectureTokens = [
  "from '../app/studio-reducer'",
  "from './studio-reducer'",
  "type: 'open-dialog'",
  "type: 'toggle-left-panel'",
  "type: 'create-graphic-scene'",
];
for (const [file, content] of contents) {
  for (const token of oldArchitectureTokens) {
    if (content.includes(token)) throw new Error(`Abandoned state architecture remains in ${path.relative(root, file)}: ${token}`);
  }
}

const lineBudgets = new Map([
  ['src/app/StudioApp.tsx', 450],
  ['src/app/StudioDialogs.tsx', 240],
  ['src/components/GraphicStage.tsx', 100],
  ['src/scene-editing/SceneElementStylePanel.tsx', 220],
  ['src/scene-editing/SceneObjectOverlay.tsx', 220],
  ['src/scene-editing/SceneObjectControls.tsx', 140],
  ['src/modules/builtin/panels/SceneObjectsDialogPanel.tsx', 180],
  ['src/map/MapStage.tsx', 140],
  ['src/map/controllers/MapControllerHost.ts', 300],
  ['src/map/controllers/MapLifecycleController.ts', 120],
  ['src/map/controllers/LayerStyleController.ts', 150],
  ['src/map/controllers/BoundaryController.ts', 180],
  ['src/map/controllers/CitiesController.ts', 130],
  ['src/map/controllers/AlertsController.ts', 140],
  ['src/map/controllers/ObservationsController.ts', 250],
  ['src/map/controllers/InteractionController.ts', 90],
  ['src/map/map-runtime.ts', 520],
  ['src/data/weather-data-context.tsx', 180],
  ['src/data/provider-health-store.ts', 110],
  ['src/modules/module-registry.ts', 260],
  ['src/types/module.ts', 170],
  ['src/state/studio-reducer.ts', 80],
  ['src/state/project/scene-reducer.ts', 240],
  ['src-tauri/src/weather_engine/providers/mod.rs', 80],
]);
for (const [relative, maximum] of lineBudgets) {
  const lines = (await text(relative)).split(/\r?\n/).length;
  if (lines > maximum) throw new Error(`${relative} is ${lines} lines; budget is ${maximum}. Split mixed responsibilities before release.`);
}

// Build a small relative-import graph to catch abandoned TSX components.
const sourceFiles = new Set(codeFiles.map((file) => path.resolve(file)));
const references = new Map([...sourceFiles].map((file) => [file, 0]));
const importPattern = /(?:from\s+|import\s+)["']([^"']+)["']/g;
for (const [file, content] of contents) {
  for (const match of content.matchAll(importPattern)) {
    const specifier = match[1];
    if (!specifier.startsWith('.')) continue;
    const base = path.resolve(path.dirname(file), specifier);
    const candidates = [
      `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx'),
    ];
    const target = candidates.find((candidate) => sourceFiles.has(path.resolve(candidate)));
    if (target) references.set(path.resolve(target), (references.get(path.resolve(target)) ?? 0) + 1);
  }
}
const allowedRoots = new Set([
  path.resolve(sourceRoot, 'main.tsx'),
  path.resolve(sourceRoot, 'modules/registry.ts'),
  path.resolve(sourceRoot, 'core/layer-order.ts'),
]);
for (const [file, count] of references) {
  if (count === 0 && file.endsWith('.tsx') && !allowedRoots.has(file)) {
    throw new Error(`Unused TSX component detected: ${path.relative(root, file)}`);
  }
}

const stateFiles = [
  'src/state/studio-state.ts',
  'src/state/studio-actions.ts',
  'src/state/project-reducer.ts',
  'src/state/project/project-helpers.ts',
  'src/state/project/scene-reducer.ts',
  'src/state/project/scene-object-reducer.ts',
  'src/state/project/show-reducer.ts',
  'src/state/reducers/project-state-reducer.ts',
  'src/state/reducers/operator-ui-reducer.ts',
  'src/state/reducers/presentation-state-reducer.ts',
  'src/state/reducers/presentation-coordinator.ts',
  'src/state/reducers/status-reducer.ts',
  'src/state/studio-reducer.ts',
  'src/state/selectors.ts',
  'src/state/scene-element-selection.ts',
];
for (const relative of stateFiles) await access(path.join(root, relative), constants.R_OK);

const projectReducer = await text('src/state/project/scene-reducer.ts');
if (/project\.scenes\.(push|splice|sort)\s*\(/.test(projectReducer)) {
  throw new Error('Direct project scene-array mutation detected in project reducer.');
}
if (!projectReducer.includes('structuredClone(source)')) {
  throw new Error('Scene duplication must isolate nested scene state.');
}

const moduleRegistry = await text('src/modules/module-registry.ts');
for (const token of ['sortByDependencies', 'assertContributionIds', 'createMapControllers', 'normalizeProjectModuleState']) {
  if (!moduleRegistry.includes(token)) throw new Error(`Module registry boundary is missing ${token}.`);
}
const mapStageSource = await text('src/map/MapStage.tsx');
for (const token of [
  'fetchStateBoundaries', 'fetchCountyBoundaries', 'fetchPlaces', 'fetchSurfaceObservations',
  'new Map(', "map.on('style.load'", 'queryRenderedFeatures', 'loadEpochRef',
]) {
  if (mapStageSource.includes(token)) {
    throw new Error(`MapStage mixed responsibility detected: ${token}`);
  }
}

const providerModule = await text('src-tauri/src/weather_engine/providers/mod.rs');
if (providerModule.includes('https://') || providerModule.split(/\r?\n/).length > 80) {
  throw new Error('Rust providers/mod.rs must remain a small module boundary, not a provider monolith.');
}

const metrics = {
  frontendFiles: codeFiles.length,
  frontendLines: [...contents.values()].reduce((sum, content) => sum + content.split(/\r?\n/).length, 0),
  studioAppLines: (await text('src/app/StudioApp.tsx')).split(/\r?\n/).length,
  mapStageLines: (await text('src/map/MapStage.tsx')).split(/\r?\n/).length,
  rustProviderBoundaryLines: providerModule.split(/\r?\n/).length,
};
console.log(`Code audit passed: ${metrics.frontendFiles} frontend files, ${metrics.frontendLines} lines; StudioApp ${metrics.studioAppLines}, MapStage ${metrics.mapStageLines}, provider boundary ${metrics.rustProviderBoundaryLines}.`);
