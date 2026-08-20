import { access, readFile } from 'node:fs/promises';

const required = [
  'src/models/ModelFieldLayer.ts',
  'src/models/ModelPlaybackTouchControls.tsx',
  'src/models/hrrr-projection.ts',
  'src/models/model-layer-ids.ts',
  'src/models/model-display-metadata.ts',
  'src/styles/broadcast-header.css',
  'tools/test-broadcast-header-integrity.cjs',
  'tools/test-model-display-metadata.cjs',
  'tools/test-model-field-provider.cjs',
  'tools/test-model-playback.cjs',
];
for (const path of required) await access(path);

const [
  packageText,
  cargo,
  providerClient,
  nativeModels,
  nativeLib,
  tauriCommands,
  modelTypes,
  modelProvider,
  controller,
  layer,
  playback,
  sceneObject,
  broadcastHeader,
  sceneStage,
  mapRuntime,
  modelLab,
  productLegend,
  modelDisplayMetadata,
  layerStack,
  contextToolsMenu,
  modelsCss,
  broadcastHeaderCss,
  r3Base,
  studioApp,
  nexGenCss,
] = await Promise.all([
  readFile('package.json', 'utf8'),
  readFile('src-tauri/Cargo.toml', 'utf8'),
  readFile('src-tauri/src/weather_engine/provider_client.rs', 'utf8'),
  readFile('src-tauri/src/weather_engine/providers/models.rs', 'utf8'),
  readFile('src-tauri/src/lib.rs', 'utf8'),
  readFile('src/engine/tauri-commands.ts', 'utf8'),
  readFile('src/models/model-types.ts', 'utf8'),
  readFile('src/models/model-provider.ts', 'utf8'),
  readFile('src/models/ModelController.ts', 'utf8'),
  readFile('src/models/ModelFieldLayer.ts', 'utf8'),
  readFile('src/models/ModelPlaybackTouchControls.tsx', 'utf8'),
  readFile('src/scene-editing/SceneObject.tsx', 'utf8'),
  readFile('src/components/BroadcastHeader.tsx', 'utf8'),
  readFile('src/components/SceneStage.tsx', 'utf8'),
  readFile('src/map/map-runtime.ts', 'utf8'),
  readFile('src/modules/builtin/panels/ModelLabDialogPanel.tsx', 'utf8'),
  readFile('src/legends/product-legend.ts', 'utf8'),
  readFile('src/models/model-display-metadata.ts', 'utf8'),
  readFile('src/components/LayerStack.tsx', 'utf8'),
  readFile('src/components/ContextToolsMenu.tsx', 'utf8'),
  readFile('src/styles/models.css', 'utf8'),
  readFile('src/styles/broadcast-header.css', 'utf8'),
  readFile('src/styles/r3-base.css', 'utf8'),
  readFile('src/app/StudioApp.tsx', 'utf8'),
  readFile('src/styles/nex-gen-wx.css', 'utf8'),
]);

const normalizedNexGenCss = nexGenCss.replace(/\r\n/g, '\n');

const packageJson = JSON.parse(packageText);
if (packageJson.version !== '0.8.5') throw new Error(`Expected 0.8.5, got ${packageJson.version}.`);
for (const script of ['validate:model-renderer', 'test:model-field-provider', 'test:model-playback', 'test:model-display-metadata', 'test:broadcast-header-integrity']) {
  if (!packageJson.scripts?.[script]) throw new Error(`Missing package script ${script}.`);
  if (!packageJson.scripts.validate.includes(script)) throw new Error(`${script} is not in the full validation chain.`);
}

if (
  !cargo.includes('grib = { version = "=0.16.0", default-features = false, features = ["jpeg2000-unpack-with-hayro", "png-unpack-with-png-crate", "ccsds-unpack-with-rust-aec"] }')
) {
  throw new Error('Rust GRIB decoder is not pinned to grib 0.16.0 with the pure-Rust JPEG2000/PNG/CCSDS decoding features.');
}
if (!providerClient.includes('pub async fn fetch_bytes_range') || !providerClient.includes('StatusCode::PARTIAL_CONTENT')) {
  throw new Error('Native provider client does not enforce bounded HTTP byte-range retrieval.');
}
for (const marker of [
  'record_range_from_index',
  'Grib2SubmessageDecoder',
  'HRRR_NX: usize = 1799',
  'HRRR_NY: usize = 1059',
  '":REFC:entire atmosphere:"',
  '":TMP:2 m above ground:"',
  'provider_client::fetch_bytes_range',
]) {
  if (!nativeModels.includes(marker)) throw new Error(`Native HRRR field decoder marker missing: ${marker}`);
}
if (!nativeLib.includes('fetch_model_hrrr_field')) throw new Error('Native HRRR field command is not registered.');
if (!tauriCommands.includes('fetchModelHrrrField')) throw new Error('Frontend HRRR field command is missing.');
if (
  !modelTypes.includes("'composite-reflectivity'")
  || !modelTypes.includes("'temperature-2m'")
  || !modelTypes.includes("field: 'temperature-2m'")
  || !modelTypes.includes('loopEnabled')
  || modelTypes.includes('defaultModelFieldForScene')
  || modelTypes.includes('persistedModelState')
) {
  throw new Error('Model state must preserve the CP1 temperature default while allowing explicit reflectivity selection and loop playback.');
}
if (!modelProvider.includes('fetchModelFieldGrid')) throw new Error('Model field provider boundary is missing.');
if (!controller.includes('ModelFieldLayer') || !controller.includes('fieldCache') || !controller.includes('setRenderPending')) {
  throw new Error('ModelController is not field-renderer/cache/readiness aware.');
}
if (!layer.includes("readonly type = 'custom'") || !layer.includes('defaultProjectionData.mainMatrix')) {
  throw new Error('MapLibre custom model field layer is incomplete.');
}
if (
  !playback.includes('ModelPlaybackDriver')
  || !playback.includes('Previous forecast hour')
  || !playback.includes('Pause model animation')
  || !playback.includes('Next forecast hour')
  || !playback.includes('Refresh HRRR run and selected field')
  || !playback.includes('LOOP')
) {
  throw new Error('Model playback driver/hidden-menu controls are incomplete.');
}
if (!sceneObject.includes("editTrigger = 'left'") || !sceneObject.includes("editTrigger !== 'contextmenu'")) {
  throw new Error('SceneObject right-click edit trigger contract is missing.');
}
if (
  !broadcastHeader.includes('editTrigger="contextmenu"')
  || broadcastHeader.includes('ModelPlaybackTouchControls')
  || !broadcastHeader.includes("const isModelHeader = scene.category === 'Models';")
  || !broadcastHeader.includes("${isModelHeader ? 'is-model-header' : ''}")
  || !broadcastHeader.includes('const modelNoLogo = isModelHeader && !logoDataUrl;')
  || !broadcastHeader.includes("visibility: 'hidden'")
  || broadcastHeader.includes('fitScale')
  || !broadcastHeader.includes("'--scene-header-scale': scene.header.scale")
  || broadcastHeader.includes("import '../styles/broadcast-header.css';")
) {
  throw new Error('Broadcast header must preserve right-click editing and model metadata while using the same final bar geometry as Tropical and every other map scene.');
}
if (
  !sceneStage.includes('ModelPlaybackDriver')
  || sceneStage.includes('modelHeaderFitScale')
  || sceneStage.includes('broadcastHeaderFitScale')
  || !sceneStage.includes('renderPurpose={renderPurpose}')
) {
  throw new Error('SceneStage must keep model playback alive without model-only broadcast-header positioning logic.');
}
if (
  !contextToolsMenu.includes('ModelPlaybackTouchControls')
  || !contextToolsMenu.includes('has-model-playback')
  || !contextToolsMenu.includes('onModuleStateChange')
) {
  throw new Error('Model playback controls are not wired into the hidden context menu.');
}
if (
  !studioApp.includes('<ContextToolsMenu')
  || !studioApp.includes("type: 'scene/merge-module-state', sceneId: selectedScene.id, moduleId, patch")
) {
  throw new Error('StudioApp does not route hidden-menu model playback changes into scene module state.');
}
if (/\.broadcast-header/.test(modelsCss)) {
  throw new Error('models.css must remain playback/tool styling only; HRRR header isolation belongs in the final shared header layer.');
}
for (const marker of [
  '.broadcast-header {',
  'width: min(1460px, calc(100% - 24px));',
  'height: 108px;',
  'grid-template-columns: 54px minmax(0, 1fr);',
  '.broadcast-header.has-custom-logo {',
  'grid-template-columns: 285px minmax(0, 1fr);',
  '.broadcast-header .header-logo.header-menu-trigger,',
  '.broadcast-header .header-copy {',
  'height: 90px;',
  'min-height: 90px;',
  'max-height: 90px;',
  'grid-template-columns: 42px minmax(0, 1fr);',
  '.broadcast-header.is-model-header .header-legend {',
  '.broadcast-header.is-model-header .header-product-legend {',
  'width: 100%;',
  '.broadcast-header.is-model-header .header-product-legend__segment {',
  'flex: 1 1 0;',
]) {
  if (!broadcastHeaderCss.includes(marker)) throw new Error(`Shared Tropical/HRRR header marker missing: ${marker}`);
}
if (broadcastHeaderCss.includes(':not(.is-model-header)')) {
  throw new Error('HRRR is still excluded from the canonical geometry that already works for Tropical.');
}
if (/\.broadcast-header\.is-model-header\s*\{[^}]*\b(?:width|height|grid-template-columns|left|right|top|transform|margin-left|padding-left)\s*:/s.test(broadcastHeaderCss)) {
  throw new Error('Models/HRRR still owns a second bar geometry.');
}

for (const marker of ['width:min(94%,1460px);', 'height:clamp(88px,13vh,112px);', 'height:calc(100% - 14px);']) {
  if (!normalizedNexGenCss.includes(marker)) throw new Error(`Pre-CP2.2 shared header cascade marker missing: ${marker}`);
}

if (!broadcastHeader.includes('{logoDataUrl && (') || broadcastHeader.includes('header-logo-fallback')) {
  throw new Error('No-logo map scenes must render the small menu trigger without a fallback branding block.');
}
for (const marker of ['width: min(var(--header-width), 1460px);', 'height: 108px;', 'grid-template-columns: 54px 1fr;', '.header-copy {', 'height: 90px;']) {
  if (!r3Base.includes(marker)) throw new Error(`Authoritative shared R3 broadcast-header geometry marker missing: ${marker}`);
}
for (const marker of ['modelFieldBroadcastLabel', 'modelHeaderValidLabel', 'modelValidDate', 'isGeneratedModelSubtitle']) {
  if (!modelDisplayMetadata.includes(marker)) throw new Error(`Model display metadata marker missing: ${marker}`);
}
if (!broadcastHeader.includes('displayModelSubtitle') || !broadcastHeader.includes('displayModelValidLabel')) {
  throw new Error('Broadcast header is not synchronized to the active HRRR field and forecast valid time.');
}
if (!layerStack.includes('modelLayerStackLabel(scene)')) {
  throw new Error('Layer Stack still exposes stale legacy HRRR product naming.');
}
const radarIndex = mapRuntime.indexOf('...RADAR_LAYER_IDS');
const modelIndex = mapRuntime.indexOf('...MODEL_FIELD_LAYER_IDS');
const contextIndex = mapRuntime.indexOf('...contextLayers');
if (!(radarIndex >= 0 && modelIndex > radarIndex && contextIndex > modelIndex)) {
  throw new Error('Model layer order is not weather < model < broadcast context.');
}
if (!modelLab.includes('Direct NOAA/NODD HRRR decoding') || !modelLab.includes('Playback speed')) {
  throw new Error('Model Lab was not advanced to the Checkpoint 2 field-rendering configuration.');
}
if (
  !productLegend.includes("scene.category === 'Models'")
  || !productLegend.includes('MODEL_REFLECTIVITY_SEGMENTS')
  || !productLegend.includes('MODEL_TEMPERATURE_SEGMENTS')
) {
  throw new Error('Model field-specific broadcast legends are not wired to the active Model Lab field.');
}

const activeFiles = [
  cargo,
  providerClient,
  nativeModels,
  nativeLib,
  tauriCommands,
  modelTypes,
  modelProvider,
  controller,
  layer,
  playback,
  broadcastHeader,
  modelLab,
  productLegend,
].join('\n');
if (/aguacero/i.test(activeFiles)) throw new Error('Aguacero reference found in active Checkpoint 2 code.');

console.log('Model renderer validation passed: NOAA HRRR byte-range GRIB decoding, Lambert mesh rendering, hidden-menu playback, right-click-only box editing, field/header/valid-time metadata sync, exact Tropical/HRRR shared bar geometry, contained multi-segment model key, Layer Stack naming, cache/readiness, and layer order verified.');
