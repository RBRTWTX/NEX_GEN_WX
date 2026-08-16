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

console.log('Product legend regression passed: wind/outlook product keys, no-key categorical scenes, operational placeholder suppression, and verified/custom fallbacks behave correctly.');
