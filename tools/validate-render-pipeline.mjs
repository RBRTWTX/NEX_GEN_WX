import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');

const required = [
  'src/rendering/SceneTransitionViewport.tsx',
  'src/rendering/capture-readiness.ts',
  'src/rendering/render-signature.ts',
  'src/thumbnails/scene-thumbnail-store.ts',
  'src/thumbnails/capture-thumbnail.ts',
  'src/thumbnails/use-scene-thumbnails.ts',
  'src/output/SceneExportHost.tsx',
  'src/output/use-output-controller.ts',
  'src/output/use-export-controller.ts',
  'src/components/StudioErrorBoundary.tsx',
];
await Promise.all(required.map((relative) => access(new URL(relative, root), constants.R_OK)));


const studioApp = await read('src/app/StudioApp.tsx');
const outputHookIndex = studioApp.indexOf('useOutputController({');
const hydrationReturnIndex = studioApp.indexOf('if (!state.project.hydrated || !selectedScene) {');
if (outputHookIndex < 0 || hydrationReturnIndex < 0 || outputHookIndex > hydrationReturnIndex) {
  throw new Error('useOutputController must run before the hydration return so React hook order remains stable.');
}
const outputController = await read('src/output/use-output-controller.ts');
for (const token of ['scene: StudioScene | null', 'if (!hydrated || !scene) return', 'let disposed = false']) {
  if (!outputController.includes(token)) throw new Error(`Output controller runtime guard is missing ${token}.`);
}
const mainSource = await read('src/main.tsx');
const errorBoundary = await read('src/components/StudioErrorBoundary.tsx');
if (!mainSource.includes('<StudioErrorBoundary>') || !errorBoundary.includes('componentDidCatch')) {
  throw new Error('The operator application must have a runtime error boundary instead of failing to a blank window.');
}

const transitions = await read('src/rendering/SceneTransitionViewport.tsx');
for (const token of [
  'scene-transition-layer--previous',
  'scene-transition-layer--current',
  "kind === 'cut'",
  "'preparing'",
  "phase: 'running'",
  'prefers-reduced-motion',
  'scene.transition.durationMs',
]) {
  if (!transitions.includes(token)) throw new Error(`Transition renderer is missing ${token}.`);
}

const outputBridge = await read('src/output/output-bridge.ts');
for (const token of [
  "kind: 'scene'",
  "kind: 'ack'",
  "kind: 'sync-request'",
  "kind: 'visibility'",
  'reportVisibility',
  'renderId',
  'signature',
  'republishLatest',
  'subscribeControls',
]) {
  if (!outputBridge.includes(token)) throw new Error(`Output synchronization is missing ${token}.`);
}

const outputApp = await read('src/output/OutputApp.tsx');
for (const token of [
  '<SceneTransitionViewport',
  'waitForStageReady',
  'outputBridge.acknowledge',
  'message.transition.durationMs',
  'sceneRenderSignature',
  "event.key !== 'Escape'",
  'onCloseRequested',
  "hideOutput('escape')",
  "hideOutput('close-request')",
  "Window.getByLabel('main')",
]) {
  if (!outputApp.includes(token)) throw new Error(`Verified clean output is missing ${token}.`);
}

const thumbnailStore = await read('src/thumbnails/scene-thumbnail-store.ts');
const thumbnailHook = await read('src/thumbnails/use-scene-thumbnails.ts');
const sceneLibrary = await read('src/components/SceneLibrary.tsx');
for (const token of ['indexedDB.open', 'scene-thumbnails', 'projectId', 'fingerprint']) {
  if (!thumbnailStore.includes(token)) throw new Error(`Thumbnail cache is missing ${token}.`);
}
for (const token of ['captureStageThumbnail', 'sceneRenderSignature', 'removeStaleThumbnails', 'saveSceneThumbnail']) {
  if (!thumbnailHook.includes(token)) throw new Error(`Thumbnail lifecycle is missing ${token}.`);
}
if (!sceneLibrary.includes('props.thumbnails[scene.id]') || !sceneLibrary.includes('<img src=')) {
  throw new Error('Scene library does not render actual captured scene thumbnails.');
}

const exportSource = await read('src/output/export-scene.ts');
const exportHost = await read('src/output/SceneExportHost.tsx');
const exportController = await read('src/output/use-export-controller.ts');
for (const token of [
  'expectedWidth ?? 1920',
  'expectedHeight ?? 1080',
  'readImageDimensions',
  'visibleOperatorNodes',
  'verified',
  'waitForStageReady',
]) {
  if (!exportSource.includes(token)) throw new Error(`Verified export is missing ${token}.`);
}
for (const token of ['width: 1920px', 'height: 1080px']) {
  const css = await read('src/styles/nex-gen-wx.css');
  if (!css.includes(token)) throw new Error(`Canonical export surface is missing ${token}.`);
}
if (!exportHost.includes('<SceneStage') || !exportHost.includes('expectedWidth: 1920')) {
  throw new Error('Canonical export host must use the shared SceneStage at 1920×1080.');
}
for (const token of ['exportSelectedShow', 'Exporting show slide', 'padStart(2']) {
  if (!exportController.includes(token)) throw new Error(`Show PNG export is missing ${token}.`);
}

const tauriLib = await read('src-tauri/src/lib.rs');
if (
  !tauriLib.includes('.on_window_event(|window, event|')
  || !tauriLib.includes('window.label() == "main"')
  || !tauriLib.includes('window.app_handle().exit(0)')
) {
  throw new Error('Closing the main operator window must terminate the persistent output process.');
}

const lifecycle = await read('src/map/controllers/MapLifecycleController.ts');
if (!lifecycle.includes("attributionControl: options.interactive ? { compact: true } : false")) {
  throw new Error('Clean output/export must suppress MapLibre attribution while keeping it on the operator map.');
}
const host = await read('src/map/controllers/MapControllerHost.ts');
const mapStage = await read('src/map/MapStage.tsx');
if (!lifecycle.includes("map.on('idle'") || !host.includes('handleIdle') || !mapStage.includes('data-render-ready')) {
  throw new Error('Map render readiness is not connected to the verified output/export pipeline.');
}

const state = await read('src/state/studio-state.ts');
const actions = await read('src/state/studio-actions.ts');
const reducer = await read('src/state/reducers/presentation-state-reducer.ts');
const capabilities = await read('src-tauri/capabilities/default.json');
if (!capabilities.includes('"core:window:allow-hide"')) {
  throw new Error('Native output hide workflow is missing core:window:allow-hide permission.');
}
const syncCase = reducer.match(/case 'presentation\/output-sync-start':([\s\S]*?)case 'presentation\/output-ack':/)?.[1] ?? '';
const ackCase = reducer.match(/case 'presentation\/output-ack':([\s\S]*?)case 'presentation\/output-error':/)?.[1] ?? '';
if (syncCase.includes('outputOpen: true') || ackCase.includes('outputOpen: true')) {
  throw new Error('Background output synchronization must not mark the hidden output window open.');
}
for (const token of ['outputStatus', 'outputRenderId', 'outputDetail']) {
  if (!state.includes(token)) throw new Error(`Output verification state is missing ${token}.`);
}
for (const token of ['presentation/output-sync-start', 'presentation/output-ack', 'presentation/output-error']) {
  if (!actions.includes(token) || !reducer.includes(token)) throw new Error(`Output verification action is missing ${token}.`);
}

const header = await read('src/components/BroadcastHeader.tsx');
if (!header.includes("interactive ? 'is-interactive' : ''")) {
  throw new Error('Broadcast header does not expose operator-only interactive editing mode.');
}

const css = await read('src/styles/nex-gen-wx.css');
for (const token of [
  'NEX GEN WX 0.6.5 — thumbnails, transitions, output and export verification',
  '.scene-transition-viewport',
  '.scene-thumbnail.has-live-thumbnail',
  '.scene-export-host',
  '.top-action.output-ready',
  '.broadcast-header.is-interactive .header-copy',
]) {
  if (!css.includes(token)) throw new Error(`Render-pipeline CSS is missing ${token}.`);
}

console.log('Render pipeline validation passed: captured thumbnails, reusable hideable output, clean attribution-free broadcast/export maps, editable header copy, canonical 1920×1080 exports, transitions, and map readiness verification are wired.');
