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

const runtime = require('../src/tropical/tropical-wind-probability-runtime-store.ts');

const operatorBefore = runtime.getTropicalWindProbabilityRuntimeSnapshot('scene-1', 'operator');
const outputBefore = runtime.getTropicalWindProbabilityRuntimeSnapshot('scene-1', 'output');
assert.equal(operatorBefore.featureCount, 0);
assert.equal(outputBefore.featureCount, 0);
assert.notStrictEqual(operatorBefore, outputBefore);

let notifications = 0;
const unsubscribe = runtime.subscribeTropicalWindProbabilityRuntime(
  'scene-1',
  () => { notifications += 1; },
  'operator',
);

runtime.publishTropicalWindProbabilityRuntime(
  'scene-1',
  {
    thresholdKnots: 34,
    featureCount: 8,
    stormCount: 2,
    provider: 'NHC',
  },
  'operator',
);
const operatorAfter = runtime.getTropicalWindProbabilityRuntimeSnapshot('scene-1', 'operator');
assert.equal(operatorAfter.thresholdKnots, 34);
assert.equal(operatorAfter.featureCount, 8);
assert.equal(operatorAfter.stormCount, 2);
assert.equal(notifications, 1);

const outputAfter = runtime.getTropicalWindProbabilityRuntimeSnapshot('scene-1', 'output');
assert.equal(outputAfter.featureCount, 0);

runtime.clearTropicalWindProbabilityRuntime('scene-1', 'operator');
assert.equal(runtime.getTropicalWindProbabilityRuntimeSnapshot('scene-1', 'operator').featureCount, 0);
assert.equal(notifications, 2);
unsubscribe();

console.log('Tropical wind-probability runtime regression passed: stable operator/output isolation, publishing, subscriptions, and clearing verified.');
