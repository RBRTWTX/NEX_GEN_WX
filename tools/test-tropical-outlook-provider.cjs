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
        if (command !== 'fetch_tropical_outlook_catalog') throw new Error(`Unexpected command ${command}`);
        const period = args.period;
        const probability = period === '2day' ? '30%' : '70%';
        const point = {
          type: 'Feature',
          properties: {
            basin: 'Atlantic',
            prob2day: '30%',
            risk2day: 'Low',
            prob7day: '70%',
            risk7day: 'High',
          },
          geometry: { type: 'Point', coordinates: [-55, 15] },
        };
        const polygon = {
          type: 'Feature',
          properties: {
            basin: 'Atlantic',
            prob2day: '20%',
            risk2day: 'Low',
            prob7day: '50%',
            risk7day: 'Medium',
          },
          geometry: { type: 'Polygon', coordinates: [[[-60, 10], [-50, 10], [-50, 20], [-60, 10]]] },
        };
        const line = {
          type: 'Feature',
          properties: {
            basin: 'Atlantic',
            prob2day: probability,
            risk2day: 'Low',
            prob7day: probability,
            risk7day: period === '2day' ? 'Low' : 'High',
          },
          geometry: { type: 'LineString', coordinates: [[-55, 15], [-60, 17]] },
        };
        return {
          provider: 'NOAA/NWS/NHC Tropical Weather Summary',
          period,
          locations: { type: 'FeatureCollection', features: [point] },
          regions: { type: 'FeatureCollection', features: period === '7day' ? [polygon] : [] },
          motion: { type: 'FeatureCollection', features: period === '7day' ? [line] : [] },
          cacheStatus: 'live',
        };
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const {
  annotateTropicalOutlookRegionLabels,
  fetchTropicalOutlookCatalog,
} = require('../src/tropical/tropical-outlook-provider.ts');

(async () => {
  const twoDay = await fetchTropicalOutlookCatalog('2day', false);
  assert.deepEqual(calls[0], {
    command: 'fetch_tropical_outlook_catalog',
    args: { period: '2day', force: false },
  });
  assert.equal(twoDay.locations.features[0].properties.ngwxProbability, 30);
  assert.equal(twoDay.locations.features[0].properties.ngwxRisk, 'LOW');
  assert.equal(twoDay.regions.features.length, 0);
  assert.equal(twoDay.motion.features.length, 0);

  const sevenDay = await fetchTropicalOutlookCatalog('7day', true);
  assert.deepEqual(calls[1], {
    command: 'fetch_tropical_outlook_catalog',
    args: { period: '7day', force: true },
  });
  assert.equal(sevenDay.locations.features[0].properties.ngwxProbability, 70);
  assert.equal(sevenDay.locations.features[0].properties.ngwxRisk, 'HIGH');
  assert.equal(sevenDay.regions.features[0].properties.ngwxProbability, 50);
  assert.equal(sevenDay.motion.features[0].properties.ngwxProbability, 70);

  const fallbackRegions = annotateTropicalOutlookRegionLabels(
    {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { ngwxProbability: 60 },
          geometry: { type: 'Polygon', coordinates: [[[-60, 10], [-50, 10], [-50, 20], [-60, 10]]] },
        },
        {
          type: 'Feature',
          properties: { ngwxProbability: 80 },
          geometry: { type: 'Polygon', coordinates: [[[-120, 10], [-110, 10], [-110, 20], [-120, 10]]] },
        },
      ],
    },
    {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { ngwxProbability: 60 },
        geometry: { type: 'Point', coordinates: [-55, 15] },
      }],
    },
  );
  assert.equal(
    fallbackRegions.features[0].properties.ngwxRegionProbabilityLabel,
    '',
    'a region containing an NHC current-location point must not duplicate the point percentage',
  );
  assert.equal(
    fallbackRegions.features[1].properties.ngwxRegionProbabilityLabel,
    '80%',
    'a forecast-development region without an NHC current-location point must retain its own probability label',
  );

  console.log('Tropical outlook provider regression passed: typed Tauri period selection, NHC probability normalization, and no-location region percentage fallback verified.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
