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
        if (command !== 'fetch_satellite_catalog') throw new Error(`Unexpected command ${command}`);
        return {
          provider: 'NOAA/NESDIS MERGEDGC_Last_24hr',
          query: {
            features: [
              { attributes: { Start_Time: 1786815600000, End_Time: 1786816199000 } },
              { attributes: { Start_Time: 1786816200000, End_Time: 1786816799000 } },
              { attributes: { Start_Time: 1786816800000, End_Time: 1786817399000 } },
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
  fetchSatelliteFrameCatalog,
  iemArchiveImageUrl,
  iemLatestTileUrl,
  noaaGeoColorTileUrl,
} = require('../src/satellite/satellite-provider.ts');

(async () => {
  assert.equal(
    iemLatestTileUrl('east', 'goes-infrared'),
    'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes_east_conus_ch13/{z}/{x}/{y}.png',
  );
  assert.equal(
    iemLatestTileUrl('west', 'goes-visible'),
    'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/goes_west_conus_ch02/{z}/{x}/{y}.png',
  );

  const iem = await fetchSatelliteFrameCatalog('west', 'goes-water-vapor', 6, false);
  assert.equal(iem.provider, 'iem-goes');
  assert.equal(iem.frames.length, 6);
  assert.equal(iem.frames.at(-1).mode, 'latest-tile');
  assert.equal(iem.frames[0].mode, 'archive-image');

  const archiveUrl = iemArchiveImageUrl(
    'goes-water-vapor',
    iem.frames[0],
    { west: -110, south: 20, east: -85, north: 40 },
    1000,
    700,
  );
  assert.ok(archiveUrl.startsWith('https://mesonet.agron.iastate.edu/GIS/radmap.php?'));
  assert.ok(archiveUrl.includes('goes_product=WV'));
  assert.ok(archiveUrl.includes('layers%5B%5D=goes'));
  assert.ok(archiveUrl.includes('bbox=-110%2C20%2C-85%2C40'));

  const geo = await fetchSatelliteFrameCatalog('east', 'goes-geocolor', 2, false);
  assert.equal(calls[0].command, 'fetch_satellite_catalog');
  assert.deepEqual(calls[0].args, { force: false });
  assert.equal(geo.provider, 'noaa-nesdis-geocolor');
  assert.equal(geo.frames.length, 2);
  assert.equal(geo.frames[0].mode, 'noaa-image-service');
  assert.ok(noaaGeoColorTileUrl(geo.frames[0].epochMs).includes('MERGEDGC_Last_24hr'));
  assert.ok(noaaGeoColorTileUrl(geo.frames[0].epochMs).includes('&time='));

  console.log('Satellite provider regression passed: IEM East/West live tiles, IEM archive-frame URLs, NOAA GeoColor timestamps, and ImageServer tile URLs verified.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});