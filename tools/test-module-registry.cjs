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

const { ModuleRegistry } = require('../src/modules/module-registry.ts');
const EmptyPanel = () => null;
const controller = (id) => ({ id });
const registry = new ModuleRegistry([
  {
    manifest: {
      id: 'core', name: 'Core', domain: 'foundation', maturity: 'foundation', description: '',
      sceneKinds: ['map', 'graphic'], tools: [], legacyFiles: [], dependencies: [],
    },
    isActiveForScene: () => true,
    providers: [{ id: 'core-provider', label: 'Core provider' }],
    settingsTabs: [{ id: 'core', label: 'Core', order: 10, sceneKinds: ['map'], component: EmptyPanel }],
    mapControllers: [{ id: 'base', phase: 'foundation', order: 10, create: () => controller('base') }],
  },
  {
    manifest: {
      id: 'weather', name: 'Weather', domain: 'weather', maturity: 'planned', description: '',
      sceneKinds: ['map'], tools: [], legacyFiles: [], dependencies: ['core'],
    },
    isActiveForScene: (scene) => scene.product?.category === 'weather',
    dialogs: [{ id: 'module:weather', title: 'Weather', sceneKinds: ['map'], component: EmptyPanel }],
    tools: [{ id: 'weather-tool', label: 'Weather', placement: 'dock-tool', order: 10, sceneKinds: ['map'], requiresActiveModule: true, command: { kind: 'open-dialog', dialog: 'module:weather' } }],
    defaultSceneState: { enabled: true },
    mapControllers: [{ id: 'weather', phase: 'data', order: 10, create: () => controller('weather') }],
  },
  {
    manifest: {
      id: 'interaction', name: 'Interaction', domain: 'map', maturity: 'foundation', description: '',
      sceneKinds: ['map'], tools: [], legacyFiles: [], dependencies: ['weather'],
    },
    mapControllers: [{ id: 'interaction', phase: 'interaction', order: 10, create: (context) => {
      assert.equal(context.requireController('weather').id, 'weather');
      return controller('interaction');
    } }],
  },
]);

const scene = {
  id: 'scene', name: 'Scene', kind: 'map', category: 'Custom', tags: [],
  transition: { type: 'cut', durationMs: 0 }, advance: 'manual', holdSeconds: 10,
  activeModuleIds: [], moduleState: {}, elementOverrides: {}, customObjects: [],
  product: { category: 'weather', id: 'test', opacity: 1, smoothing: 'balanced' },
};

assert.deepEqual([...registry.resolveSceneModuleIds(scene)], ['core', 'weather']);
assert.equal(registry.getProviders()[0].id, 'core-provider');
assert.equal(registry.getSettingsTabs(scene)[0].id, 'core');
assert.equal(registry.getDialog('module:weather', scene).title, 'Weather');
assert.equal(registry.getTools(scene, 'dock-tool')[0].id, 'weather-tool');
assert.deepEqual(registry.createMapControllers().map((item) => item.id), ['base', 'weather', 'interaction']);
assert.deepEqual(registry.normalizeSceneModuleState(scene).moduleState.weather, { enabled: true });
const normalizedProject = registry.normalizeProjectModuleState({
  schemaVersion: 8,
  id: 'project', name: 'Project', createdAt: '', updatedAt: '',
  scenes: [scene], selectedSceneId: scene.id, shows: [], selectedShowId: '', branding: {},
});
assert.deepEqual(normalizedProject.scenes[0].moduleState.weather, { enabled: true });
assert.deepEqual(scene.moduleState, {}, 'module normalization must not mutate the source scene');
assert.throws(() => new ModuleRegistry([
  {
    manifest: { id: 'broken', name: 'Broken', domain: 'foundation', maturity: 'planned', description: '', sceneKinds: ['map'], tools: [], legacyFiles: [], dependencies: ['missing'] },
  },
]), /missing module/);

console.log('Module registry regression passed: dependency resolution, contributions, controller phases, and isolated module state verified.');
