import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');
const requireFile = (relative) => access(new URL(relative, root), constants.R_OK);

const required = [
  'src/types/module.ts',
  'src/modules/module-registry.ts',
  'src/modules/module-context.tsx',
  'src/modules/ModuleDialogHost.tsx',
  'src/modules/registry.ts',
  'src/modules/builtin/core-definitions.tsx',
  'src/modules/builtin/map-definitions.tsx',
  'src/modules/builtin/weather-definitions.tsx',
  'src/modules/builtin/graphics-definitions.tsx',
  'src/state/project/scene-reducer.ts',
  'src/state/project/show-reducer.ts',
  'src/state/reducers/project-state-reducer.ts',
  'src/state/reducers/operator-ui-reducer.ts',
  'src/state/reducers/presentation-state-reducer.ts',
  'src/state/reducers/presentation-coordinator.ts',
  'src/state/reducers/status-reducer.ts',
  'src/data/provider-health-store.ts',
  'src/data/alerts-store.ts',
  'src/data/cross-window-weather-state.ts',
  'tools/test-module-registry.cjs',
  'tools/test-built-in-module-registry.cjs',
];
await Promise.all(required.map(requireFile));

const moduleTypes = await read('src/types/module.ts');
for (const token of [
  'StudioModuleDefinition',
  'ModuleProviderContribution',
  'ModuleDialogContribution',
  'ModuleSettingsTabContribution',
  'ModuleToolContribution',
  'ModuleMapControllerContribution',
  'defaultSceneState',
  'migrateSceneState',
]) {
  if (!moduleTypes.includes(token)) throw new Error(`Module contract is missing ${token}.`);
}

const registry = await read('src/modules/module-registry.ts');
for (const token of [
  'sortByDependencies',
  'assertContributionIds',
  'resolveSceneModuleIds',
  'normalizeProjectModuleState',
  'normalizeSceneModuleState',
  'createMapControllers',
  'getProviders',
  'getSettingsTabs',
  'getDialog',
  'getTools',
]) {
  if (!registry.includes(token)) throw new Error(`Module registry behavior is missing ${token}.`);
}
for (const token of ['Duplicate module id', 'Circular module dependency', 'depends on missing module']) {
  if (!registry.includes(token)) throw new Error(`Module registry validation is missing: ${token}`);
}

const registrySingleton = await read('src/modules/registry.ts');
for (const token of ['coreModuleDefinitions', 'mapModuleDefinitions', 'weatherModuleDefinitions', 'graphicsModuleDefinitions', 'new ModuleRegistry']) {
  if (!registrySingleton.includes(token)) throw new Error(`Built-in module registration is missing ${token}.`);
}

const host = await read('src/map/controllers/MapControllerHost.ts');
if (!host.includes('moduleRegistry.createMapControllers()')) {
  throw new Error('MapControllerHost must receive map controllers from the module registry.');
}
for (const forbidden of [
  'new BoundaryController', 'new CitiesController', 'new AlertsController',
  'new CameraController', 'new LayerOrderController', 'new ResizeController',
]) {
  if (host.includes(forbidden)) throw new Error(`MapControllerHost still hardcodes module behavior: ${forbidden}`);
}

const settings = await read('src/components/SettingsDialog.tsx');
if (!settings.includes('registry.getSettingsTabs(scene)')) throw new Error('SettingsDialog is not registry-driven.');
const dialogs = await read('src/modules/ModuleDialogHost.tsx');
if (!dialogs.includes('registry.getDialog')) throw new Error('ModuleDialogHost is not registry-driven.');
const studio = await read('src/app/StudioApp.tsx');
for (const token of [
  "registry.getTools(selectedScene, 'dock-layer')",
  "registry.getTools(selectedScene, 'dock-tool')",
  "registry.getTools(selectedScene, 'quick')",
  "registry.getTools(selectedScene, 'context')",
  'registry.normalizeProjectModuleState',
]) {
  if (!studio.includes(token)) throw new Error(`StudioApp module composition is missing ${token}.`);
}

const weatherContext = await read('src/data/weather-data-context.tsx');
if (!weatherContext.includes('registry.getProviders()') || !weatherContext.includes('useProviderHealthStore')) {
  throw new Error('Provider state is not sourced from module provider contributions.');
}
const providerStore = await read('src/data/provider-health-store.ts');
if (!providerStore.includes('ProviderId = string') || !providerStore.includes('ModuleProviderContribution')) {
  throw new Error('Provider health state remains a closed hardcoded provider union.');
}

const domain = await read('src/types/domain.ts');
const migration = await read('src/core/project-migration.ts');
const defaults = await read('src/scenes/default-project.ts');
for (const [name, content] of [['domain', domain], ['migration', migration], ['defaults', defaults]]) {
  if (!content.includes('schemaVersion: 8')) throw new Error(`${name} is not synchronized to module-state schema 8.`);
}
if (!domain.includes('ModuleSceneState') || !domain.includes('moduleState: ModuleSceneState')) {
  throw new Error('Scene-specific module state is missing from the project domain.');
}
for (const action of ['scene/set-module-active', 'scene/merge-module-state', 'scene/replace-module-state', 'scene/reset-module-state', 'scene/normalize-module-state']) {
  const source = `${await read('src/state/studio-actions.ts')}\n${await read('src/state/project/scene-reducer.ts')}`;
  if (!source.includes(action)) throw new Error(`Module-state action is missing: ${action}`);
}

const rootReducer = await read('src/state/studio-reducer.ts');
for (const token of [
  'reduceProjectState', 'reducePresentationState', 'reduceOperatorUiState',
  'reduceOperatorStatus', 'coordinatePresentation',
]) {
  if (!rootReducer.includes(token)) throw new Error(`Root state coordinator is missing ${token}.`);
}
if (rootReducer.includes("case 'scene/") || rootReducer.includes("case 'show/")) {
  throw new Error('Root studio reducer contains domain-specific scene/show mutation logic.');
}

try {
  await access(new URL('src/components/ToolDialog.tsx', root), constants.F_OK);
  throw new Error('Obsolete central ToolDialog.tsx still exists.');
} catch (error) {
  if (error instanceof Error && error.message.includes('Obsolete central')) throw error;
}

const packageJson = JSON.parse(await read('package.json'));
if (!packageJson.scripts?.validate?.includes('validate:module-architecture')) {
  throw new Error('Module architecture validation is not part of the release pipeline.');
}
if (!packageJson.scripts?.validate?.includes('test:modules')) {
  throw new Error('Module registry runtime regression is not part of the release pipeline.');
}

console.log('Module architecture validation passed: dependency-safe registry, registry-driven tools/dialogs/settings/controllers/providers, schema 8 module state, and separated application-state reducers verified.');
