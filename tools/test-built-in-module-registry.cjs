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
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  module._compile(output.outputText, filename);
}
Module._extensions['.ts'] = transpile;
Module._extensions['.tsx'] = transpile;

// This is a Node/CommonJS registry smoke test, not a browser bundler test.
// UI modules may legitimately import styles/assets; keep those imports inert.
for (const extension of ['.css', '.scss', '.sass', '.less']) {
  Module._extensions[extension] = (module) => {
    module.exports = {};
  };
}
for (const extension of ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.woff', '.woff2']) {
  Module._extensions[extension] = (module, filename) => {
    module.exports = filename;
  };
}

global.document = {
  createElement: () => ({
    width: 1,
    height: 1,
    getContext: () => ({
      clearRect: () => undefined,
      drawImage: () => undefined,
      createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
      putImageData: () => undefined,
    }),
    toDataURL: () => 'data:image/png;base64,',
  }),
};
global.Image = class Image {};

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'react') {
    return {
      createContext: (value) => ({ value, Provider: ({ children }) => children }),
      useContext: (context) => context.value,
      useMemo: (factory) => factory(),
      useCallback: (callback) => callback,
      useState: (value) => [typeof value === 'function' ? value() : value, () => undefined],
      useEffect: () => undefined,
      useRef: (value) => ({ current: value }),
      useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
    };
  }
  if (request === 'react/jsx-runtime') {
    return { jsx: () => null, jsxs: () => null, Fragment: Symbol('Fragment') };
  }
  if (request === '@tauri-apps/api/core') return { invoke: async () => null };
  if (request === '@tauri-apps/api/event') return { emitTo: async () => undefined, listen: async () => () => undefined };
  if (request === '@tauri-apps/api/window') return { Window: class Window {}, getCurrentWindow: () => ({}) };
  if (request === 'html-to-image') return { toPng: async () => '' };
  if (request === 'maplibre-gl') {
    class Map {}
    class NavigationControl {}
    return { Map, NavigationControl, setWorkerUrl: () => undefined };
  }
  if (request.includes('maplibre-gl-worker')) return 'worker.js';
  return originalLoad.call(this, request, parent, isMain);
};

const { moduleRegistry } = require('../src/modules/registry.ts');
const ids = moduleRegistry.definitions.map((definition) => definition.manifest.id);
for (const id of [
  'scene-engine', 'scene-objects', 'presentation', 'output', 'data-engine', 'map', 'boundaries', 'cities',
  'roads', 'alerts', 'observations', 'temperature', 'radar', 'satellite', 'tropical',
  'forecast', 'rainfall', 'outlooks', 'fronts', 'models', 'graphics', 'drawing', 'assets',
  'color-tables',
]) {
  assert.ok(ids.includes(id), `built-in registry is missing ${id}`);
}
assert.equal(new Set(ids).size, ids.length, 'built-in module IDs must be unique');
assert.deepEqual(
  moduleRegistry.createMapControllers().map((controller) => controller.id),
  ['basemap', 'layer-style', 'roads', 'boundaries', 'cities', 'satellite', 'radar', 'alerts', 'observations', 'camera', 'interaction', 'layer-order', 'resize'],
  'built-in map controllers should be registry-ordered and complete',
);
const providers = moduleRegistry.getProviders();
assert.deepEqual(
  providers.map((provider) => provider.id),
  ['basemap', 'states', 'counties', 'cities', 'roads', 'alerts', 'observations', 'radar-mrms', 'radar-sites', 'satellite-goes'],
  'provider health definitions should be registry-owned',
);
const mapScene = {
  id: 'radar-scene', name: 'Radar', kind: 'map', category: 'Radar', tags: [],
  transition: { type: 'cut', durationMs: 0 }, advance: 'manual', holdSeconds: 10,
  activeModuleIds: ['radar'], moduleState: {}, elementOverrides: {}, customObjects: [],
  camera: { center: [-98, 29], zoom: 7, bearing: 0, pitch: 0 }, baseMap: 'standard', projection: 'mercator',
  product: { category: 'radar', id: 'reflectivity', opacity: 1, smoothing: 'balanced' },
  overlays: { roads: true, states: true, counties: true, cities: true, alerts: true, observations: false, satellite: false },
  display: { cityDensity: 50, cityLabelScale: 100, roadDensity: 50, boundaryWeight: 100, dimBasemapUnderWeather: false },
  alerts: { minimumSeverity: 'unknown', showFill: true, showOutline: true, autoZoomOnSelect: true },
  observations: { field: 'tempF', displayMode: 'broadcast', density: 50, labelScale: 100, showField: false, fieldOpacity: 75, showStations: false, showStationIds: false, smoothing: 'smooth' },
  samples: [], header: { title: 'RADAR', subtitle: '', validLabel: 'CURRENT', visible: true, opacity: 1, scale: 1, legend: { kind: 'reflectivity', visible: true, lowLabel: 'LIGHT', highLabel: 'HEAVY', customLabel: '' } },
};
const normalized = moduleRegistry.normalizeSceneModuleState(mapScene);
assert.equal(normalized.moduleState.radar.mode, 'national');
assert.equal(normalized.moduleState.radar.selectedSite, 'auto');
assert.equal(normalized.moduleState.radar.animationEnabled, false);
assert.equal(normalized.moduleState.radar.blendEnabled, false);
assert.equal(normalized.moduleState.radar.frameCount, 12);
assert.equal(normalized.moduleState.radar.playbackRateMs, 900);
assert.equal(normalized.moduleState.radar.autoRefreshEnabled, true);
assert.ok(moduleRegistry.getDialog('module:radar', normalized));
assert.ok(moduleRegistry.getTools(normalized, 'quick').some((tool) => tool.id === 'radar-quick'));

const satelliteScene = {
  ...mapScene,
  id: 'satellite-scene',
  name: 'Satellite',
  category: 'Satellite',
  activeModuleIds: ['satellite'],
  moduleState: {},
  product: { category: 'satellite', id: 'goes-infrared', opacity: 0.95, smoothing: 'smooth' },
};
const normalizedSatellite = moduleRegistry.normalizeSceneModuleState(satelliteScene);
assert.equal(normalizedSatellite.moduleState.satellite.source, 'east');
assert.equal(normalizedSatellite.moduleState.satellite.product, 'goes-infrared');
assert.equal(normalizedSatellite.moduleState.satellite.frameCount, 12);
assert.equal(normalizedSatellite.moduleState.satellite.autoRefreshEnabled, true);
assert.ok(moduleRegistry.getDialog('module:satellite', normalizedSatellite));
assert.ok(moduleRegistry.getTools(normalizedSatellite, 'quick').some((tool) => tool.id === 'satellite-quick'));

console.log(`Built-in registry regression passed: ${ids.length} modules, ${providers.length} providers, and 13 map controllers verified.`);
