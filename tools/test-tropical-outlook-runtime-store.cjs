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
  if (request === 'react') return { useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot() };
  return originalLoad.call(this, request, parent, isMain);
};

const {
  publishTropicalOutlookRuntime,
  clearTropicalOutlookRuntime,
  getTropicalOutlookRuntimeSnapshot,
  subscribeTropicalOutlookRuntime,
} = require('../src/tropical/tropical-outlook-runtime-store.ts');

const sceneId = 'outlook-scene';
assert.equal(getTropicalOutlookRuntimeSnapshot(sceneId, 'operator').period, null);
assert.equal(getTropicalOutlookRuntimeSnapshot(sceneId, 'output').featureCounts.locations, 0);

let operatorNotifications = 0;
let outputNotifications = 0;
const stopOperator = subscribeTropicalOutlookRuntime(sceneId, () => { operatorNotifications += 1; }, 'operator');
const stopOutput = subscribeTropicalOutlookRuntime(sceneId, () => { outputNotifications += 1; }, 'output');

publishTropicalOutlookRuntime(sceneId, {
  period: '7day',
  featureCounts: { locations: 2, regions: 2, motion: 1 },
  updatedAt: '2026-08-16T16:00:00Z',
}, 'operator');

assert.equal(operatorNotifications, 1);
assert.equal(outputNotifications, 0);
assert.equal(getTropicalOutlookRuntimeSnapshot(sceneId, 'operator').featureCounts.regions, 2);
assert.equal(getTropicalOutlookRuntimeSnapshot(sceneId, 'output').period, null);

publishTropicalOutlookRuntime(sceneId, {
  period: '2day',
  featureCounts: { locations: 1, regions: 0, motion: 0 },
}, 'output');
assert.equal(outputNotifications, 1);
assert.equal(getTropicalOutlookRuntimeSnapshot(sceneId, 'output').period, '2day');

clearTropicalOutlookRuntime(sceneId, 'operator');
assert.equal(operatorNotifications, 2);
assert.equal(getTropicalOutlookRuntimeSnapshot(sceneId, 'operator').period, null);

stopOperator();
stopOutput();
console.log('Tropical outlook runtime regression passed: stable operator/output channel isolation, publishing, subscriptions, and clearing verified.');
