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
        if (command !== 'fetch_tropical_storm_surge_catalog') {
          throw new Error(`Unexpected command ${command}`);
        }
        if (args.product === 'potential') {
          return {
            provider: 'NOAA/NWS/NHC Tropical Weather Summary',
            product: 'potential',
            footprint: {
              type: 'FeatureCollection',
              features: [{
                type: 'Feature',
                properties: { idp_filedate: 1786900000000, idp_source: 'AT1_inun' },
                geometry: { type: 'Polygon', coordinates: [[[-90, 28], [-89, 28], [-89, 29], [-90, 28]]] },
              }],
            },
            rasterLayer: 24,
            cacheStatus: 'live',
          };
        }
        return {
          provider: 'NOAA/NWS/NHC Peak Storm Surge',
          product: 'peak',
          points: {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              properties: {
                name: 'blue',
                popupinfo: '{"peak_surge_range":"1-2 ft","color":"blue"}',
              },
              geometry: { type: 'Point', coordinates: [-159.5, 22] },
            }],
          },
          lines: {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              properties: { name: 'yellow', popupinfo: '3-6 ft' },
              geometry: { type: 'LineString', coordinates: [[-90, 29], [-89, 29]] },
            }],
          },
          polygons: {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              properties: { name: 'purple', popupinfo: '12-15 ft' },
              geometry: { type: 'Polygon', coordinates: [[[-90, 28], [-89, 28], [-89, 29], [-90, 28]]] },
            }],
          },
          cacheStatus: 'live',
        };
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const {
  fetchTropicalStormSurgeCatalog,
  stormSurgeFeatureCount,
} = require('../src/tropical/tropical-storm-surge-provider.ts');

(async () => {
  const potential = await fetchTropicalStormSurgeCatalog('potential', false);
  assert.deepEqual(calls[0], {
    command: 'fetch_tropical_storm_surge_catalog',
    args: { product: 'potential', force: false },
  });
  assert.equal(potential.product, 'potential');
  assert.equal(potential.footprint.features.length, 1);
  assert.ok(potential.rasterVersion.includes('1786900000000'));
  assert.equal(stormSurgeFeatureCount(potential), 1);

  const peak = await fetchTropicalStormSurgeCatalog('peak', true);
  assert.deepEqual(calls[1], {
    command: 'fetch_tropical_storm_surge_catalog',
    args: { product: 'peak', force: true },
  });
  assert.equal(peak.points.features[0].properties.ngwxSurgeClass, 'blue');
  assert.equal(
    peak.points.features[0].properties.ngwxSurgeLabel,
    '1-2 ft',
    'structured NHC popup JSON must render only the storm-surge range, never the raw JSON object',
  );
  assert.equal(peak.lines.features[0].properties.ngwxSurgeClass, 'yellow');
  assert.equal(peak.polygons.features[0].properties.ngwxSurgeClass, 'purple');
  assert.equal(stormSurgeFeatureCount(peak), 3);

  console.log('Tropical storm-surge provider regression passed: typed potential/peak requests, potential-raster versioning, structured peak-range popup normalization, category normalization, and feature counts verified.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
