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

const { productLegendForScene } = require('../src/legends/product-legend.ts');

function scene(overrides = {}) {
  return {
    id: 'test-scene',
    name: 'Test',
    kind: 'map',
    category: 'Tropical',
    product: { category: 'tropical', id: 'test-product', opacity: 1, smoothing: 'balanced' },
    header: {
      title: 'TEST',
      subtitle: '',
      validLabel: 'CURRENT',
      visible: true,
      opacity: 1,
      scale: 1,
      legend: { kind: 'custom', visible: true, lowLabel: 'LOW', highLabel: 'HIGH', customLabel: '' },
    },
    ...overrides,
  };
}

for (const productId of ['nhc-wind-prob-34kt', 'nhc-wind-prob-50kt', 'nhc-wind-prob-64kt']) {
  const spec = productLegendForScene(scene({ product: { category: 'tropical', id: productId, opacity: 1, smoothing: 'smooth' } }));
  assert.equal(spec.mode, 'discrete');
  assert.equal(spec.id, 'nhc-wind-probability');
  assert.equal(spec.segments.length, 10);
  assert.equal(spec.segments[0].color, '#267300');
  assert.equal(spec.segments.at(-1).color, '#a900e6');
}

for (const productId of ['nhc-outlook-2day', 'nhc-outlook-7day']) {
  const spec = productLegendForScene(scene({ product: { category: 'tropical', id: productId, opacity: 1, smoothing: 'smooth' } }));
  assert.equal(spec.mode, 'discrete');
  assert.equal(spec.segments.length, 3);
}


for (const productId of ['nhc-arrival-earliest', 'nhc-arrival-most-likely']) {
  const spec = productLegendForScene(scene({
    product: { category: 'tropical', id: productId, opacity: 1, smoothing: 'smooth' },
    moduleState: {},
  }));
  assert.equal(spec.mode, 'discrete');
  assert.equal(spec.id, 'nhc-arrival-34kt-probability');
  assert.equal(spec.segments.length, 10);

  const contoursOnly = productLegendForScene(scene({
    product: { category: 'tropical', id: productId, opacity: 1, smoothing: 'smooth' },
    moduleState: { 'tropical-arrival-time': { showWindProbability: false } },
  }));
  assert.equal(contoursOnly.mode, 'none');
}

const potentialSurge = productLegendForScene(scene({
  product: { category: 'tropical', id: 'nhc-surge-inundation', opacity: 1, smoothing: 'smooth' },
}));
assert.equal(potentialSurge.mode, 'discrete');
assert.equal(potentialSurge.segments.length, 4);
assert.equal(potentialSurge.segments[0].color, '#005ce6');

const peakSurge = productLegendForScene(scene({
  product: { category: 'tropical', id: 'nhc-peak-storm-surge', opacity: 1, smoothing: 'smooth' },
}));
assert.equal(peakSurge.mode, 'discrete');
assert.equal(peakSurge.segments.length, 5);
assert.equal(peakSurge.segments.at(-1).color, '#c500ff');

for (const [field, expectedId, expectedTitle] of [
  ['dewpoint-2m', 'hrrr-dewpoint-2m', '2 M DEW POINT (°F)'],
  ['relative-humidity-2m', 'hrrr-relative-humidity-2m', '2 M RELATIVE HUMIDITY (%)'],
  ['wind-gust-surface', 'hrrr-wind-gust-surface', 'SURFACE WIND GUST (mph)'],
]) {
  const spec = productLegendForScene(scene({
    category: 'Models',
    product: { category: 'models', id: 'hrrr-reflectivity', opacity: 1, smoothing: 'balanced' },
    moduleState: { models: { field } },
    header: {
      title: 'HRRR MODEL FORECAST',
      subtitle: '',
      validLabel: 'CURRENT',
      visible: true,
      opacity: 1,
      scale: 1,
      legend: { kind: 'temperature', visible: true, lowLabel: '', highLabel: '', customLabel: '' },
    },
  }));
  assert.equal(spec.mode, 'discrete');
  assert.equal(spec.id, expectedId);
  assert.equal(spec.title, expectedTitle);
}

assert.equal(productLegendForScene(scene({ id: 'nhc-track-cone' })).mode, 'none');
assert.equal(productLegendForScene(scene({ id: 'active-alerts-ewx' })).mode, 'none');
assert.equal(productLegendForScene(scene({ id: 'national-air-quality-ozone' })).mode, 'none');
assert.equal(productLegendForScene(scene({ id: 'national-air-quality-smoke' })).mode, 'none');
assert.equal(productLegendForScene(scene()).mode, 'none', 'unverified operational custom placeholder should be hidden');

assert.equal(
  productLegendForScene(scene({
    category: 'Radar',
    product: { category: 'radar', id: 'mrms-reflectivity', opacity: 1, smoothing: 'balanced' },
    header: {
      title: 'RADAR', subtitle: '', validLabel: 'CURRENT', visible: true, opacity: 1, scale: 1,
      legend: { kind: 'reflectivity', visible: true, lowLabel: 'LIGHT', highLabel: 'HEAVY', customLabel: '' },
    },
  })),
  null,
  'verified legacy reflectivity key should remain untouched',
);

assert.equal(
  productLegendForScene(scene({ category: 'Custom' })),
  null,
  'true Custom scenes should retain the editable custom key',
);

console.log('Product legend regression passed: wind/outlook/arrival/surge product keys, arrival background toggling, no-key categorical scenes, operational placeholder suppression, and verified/custom fallbacks behave correctly.');
