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
Module._extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  module._compile(output.outputText, filename);
};

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'react') {
    return { useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot() };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const runtime = require('../src/tropical/tropical-arrival-time-runtime-store.ts');

const operatorBefore = runtime.getTropicalArrivalTimeRuntimeSnapshot('scene-1', 'operator');
const outputBefore = runtime.getTropicalArrivalTimeRuntimeSnapshot('scene-1', 'output');
assert.equal(operatorBefore.contourCount, 0);
assert.equal(outputBefore.contourCount, 0);
assert.notStrictEqual(operatorBefore, outputBefore);

let notifications = 0;
const unsubscribe = runtime.subscribeTropicalArrivalTimeRuntime(
  'scene-1',
  () => { notifications += 1; },
  'operator',
);
runtime.publishTropicalArrivalTimeRuntime('scene-1', {
  mode: 'earliest',
  contourCount: 7,
  probabilityAreaCount: 10,
  stormCount: 1,
  provider: 'NHC',
}, 'operator');
const operatorAfter = runtime.getTropicalArrivalTimeRuntimeSnapshot('scene-1', 'operator');
assert.equal(operatorAfter.mode, 'earliest');
assert.equal(operatorAfter.contourCount, 7);
assert.equal(operatorAfter.probabilityAreaCount, 10);
assert.equal(notifications, 1);
assert.equal(runtime.getTropicalArrivalTimeRuntimeSnapshot('scene-1', 'output').contourCount, 0);

runtime.clearTropicalArrivalTimeRuntime('scene-1', 'operator');
assert.equal(runtime.getTropicalArrivalTimeRuntimeSnapshot('scene-1', 'operator').contourCount, 0);
assert.equal(notifications, 2);
unsubscribe();

console.log('Tropical arrival-time runtime regression passed: stable operator/output isolation, publishing, subscriptions, and clearing verified.');
