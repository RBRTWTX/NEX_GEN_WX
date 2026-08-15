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
  clearSatelliteRuntime,
  getSatelliteRuntimeSnapshot,
  publishSatelliteRuntime,
} = require('../src/satellite/satellite-runtime-store.ts');

publishSatelliteRuntime('scene-a', {
  provider: 'IEM GOES',
  source: 'east',
  product: 'goes-infrared',
  validTime: '2026-08-15T18:20:00.000Z',
}, 'operator');
publishSatelliteRuntime('scene-a', {
  provider: 'Output NOAA GOES',
  source: 'west',
}, 'output');

assert.equal(getSatelliteRuntimeSnapshot('scene-a', 'operator').provider, 'IEM GOES');
assert.equal(getSatelliteRuntimeSnapshot('scene-a', 'operator').source, 'east');
assert.equal(getSatelliteRuntimeSnapshot('scene-a', 'output').source, 'west');
assert.notEqual(
  getSatelliteRuntimeSnapshot('scene-a', 'operator'),
  getSatelliteRuntimeSnapshot('scene-a', 'output'),
  'operator and output snapshots must remain isolated',
);

clearSatelliteRuntime('scene-a', 'operator');
assert.equal(getSatelliteRuntimeSnapshot('scene-a', 'operator').provider, '');
assert.equal(getSatelliteRuntimeSnapshot('scene-a', 'output').provider, 'Output NOAA GOES');

console.log('Satellite runtime store regression passed: stable per-scene operator/output channel isolation verified.');