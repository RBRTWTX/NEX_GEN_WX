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
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
}
Module._extensions['.ts'] = transpile;

const originalLoad = Module._load;
let fieldCall = null;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === '../engine/tauri-commands' && parent?.filename?.endsWith(path.join('src', 'models', 'model-provider.ts'))) {
    return {
      fetchModelHrrrCycleCatalog: async () => ({
        date: '20260818',
        cycle: 17,
        forecastHours: [0, 1, 2, 3],
      }),
      fetchModelHrrrField: async (date, cycle, forecastHour, field, smoothing, force) => {
        fieldCall = { date, cycle, forecastHour, field, smoothing, force };
        return {
          field,
          runId: `${date}T${String(cycle).padStart(2, '0')}Z`,
          date,
          cycle,
          forecastHour,
          nx: 1799,
          ny: 1059,
          iIndices: [0, 1798],
          jIndices: [0, 1058],
          values: [10, 20, 30, 40],
          unit: field === 'temperature-2m' ? '°F' : 'dBZ',
        };
      },
    };
  }
  return originalLoad.apply(this, arguments);
};

(async () => {
  const provider = require(path.join(root, 'src/models/model-provider.ts'));
  const projection = require(path.join(root, 'src/models/hrrr-projection.ts'));

  assert.equal(
    provider.hrrrSurfaceIndexUrl('20260818', 17, 3),
    'https://noaa-hrrr-bdp-pds.s3.amazonaws.com/hrrr.20260818/conus/hrrr.t17z.wrfsfcf03.grib2.idx',
  );

  const catalog = await provider.fetchHrrrCatalogForRun('20260818', 17);
  const grid = await provider.fetchModelFieldGrid(
    { model: 'hrrr', field: 'composite-reflectivity', smoothing: 'balanced' },
    catalog.run,
    3,
  );
  assert.deepEqual(fieldCall, {
    date: '20260818',
    cycle: 17,
    forecastHour: 3,
    field: 'composite-reflectivity',
    smoothing: 'balanced',
    force: false,
  });
  assert.equal(grid.values.length, 4);
  assert.equal(grid.unit, 'dBZ');

  const southwest = projection.hrrrGridLonLat(0, 0);
  const northeast = projection.hrrrGridLonLat(1798, 1058);
  assert.ok(Math.abs(southwest[0] - (-122.719528)) < 0.001);
  assert.ok(Math.abs(southwest[1] - 21.138123) < 0.001);
  assert.ok(Math.abs(northeast[0] - (-60.917)) < 0.01);
  assert.ok(Math.abs(northeast[1] - 47.842) < 0.01);

  console.log('Model field provider regression passed: direct NODD paths, typed field request normalization, 1799x1059 contract, and HRRR Lambert corner projection verified.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
