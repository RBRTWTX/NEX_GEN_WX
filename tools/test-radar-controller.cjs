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

let responseQueue = [];
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'react') return { useSyncExternalStore: (_subscribe, get) => get() };
  if (request === '@tauri-apps/api/core') {
    return {
      invoke: async (command) => {
        assert.equal(command, 'fetch_radar_mrms_catalog');
        if (!responseQueue.length) throw new Error('No mocked radar response queued.');
        return responseQueue.shift();
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

global.window = {
  setInterval: () => 1,
  clearInterval: () => undefined,
  setTimeout: () => 1,
  clearTimeout: () => undefined,
};

const { RadarController } = require('../src/radar/RadarController.ts');

function catalog(epoch) {
  return catalogFrames([epoch]);
}

function catalogFrames(epochs, cacheWarning = '') {
  return {
    metadata: { timeInfo: { timeExtent: [epochs[0], epochs.at(-1)] } },
    query: { features: epochs.map((epoch) => ({ attributes: { idp_validtime: epoch } })) },
    cacheStatus: 'live',
    ...(cacheWarning ? { cacheWarning } : {}),
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

class MockMap {
  constructor() {
    this.sources = new Map();
    this.layers = new Map();
    this.center = { lat: 29.42, lng: -98.49 };
  }
  getCenter() { return this.center; }
  getSource(id) { return this.sources.get(id); }
  addSource(id, definition) {
    this.sources.set(id, {
      definition,
      tiles: [...definition.tiles],
      history: [[...definition.tiles]],
      setTiles(tiles) { this.tiles = [...tiles]; this.history.push([...tiles]); },
    });
  }
  removeSource(id) { this.sources.delete(id); }
  getLayer(id) { return this.layers.get(id); }
  addLayer(layer) { this.layers.set(layer.id, { ...layer }); }
  removeLayer(id) { this.layers.delete(id); }
  setPaintProperty(id, property, value) {
    const layer = this.layers.get(id);
    if (layer) layer.paint = { ...(layer.paint || {}), [property]: value };
  }
}

function scene(refreshToken = 0, frameIndex = -1) {
  return {
    id: 'radar-scene',
    kind: 'map',
    product: { category: 'radar', id: 'mrms-base-reflectivity', opacity: 0.82, smoothing: 'balanced' },
    moduleState: {
      radar: {
        mode: 'national', selectedSite: 'auto', animationEnabled: false, blendEnabled: false,
        frameIndex, frameCount: 12, playbackRateMs: 900, playbackStartedAt: 0, autoRefreshEnabled: false,
        expandedTools: false, refreshToken,
      },
    },
  };
}

function createContext(map) {
  let currentScene = scene();
  const pending = [];
  const statuses = [];
  let orderChanges = 0;
  return {
    get scene() { return currentScene; },
    set scene(value) { currentScene = value; },
    map,
    interactive: false,
    renderPurpose: 'export',
    styleGeneration: 1,
    isStyleReady: () => true,
    setRenderPending: (_id, value) => pending.push(value),
    notifyLayerOrderChanged: () => { orderChanges += 1; },
    callbacks: { reportProviderStatus: (...args) => statuses.push(args) },
    pending,
    statuses,
    get orderChanges() { return orderChanges; },
  };
}

async function main() {
  const firstEpoch = 1761500300000;
  const map = new MockMap();
  const context = createContext(map);
  const controller = new RadarController();
  responseQueue = [catalog(firstEpoch)];
  await controller.sync(context, false);

  const source = map.getSource('studio-radar-source-0');
  assert.ok(source, 'radar source should be created');
  assert.equal(source.history[0][0].includes('&time='), false, 'MRMS should first request documented latest imagery without a time parameter');
  assert.match(source.tiles[0], new RegExp(`time=${firstEpoch}`));
  assert.ok(map.getLayer('studio-radar-layer-0'), 'radar layer should be created');
  assert.deepEqual(context.pending, [true, false]);
  assert.equal(context.orderChanges, 2);
  assert.equal(context.statuses.at(-1)[1], 'online');

  const degradedMap = new MockMap();
  const degradedContext = createContext(degradedMap);
  const degradedController = new RadarController();
  responseQueue = [catalogFrames([firstEpoch], 'MRMS frame-query endpoint unavailable')];
  await degradedController.sync(degradedContext, false);
  assert.equal(degradedContext.statuses.at(-1)[1], 'degraded');
  assert.match(degradedContext.statuses.at(-1)[2], /frame-query endpoint unavailable/);
  degradedController.dispose();

  const stale = deferred();
  const secondEpoch = 1761500900000;
  responseQueue = [stale.promise, catalog(secondEpoch)];
  context.scene = scene(1);
  const oldRequest = controller.sync(context, true);
  context.scene = scene(2);
  const currentRequest = controller.sync(context, true);
  await currentRequest;
  stale.resolve(catalog(firstEpoch));
  await oldRequest;

  const finalSource = map.getSource('studio-radar-source-0');
  assert.match(finalSource.tiles[0], new RegExp(`time=${secondEpoch}`));
  assert.doesNotMatch(finalSource.tiles[0], new RegExp(`time=${firstEpoch}`));

  // A refresh response must not restore the frame choice captured when the request began.
  const frameChoiceMap = new MockMap();
  const frameChoiceContext = createContext(frameChoiceMap);
  const frameChoiceController = new RadarController();
  const frameEpochs = [1761501200000, 1761501500000, 1761501800000];
  const pendingRefresh = deferred();
  responseQueue = [pendingRefresh.promise];
  frameChoiceContext.scene = scene(3, 2);
  const refreshRequest = frameChoiceController.sync(frameChoiceContext, true);
  frameChoiceContext.scene = scene(3, 0);
  pendingRefresh.resolve(catalogFrames(frameEpochs));
  await refreshRequest;
  const frameChoiceSource = frameChoiceMap.getSource('studio-radar-source-0');
  assert.match(frameChoiceSource.tiles[0], new RegExp(`time=${frameEpochs[0]}`));
  assert.doesNotMatch(frameChoiceSource.tiles[0], new RegExp(`time=${frameEpochs[2]}`));

  frameChoiceController.dispose();
  controller.dispose();
  console.log('Radar controller regression passed: immediate latest rendering, catalog rendering, readiness, layer order, online/degraded provider health, stale-request rejection, and in-flight frame-choice preservation verified.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
