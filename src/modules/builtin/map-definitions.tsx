import { AlertsController } from '../../map/controllers/AlertsController';
import { BoundaryController } from '../../map/controllers/BoundaryController';
import { CitiesController } from '../../map/controllers/CitiesController';
import { ObservationsController } from '../../map/controllers/ObservationsController';
import { RoadsController } from '../../map/controllers/RoadsController';
import type { StudioModuleDefinition } from '../../types/module';
import { AlertsDialogPanel } from './panels/AlertsDialogPanel';
import { AlertsSettingsPanel } from './panels/AlertsSettingsPanel';
import { CitiesSettingsPanel } from './panels/CitiesSettingsPanel';
import { ObservationsSettingsPanel } from './panels/ObservationsSettingsPanel';
import { RoadsSettingsPanel } from './panels/RoadsSettingsPanel';

export const mapModuleDefinitions: StudioModuleDefinition[] = [
  {
    manifest: {
      id: 'boundaries', name: 'Administrative Boundaries', domain: 'map', maturity: 'foundation',
      description: 'Cached Census state and zoom-aware county boundaries rendered above weather data and below city labels.',
      sceneKinds: ['map'], tools: ['States', 'Counties', 'Line weight', 'Refresh'],
      legacyFiles: ['public/map-engine.js', 'server.js'], dependencies: ['map', 'data-engine'],
    },
    isActiveForScene: (scene) => scene.kind === 'map' && (scene.overlays.states || scene.overlays.counties),
    providers: [{ id: 'states', label: 'State boundaries' }, { id: 'counties', label: 'County boundaries' }],
    mapControllers: [{ id: 'boundaries', phase: 'data', order: 10, create: () => new BoundaryController() }],
    tools: [
      { id: 'boundaries-states', label: 'States', placement: 'dock-layer', order: 10, sceneKinds: ['map'], command: { kind: 'toggle-overlay', overlay: 'states' } },
      { id: 'boundaries-counties', label: 'Counties', placement: 'dock-layer', order: 20, sceneKinds: ['map'], command: { kind: 'toggle-overlay', overlay: 'counties' } },
    ],
  },
  {
    manifest: {
      id: 'cities', name: 'Cities and Places', domain: 'map', maturity: 'foundation',
      description: 'Zoom-responsive city density, hover/click behavior, pinned places, hide/restore and label styling.',
      sceneKinds: ['map'], tools: ['Density', 'Pinned cities', 'Hide/restore', 'Label style'],
      legacyFiles: ['public/broadcast-data-layers.js', 'server.js'], dependencies: ['map', 'data-engine'],
    },
    isActiveForScene: (scene) => scene.kind === 'map' && scene.overlays.cities,
    providers: [{ id: 'cities', label: 'Cities and places' }],
    mapControllers: [{ id: 'cities', phase: 'data', order: 20, create: () => new CitiesController() }],
    settingsTabs: [{ id: 'cities', label: 'Cities', order: 30, sceneKinds: ['map'], component: CitiesSettingsPanel }],
    tools: [{ id: 'cities-layer', label: 'Cities', placement: 'dock-layer', order: 30, sceneKinds: ['map'], command: { kind: 'toggle-overlay', overlay: 'cities' } }],
  },
  {
    manifest: {
      id: 'roads', name: 'Roads', domain: 'map', maturity: 'foundation',
      description: 'Road and route labels that remain below all weather data at every scene and scale.',
      sceneKinds: ['map'], tools: ['Visibility', 'Density', 'Line weight', 'Route labels'],
      legacyFiles: ['public/broadcast-data-layers.js', 'server.js'], dependencies: ['map', 'data-engine'],
    },
    isActiveForScene: (scene) => scene.kind === 'map' && scene.overlays.roads,
    providers: [{ id: 'roads', label: 'Roads and route context' }],
    mapControllers: [{ id: 'roads', phase: 'data', order: 5, create: () => new RoadsController() }],
    settingsTabs: [{ id: 'roads', label: 'Roads', order: 40, sceneKinds: ['map'], component: RoadsSettingsPanel }],
    tools: [{ id: 'roads-layer', label: 'Roads', placement: 'dock-layer', order: 40, sceneKinds: ['map'], command: { kind: 'toggle-overlay', overlay: 'roads' } }],
  },
  {
    manifest: {
      id: 'alerts', name: 'NWS Alerts', domain: 'weather', maturity: 'foundation',
      description: 'Active NWS alert retrieval, filtering, geometry, list navigation, zoom and leader-line callouts.',
      sceneKinds: ['map'], tools: ['Event filters', 'Alert list', 'Zoom', 'Callout', 'Refresh'],
      legacyFiles: ['server.js', 'public/broadcast-data-layers.js'], dependencies: ['map', 'data-engine'],
    },
    isActiveForScene: (scene) => scene.kind === 'map' && scene.overlays.alerts,
    providers: [{ id: 'alerts', label: 'NWS alerts' }],
    mapControllers: [{ id: 'alerts', phase: 'data', order: 30, create: () => new AlertsController() }],
    dialogs: [{ id: 'module:alerts', title: 'Active Alerts', className: 'tool-window--alerts', order: 30, sceneKinds: ['map'], component: AlertsDialogPanel }],
    settingsTabs: [{ id: 'alerts', label: 'Alerts', order: 50, sceneKinds: ['map'], component: AlertsSettingsPanel }],
    tools: [
      { id: 'alerts-layer', label: 'Alerts', placement: 'dock-layer', order: 50, sceneKinds: ['map'], command: { kind: 'toggle-overlay', overlay: 'alerts' } },
      { id: 'alerts-quick', label: 'Alerts', placement: 'quick', order: 30, sceneKinds: ['map'], command: { kind: 'open-dialog', dialog: 'module:alerts' } },
      { id: 'alerts-context', label: 'Alerts', placement: 'context', order: 130, sceneKinds: ['map'], command: { kind: 'open-dialog', dialog: 'module:alerts' } },
    ],
  },
  {
    manifest: {
      id: 'observations', name: 'Observations', domain: 'weather', maturity: 'foundation',
      description: 'Native NOAA METAR ingestion, station thinning, broadcast labels, station details and field analysis.',
      sceneKinds: ['map'], tools: ['Field', 'Density', 'Label style', 'Station filter'],
      legacyFiles: ['lib/observations.js', 'public/broadcast-data-layers.js'], dependencies: ['map', 'data-engine'],
    },
    isActiveForScene: (scene) => scene.kind === 'map' && (scene.overlays.observations || scene.product.category === 'temperature'),
    providers: [{ id: 'observations', label: 'Surface observations' }],
    mapControllers: [{
      id: 'observations', phase: 'data', order: 40,
      create: (context) => {
        const controller = new ObservationsController();
        context.setService('observations-controller', controller);
        return controller;
      },
    }],
    settingsTabs: [{ id: 'observations', label: 'Observations', order: 60, sceneKinds: ['map'], component: ObservationsSettingsPanel }],
  },
  {
    manifest: {
      id: 'temperature', name: 'Temperature Suite', domain: 'weather', maturity: 'foundation',
      description: 'Current temperature, dew point, humidity, heat index, wind chill and wind analyses with scene-specific point sampling.',
      sceneKinds: ['map'], tools: ['Field', 'Color table', 'Opacity', 'Labels', 'Sampling'],
      legacyFiles: ['public/map-engine.js', 'lib/observations.js', 'workers/model_worker.py'], dependencies: ['map', 'data-engine', 'observations'],
    },
    isActiveForScene: (scene) => scene.kind === 'map' && scene.product.category === 'temperature',
  },
];
