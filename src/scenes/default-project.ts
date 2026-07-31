import legacyScenes from '../../reference/legacy-r3/default-scenes.json';
import legacyGraphics from '../../reference/legacy-r3/default-graphics.json';
import type {
  HeaderLegendKind,
  MapScene,
  ObservationDisplaySettings,
  SceneCategory,
  StudioProject,
  StudioScene,
} from '../types/domain';

const now = new Date().toISOString();

const observationDefaults: ObservationDisplaySettings = {
  field: 'tempF',
  displayMode: 'broadcast',
  density: 58,
  labelScale: 100,
  showField: true,
  fieldOpacity: 74,
  showStations: true,
  showStationIds: false,
  smoothing: 'smooth',
};

function category(value: unknown, fallback: SceneCategory): SceneCategory {
  const allowed: SceneCategory[] = [
    'Home', 'National', 'Regional', 'Radar', 'Severe', 'Rainfall', 'Satellite', 'Forecast',
    'Climate', 'Winter', 'Observations', 'Tropical', 'Models', 'Graphics', 'Custom',
  ];
  return allowed.includes(value as SceneCategory) ? value as SceneCategory : fallback;
}

function legendKind(value: unknown, productCategory: string): HeaderLegendKind {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('reflect')) return 'reflectivity';
  if (text.includes('temp')) return 'temperature';
  if (text.includes('dew')) return 'dewpoint';
  if (text.includes('rain') || text.includes('qpf')) return 'rainfall';
  if (text.includes('sat') || productCategory === 'satellite') return 'satellite';
  if (text.includes('outlook') || productCategory === 'outlooks') return 'outlook';
  return text ? 'custom' : 'none';
}

function legendLabels(kind: HeaderLegendKind): [string, string] {
  switch (kind) {
    case 'temperature': return ['COLD', 'HOT'];
    case 'dewpoint': return ['DRY', 'HUMID'];
    case 'rainfall': return ['LIGHT', 'HEAVY'];
    case 'satellite': return ['WARM', 'COLD'];
    case 'outlook': return ['LOW', 'HIGH'];
    case 'reflectivity': return ['LIGHT', 'HEAVY'];
    default: return ['LOW', 'HIGH'];
  }
}

function activeModules(productCategory: string, overlays: Record<string, unknown>): string[] {
  const modules = new Set<string>(['map']);
  const categoryMap: Record<string, string> = {
    radar: 'radar', satellite: 'satellite', temperature: 'temperature', rainfall: 'radar',
    outlooks: 'forecast', models: 'models', tropical: 'tropical', observations: 'observations',
  };
  if (categoryMap[productCategory]) modules.add(categoryMap[productCategory]);
  if (overlays.cities) modules.add('cities');
  if (overlays.roads) modules.add('roads');
  if (overlays.states || overlays.counties) modules.add('boundaries');
  if (overlays.alerts) modules.add('alerts');
  if (overlays.observations) modules.add('observations');
  return [...modules];
}

function mapSceneFromLegacy(raw: Record<string, any>): MapScene {
  const productCategory = String(raw.product?.category ?? 'radar');
  const kind = legendKind(raw.header?.legend, productCategory);
  const [lowLabel, highLabel] = legendLabels(kind);
  const field = raw.product?.id?.includes('dew') ? 'dewpointF' : 'tempF';
  return {
    id: String(raw.id),
    name: String(raw.name ?? raw.id),
    kind: 'map',
    category: category(raw.category, productCategory === 'radar' ? 'Radar' : 'Custom'),
    tags: [String(raw.category ?? ''), productCategory].filter(Boolean),
    camera: {
      center: [Number(raw.camera?.center?.[0] ?? -98.52), Number(raw.camera?.center?.[1] ?? 29.55)],
      zoom: Number(raw.camera?.zoom ?? 7.25),
      pitch: Number(raw.camera?.pitch ?? 0),
      bearing: Number(raw.camera?.bearing ?? 0),
    },
    baseMap: ['gray', 'dark', 'satellite'].includes(raw.baseMap) ? raw.baseMap : 'gray',
    projection: raw.projection === 'globe' ? 'globe' : 'mercator',
    product: {
      category: productCategory,
      id: String(raw.product?.id ?? 'mrms-reflectivity'),
      opacity: Number(raw.product?.opacity ?? 0.82),
      smoothing: raw.product?.smooth ? 'smooth' : 'balanced',
    },
    overlays: {
      states: Boolean(raw.overlays?.states ?? true),
      counties: Boolean(raw.overlays?.counties ?? false),
      roads: Boolean(raw.overlays?.roads ?? true),
      cities: Boolean(raw.overlays?.cities ?? true),
      alerts: Boolean(raw.overlays?.alerts ?? false),
      observations: Boolean(raw.overlays?.observations ?? false),
      radarSites: Boolean(raw.overlays?.radarSites ?? false),
      stormReports: Boolean(raw.overlays?.lsr ?? raw.overlays?.stormReports ?? false),
    },
    display: {
      cityDensity: 65,
      cityLabelScale: 100,
      roadDensity: raw.overlays?.roads ? 65 : 35,
      boundaryWeight: 100,
      dimBasemapUnderWeather: productCategory !== 'satellite',
    },
    alerts: {
      minimumSeverity: 'unknown',
      showFill: true,
      showOutline: true,
      autoZoomOnSelect: true,
    },
    observations: {
      ...observationDefaults,
      field,
      showField: productCategory === 'temperature' || Boolean(raw.overlays?.observations),
      showStations: Boolean(raw.overlays?.observations) || productCategory === 'temperature',
    },
    samples: [],
    header: {
      title: String(raw.header?.title ?? raw.name ?? 'WEATHER'),
      subtitle: String(raw.header?.subtitle ?? 'NEX GEN WX'),
      validLabel: String(raw.header?.valid ?? 'CURRENT'),
      visible: true,
      opacity: Number(raw.header?.opacity ?? 0.92),
      scale: Number(raw.header?.scale ?? 1),
      legend: {
        kind,
        visible: kind !== 'none',
        lowLabel,
        highLabel,
        customLabel: '',
      },
    },
    transition: {
      type: ['cut', 'dissolve', 'ease', 'fly'].includes(raw.transition?.type) ? raw.transition.type : 'fly',
      durationMs: Number(raw.transition?.duration ?? 1800),
    },
    advance: raw.advance === 'automatic' ? 'automatic' : 'manual',
    holdSeconds: Number(raw.hold ?? 10),
    activeModuleIds: activeModules(productCategory, raw.overlays ?? {}),
    moduleState: {},
    elementOverrides: {},
    customObjects: [],
  };
}

function graphicSceneFromLegacy(raw: Record<string, any>): StudioScene {
  return {
    id: String(raw.id),
    name: String(raw.name ?? raw.title ?? raw.id),
    kind: 'graphic',
    category: 'Graphics',
    tags: ['Graphics', String(raw.graphic?.templateId ?? '')].filter(Boolean),
    templateId: String(raw.graphic?.templateId ?? 'custom'),
    settings: { ...(raw.graphic?.settings ?? {}) },
    transition: {
      type: ['cut', 'dissolve', 'ease', 'fly'].includes(raw.transition?.type) ? raw.transition.type : 'dissolve',
      durationMs: Number(raw.transition?.duration ?? 900),
    },
    advance: raw.advance === 'automatic' ? 'automatic' : 'manual',
    holdSeconds: Number(raw.hold ?? 12),
    activeModuleIds: ['graphics', 'forecast'],
    moduleState: {},
    elementOverrides: {},
    customObjects: [],
  };
}

const scenes: StudioScene[] = [
  ...(legacyScenes as Array<Record<string, any>>).map(mapSceneFromLegacy),
  ...(legacyGraphics as Array<Record<string, any>>).map(graphicSceneFromLegacy),
];

const defaultShowSceneIds = scenes.slice(0, 12).map((scene) => scene.id);

export const defaultProject: StudioProject = {
  schemaVersion: 8,
  id: 'project-nex-gen-wx-default',
  name: 'Untitled Project',
  createdAt: now,
  updatedAt: now,
  selectedSceneId: scenes[0]?.id ?? 'home-ewx',
  scenes,
  shows: [{
    id: 'show-main',
    name: 'Main Weather Show',
    sceneIds: defaultShowSceneIds,
    loop: false,
    defaultHoldSeconds: 15,
  }],
  selectedShowId: 'show-main',
  branding: {
    studioName: 'NEX GEN WX',
    shortName: 'NEX GEN WX',
    logoDataUrl: null,
  },
};
