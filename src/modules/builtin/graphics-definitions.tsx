import type { StudioModuleDefinition } from '../../types/module';
import { AssetsDialogPanel } from './panels/AssetsDialogPanel';
import { ColorTablesDialogPanel } from './panels/ColorTablesDialogPanel';
import { DrawingDialogPanel } from './panels/DrawingDialogPanel';
import { GraphicSettingsPanel } from './panels/GraphicSettingsPanel';

export const graphicsModuleDefinitions: StudioModuleDefinition[] = [
  {
    manifest: {
      id: 'graphics', name: 'Forecast Graphics', domain: 'graphics', maturity: 'planned',
      description: 'Non-map forecast templates with direct editing and safe-area rendering.',
      sceneKinds: ['graphic'], tools: ['Template', 'Location', 'Theme', 'Refresh', 'Edit text'],
      legacyFiles: ['public/graphic-engine.js', 'public/data/default-graphics.json'], dependencies: ['scene-engine', 'data-engine'],
    },
    isActiveForScene: (scene) => scene.kind === 'graphic',
    settingsTabs: [{ id: 'graphic', label: 'Graphic', order: 10, sceneKinds: ['graphic'], component: GraphicSettingsPanel }],
  },
  {
    manifest: {
      id: 'drawing', name: 'Drawing and Symbols', domain: 'graphics', maturity: 'planned',
      description: 'Pointer-isolated lines, arrows, boxes, fronts, symbols, editing, deletion and ordering.',
      sceneKinds: ['map'], tools: ['Line', 'Arrow', 'Box', 'Front', 'Symbol', 'Select', 'Delete'],
      legacyFiles: ['public/studio.js', 'public/graphic-engine.js'], dependencies: ['map', 'scene-engine'],
    },
    dialogs: [{ id: 'module:draw', title: 'Drawing Tools', className: 'tool-window--draw', order: 60, sceneKinds: ['map'], component: DrawingDialogPanel }],
    tools: [
      { id: 'drawing-quick', label: 'Draw', placement: 'quick', order: 40, sceneKinds: ['map'], command: { kind: 'open-dialog', dialog: 'module:draw' } },
      { id: 'drawing-context', label: 'Draw', placement: 'context', order: 50, sceneKinds: ['map'], command: { kind: 'open-dialog', dialog: 'module:draw' } },
      { id: 'drawing-arrow-context', label: 'Arrow', placement: 'context', order: 60, sceneKinds: ['map'], command: { kind: 'open-dialog', dialog: 'module:draw' } },
    ],
  },
  {
    manifest: {
      id: 'assets', name: 'Broadcast Assets', domain: 'graphics', maturity: 'planned',
      description: 'Movable text, symbols, images, pressure centers and weather icons.',
      sceneKinds: ['map', 'graphic'], tools: ['Text', 'Symbols', 'Images', 'Upload'],
      legacyFiles: ['public/studio.js', 'public/graphic-engine.js'], dependencies: ['scene-engine'],
    },
    dialogs: [{ id: 'module:assets', title: 'Assets', className: 'tool-window--assets', order: 70, component: AssetsDialogPanel }],
    tools: [
      { id: 'assets-quick', label: 'Assets', placement: 'quick', order: 50, sceneKinds: ['map'], command: { kind: 'open-dialog', dialog: 'module:assets' } },
      { id: 'assets-context', label: 'Assets', placement: 'context', order: 70, sceneKinds: ['map'], command: { kind: 'open-dialog', dialog: 'module:assets' } },
    ],
  },
  {
    manifest: {
      id: 'color-tables', name: 'Color Tables', domain: 'graphics', maturity: 'planned',
      description: 'Product-specific color ramps, labels, custom stops and default assignments.',
      sceneKinds: ['map', 'graphic'], tools: ['Product', 'Color table', 'Stops', 'Default'],
      legacyFiles: ['public/map-engine.js', 'public/graphic-engine.js'], dependencies: ['scene-engine'],
    },
    dialogs: [{ id: 'module:color-tables', title: 'Color Tables', className: 'tool-window--color-tables', order: 80, component: ColorTablesDialogPanel }],
    tools: [{ id: 'color-tables-dock', label: 'Color Tables', placement: 'dock-tool', order: 40, sceneKinds: ['map', 'graphic'], command: { kind: 'open-dialog', dialog: 'module:color-tables' } }],
  },
];
