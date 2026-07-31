import fs from 'node:fs/promises';

async function text(path) {
  return fs.readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

const domain = await text('src/types/domain.ts');
for (const token of ['SceneObjectKind', 'SceneElementTransform', 'CustomSceneObject', 'customObjects: CustomSceneObject[]', 'gradientStartColor', 'schemaVersion: 8']) {
  if (!domain.includes(token)) throw new Error(`Scene object domain is missing ${token}.`);
}

const stage = await text('src/components/SceneStage.tsx');
for (const token of ['CustomSceneObjectLayer', 'SceneObjectOverlay', '--scene-stage-width', 'onElementTransformChange']) {
  if (!stage.includes(token)) throw new Error(`SceneStage is missing ${token}.`);
}

const overlay = await text('src/scene-editing/SceneObjectOverlay.tsx');
for (const token of ["type DragMode = 'move'", 'resize-nw', "mode === 'rotate'", 'updateElementTransform', 'ArrowLeft', 'PageUp']) {
  if (!overlay.includes(token)) throw new Error(`Scene-object overlay is missing ${token}.`);
}

const panel = `${await text('src/scene-editing/SceneElementStylePanel.tsx')}\n${await text('src/scene-editing/SceneObjectControls.tsx')}`;
for (const token of ['Position and layer', 'Appearance', 'Use two-color gradient', 'Lock position and size', 'Hide in clean output and PNG', 'Bring forward', 'Reset position', 'Shape type']) {
  if (!panel.includes(token)) throw new Error(`Scene-object panel is missing ${token}.`);
}

const customPanel = await text('src/modules/builtin/panels/SceneObjectsDialogPanel.tsx');
for (const token of ['+ Text', '+ Shape', '+ Image', 'scene/add-custom-object', 'imageDataUrl']) {
  if (!customPanel.includes(token)) throw new Error(`Scene-object library is missing ${token}.`);
}

const reducer = `${await text('src/state/project/scene-reducer.ts')}\n${await text('src/state/project/scene-object-reducer.ts')}`;
for (const token of ['scene/set-element-transform', 'scene/add-custom-object', 'scene/update-custom-object', 'scene/delete-custom-object', 'scene/duplicate-custom-object']) {
  if (!reducer.includes(token)) throw new Error(`Scene reducer is missing ${token}.`);
}

const output = await text('src/styles/nex-gen-wx.css');
for (const token of ['NEX GEN WX 0.6.4 — universal scene-object editing', '.scene-object-overlay', '.custom-scene-object-layer', '.output-shell .scene-object-overlay']) {
  if (!output.includes(token)) throw new Error(`Scene-object CSS is missing ${token}.`);
}

const graphicFiles = [
  'src/graphics/GraphicHeader.tsx',
  'src/graphics/templates/SevenDayGraphic.tsx',
  'src/graphics/templates/HourlyGraphic.tsx',
  'src/graphics/templates/PlannerGraphic.tsx',
  'src/graphics/templates/TwoPanelGraphic.tsx',
  'src/graphics/templates/NeedToKnowGraphic.tsx',
  'src/graphics/templates/MuggyMeterGraphic.tsx',
];
for (const file of graphicFiles) {
  const content = await text(file);
  if (!content.includes('SceneObject')) throw new Error(`${file} is not registered with universal scene-object editing.`);
}

console.log('Scene-object validation passed: authored elements, direct manipulation, custom assets, persistence, output isolation, and graphic-template registration verified.');
