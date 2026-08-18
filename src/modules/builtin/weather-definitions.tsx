import type { StudioModuleDefinition } from '../../types/module';
import { RadarController } from '../../radar/RadarController';
import { DEFAULT_RADAR_SCENE_STATE, normalizeRadarSceneState } from '../../radar/radar-types';
import { SatelliteController } from '../../satellite/SatelliteController';
import { TropicalController } from '../../tropical/TropicalController';
import { TropicalOutlookController } from '../../tropical/TropicalOutlookController';
import { TropicalWindProbabilityController } from '../../tropical/TropicalWindProbabilityController';
import { TropicalStormSurgeController } from '../../tropical/TropicalStormSurgeController';
import { TropicalArrivalTimeController } from '../../tropical/TropicalArrivalTimeController';
import { DEFAULT_SATELLITE_SCENE_STATE, normalizeSatelliteSceneState } from '../../satellite/satellite-types';
import { DEFAULT_TROPICAL_SCENE_STATE, normalizeTropicalSceneState } from '../../tropical/tropical-types';
import { ModelLabDialogPanel } from './panels/ModelLabDialogPanel';
import { RadarDialogPanel } from './panels/RadarDialogPanel';
import { SatelliteDialogPanel } from './panels/SatelliteDialogPanel';
import { TropicalDialogPanel } from './panels/TropicalDialogPanel';

export const weatherModuleDefinitions: StudioModuleDefinition[] = [
  {
    manifest: {
      id: 'radar', name: 'Radar', domain: 'weather', maturity: 'operational',
      description: 'Nationwide NOAA MRMS reflectivity and IEM NEXRAD Level III site products with latest-first rendering, animation, site selection and export-safe state.',
      sceneKinds: ['map'], tools: ['Product', 'Site', 'Composite', 'Playback', 'Smoothing', 'Timeline'],
      legacyFiles: ['public/map-engine.js', 'workers/radar_worker.py', 'workers/level3_worker.py'], dependencies: ['map', 'data-engine'],
    },
    isActiveForScene: (scene) => scene.kind === 'map' && scene.product.category === 'radar',
    providers: [
      { id: 'radar-mrms', label: 'NOAA MRMS radar' },
      { id: 'radar-sites', label: 'IEM NEXRAD radar' },
    ],
    mapControllers: [{ id: 'radar', phase: 'data', order: 25, create: () => new RadarController() }],
    dialogs: [{ id: 'module:radar', title: 'Radar Controls', className: 'tool-window--radar', order: 10, sceneKinds: ['map'], requiresActiveModule: true, component: RadarDialogPanel }],
    tools: [
      { id: 'radar-dock', label: 'Radar', placement: 'dock-tool', order: 20, sceneKinds: ['map'], requiresActiveModule: true, command: { kind: 'open-dialog', dialog: 'module:radar' } },
      { id: 'radar-quick', label: 'Radar', placement: 'quick', order: 10, sceneKinds: ['map'], requiresActiveModule: true, command: { kind: 'open-dialog', dialog: 'module:radar' } },
      { id: 'radar-context', label: 'Radar', placement: 'context', order: 120, sceneKinds: ['map'], requiresActiveModule: true, command: { kind: 'open-dialog', dialog: 'module:radar' } },
    ],
    defaultSceneState: { ...DEFAULT_RADAR_SCENE_STATE },
    migrateSceneState: (value, scene) => scene.kind === 'map'
      ? { ...normalizeRadarSceneState(value, scene) }
      : { ...value },
  },
  {
    manifest: {
      id: 'satellite', name: 'Satellite', domain: 'weather', maturity: 'migration-next',
      description: 'GOES East/West satellite imagery with IEM live tiles and archive composites, NOAA/NESDIS GeoColor history, animation, export-safe rendering and independent overlay state.',
      sceneKinds: ['map'], tools: ['Satellite', 'Product', 'Frame', 'Play', 'Speed', 'Opacity', 'Overlay'],
      legacyFiles: ['public/map-engine.js', 'server.js'], dependencies: ['map', 'data-engine'],
    },
    isActiveForScene: (scene) => scene.kind === 'map' && (
      scene.product.category === 'satellite'
      || Boolean((scene.moduleState.satellite as { overlayEnabled?: boolean } | undefined)?.overlayEnabled)
    ),
    providers: [
      { id: 'satellite-goes', label: 'IEM / NOAA GOES satellite' },
    ],
    mapControllers: [{ id: 'satellite', phase: 'data', order: 24, create: () => new SatelliteController() }],
    dialogs: [{ id: 'module:satellite', title: 'Satellite Controls', className: 'tool-window--satellite', order: 20, sceneKinds: ['map'], component: SatelliteDialogPanel }],
    tools: [
      { id: 'satellite-dock', label: 'Satellite', placement: 'dock-tool', order: 30, sceneKinds: ['map'], command: { kind: 'open-dialog', dialog: 'module:satellite' } },
      { id: 'satellite-quick', label: 'Satellite', placement: 'quick', order: 20, sceneKinds: ['map'], command: { kind: 'open-dialog', dialog: 'module:satellite' } },
      { id: 'satellite-context', label: 'Satellite', placement: 'context', order: 110, sceneKinds: ['map'], command: { kind: 'open-dialog', dialog: 'module:satellite' } },
    ],
    defaultSceneState: { ...DEFAULT_SATELLITE_SCENE_STATE },
    migrateSceneState: (value, scene) => scene.kind === 'map'
      ? { ...normalizeSatelliteSceneState(value, scene) }
      : { ...value },
  },
  {
    manifest: {
      id: 'tropical', name: 'Tropical Weather', domain: 'weather', maturity: 'migration-next',
      description: 'Official NOAA/NWS/NHC tropical outlooks, forecast track/cone, coastal watches/warnings, wind probabilities, arrival-time contours, and storm-surge products with scene-owned controls and output-safe rendering.',
      sceneKinds: ['map'], tools: ['Outlook', 'Storm', 'Track', 'Cone', 'Points', 'Watches', 'Wind Probability', 'Arrival Time', 'Storm Surge'],
      legacyFiles: ['lib/tropical.js', 'public/broadcast-data-layers.js'], dependencies: ['map', 'data-engine'],
    },
    isActiveForScene: (scene) => scene.kind === 'map' && scene.category === 'Tropical',
    providers: [
      { id: 'tropical-nhc', label: 'NOAA / NHC Tropical Weather Summary' },
    ],
    mapControllers: [
      { id: 'tropical', phase: 'data', order: 26, create: () => new TropicalController() },
      { id: 'tropical-outlook', phase: 'data', order: 27, create: () => new TropicalOutlookController() },
      { id: 'tropical-wind-probability', phase: 'data', order: 28, create: () => new TropicalWindProbabilityController() },
      { id: 'tropical-storm-surge', phase: 'data', order: 29, create: () => new TropicalStormSurgeController() },
      { id: 'tropical-arrival-time', phase: 'data', order: 29.5, create: () => new TropicalArrivalTimeController() },
    ],
    dialogs: [{ id: 'module:tropical', title: 'Tropical Controls', className: 'tool-window--tropical', order: 30, sceneKinds: ['map'], requiresActiveModule: true, component: TropicalDialogPanel }],
    tools: [
      { id: 'tropical-dock', label: 'Tropical', placement: 'dock-tool', order: 40, sceneKinds: ['map'], requiresActiveModule: true, command: { kind: 'open-dialog', dialog: 'module:tropical' } },
      { id: 'tropical-quick', label: 'Tropical', placement: 'quick', order: 30, sceneKinds: ['map'], requiresActiveModule: true, command: { kind: 'open-dialog', dialog: 'module:tropical' } },
      { id: 'tropical-context', label: 'Tropical', placement: 'context', order: 105, sceneKinds: ['map'], requiresActiveModule: true, command: { kind: 'open-dialog', dialog: 'module:tropical' } },
    ],
    defaultSceneState: { ...DEFAULT_TROPICAL_SCENE_STATE },
    migrateSceneState: (value, scene) => scene.kind === 'map'
      ? { ...normalizeTropicalSceneState(value) }
      : { ...value },
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
