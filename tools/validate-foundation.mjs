import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');
const requiredFiles = [
  'src/app/StudioApp.tsx',
  'src/app/StudioDialogs.tsx',
  'src/core/project-migration.ts',
  'src/scenes/default-project.ts',
  'src/types/domain.ts',
  'src/data/weather-data-context.tsx',
  'src/data/provider-health-store.ts',
  'src/data/alerts-store.ts',
  'src/data/cross-window-weather-state.ts',
  'src/data/observation-summary.ts',
  'src/map/MapStage.tsx',
  'src/map/controllers/controller-types.ts',
  'src/map/controllers/controller-utils.ts',
  'src/map/controllers/index.ts',
  'src/map/controllers/MapLifecycleController.ts',
  'src/map/controllers/MapControllerHost.ts',
  'src/map/controllers/BasemapController.ts',
  'src/map/controllers/LayerStyleController.ts',
  'src/map/controllers/BoundaryController.ts',
  'src/map/controllers/CitiesController.ts',
  'src/map/controllers/AlertsController.ts',
  'src/map/controllers/ObservationsController.ts',
  'src/map/controllers/CameraController.ts',
  'src/map/controllers/InteractionController.ts',
  'src/map/controllers/LayerOrderController.ts',
  'src/map/controllers/ResizeController.ts',
  'src/map/map-runtime.ts',
  'src/map/map-layer-utils.ts',
  'src/map/basemap-styles.ts',
  'src/map/observation-field.ts',
  'src/state/studio-state.ts',
  'src/state/studio-actions.ts',
  'src/state/project-reducer.ts',
  'src/state/project/project-helpers.ts',
  'src/state/project/scene-reducer.ts',
  'src/state/project/show-reducer.ts',
  'src/state/reducers/project-state-reducer.ts',
  'src/state/reducers/operator-ui-reducer.ts',
  'src/state/reducers/presentation-state-reducer.ts',
  'src/state/reducers/presentation-coordinator.ts',
  'src/state/reducers/status-reducer.ts',
  'src/state/studio-reducer.ts',
  'src/state/selectors.ts',
  'src/state/scene-element-selection.ts',
  'src/components/TopBar.tsx',
  'src/components/SceneLibrary.tsx',
  'src/components/LayerStack.tsx',
  'src/components/BottomDock.tsx',
  'src/components/BroadcastHeader.tsx',
  'src/components/ContextToolsMenu.tsx',
  'src/components/StageQuickTools.tsx',
  'src/components/FloatingWindow.tsx',
  'src/components/ProductsDialog.tsx',
  'src/components/SettingsDialog.tsx',
  'src/components/GraphicSceneBuilder.tsx',
  'src/components/SaveSceneDialog.tsx',
  'src/components/ShowBuilderDialog.tsx',
  'src/modules/ModuleDialogHost.tsx',
  'src/modules/module-context.tsx',
  'src/modules/module-registry.ts',
  'src/modules/builtin/core-definitions.tsx',
  'src/modules/builtin/map-definitions.tsx',
  'src/modules/builtin/weather-definitions.tsx',
  'src/modules/builtin/graphics-definitions.tsx',
  'src/components/SceneStage.tsx',
  'src/components/GraphicStage.tsx',
  'src/scene-editing/SceneEditingContext.tsx',
  'src/scene-editing/EditableSceneText.tsx',
  'src/scene-editing/SceneElementStylePanel.tsx',
  'src/graphics/GraphicHeader.tsx',
  'src/graphics/GraphicText.tsx',
  'src/modules/registry.ts',
  'src/core/layer-order.ts',
  'src/output/output-bridge.ts',
  'src/output/export-scene.ts',
  'src/styles/r3-base.css',
  'src/styles/nex-gen-wx.css',
  'src-tauri/src/lib.rs',
  'src-tauri/src/storage.rs',
  'src-tauri/src/weather_engine/provider_client.rs',
  'src-tauri/src/weather_engine/providers/mod.rs',
  'src-tauri/src/weather_engine/providers/types.rs',
  'src-tauri/src/weather_engine/providers/alerts.rs',
  'src-tauri/src/weather_engine/providers/census.rs',
  'src-tauri/src/weather_engine/providers/observations.rs',
  'docs/PRODUCT_DEFINITION.md',
  'docs/R3_FRONTEND_SPEC.md',
  'scripts/prepare-windows-build-cache.ps1',
  'setup-nex-gen-wx.bat',
  'run-nex-gen-wx.bat',
  'tools/test-state-runtime.cjs',
  'tools/test-module-registry.cjs',
  'tools/validate-module-architecture.mjs',
  'docs/history/CODE_AUDIT_0_6_0.md',
  'docs/history/RELEASE_0_6_0.md',
  'docs/history/CODE_AUDIT_0_6_1.md',
  'docs/history/RELEASE_0_6_1.md',
  'docs/history/CODE_AUDIT_0_6_2.md',
  'docs/history/RELEASE_0_6_2.md',
  'docs/CODE_AUDIT_0_6_4.md',
  'docs/RELEASE_0_6_4.md',
  'docs/MODULE_AUTHORING.md',
];
for (const path of requiredFiles) await access(new URL(path, root), constants.R_OK);

const modules = [
  await read('src/modules/builtin/core-definitions.tsx'),
  await read('src/modules/builtin/map-definitions.tsx'),
  await read('src/modules/builtin/weather-definitions.tsx'),
  await read('src/modules/builtin/graphics-definitions.tsx'),
].join('\n');
for (const id of [
  'scene-engine', 'presentation', 'output', 'map', 'data-engine', 'radar', 'satellite',
  'temperature', 'observations', 'alerts', 'tropical', 'cities', 'boundaries', 'roads',
]) {
  if (!modules.includes(`id: '${id}'`)) throw new Error(`Missing required module: ${id}`);
}

const layerOrder = await read('src/core/layer-order.ts');
const roads = layerOrder.indexOf("'roads'");
const weather = layerOrder.indexOf("'weather-data'");
const cities = layerOrder.indexOf("'city-labels'");
if (roads < 0 || weather < 0 || cities < 0 || roads > weather || cities < weather) {
  throw new Error('Required map layer order is invalid: roads < weather < city labels.');
}

const domain = await read('src/types/domain.ts');
for (const requirement of [
  'schemaVersion: 8', 'interface StudioShow', 'interface StudioBranding', 'interface HeaderLegendState',
  'type SceneCategory', 'ObservationDisplaySettings', 'SurfaceObservationCollection', 'MapSample',
]) {
  if (!domain.includes(requirement)) throw new Error(`Domain requirement is missing: ${requirement}`);
}

const migration = await read('src/core/project-migration.ts');
for (const requirement of ['DEFAULT_OBSERVATION_DISPLAY', 'normalizeShows', 'normalizeModuleState', 'schemaVersion: 8', "studioName: candidate.branding?.studioName ?? 'NEX GEN WX'"]) {
  if (!migration.includes(requirement)) throw new Error(`Project migration is missing ${requirement}.`);
}

const defaultProject = await read('src/scenes/default-project.ts');
for (const requirement of ["legacy-r3/default-scenes.json", "legacy-r3/default-graphics.json", "studioName: 'NEX GEN WX'", "selectedShowId: 'show-main'"]) {
  if (!defaultProject.includes(requirement)) throw new Error(`R3 default project is missing ${requirement}.`);
}

const actions = await read('src/state/studio-actions.ts');
for (const action of [
  'scene/create-graphic', 'scene/duplicate', 'presentation/start-show', 'presentation/advance-show',
  'show/create', 'show/add-scene', 'show/move-scene', 'ui/open-dialog', 'ui/toggle-left-panel',
]) {
  if (!actions.includes(`'${action}'`)) throw new Error(`Studio state is missing action: ${action}`);
}

const studioApp = await read('src/app/StudioApp.tsx');
for (const component of [
  'TopBar', 'SceneLibrary', 'SceneTransitionViewport', 'BottomDock', 'ContextToolsMenu', 'StageQuickTools', 'StudioDialogs',
]) {
  if (!studioApp.includes(component)) throw new Error(`Studio shell is missing ${component}.`);
}
const studioDialogs = await read('src/app/StudioDialogs.tsx');
for (const component of [
  'ProductsDialog', 'SettingsDialog', 'GraphicSceneBuilder', 'SaveSceneDialog', 'ShowBuilderDialog',
  'ModuleDialogHost', 'SceneElementStylePanel',
]) {
  if (!studioDialogs.includes(component)) throw new Error(`Studio dialog host is missing ${component}.`);
}

const css = `${await read('src/styles/r3-base.css')}\n${await read('src/styles/nex-gen-wx.css')}`;
for (const className of [
  'app-shell', 'app-topbar', 'left-panel', 'scene-grid', 'layer-stack', 'stage', 'broadcast-header',
  'hidden-map-menu', 'map-corner-controls', 'bottom-dock', 'floating-window', 'settings-layout',
  'product-browser', 'graphic-template-grid', 'show-builder-window', 'show-rundown', 'graphic-stage',
]) {
  if (!css.includes(`.${className}`)) throw new Error(`R3 frontend class is missing: ${className}`);
}
if (!css.includes('NEX GEN WX 0.6.5 — thumbnails, transitions, output and export verification')) {
  throw new Error('0.6.5 render-pipeline CSS marker is missing.');
}

const broadcastHeader = await read('src/components/BroadcastHeader.tsx');
for (const requirement of ['header-logo', 'header-title-row', 'header-lower-row', 'EditableSceneText', 'header-legend', 'onToggleMenu']) {
  if (!broadcastHeader.includes(requirement)) throw new Error(`Broadcast header parity is missing ${requirement}.`);
}

const showBuilder = await read('src/components/ShowBuilderDialog.tsx');
for (const requirement of ['Scene Library', 'Scene Builder', '24/7 Loop', 'onMoveScene', 'defaultHoldSeconds']) {
  if (!showBuilder.includes(requirement)) throw new Error(`Show builder is missing ${requirement}.`);
}

const mapStage = await read('src/map/MapStage.tsx');
for (const behavior of [
  'new MapControllerHost',
  'host.mount(container)',
  'host.destroy()',
  'updateScene(scene)',
  'updateAlerts(alerts.data)',
]) {
  if (!mapStage.includes(behavior)) throw new Error(`MapStage controller composition is missing ${behavior}.`);
}
for (const forbidden of ['fetchSurfaceObservations', 'renderObservationField', 'new Map(', "map.on('style.load'"]) {
  if (mapStage.includes(forbidden)) throw new Error(`MapStage owns mixed responsibility again: ${forbidden}.`);
}
const lifecycle = await read('src/map/controllers/MapLifecycleController.ts');
for (const behavior of [
  'canvasContextAttributes: { preserveDrawingBuffer: true',
  'attributionControl: { compact: true }',
  'createBasemapStyle',
]) {
  const source = behavior === 'createBasemapStyle'
    ? await read('src/map/controllers/MapControllerHost.ts')
    : lifecycle;
  if (!source.includes(behavior)) throw new Error(`Map lifecycle behavior is missing ${behavior}.`);
}
const observationsController = await read('src/map/controllers/ObservationsController.ts');
for (const behavior of ['fetchSurfaceObservations', 'renderObservationField', 'nearestAnalysisValue', 'summarizeObservation']) {
  if (!observationsController.includes(behavior)) throw new Error(`Observation controller is missing ${behavior}.`);
}

const providerModules = [
  await read('src-tauri/src/weather_engine/providers/alerts.rs'),
  await read('src-tauri/src/weather_engine/providers/census.rs'),
  await read('src-tauri/src/weather_engine/providers/observations.rs'),
].join('\n');
for (const provider of ['api.weather.gov/alerts/active', 'TIGERweb/State_County', 'TIGERweb/Places_CouSub_ConCity_SubMCD', 'aviationweather.gov/data/cache/metars.cache.csv.gz']) {
  if (!providerModules.includes(provider)) throw new Error(`Rust provider adapters are missing ${provider}.`);
}
for (const behavior of ['parse_metar_csv_text', 'parse_metar_cache', 'select_station_labels', 'build_analysis_grid', 'surface_observations']) {
  if (!providerModules.includes(`fn ${behavior}`) && !providerModules.includes(`async fn ${behavior}`)) {
    throw new Error(`Rust observation provider is missing ${behavior}.`);
  }
}

const nativeCommands = await read('src-tauri/src/lib.rs');
for (const command of ['load_latest_project', 'fetch_active_alerts', 'fetch_state_boundaries', 'fetch_county_boundaries', 'fetch_places', 'fetch_surface_observations']) {
  if (!nativeCommands.includes(command)) throw new Error(`Tauri command is missing: ${command}`);
}

const packageJson = JSON.parse(await read('package.json'));
if (!packageJson.scripts?.validate?.includes('test:state') || packageJson.scripts?.['test:state'] !== 'node tools/test-state-runtime.cjs') {
  throw new Error('Runtime state regression is not part of the validation pipeline.');
}
if (!packageJson.scripts?.validate?.includes('validate:map-controllers')) {
  throw new Error('Map controller regression validation is not part of the release pipeline.');
}
if (!packageJson.scripts?.validate?.includes('validate:module-architecture') || !packageJson.scripts?.validate?.includes('test:modules')) {
  throw new Error('Module architecture regressions are not part of the release pipeline.');
}
const tauriConfig = JSON.parse(await read('src-tauri/tauri.conf.json'));
const cargoToml = await read('src-tauri/Cargo.toml');
if (packageJson.name !== 'nex-gen-wx' || tauriConfig.productName !== 'NEX GEN WX') throw new Error('Project naming is not synchronized.');
if (packageJson.version !== '0.6.5' || tauriConfig.version !== '0.6.5' || !cargoToml.includes('version = "0.6.5"')) {
  throw new Error('Package, Tauri and Rust versions must all be 0.6.5.');
}
for (const dependency of ['csv =', 'flate2 =', 'tokio =']) {
  if (!cargoToml.includes(dependency)) throw new Error(`Rust dependency is missing: ${dependency}`);
}
if (!cargoToml.includes('name = "nex_gen_wx_lib"') || !(await read('src-tauri/src/main.rs')).includes('nex_gen_wx_lib::run()')) {
  throw new Error('Rust library naming is not synchronized to NEX GEN WX.');
}
if (!(await read('src-tauri/src/storage.rs')).includes('.nexgenwx.json')) {
  throw new Error('New project files must use the NEX GEN WX project extension.');
}

for (const launcher of ['setup-nex-gen-wx.bat', 'run-nex-gen-wx.bat']) {
  const script = await read(launcher);
  if (!script.includes('prepare-windows-build-cache.ps1')) throw new Error(`${launcher} lacks build-cache relocation protection.`);
}
const setupScript = await read('setup-nex-gen-wx.bat');
if (!setupScript.includes('cargo test --manifest-path')) {
  throw new Error('Windows setup must compile and run native Rust regression tests.');
}

console.log('Foundation validation passed: R3 shell, modular state, split map runtime, native provider adapters, schema 8, real module registration, and synchronized 0.6.5 versions verified.');
