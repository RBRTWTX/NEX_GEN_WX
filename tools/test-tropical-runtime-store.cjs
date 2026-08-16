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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  module._compile(output.outputText, filename);
}
Module._extensions['.ts'] = transpile;

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'react') {
    return { useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot() };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const {
  clearTropicalRuntime,
  getTropicalRuntimeSnapshot,
  publishTropicalRuntime,
  subscribeTropicalRuntime,
} = require('../src/tropical/tropical-runtime-store.ts');

const sceneId = 'tropical-test';
let notifications = 0;
const unsubscribe = subscribeTropicalRuntime(sceneId, () => { notifications += 1; });

assert.equal(getTropicalRuntimeSnapshot(sceneId).loading, false);
publishTropicalRuntime(sceneId, {
  loading: true,
  provider: 'NOAA/NWS/NHC Tropical Weather Summary',
});
assert.equal(getTropicalRuntimeSnapshot(sceneId).loading, true);
assert.equal(notifications, 1);

publishTropicalRuntime(sceneId, {
  loading: false,
  selectedStormId: 'AT1',
  featureCounts: { points: 9, track: 1, cone: 1, warnings: 2 },
});
assert.equal(getTropicalRuntimeSnapshot(sceneId).selectedStormId, 'AT1');
assert.equal(getTropicalRuntimeSnapshot(sceneId).featureCounts.warnings, 2);
assert.equal(notifications, 2);

clearTropicalRuntime(sceneId);
assert.equal(getTropicalRuntimeSnapshot(sceneId).selectedStormId, null);
assert.equal(notifications, 3);
unsubscribe();

publishTropicalRuntime(sceneId, { selectedStormId: 'AT1' }, 'output');
assert.equal(getTropicalRuntimeSnapshot(sceneId, 'operator').selectedStormId, null);
assert.equal(getTropicalRuntimeSnapshot(sceneId, 'output').selectedStormId, 'AT1');
clearTropicalRuntime(sceneId, 'output');

console.log('Tropical runtime regression passed: operator/output isolation, publishing, subscriptions, and clearing verified.');
