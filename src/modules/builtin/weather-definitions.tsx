import type { StudioModuleDefinition } from '../../types/module';
import { ModelLabDialogPanel } from './panels/ModelLabDialogPanel';
import { RadarDialogPanel } from './panels/RadarDialogPanel';
import { SatelliteDialogPanel } from './panels/SatelliteDialogPanel';

export const weatherModuleDefinitions: StudioModuleDefinition[] = [
  {
    manifest: {
      id: 'radar', name: 'Radar', domain: 'weather', maturity: 'migration-next',
      description: 'MRMS, NEXRAD Level II/III, multi-site blending, sweep controls, products and animation.',
      sceneKinds: ['map'], tools: ['Product', 'Site', 'Blend', 'Sweep', 'Smoothing', 'Timeline'],
      legacyFiles: ['public/map-engine.js', 'workers/radar_worker.py', 'workers/level3_worker.py'], dependencies: ['map', 'data-engine'],
    },
    isActiveForScene: (scene) => scene.kind === 'map' && scene.product.category === 'radar',
    dialogs: [{ id: 'module:radar', title: 'Radar Controls', className: 'tool-window--radar', order: 10, sceneKinds: ['map'], component: RadarDialogPanel }],
    tools: [
      { id: 'radar-dock', label: 'Radar', placement: 'dock-tool', order: 20, sceneKinds: ['map'], command: { kind: 'open-dialog', dialog: 'module:radar' } },
      { id: 'radar-quick', label: 'Radar', placement: 'quick', order: 10, sceneKinds: ['map'], command: { kind: 'open-dialog', dialog: 'module:radar' } },
      { id: 'radar-context', label: 'Sweep', placement: 'context', order: 120, sceneKinds: ['map'], command: { kind: 'open-dialog', dialog: 'module:radar' } },
    ],
    defaultSceneState: { selectedSite: 'auto', animationEnabled: false, blendEnabled: false },
  },
  {
    manifest: {
      id: 'satellite', name: 'Satellite', domain: 'weather', maturity: 'migration-next',
      description: 'Independent GOES products, frame catalog, animation and overlay behavior.',
      sceneKinds: ['map'], tools: ['Product', 'Frame', 'Play', 'Speed', 'Opacity', 'Overlay'],
      legacyFiles: ['public/map-engine.js', 'server.js'], dependencies: ['map', 'data-engine'],
    },
    isActiveForScene: (scene) => scene.kind === 'map' && scene.product.category === 'satellite',
    dialogs: [{ id: 'module:satellite', title: 'Satellite Controls', className: 'tool-window--satellite', order: 20, sceneKinds: ['map'], component: SatelliteDialogPanel }],
    tools: [
      { id: 'satellite-dock', label: 'Satellite', placement: 'dock-tool', order: 30, sceneKinds: ['map'], command: { kind: 'open-dialog', dialog: 'module:satellite' } },
      { id: 'satellite-quick', label: 'Satellite', placement: 'quick', order: 20, sceneKinds: ['map'], command: { kind: 'open-dialog', dialog: 'module:satellite' } },
      { id: 'satellite-context', label: 'Satellite', placement: 'context', order: 110, sceneKinds: ['map'], command: { kind: 'open-dialog', dialog: 'module:satellite' } },
    ],
    defaultSceneState: { channel: 'enhanced', overlayEnabled: false, animationEnabled: false },
  },
  {
    manifest: {
      id: 'tropical', name: 'Tropical Weather', domain: 'weather', maturity: 'migration-next',
      description: 'NHC outlooks, current storms, track, cone, points, watches, wind radii and impact products.',
      sceneKinds: ['map'], tools: ['Storm', 'Track', 'Cone', 'Points', 'Watches', 'Wind radii', 'Impacts'],
      legacyFiles: ['lib/tropical.js', 'public/broadcast-data-layers.js'], dependencies: ['map', 'data-engine'],
    },
    isActiveForScene: (scene) => scene.kind === 'map' && scene.category === 'Tropical',
    defaultSceneState: { selectedStormId: null, showTrack: true, showCone: true, showPoints: true },
  },
  {
    manifest: {
      id: 'forecast', name: 'Forecast Data', domain: 'weather', maturity: 'planned',
      description: 'NWS daily/hourly forecast bundles and national forecast products.',
      sceneKinds: ['map', 'graphic'], tools: ['Location', 'Valid time', 'Refresh'],
      legacyFiles: ['server.js', 'public/graphic-engine.js'], dependencies: ['data-engine'],
    },
    isActiveForScene: (scene) => scene.kind === 'graphic' || scene.category === 'Forecast',
  },
  {
    manifest: {
      id: 'rainfall', name: 'Rainfall', domain: 'weather', maturity: 'planned',
      description: 'MRMS QPE, RFC observations and WPC QPF with continuous rendering and exact sampling.',
      sceneKinds: ['map'], tools: ['Period', 'Color table', 'Opacity', 'Sampling'],
      legacyFiles: ['public/data/product-registry.json', 'server.js'], dependencies: ['map', 'data-engine'],
    },
    isActiveForScene: (scene) => scene.kind === 'map' && scene.category === 'Rainfall',
  },
  {
    manifest: {
      id: 'outlooks', name: 'Severe Outlooks', domain: 'weather', maturity: 'planned',
      description: 'SPC categorical/probability outlooks and mesoscale discussions.',
      sceneKinds: ['map'], tools: ['Day', 'Hazard', 'Labels', 'Mesoscale discussions'],
      legacyFiles: ['public/data/product-registry.json', 'server.js'], dependencies: ['map', 'data-engine'],
    },
    isActiveForScene: (scene) => scene.kind === 'map' && scene.product.category === 'outlooks',
  },
  {
    manifest: {
      id: 'fronts', name: 'Fronts and Surface Analysis', domain: 'weather', maturity: 'planned',
      description: 'Clean vector fronts, pressure centers and decluttered broadcast styling.',
      sceneKinds: ['map'], tools: ['Valid time', 'Front types', 'Pressure centers', 'Declutter'],
      legacyFiles: ['server.js', 'public/map-engine.js'], dependencies: ['map', 'data-engine'],
    },
    isActiveForScene: (scene) => scene.kind === 'map' && scene.activeModuleIds.includes('fronts'),
    tools: [
      { id: 'fronts-layer', label: 'Fronts', placement: 'dock-layer', order: 60, sceneKinds: ['map'], command: { kind: 'open-settings', tab: 'map' } },
      { id: 'fronts-context', label: 'Fronts', placement: 'context', order: 100, sceneKinds: ['map'], command: { kind: 'open-settings', tab: 'map' } },
    ],
  },
  {
    manifest: {
      id: 'models', name: 'Forecast Models', domain: 'weather', maturity: 'planned',
      description: 'GRIB acquisition, numerical grids, model fields, timelines, loops and sampling.',
      sceneKinds: ['map'], tools: ['Model', 'Run', 'Field', 'Forecast hour', 'Loop', 'Sampling'],
      legacyFiles: ['workers/model_worker.py', 'public/data/model-registry.json'], dependencies: ['map', 'data-engine'],
    },
    isActiveForScene: (scene) => scene.kind === 'map' && scene.category === 'Models',
    dialogs: [{ id: 'module:model-lab', title: 'Model Lab', className: 'tool-window--model-lab', order: 50, sceneKinds: ['map'], component: ModelLabDialogPanel }],
    tools: [
      { id: 'models-dock', label: 'Model Lab', placement: 'dock-tool', order: 70, sceneKinds: ['map'], command: { kind: 'open-dialog', dialog: 'module:model-lab' } },
      { id: 'models-timeline', label: 'Timeline', placement: 'dock-tool', order: 60, sceneKinds: ['map'], command: { kind: 'status', message: 'Timeline module will open in the R3 bottom workspace' } },
    ],
  },
];
