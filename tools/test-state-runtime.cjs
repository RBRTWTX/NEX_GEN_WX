const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');
const Module = require('node:module');

function loadTypeScript() {
  try {
    return require('typescript');
  } catch {
    const globalRoot = childProcess.execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    return require(path.join(globalRoot, 'typescript'));
  }
}

const ts = loadTypeScript();

function transpile(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      resolveJsonModule: true,
      moduleResolution: ts.ModuleResolutionKind.Node10,
    },
  });
  module._compile(output.outputText, filename);
}

Module._extensions['.ts'] = transpile;

const { defaultProject } = require('../src/scenes/default-project.ts');
const { migrateProject } = require('../src/core/project-migration.ts');
const { createInitialStudioState } = require('../src/state/studio-state.ts');
const { studioReducer } = require('../src/state/studio-reducer.ts');

function clone(value) {
  return structuredClone(value);
}

const sourceProject = clone(defaultProject);
let state = createInitialStudioState(sourceProject);
assert.equal(state.project.document, sourceProject, 'initial state should retain the supplied project document');
assert.equal(state.project.document.schemaVersion, 8);

const secondScene = sourceProject.scenes[1];
const beforeSelectUpdatedAt = state.project.document.updatedAt;
state = studioReducer(state, { type: 'scene/select', sceneId: secondScene.id });
assert.equal(state.project.document.selectedSceneId, secondScene.id, 'scene selection should update selectedSceneId');
assert.equal(state.project.document.updatedAt, beforeSelectUpdatedAt, 'scene selection must not mark scene content as edited');
assert.equal(state.project.persistence, 'idle', 'scene selection must not mark project persistence dirty');

const documentBeforeDialog = state.project.document;
state = studioReducer(state, { type: 'ui/open-dialog', dialog: 'settings', settingsTab: 'map' });
assert.equal(state.ui.activeDialog, 'settings');
assert.equal(state.ui.settingsTab, 'map');
assert.equal(state.project.document, documentBeforeDialog, 'opening operator UI must not alter project data');

const editableSceneId = state.project.document.selectedSceneId;
const styleDocumentBefore = state.project.document;
state = studioReducer(state, {
  type: 'ui/select-scene-element',
  selection: { sceneId: editableSceneId, elementId: 'map.header.title', label: 'Map header title', kind: 'text', source: 'built-in' },
});
assert.equal(state.project.document, styleDocumentBefore, 'selecting authored text must remain operator-only state');
assert.equal(state.ui.selectedSceneElement.elementId, 'map.header.title');
state = studioReducer(state, {
  type: 'scene/set-element-style',
  sceneId: editableSceneId,
  elementId: 'map.header.title',
  style: { color: '#ffcc00', fontSizePx: 52, backgroundColor: undefined },
});
const styledScene = state.project.document.scenes.find((scene) => scene.id === editableSceneId);
assert.deepEqual(
  styledScene.elementOverrides['map.header.title'].style,
  { color: '#ffcc00', fontSizePx: 52 },
  'scene-specific style changes should persist without undefined properties',
);
assert.equal(state.project.persistence, 'dirty');
state = studioReducer(state, {
  type: 'scene/reset-element-style',
  sceneId: editableSceneId,
  elementId: 'map.header.title',
});
const resetScene = state.project.document.scenes.find((scene) => scene.id === editableSceneId);
assert.equal(resetScene.elementOverrides['map.header.title'], undefined, 'style reset should remove the override');

const originalSceneCount = state.project.document.scenes.length;
const sourceScene = state.project.document.scenes[0];
const sourceSnapshot = clone(sourceScene);
state = studioReducer(state, { type: 'scene/duplicate', sceneId: sourceScene.id, name: 'Runtime Copy' });
assert.equal(state.project.document.scenes.length, originalSceneCount + 1, 'duplicate should add exactly one scene');
assert.deepEqual(state.project.document.scenes[0], sourceSnapshot, 'duplicate must not mutate the source scene');
assert.notEqual(state.project.document.selectedSceneId, sourceScene.id, 'duplicate should become the selected scene');
assert.equal(state.project.persistence, 'dirty', 'content edits should mark persistence dirty');

state = studioReducer(state, {
  type: 'scene/merge-module-state',
  sceneId: state.project.document.selectedSceneId,
  moduleId: 'radar',
  patch: { selectedSite: 'auto', blendEnabled: true },
});
const moduleScene = state.project.document.scenes.find((scene) => scene.id === state.project.document.selectedSceneId);
assert.deepEqual(moduleScene.moduleState.radar, { selectedSite: 'auto', blendEnabled: true }, 'module state should remain isolated by module id');
state = studioReducer(state, {
  type: 'scene/set-module-active',
  sceneId: moduleScene.id,
  moduleId: 'radar',
  value: true,
});
assert.ok(state.project.document.scenes.find((scene) => scene.id === moduleScene.id).activeModuleIds.includes('radar'));
state = studioReducer(state, {
  type: 'scene/normalize-module-state',
  sceneId: moduleScene.id,
  moduleState: { ...moduleScene.moduleState, radar: { selectedSite: 'auto', blendEnabled: true, animationEnabled: false } },
});
assert.equal(
  state.project.document.scenes.find((scene) => scene.id === moduleScene.id).moduleState.radar.animationEnabled,
  false,
  'normalized module defaults should persist through the generic scene module-state boundary',
);

const show = state.project.document.shows[0];
state = studioReducer(state, { type: 'presentation/start-show', showId: show.id });
assert.equal(state.presentation.playing, true, 'show should start playing');
assert.equal(state.presentation.showId, show.id);
assert.equal(state.project.document.selectedSceneId, show.sceneIds[0]);
if (show.sceneIds.length > 1) {
  state = studioReducer(state, { type: 'presentation/advance-show', direction: 1 });
  assert.equal(state.presentation.sceneIndex, 1, 'show advance should update the rundown index');
  assert.equal(state.project.document.selectedSceneId, show.sceneIds[1]);
}
state = studioReducer(state, { type: 'presentation/stop-show' });
assert.equal(state.presentation.playing, false);
assert.equal(state.presentation.showId, null);

state = studioReducer(state, { type: 'presentation/output-sync-start', renderId: 'render-1', sceneId: state.project.document.selectedSceneId });
assert.equal(state.presentation.outputStatus, 'syncing');
state = studioReducer(state, {
  type: 'presentation/output-ack', renderId: 'stale-render', sceneId: state.project.document.selectedSceneId,
  ready: true, width: 1920, height: 1080, detail: 'stale',
});
assert.equal(state.presentation.outputStatus, 'syncing', 'stale output acknowledgements must be ignored');
state = studioReducer(state, {
  type: 'presentation/output-ack', renderId: 'render-1', sceneId: state.project.document.selectedSceneId,
  ready: true, width: 1920, height: 1080, detail: 'Output verified at 1920×1080.',
});
assert.equal(state.presentation.outputStatus, 'ready');
assert.equal(state.presentation.outputWidth, 1920);
assert.equal(state.presentation.outputHeight, 1080);

const legacy = clone(defaultProject);
legacy.schemaVersion = 5;
delete legacy.branding;
legacy.selectedSceneId = 'missing-scene';
legacy.shows = undefined;
const migrated = migrateProject(legacy);
assert.equal(migrated.schemaVersion, 8, 'migration should upgrade schema to version 8');
assert.equal(migrated.selectedSceneId, migrated.scenes[0].id, 'migration should recover an invalid selected scene');
assert.ok(migrated.shows.length > 0, 'migration should create a usable default show');
assert.equal(migrated.branding.studioName, 'NEX GEN WX');

migrated.scenes[0].elementOverrides['map.header.title'] = {
  style: { color: '#ffffff', backgroundColor: '#12233d', fontWeight: 900 },
  transform: { xPercent: 2, rotationDeg: 3 },
};
const serialized = JSON.stringify(migrated);
const roundTrip = migrateProject(JSON.parse(serialized));
assert.equal(roundTrip.schemaVersion, 8);
assert.equal(roundTrip.scenes.length, migrated.scenes.length);
assert.equal(roundTrip.shows.length, migrated.shows.length);
assert.equal(roundTrip.selectedSceneId, migrated.selectedSceneId);
assert.deepEqual(
  roundTrip.scenes[0].elementOverrides['map.header.title'].style,
  { color: '#ffffff', backgroundColor: '#12233d', fontWeight: 900 },
  'scene element styles must survive project JSON round trips',
);

console.log(`State runtime regression passed: ${roundTrip.scenes.length} scenes, ${roundTrip.shows.length} show(s), immutable UI/project boundaries verified.`);
