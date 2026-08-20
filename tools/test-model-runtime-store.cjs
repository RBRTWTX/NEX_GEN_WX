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
  clearModelRuntime,
  getModelRuntimeSnapshot,
  publishModelRuntime,
} = require('../src/models/model-runtime-store.ts');

publishModelRuntime('model-scene', {
  provider: 'NOAA NODD HRRR',
  availableHours: [0, 1, 2, 3],
  forecastHour: 2,
}, 'operator');

publishModelRuntime('model-scene', {
  provider: 'Output model provider',
  availableHours: [0, 1],
  forecastHour: 1,
}, 'output');

assert.equal(getModelRuntimeSnapshot('model-scene', 'operator').provider, 'NOAA NODD HRRR');
assert.equal(getModelRuntimeSnapshot('model-scene', 'operator').forecastHour, 2);
assert.deepEqual(getModelRuntimeSnapshot('model-scene', 'operator').availableHours, [0, 1, 2, 3]);
assert.equal(getModelRuntimeSnapshot('model-scene', 'output').provider, 'Output model provider');

clearModelRuntime('model-scene', 'operator');
assert.equal(getModelRuntimeSnapshot('model-scene', 'operator').provider, '');
assert.equal(getModelRuntimeSnapshot('model-scene', 'output').provider, 'Output model provider');

console.log('Model runtime regression passed: per-scene operator/output runtime isolation verified.');
