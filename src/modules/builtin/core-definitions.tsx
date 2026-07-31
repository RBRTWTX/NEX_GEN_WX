import { BasemapController } from '../../map/controllers/BasemapController';
import { CameraController } from '../../map/controllers/CameraController';
import { InteractionController } from '../../map/controllers/InteractionController';
import { LayerOrderController } from '../../map/controllers/LayerOrderController';
import { LayerStyleController } from '../../map/controllers/LayerStyleController';
import { ResizeController } from '../../map/controllers/ResizeController';
import type { ObservationsController } from '../../map/controllers/ObservationsController';
import type { StudioModuleDefinition } from '../../types/module';
import { DataSourcesDialogPanel } from './panels/DataSourcesDialogPanel';
import { HeaderSettingsPanel } from './panels/HeaderSettingsPanel';
import { ImportExportSettingsPanel, PresentationSettingsPanel } from './panels/PresentationSettingsPanel';
import { MapSettingsPanel } from './panels/MapSettingsPanel';
import { SceneObjectsDialogPanel } from './panels/SceneObjectsDialogPanel';

export const coreModuleDefinitions: StudioModuleDefinition[] = [
  {
    manifest: {
      id: 'scene-engine', name: 'Scene Engine', domain: 'foundation', maturity: 'foundation',
      description: 'Owns scene state, selection, duplication, ordering, persistence and version migration.',
      sceneKinds: ['map', 'graphic'], tools: ['Add scene', 'Duplicate', 'Rename', 'Delete', 'Save project'],
      legacyFiles: ['public/studio.js', 'public/rundown-controller.js'], dependencies: [],
    },
    isActiveForScene: () => true,
    settingsTabs: [{ id: 'header', label: 'Header', order: 10, sceneKinds: ['map'], component: HeaderSettingsPanel }],
  },
  {
    manifest: {
      id: 'scene-objects', name: 'Scene Object Editor', domain: 'graphics', maturity: 'foundation',
      description: 'Universal authored-object selection, direct text editing, movement, scaling, rotation, layering, locking, hiding and custom text/shape/image assets.',
      sceneKinds: ['map', 'graphic'], tools: ['Select object', 'Move', 'Resize', 'Rotate', 'Add text', 'Add shape', 'Add image'],
      legacyFiles: ['public/studio.js', 'public/graphic-scene-renderer.js'], dependencies: ['scene-engine'],
    },
    isActiveForScene: () => true,
    dialogs: [{ id: 'module:scene-objects', title: 'Scene Objects', className: 'tool-window--scene-objects', order: 5, component: SceneObjectsDialogPanel }],
    tools: [
      { id: 'scene-objects', label: 'Objects', placement: 'dock-tool', order: 5, sceneKinds: ['map', 'graphic'], command: { kind: 'open-dialog', dialog: 'module:scene-objects' } },
      { id: 'scene-objects-context', label: 'Objects', placement: 'context', order: 5, sceneKinds: ['map'], command: { kind: 'open-dialog', dialog: 'module:scene-objects' } },
    ],
  },
  {
    manifest: {
      id: 'presentation', name: 'Presentation Engine', domain: 'presentation', maturity: 'foundation',
      description: 'PowerPoint-like scene advance, manual/automatic playback, transitions and clean output synchronization.',
      sceneKinds: ['map', 'graphic'], tools: ['Previous', 'Next', 'Play', 'Stop', 'Hold time', 'Transition'],
      legacyFiles: ['public/studio.js', 'public/rundown-controller.js'], dependencies: ['scene-engine', 'output'],
    },
    isActiveForScene: () => true,
    settingsTabs: [{ id: 'shows', label: 'Shows', order: 80, sceneKinds: ['map', 'graphic'], component: PresentationSettingsPanel }],
  },
  {
    manifest: {
      id: 'output', name: 'Output Engine', domain: 'output', maturity: 'foundation',
      description: 'Uses one renderer for clean presentation output, PNG export and optional OBS capture.',
      sceneKinds: ['map', 'graphic'], tools: ['Open output', 'Export current PNG'],
      legacyFiles: ['public/studio.js'], dependencies: ['scene-engine'],
    },
    isActiveForScene: () => true,
    settingsTabs: [{ id: 'import-export', label: 'Import/Export', order: 90, sceneKinds: ['map', 'graphic'], component: ImportExportSettingsPanel }],
  },
  {
    manifest: {
      id: 'data-engine', name: 'Weather Data Engine', domain: 'data', maturity: 'foundation',
      description: 'Rust-side provider requests, normalization, caching, job state and safe typed results.',
      sceneKinds: ['map', 'graphic'], tools: ['Source health', 'Cache', 'Refresh', 'Jobs'],
      legacyFiles: ['server.js', 'lib/cache.js', 'workers/*.py'], dependencies: [],
    },
    isActiveForScene: () => true,
    dialogs: [{ id: 'module:sources', title: 'Data Sources', className: 'tool-window--sources', order: 10, component: DataSourcesDialogPanel }],
  },
  {
    manifest: {
      id: 'map', name: 'Map Engine', domain: 'map', maturity: 'foundation',
      description: 'MapLibre camera, basemap, projection, deterministic layer order and render lifecycle.',
      sceneKinds: ['map'], tools: ['Basemap', 'Projection', 'Camera', 'Layer order'],
      legacyFiles: ['public/map-engine.js'], dependencies: ['scene-engine'],
    },
    isActiveForScene: (scene) => scene.kind === 'map',
    providers: [{ id: 'basemap', label: 'Basemap' }],
    settingsTabs: [{ id: 'map', label: 'Map', order: 20, sceneKinds: ['map'], component: MapSettingsPanel }],
    mapControllers: [
      { id: 'basemap', phase: 'foundation', order: 10, create: () => new BasemapController() },
      { id: 'layer-style', phase: 'foundation', order: 20, create: () => new LayerStyleController() },
      { id: 'camera', phase: 'interaction', order: 10, create: () => new CameraController() },
      {
        id: 'interaction', phase: 'interaction', order: 20,
        create: (context) => new InteractionController(context.requireController<ObservationsController>('observations')),
      },
      { id: 'layer-order', phase: 'finalize', order: 10, create: () => new LayerOrderController() },
      { id: 'resize', phase: 'finalize', order: 20, create: () => new ResizeController() },
    ],
    tools: [
      { id: 'map-products', label: 'Products', placement: 'dock-tool', order: 10, sceneKinds: ['map'], command: { kind: 'open-dialog', dialog: 'products' } },
      { id: 'map-value-points', label: 'Value Points', placement: 'dock-tool', order: 80, sceneKinds: ['map'], command: { kind: 'status', message: 'Click the map to place value points' } },
      { id: 'map-home', label: 'H', placement: 'context', order: 10, sceneKinds: ['map'], command: { kind: 'map-home' } },
      { id: 'map-zoom-in', label: '+', placement: 'context', order: 30, sceneKinds: ['map'], command: { kind: 'map-zoom', amount: 1 } },
      { id: 'map-zoom-out', label: '−', placement: 'context', order: 40, sceneKinds: ['map'], command: { kind: 'map-zoom', amount: -1 } },
      { id: 'map-settings', label: '?', placement: 'context', order: 20, sceneKinds: ['map'], command: { kind: 'open-settings', tab: 'map' } },
      { id: 'map-callouts', label: 'Callouts', placement: 'context', order: 80, sceneKinds: ['map'], command: { kind: 'open-settings', tab: 'observations' } },
      { id: 'map-clear-callouts', label: 'Clear Callouts', placement: 'context', order: 90, sceneKinds: ['map'], command: { kind: 'clear-samples' } },
    ],
  },
];
