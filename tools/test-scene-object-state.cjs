const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');
const Module = require('node:module');

function loadTypeScript() {
  try { return require('typescript'); }
  catch {
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

let state = createInitialStudioState(structuredClone(defaultProject));
const sceneId = state.project.document.selectedSceneId;
const object = { id: 'custom-test-text', kind: 'text', label: 'Test Text', text: 'EDIT ME' };
state = studioReducer(state, {
  type: 'scene/add-custom-object',
  sceneId,
  object,
  transform: { xPercent: 12, yPercent: 24, zIndex: 40 },
  style: { color: '#ffffff', backgroundColor: '#123456', gradientStartColor: '#123456', gradientEndColor: '#654321', gradientAngleDeg: 45, fontSizePx: 44 },
});
let scene = state.project.document.scenes.find((item) => item.id === sceneId);
assert.equal(scene.customObjects.length, 1);
assert.equal(scene.customObjects[0].text, 'EDIT ME');
assert.deepEqual(scene.elementOverrides['custom.custom-test-text'].transform, { xPercent: 12, yPercent: 24, zIndex: 40 });

state = studioReducer(state, {
  type: 'scene/set-element-transform',
  sceneId,
  elementId: 'custom.custom-test-text',
  transform: { scaleX: 1.25, scaleY: 0.9, rotationDeg: 8, locked: true, hidden: true },
});
state = studioReducer(state, {
  type: 'scene/set-element-style',
  sceneId,
  elementId: 'custom.custom-test-text',
  style: { borderColor: '#ffcc00', borderWidthPx: 2, borderRadiusPx: 6 },
});
scene = state.project.document.scenes.find((item) => item.id === sceneId);
assert.equal(scene.elementOverrides['custom.custom-test-text'].transform.locked, true);
assert.equal(scene.elementOverrides['custom.custom-test-text'].transform.hidden, true);
assert.equal(scene.elementOverrides['custom.custom-test-text'].style.borderColor, '#ffcc00');
assert.equal(scene.elementOverrides['custom.custom-test-text'].style.gradientAngleDeg, 45);

state = studioReducer(state, {
  type: 'scene/update-custom-object', sceneId, objectId: object.id, patch: { text: 'UPDATED', label: 'Updated Text' },
});
scene = state.project.document.scenes.find((item) => item.id === sceneId);
assert.equal(scene.customObjects[0].text, 'UPDATED');
assert.equal(scene.customObjects[0].label, 'Updated Text');

state = studioReducer(state, { type: 'scene/duplicate-custom-object', sceneId, objectId: object.id });
scene = state.project.document.scenes.find((item) => item.id === sceneId);
assert.equal(scene.customObjects.length, 2);
const duplicate = scene.customObjects[1];
assert.notEqual(duplicate.id, object.id);
assert.equal(duplicate.text, 'UPDATED');
assert.ok(scene.elementOverrides[`custom.${duplicate.id}`]);

const roundTrip = migrateProject(JSON.parse(JSON.stringify(state.project.document)));
assert.equal(roundTrip.schemaVersion, 8);
const roundTripScene = roundTrip.scenes.find((item) => item.id === sceneId);
assert.equal(roundTripScene.customObjects.length, 2);
assert.equal(roundTripScene.elementOverrides['custom.custom-test-text'].transform.rotationDeg, 8);
assert.equal(roundTripScene.elementOverrides['custom.custom-test-text'].style.gradientEndColor, '#654321');

state = studioReducer(state, { type: 'scene/reset-element-transform', sceneId, elementId: 'custom.custom-test-text' });
scene = state.project.document.scenes.find((item) => item.id === sceneId);
assert.deepEqual(scene.elementOverrides['custom.custom-test-text'].transform, {});
assert.ok(Object.keys(scene.elementOverrides['custom.custom-test-text'].style).length > 0);

state = studioReducer(state, { type: 'scene/delete-custom-object', sceneId, objectId: object.id });
scene = state.project.document.scenes.find((item) => item.id === sceneId);
assert.equal(scene.customObjects.some((item) => item.id === object.id), false);
assert.equal(scene.elementOverrides['custom.custom-test-text'], undefined);

console.log('Scene-object state regression passed: add, edit, transform, lock, hide, duplicate, migrate, reset, and delete verified.');
