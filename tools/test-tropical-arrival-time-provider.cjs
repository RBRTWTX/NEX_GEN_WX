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

const calls = [];
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === '@tauri-apps/api/core') {
    return {
      invoke: async (command, args) => {
        calls.push({ command, args });
        if (command === 'fetch_tropical_arrival_time_catalog') {
          return {
            provider: 'NOAA/NWS/NHC Tropical Weather Summary',
            mode: args.mode,
            contours: {
              type: 'FeatureCollection',
              features: [{
                type: 'Feature',
                properties: {
                  arrival_time: '2026-08-18T12:00Z',
                  popupinfo: '<b>TUE 8 AM EDT</b>',
                  idp_source: 'AT1_arrival',
                },
                geometry: { type: 'LineString', coordinates: [[-78, 25], [-77, 26]] },
              }],
            },
            cacheStatus: 'live',
          };
        }
        if (command === 'fetch_tropical_wind_probability_catalog') {
          return {
            provider: 'NOAA/NWS/NHC Tropical Weather Summary',
            thresholdKnots: 34,
            probabilities: {
              type: 'FeatureCollection',
              features: [{
                type: 'Feature',
                properties: { percentage: '30-40%', idp_source: 'AT1_windprob' },
                geometry: { type: 'Polygon', coordinates: [[[-78, 24], [-77, 24], [-77, 25], [-78, 24]]] },
              }],
            },
            cacheStatus: 'live',
          };
        }
        throw new Error(`Unexpected command ${command}`);
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const {
  arrivalTimeStormWallets,
  fetchTropicalArrivalTimeCatalog,
} = require('../src/tropical/tropical-arrival-time-provider.ts');

(async () => {
  const catalog = await fetchTropicalArrivalTimeCatalog('earliest', false);
  assert.deepEqual(calls[0], {
    command: 'fetch_tropical_arrival_time_catalog',
    args: { mode: 'earliest', force: false },
  });
  assert.deepEqual(calls[1], {
    command: 'fetch_tropical_wind_probability_catalog',
    args: { thresholdKnots: 34, force: false },
  });
  assert.equal(catalog.mode, 'earliest');
  assert.equal(catalog.contours.features[0].properties.ngwxArrivalLabel, 'TUE 8 AM EDT');
  assert.equal(catalog.contours.features[0].properties.ngwxWallet, 'AT1');
  assert.equal(catalog.windProbability34.features[0].properties.ngwxProbabilityRange, '30-40%');
  assert.deepEqual(arrivalTimeStormWallets(catalog), ['AT1']);

  const likely = await fetchTropicalArrivalTimeCatalog('most-likely', true);
  assert.equal(likely.mode, 'most-likely');
  assert.equal(calls[2].args.mode, 'most-likely');
  assert.equal(calls[3].args.thresholdKnots, 34);

  console.log('Tropical arrival-time provider regression passed: typed earliest/most-likely requests, NHC contour-label normalization, storm-wallet discovery, and 34-kt probability background verified.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
