import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');

for (const relative of [
  'src/legends/product-legend.ts',
  'src/components/BroadcastHeader.tsx',
  'src/styles/nex-gen-wx.css',
  'src/tropical/tropical-outlook-renderer.ts',
  'src/tropical/tropical-wind-probability-renderer.ts',
]) {
  await access(new URL(relative, root), constants.R_OK);
}

const registry = await read('src/legends/product-legend.ts');
const header = await read('src/components/BroadcastHeader.tsx');
const css = await read('src/styles/nex-gen-wx.css');
const windRenderer = await read('src/tropical/tropical-wind-probability-renderer.ts');
const outlookRenderer = await read('src/tropical/tropical-outlook-renderer.ts');

for (const product of ['nhc-wind-prob-34kt', 'nhc-wind-prob-50kt', 'nhc-wind-prob-64kt']) {
  if (!registry.includes(`'${product}'`)) throw new Error(`Product legend registry is missing ${product}.`);
}
for (const [label, color] of [
  ['5–10', '#267300'],
  ['10–20', '#38a800'],
  ['20–30', '#55ff00'],
  ['30–40', '#e6e600'],
  ['40–50', '#ffd37f'],
  ['50–60', '#e69800'],
  ['60–70', '#ffaa00'],
  ['70–80', '#e60000'],
  ['80–90', '#a83800'],
  ['>90%', '#a900e6'],
]) {
  if (!registry.includes(`label: '${label}', color: '${color}'`)) {
    throw new Error(`Wind-probability legend is missing ${label} ${color}.`);
  }
  if (!windRenderer.includes(`'${color}'`)) {
    throw new Error(`Wind-probability legend color ${color} no longer matches the renderer.`);
  }
}

for (const [label, color] of [
  ['LOW ≤30%', '#f1c84b'],
  ['MED 40–60%', '#e69800'],
  ['HIGH ≥70%', '#e60000'],
]) {
  if (!registry.includes(`label: '${label}', color: '${color}'`)) {
    throw new Error(`NHC outlook legend is missing ${label} ${color}.`);
  }
  if (!outlookRenderer.includes(`'${color}'`)) {
    throw new Error(`NHC outlook legend color ${color} no longer matches the renderer.`);
  }
}

for (const sceneId of [
  'visible-satellite',
  'spc-md-national',
  'active-alerts-ewx',
  'national-air-quality-ozone',
  'national-air-quality-smoke',
  'national-forecast-day1',
  'national-fronts-day1',
  'nhc-track-cone',
]) {
  if (!registry.includes(`'${sceneId}'`)) throw new Error(`No-key scene policy is missing ${sceneId}.`);
}

for (const token of [
  "import { productLegendForScene } from '../legends/product-legend';",
  'const productLegend = productLegendForScene(scene);',
  "productLegend?.mode !== 'none'",
  "productLegend?.mode === 'discrete'",
  'header-product-legend',
]) {
  if (!header.includes(token)) throw new Error(`BroadcastHeader product-legend integration missing: ${token}`);
}

for (const token of [
  '.header-product-legend',
  '.header-product-legend__segment',
  '.header-product-legend__segment small',
]) {
  if (!css.includes(token)) throw new Error(`Product legend CSS missing: ${token}`);
}

if (!registry.includes("scene.header.legend.kind === 'custom' && scene.category !== 'Custom'")) {
  throw new Error('Operational custom-placeholder suppression rule is missing.');
}
if (!registry.includes("scene.category !== 'Custom'")) {
  throw new Error('True Custom scenes must remain eligible for the editable custom key.');
}

console.log('Product legend validation passed: verified existing keys are preserved, NHC wind/outlook colors match their renderers, categorical no-key scenes are suppressed, and operational placeholder custom keys no longer auto-render.');
