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
  if (request === 'react') return { useSyncExternalStore: (_subscribe, get) => get() };
  return originalLoad.call(this, request, parent, isMain);
};

const store = require('../src/radar/radar-runtime-store.ts');

const a = store.getRadarRuntimeSnapshot('scene-a', 'operator');
const b = store.getRadarRuntimeSnapshot('scene-a', 'operator');
assert.equal(a, b, 'empty external-store snapshot must be referentially stable');
assert.notEqual(a, store.getRadarRuntimeSnapshot('scene-a', 'output'), 'channels must have separate stable snapshots');

store.publishRadarRuntime('scene-a', { loading: true }, 'operator');
const published = store.getRadarRuntimeSnapshot('scene-a', 'operator');
assert.notEqual(published, a, 'publishing must create a changed snapshot');
assert.equal(store.getRadarRuntimeSnapshot('scene-a', 'operator'), published, 'published snapshot must remain stable between changes');

store.clearRadarRuntime('scene-a', 'operator');
assert.equal(store.getRadarRuntimeSnapshot('scene-a', 'operator'), a, 'clear should return to the same cached empty snapshot');
console.log('Radar runtime store regression passed: React external-store snapshots are stable by scene and channel.');
