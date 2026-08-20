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

const metadata = require(path.join(root, 'src/models/model-display-metadata.ts'));

const temperatureScene = {
  category: 'Models',
  moduleState: {},
  product: { id: 'hrrr-reflectivity' },
  header: { subtitle: 'COMPOSITE REFLECTIVITY', validLabel: 'CURRENT' },
};
assert.equal(metadata.modelFieldBroadcastLabel(temperatureScene), '2 M TEMPERATURE');
assert.equal(metadata.modelLayerStackLabel(temperatureScene), 'HRRR · 2 m Temperature');
assert.equal(metadata.isGeneratedModelSubtitle('COMPOSITE REFLECTIVITY'), true);
assert.equal(metadata.isGeneratedModelSubtitle('MY CUSTOM FORECAST'), false);
assert.equal(metadata.isGeneratedModelValidLabel('CURRENT'), true);
assert.equal(metadata.isGeneratedModelValidLabel('TONIGHT'), false);

const run = {
  id: '20260818T17Z',
  date: '20260818',
  cycle: 17,
  label: 'HRRR 20260818 17Z',
  forecastHours: [0, 1, 2, 3],
};
assert.equal(metadata.modelValidDate(run, 2).toISOString(), '2026-08-18T19:00:00.000Z');
const utcLabel = metadata.modelHeaderValidLabel(run, 2, 'en-US', 'UTC');
assert.match(utcLabel, /^VALID /);
assert.match(utcLabel, /7:00 PM/);
assert.match(utcLabel, /UTC/);
assert.equal(metadata.modelHeaderValidLabel(null, 2), 'F02');

console.log('Model display metadata regression passed: active field labels, Layer Stack naming, generated/custom header preservation, and forecast valid-time calculation verified.');
