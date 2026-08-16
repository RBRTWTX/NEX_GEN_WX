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

const calls = [];
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === '@tauri-apps/api/core') {
    return {
      invoke: async (command, args) => {
        calls.push({ command, args });
        if (command !== 'fetch_tropical_wind_probability_catalog') {
          throw new Error(`Unexpected command ${command}`);
        }
        return {
          provider: 'NOAA/NWS/NHC Tropical Weather Summary',
          thresholdKnots: args.thresholdKnots,
          probabilities: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: { percentage: '<5%', idp_source: 'AT1_windprob' },
                geometry: { type: 'Polygon', coordinates: [[[-75, 20], [-74, 20], [-74, 21], [-75, 20]]] },
              },
              {
                type: 'Feature',
                properties: { percentage: '30-40%', idp_source: 'AT1_windprob' },
                geometry: { type: 'Polygon', coordinates: [[[-76, 21], [-75, 21], [-75, 22], [-76, 21]]] },
              },
              {
                type: 'Feature',
                properties: { percentage: '>90%', idp_source: 'EP2_windprob' },
                geometry: { type: 'Polygon', coordinates: [[[-110, 15], [-109, 15], [-109, 16], [-110, 15]]] },
              },
            ],
          },
          cacheStatus: 'live',
        };
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const {
  fetchTropicalWindProbabilityCatalog,
  windProbabilityStormWallets,
} = require('../src/tropical/tropical-wind-probability-provider.ts');

(async () => {
  const catalog = await fetchTropicalWindProbabilityCatalog(34, false);
  assert.deepEqual(calls[0], {
    command: 'fetch_tropical_wind_probability_catalog',
    args: { thresholdKnots: 34, force: false },
  });
  assert.equal(catalog.thresholdKnots, 34);
  assert.equal(catalog.probabilities.features[0].properties.ngwxProbabilityRange, '<5%');
  assert.equal(catalog.probabilities.features[0].properties.ngwxProbabilityMin, 0);
  assert.equal(catalog.probabilities.features[0].properties.ngwxProbabilityMax, 5);
  assert.equal(catalog.probabilities.features[1].properties.ngwxProbabilityMin, 30);
  assert.equal(catalog.probabilities.features[1].properties.ngwxProbabilityMax, 40);
  assert.equal(catalog.probabilities.features[2].properties.ngwxProbabilityMin, 90);
  assert.equal(catalog.probabilities.features[2].properties.ngwxProbabilityMax, 100);
  assert.deepEqual(windProbabilityStormWallets(catalog), ['AT1', 'EP2']);

  const hurricane = await fetchTropicalWindProbabilityCatalog(64, true);
  assert.equal(hurricane.thresholdKnots, 64);
  assert.deepEqual(calls[1], {
    command: 'fetch_tropical_wind_probability_catalog',
    args: { thresholdKnots: 64, force: true },
  });

  console.log('Tropical wind-probability provider regression passed: typed 34/64-kt Tauri requests, NHC probability-bin normalization, and storm-wallet discovery verified.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
