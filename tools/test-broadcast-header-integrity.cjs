const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');

const scenes = JSON.parse(read('reference/legacy-r3/default-scenes.json'));
assert.ok(Array.isArray(scenes) && scenes.length > 0, 'Default map-scene reference is empty.');
const categories = new Set();
for (const scene of scenes) {
  assert.ok(scene && typeof scene === 'object', 'Every reference scene must be an object.');
  assert.ok(scene.header && typeof scene.header === 'object', `Scene ${scene.id ?? '(unknown)'} is missing a header.`);
  assert.ok(String(scene.header.title ?? '').trim(), `Scene ${scene.id ?? '(unknown)'} is missing a header title.`);
  categories.add(String(scene.category ?? 'Unknown'));
}

const main = read('src/main.tsx');
const r3Import = main.indexOf("import './styles/r3-base.css';");
const nexImport = main.indexOf("import './styles/nex-gen-wx.css';");
const finalImport = main.indexOf("import './styles/broadcast-header.css';");
assert.ok(r3Import >= 0 && nexImport > r3Import && finalImport > nexImport,
  'Broadcast header final CSS must load after r3-base.css and nex-gen-wx.css.');

const finalCss = read('src/styles/broadcast-header.css');

// One canonical bar geometry for Tropical, Radar, Satellite, Models/HRRR, etc.
for (const marker of [
  '.broadcast-header {',
  'width: min(1460px, calc(100% - 24px));',
  'max-width: none;',
  'height: 108px;',
  'grid-template-columns: 54px minmax(0, 1fr);',
  '.broadcast-header.has-custom-logo {',
  'grid-template-columns: 285px minmax(0, 1fr);',
  '.broadcast-header .header-logo.header-menu-trigger,',
  '.broadcast-header .header-copy {',
  'height: 90px;',
  'min-height: 90px;',
  'max-height: 90px;',
  '.broadcast-header:not(.has-custom-logo) .header-copy {',
  'margin-left: -2px;',
  'padding-left: 22px;',
  'grid-template-columns: 42px minmax(0, 1fr);',
  'height: 78px;',
]) assert.ok(finalCss.includes(marker), `Canonical all-scene header marker missing: ${marker}`);

// The exact bug: HRRR was excluded from the final geometry while Tropical was not.
assert.ok(!finalCss.includes(':not(.is-model-header)'),
  'HRRR is still excluded from the same canonical geometry used by Tropical.');
assert.ok(!/\.broadcast-header\.is-model-header\s*\{[^}]*\b(?:width|height|grid-template-columns|left|right|top|transform|margin-left|padding-left)\s*:/s.test(finalCss),
  'Models/HRRR still owns a second bar geometry.');

// Models may constrain only its many-segment discrete legend INSIDE the shared track.
for (const marker of [
  '.broadcast-header.is-model-header .header-legend {',
  'max-width: 100%;',
  'overflow: hidden;',
  '.broadcast-header.is-model-header .header-product-legend {',
  'width: 100%;',
  'display: flex;',
  '.broadcast-header.is-model-header .header-product-legend__segment {',
  'flex: 1 1 0;',
  'min-width: 0;',
]) assert.ok(finalCss.includes(marker), `HRRR key containment marker missing: ${marker}`);

const header = read('src/components/BroadcastHeader.tsx');
assert.ok(header.includes("const isModelHeader = scene.category === 'Models';"),
  'BroadcastHeader no longer identifies Models for metadata/key content.');
assert.ok(header.includes("${isModelHeader ? 'is-model-header' : ''}"),
  'Models class hook is missing.');
assert.ok(header.includes('displayModelSubtitle') && header.includes('displayModelValidLabel'),
  'HRRR dynamic metadata sync was lost.');
assert.ok(header.includes('productLegendForScene(scene)'),
  'Shared discrete product-legend renderer was lost.');
assert.ok(!header.includes('ModelPlaybackTouchControls'),
  'Playback controls leaked back into the visible title bar.');
assert.ok(!header.includes('fitScale'),
  'Model-only header fit scaling returned.');

const modelsCss = read('src/styles/models.css');
assert.ok(!/\.broadcast-header/.test(modelsCss),
  'models.css must not own broadcast-header geometry.');

const stage = read('src/components/SceneStage.tsx');
assert.ok(stage.includes('<BroadcastHeader'), 'SceneStage no longer renders the shared BroadcastHeader.');
assert.ok(stage.includes('ModelPlaybackDriver'), 'Model playback driver was lost.');
assert.ok(!stage.includes('modelHeaderFitScale') && !stage.includes('broadcastHeaderFitScale'),
  'Model-only stage positioning returned.');

console.log(
  `Broadcast header parity regression passed across ${scenes.length} reference scenes and ${categories.size} categories: `
  + 'Tropical and HRRR now share one canonical 1460/54/90 bar geometry; Models only constrains its many-segment key inside the shared legend track.'
);
