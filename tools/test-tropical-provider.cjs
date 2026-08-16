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
        if (command !== 'fetch_tropical_catalog') throw new Error(`Unexpected command ${command}`);
        const point = (wallet, name, tau, lon, lat) => ({
          type: 'Feature',
          properties: {
            idp_source: `${wallet}_forecast`,
            stormname: name,
            stormtype: 'Hurricane',
            basin: wallet.slice(0, 2),
            advisnum: '12',
            advdate: '2026-08-15 21:00 UTC',
            maxwind: tau === 0 ? 90 : 80,
            mslp: tau === 0 ? 970 : 980,
            dvlbl: tau === 0 ? 'H' : 'S',
            tau,
          },
          geometry: { type: 'Point', coordinates: [lon, lat] },
        });
        const line = (wallet, name) => ({
          type: 'Feature',
          properties: { idp_source: `${wallet}_forecast`, stormname: name, stormtype: 'Hurricane' },
          geometry: { type: 'LineString', coordinates: [[-70, 20], [-72, 22]] },
        });
        const polygon = (wallet, name) => ({
          type: 'Feature',
          properties: { idp_source: `${wallet}_forecast`, stormname: name, stormtype: 'Hurricane' },
          geometry: { type: 'Polygon', coordinates: [[[-73, 19], [-69, 19], [-69, 23], [-73, 19]]] },
        });
        return {
          provider: 'NOAA/NWS/NHC Tropical Weather Summary',
          points: { type: 'FeatureCollection', features: [
            point('AT1', 'ALPHA', 0, -70, 20),
            point('AT1', 'ALPHA', 24, -72, 22),
            point('EP2', 'BETA', 0, -110, 15),
            point('CP3', 'GAMMA', 0, -155, 18),
          ] },
          track: { type: 'FeatureCollection', features: [line('AT1', 'ALPHA'), line('EP2', 'BETA'), line('CP3', 'GAMMA')] },
          cone: { type: 'FeatureCollection', features: [polygon('AT1', 'ALPHA'), polygon('EP2', 'BETA'), polygon('CP3', 'GAMMA')] },
          warnings: { type: 'FeatureCollection', features: [
            { ...line('AT1', 'ALPHA'), properties: { idp_source: 'AT1_warning', stormname: 'ALPHA', tcww: 'HWR' } },
          ] },
          cacheStatus: 'live',
        };
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const {
  fetchTropicalCatalog,
  tropicalStormsFromCatalog,
  selectTropicalStorm,
} = require('../src/tropical/tropical-provider.ts');

(async () => {
  const catalog = await fetchTropicalCatalog(false);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { command: 'fetch_tropical_catalog', args: { force: false } });

  const storms = tropicalStormsFromCatalog(catalog);
  assert.deepEqual(storms.map((storm) => storm.id), ['AT1', 'CP3', 'EP2']);
  assert.equal(storms[0].name, 'ALPHA');
  assert.equal(storms[0].maxWindKt, 90);
  assert.deepEqual(storms[0].currentCoordinate, [-70, 20]);

  const alpha = selectTropicalStorm(catalog, 'AT1');
  assert.equal(alpha.selected.id, 'AT1');
  assert.equal(alpha.points.features.length, 2);
  assert.equal(alpha.track.features.length, 1);
  assert.equal(alpha.cone.features.length, 1);
  assert.equal(alpha.warnings.features.length, 1);

  const fallback = selectTropicalStorm(catalog, 'MISSING');
  assert.equal(fallback.selected.id, 'AT1');

  console.log('Tropical provider regression passed: NHC catalog invocation, wallet discovery, storm selection, and GeoJSON filtering verified.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
