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

let calls = 0;
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === '../engine/tauri-commands') {
    return {
      fetchModelHrrrCycleCatalog: async (date, cycle) => {
        calls += 1;
        if (calls < 3) return { provider: 'noaa-nodd-hrrr', model: 'hrrr', date, cycle, forecastHours: [] };
        return { provider: 'noaa-nodd-hrrr', model: 'hrrr', date, cycle, forecastHours: [0, 1, 2, 3, 6, 12, 18] };
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const provider = require('../src/models/model-provider.ts');
const types = require('../src/models/model-types.ts');

(async () => {
  const candidates = provider.candidateHrrrRuns(Date.UTC(2026, 7, 18, 17, 30), 3);
  assert.deepEqual(candidates, [
    { date: '20260818', cycle: 16 },
    { date: '20260818', cycle: 15 },
    { date: '20260818', cycle: 14 },
  ]);

  const catalog = await provider.fetchLatestHrrrCatalog(false);
  assert.equal(calls, 3);
  assert.equal(catalog.provider, 'noaa-nodd-hrrr');
  assert.deepEqual(catalog.run.forecastHours, [0, 1, 2, 3, 6, 12, 18]);

  assert.equal(
    provider.hrrrSurfaceIndexUrl('20260818', 16, 3),
    'https://noaa-hrrr-bdp-pds.s3.amazonaws.com/hrrr.20260818/conus/hrrr.t16z.wrfsfcf03.grib2.idx',
  );
  assert.deepEqual(types.parseModelRunId('20260818T16Z'), { date: '20260818', cycle: 16 });
  assert.equal(types.nearestForecastHour(5, [0, 3, 6, 9]), 6);

  console.log('Model provider regression passed: HRRR cycle fallback, run parsing, forecast hours, and direct NODD object paths verified.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
