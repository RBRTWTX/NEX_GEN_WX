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

const root = path.resolve(__dirname, '..');
function transpile(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
}
Module._extensions['.ts'] = transpile;

const model = require(path.join(root, 'src/models/model-types.ts'));

assert.deepEqual(model.advanceModelForecastHour(3, [0, 1, 2, 3], 1, true), {
  hour: 0,
  wrapped: true,
  atBoundary: true,
});
assert.deepEqual(model.advanceModelForecastHour(3, [0, 1, 2, 3], 1, false), {
  hour: 3,
  wrapped: false,
  atBoundary: true,
});
assert.deepEqual(model.advanceModelForecastHour(0, [0, 1, 2, 3], -1, true), {
  hour: 3,
  wrapped: true,
  atBoundary: true,
});
assert.equal(model.normalizeModelSceneState({ loopEnabled: false }).loopEnabled, false);
assert.equal(model.normalizeModelSceneState({ playbackRateMs: 1 }).playbackRateMs, 350);
assert.equal(model.DEFAULT_MODEL_SCENE_STATE.field, 'temperature-2m');
assert.equal(model.normalizeModelSceneState({}).field, 'temperature-2m');
assert.equal(model.normalizeModelSceneState({ field: 'temperature-2m' }).field, 'temperature-2m');
assert.equal(model.normalizeModelSceneState({ field: 'composite-reflectivity' }).field, 'composite-reflectivity');

console.log('Model playback regression passed: previous/next boundaries, looping, playback-rate guardrails, CP1 temperature default preservation, and explicit reflectivity selection verified.');
