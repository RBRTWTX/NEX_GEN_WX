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
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  module._compile(output.outputText, filename);
}
Module._extensions['.ts'] = transpile;

const calls = [];
let mrmsResponse = {
  cacheStatus: 'live',
  metadata: { timeInfo: { timeExtent: [1761500000000, 1761500900000] } },
  query: {
    features: [
      { attributes: { idp_validtime: 1761500000000 } },
      { attributes: { idp_validtime: 1761500300000 } },
      { attributes: { idp_validtime: 1761500600000 } },
      { attributes: { idp_validtime: 1761500900000 } },
    ],
  },
};

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === '@tauri-apps/api/core') {
    return {
      invoke: async (command, args) => {
        calls.push({ command, args });
        if (command === 'fetch_radar_mrms_catalog') return mrmsResponse;
        if (command === 'fetch_radar_sites') {
          return {
            cacheStatus: 'live',
            provider: 'IEM',
            radars: [
              { id: 'EWX', name: 'Austin/San Antonio', distance_miles: 12 },
              { id: 'GRK', name: 'Central Texas', distance_miles: 58 },
            ],
          };
        }
        if (command === 'fetch_radar_site_catalog') {
          return {
            cacheStatus: 'live',
            generatedAt: '2026-07-26T21:45:00Z',
            requestStart: '2026-07-26T18:00:00Z',
            scans: [
              { timestamp: '202607262000' },
              { timestamp: '202607262005' },
              { timestamp: '202607262010' },
            ],
          };
        }
        throw new Error(`Unexpected invoke command ${command}`);
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const provider = require('../src/radar/radar-provider.ts');
const radarTypes = require('../src/radar/radar-types.ts');
const commands = require('../src/engine/tauri-commands.ts');

async function main() {
  const mrms = await provider.fetchMrmsRadarCatalog(3, true);
  assert.equal(mrms.provider, 'noaa-mrms');
  assert.deepEqual(mrms.frames.map((frame) => frame.epochMs), [1761500300000, 1761500600000, 1761500900000]);
  assert.match(provider.mrmsTileUrl(mrms.frames.at(-1).epochMs), /time=1761500900000/);
  assert.match(provider.mrmsTileUrl(null), /exportImage\?bbox=/);

  mrmsResponse = {
    cacheStatus: 'live',
    cacheWarning: 'MRMS frame-query endpoint unavailable',
    metadata: { timeInfo: { timeExtent: [1761500000000, 1761500900000] } },
    query: {},
  };
  const metadataOnly = await provider.fetchMrmsRadarCatalog(12, true);
  assert.deepEqual(metadataOnly.frames.map((frame) => frame.epochMs), [1761500900000]);
  assert.match(metadataOnly.cacheWarning, /frame-query endpoint unavailable/);

  const sites = await provider.fetchAvailableRadarSites(29.42, -98.49, true);
  assert.deepEqual(sites.map((site) => site.id), ['EWX', 'GRK']);
  assert.ok(!sites.some((site) => site.id === 'LIVE' || site.id === 'IEM'));
  assert.ok(sites[0].distanceKm > 19 && sites[0].distanceKm < 20);

  const siteCatalog = await provider.fetchSiteRadarCatalog('KEWX', 'site-base-velocity', 2, true);
  assert.equal(siteCatalog.product, 'site-base-velocity');
  assert.deepEqual(siteCatalog.frames.map((frame) => frame.timestamp), ['202607262005', '202607262010']);
  assert.equal(radarTypes.iemProductCode('site-base-velocity'), 'N0U');
  assert.equal(radarTypes.radarPlaybackFrameIndex({ animationEnabled: true, frameIndex: 1, playbackRateMs: 1000, playbackStartedAt: 10_000 }, 4, 12_100), 3);
  assert.equal(radarTypes.radarPlaybackFrameIndex({ animationEnabled: true, frameIndex: 1, playbackRateMs: 1000, playbackStartedAt: 10_000 }, 4, 14_100), 1);
  assert.equal(
    provider.iemRadarTileUrl('EWX', 'N0U', '202607262010'),
    'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::EWX-N0U-202607262010/{z}/{x}/{y}.png',
  );
  assert.match(provider.iemRadarTileUrl('EWX', 'N0B', 'bad'), /EWX-N0B-0/);

  const siteCall = calls.find((call) => call.command === 'fetch_radar_site_catalog');
  assert.equal(siteCall.args.site, 'EWX');
  assert.equal(siteCall.args.productCode, 'N0U');
  assert.match(siteCall.args.start, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/);
  assert.match(siteCall.args.end, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/);

  await assert.rejects(() => commands.fetchRadarSites(91, -98, '2026-07-26T20:00Z'), /latitude/);
  await assert.rejects(
    () => commands.fetchRadarSiteCatalog('EWX!', 'N0B', '2026-07-26T19:00Z', '2026-07-26T20:00Z'),
    /site identifier/,
  );
  await assert.rejects(
    () => commands.fetchRadarSiteCatalog('EWX', 'N0Q', '2026-07-26T19:00Z', '2026-07-26T20:00Z'),
    /Unsupported single-site radar product/,
  );

  console.log('Radar provider regression passed: typed native arguments, provider-confirmed MRMS frames, IEM site normalization, Level III catalogs, product codes, and tile URLs verified.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
