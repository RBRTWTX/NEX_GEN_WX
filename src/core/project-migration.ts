import { defaultProject } from '../scenes/default-project';
import type {
  AlertDisplaySettings,
  CustomSceneObject,
  HeaderLegendState,
  HeaderState,
  MapDisplaySettings,
  ObservationDisplaySettings,
  SceneCategory,
  SceneElementOverride,
  SceneElementStyle,
  SceneElementTransform,
  StudioProject,
  StudioScene,
  StudioShow,
} from '../types/domain';

export const DEFAULT_MAP_DISPLAY: MapDisplaySettings = {
  cityDensity: 62,
  cityLabelScale: 100,
  roadDensity: 65,
  boundaryWeight: 100,
  dimBasemapUnderWeather: false,
  contextMode: 'auto',
  contextOpacity: 72,
  contextDetail: 'broadcast',
};

export const DEFAULT_ALERT_DISPLAY: AlertDisplaySettings = {
  minimumSeverity: 'unknown',
  showFill: true,
  showOutline: true,
  autoZoomOnSelect: true,
};

export const DEFAULT_OBSERVATION_DISPLAY: ObservationDisplaySettings = {
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

const DEFAULT_LEGEND: HeaderLegendState = {
  kind: 'none',
  visible: false,
  lowLabel: 'LIGHT',
  highLabel: 'HEAVY',
  customLabel: '',
};


function finiteNumber(value: unknown, minimum: number, maximum: number): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : undefined;
}

function normalizeModuleState(input: unknown): Record<string, Record<string, unknown>> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>)
      .filter(([moduleId, value]) => moduleId.length > 0 && moduleId.length <= 100 && value && typeof value === 'object' && !Array.isArray(value))
      .map(([moduleId, value]) => [moduleId, { ...(value as Record<string, unknown>) }]),
  );
}

function normalizeElementStyle(input: unknown): SceneElementStyle {
  if (!input || typeof input !== 'object') return {};
  const value = input as Record<string, unknown>;
  const textAlign = value.textAlign === 'center' || value.textAlign === 'right' ? value.textAlign : value.textAlign === 'left' ? 'left' : undefined;
  return Object.fromEntries(Object.entries({
    color: typeof value.color === 'string' ? value.color.slice(0, 64) : undefined,
    backgroundColor: typeof value.backgroundColor === 'string' ? value.backgroundColor.slice(0, 64) : undefined,
    gradientStartColor: typeof value.gradientStartColor === 'string' ? value.gradientStartColor.slice(0, 64) : undefined,
    gradientEndColor: typeof value.gradientEndColor === 'string' ? value.gradientEndColor.slice(0, 64) : undefined,
    gradientAngleDeg: finiteNumber(value.gradientAngleDeg, -360, 360),
    fontFamily: typeof value.fontFamily === 'string' ? value.fontFamily.slice(0, 120) : undefined,
    fontSizePx: finiteNumber(value.fontSizePx, 8, 220),
    fontWeight: finiteNumber(value.fontWeight, 100, 950),
    lineHeight: finiteNumber(value.lineHeight, 0.6, 3),
    textAlign,
    opacity: finiteNumber(value.opacity, 0.05, 1),
    textShadow: typeof value.textShadow === 'boolean' ? value.textShadow : undefined,
    letterSpacingPx: finiteNumber(value.letterSpacingPx, -5, 30),
    borderColor: typeof value.borderColor === 'string' ? value.borderColor.slice(0, 64) : undefined,
    borderWidthPx: finiteNumber(value.borderWidthPx, 0, 30),
    borderRadiusPx: finiteNumber(value.borderRadiusPx, 0, 200),
    paddingPx: finiteNumber(value.paddingPx, 0, 80),
    boxShadow: typeof value.boxShadow === 'boolean' ? value.boxShadow : undefined,
  }).filter(([, item]) => item !== undefined)) as SceneElementStyle;
}

function normalizeElementTransform(input: unknown): SceneElementTransform {
  if (!input || typeof input !== 'object') return {};
  const value = input as Record<string, unknown>;
  return Object.fromEntries(Object.entries({
    xPercent: finiteNumber(value.xPercent, -200, 200),
    yPercent: finiteNumber(value.yPercent, -200, 200),
    scaleX: finiteNumber(value.scaleX, 0.05, 12),
    scaleY: finiteNumber(value.scaleY, 0.05, 12),
    rotationDeg: finiteNumber(value.rotationDeg, -1080, 1080),
    zIndex: finiteNumber(value.zIndex, -1000, 1000),
    locked: typeof value.locked === 'boolean' ? value.locked : undefined,
    hidden: typeof value.hidden === 'boolean' ? value.hidden : undefined,
  }).filter(([, item]) => item !== undefined)) as SceneElementTransform;
}

function normalizeCustomObjects(input: unknown): CustomSceneObject[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const result: CustomSceneObject[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const value = item as Record<string, unknown>;
    const id = typeof value.id === 'string' ? value.id.slice(0, 120) : '';
    const kind = value.kind === 'shape' || value.kind === 'image' ? value.kind : value.kind === 'text' ? 'text' : null;
    if (!id || !kind || seen.has(id)) continue;
    seen.add(id);
    result.push({
      id,
      kind,
      label: typeof value.label === 'string' ? value.label.slice(0, 160) : `Custom ${kind}`,
      text: typeof value.text === 'string' ? value.text.slice(0, 5000) : undefined,
      imageDataUrl: typeof value.imageDataUrl === 'string' && value.imageDataUrl.startsWith('data:image/') ? value.imageDataUrl : null,
      shape: value.shape === 'ellipse' || value.shape === 'line' || value.shape === 'rounded' ? value.shape : 'rectangle',
    });
  }
  return result;
}

function normalizeElementOverrides(input: unknown): Record<string, SceneElementOverride> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>)
      .filter(([elementId]) => elementId.length > 0 && elementId.length <= 160)
      .map(([elementId, override]) => {
        const value = override && typeof override === 'object' ? override as Record<string, unknown> : {};
        const style = normalizeElementStyle(value.style);
        const transform = normalizeElementTransform(value.transform);
        return [elementId, { style, transform } satisfies SceneElementOverride] as const;
      })
      .filter(([, override]) => Object.keys(override.style).length > 0 || Object.keys(override.transform).length > 0),
  );
}

function inferCategory(scene: Record<string, unknown>): SceneCategory {
  if (scene.kind === 'graphic') return 'Graphics';
  const explicit = String(scene.category ?? '');
  const allowed: SceneCategory[] = [
    'Home', 'National', 'Regional', 'Radar', 'Severe', 'Rainfall', 'Satellite', 'Forecast',
    'Climate', 'Winter', 'Observations', 'Tropical', 'Models', 'Graphics', 'Custom',
  ];
  if (allowed.includes(explicit as SceneCategory)) return explicit as SceneCategory;
  const category = String((scene.product as { category?: unknown } | undefined)?.category ?? '').toLowerCase();
  if (category === 'radar') return 'Radar';
  if (category === 'satellite') return 'Satellite';
  if (category === 'rainfall') return 'Rainfall';
  if (category === 'outlooks') return 'Severe';
  if (category === 'temperature') return 'Observations';
  return 'Custom';
}

function inferHeaderLegend(header: Partial<HeaderState> | undefined, productCategory: string): HeaderLegendState {
  const existing = header?.legend as Partial<HeaderLegendState> | undefined;
  if (existing && typeof existing === 'object') return { ...DEFAULT_LEGEND, ...existing };
  if (productCategory === 'radar') return { ...DEFAULT_LEGEND, kind: 'reflectivity', visible: true };
  if (productCategory === 'temperature') return { ...DEFAULT_LEGEND, kind: 'temperature', visible: true, lowLabel: 'COLD', highLabel: 'HOT' };
  if (productCategory === 'satellite') return { ...DEFAULT_LEGEND, kind: 'satellite', visible: true, lowLabel: 'WARM', highLabel: 'COLD' };
  if (productCategory === 'rainfall') return { ...DEFAULT_LEGEND, kind: 'rainfall', visible: true };
  return DEFAULT_LEGEND;
}

function normalizeScene(scene: Record<string, unknown>): StudioScene {
  const common = {
    ...scene,
    category: inferCategory(scene),
    tags: Array.isArray(scene.tags) ? scene.tags.map(String) : [],
  };
  if (scene.kind !== 'map') {
    return {
      ...common,
      kind: 'graphic',
      templateId: typeof scene.templateId === 'string' ? scene.templateId : 'custom',
      settings: scene.settings && typeof scene.settings === 'object' ? scene.settings as Record<string, unknown> : {},
      activeModuleIds: Array.isArray(scene.activeModuleIds) ? scene.activeModuleIds.map(String) : ['graphics', 'forecast'],
      moduleState: normalizeModuleState(scene.moduleState),
      elementOverrides: normalizeElementOverrides(scene.elementOverrides),
      customObjects: normalizeCustomObjects(scene.customObjects),
    } as StudioScene;
  }

  const mapScene = scene as Record<string, unknown> & {
    display?: Partial<MapDisplaySettings>;
    alerts?: Partial<AlertDisplaySettings>;
    observations?: Partial<ObservationDisplaySettings>;
    header?: Partial<HeaderState>;
    samples?: unknown[];
    product?: { category?: string };
  };
  const productCategory = String(mapScene.product?.category ?? '');
  return {
    ...common,
    kind: 'map',
    display: { ...DEFAULT_MAP_DISPLAY, ...(mapScene.display ?? {}) },
    alerts: { ...DEFAULT_ALERT_DISPLAY, ...(mapScene.alerts ?? {}) },
    observations: { ...DEFAULT_OBSERVATION_DISPLAY, ...(mapScene.observations ?? {}) },
    samples: Array.isArray(mapScene.samples) ? mapScene.samples : [],
    activeModuleIds: Array.isArray(mapScene.activeModuleIds)
      ? [...new Set(mapScene.activeModuleIds.map(String).filter(Boolean))]
      : [],
    moduleState: normalizeModuleState(mapScene.moduleState),
    elementOverrides: normalizeElementOverrides(mapScene.elementOverrides),
    customObjects: normalizeCustomObjects(mapScene.customObjects),
    header: {
      title: String(mapScene.header?.title ?? 'WEATHER'),
      subtitle: String(mapScene.header?.subtitle ?? 'NEX GEN WX'),
      validLabel: String(mapScene.header?.validLabel ?? 'CURRENT'),
      visible: mapScene.header?.visible !== false,
      opacity: typeof mapScene.header?.opacity === 'number' ? mapScene.header.opacity : 0.92,
      scale: typeof mapScene.header?.scale === 'number' ? mapScene.header.scale : 1,
      legend: inferHeaderLegend(mapScene.header, productCategory),
    },
  } as StudioScene;
}

function normalizeShows(input: unknown, scenes: StudioScene[]): StudioShow[] {
  if (!Array.isArray(input)) {
    return [{
      id: 'show-main',
      name: 'Main Weather Show',
      sceneIds: scenes.slice(0, 12).map((scene) => scene.id),
      loop: false,
      defaultHoldSeconds: 15,
    }];
  }
  const sceneIds = new Set(scenes.map((scene) => scene.id));
  const shows = input.map((show, index) => {
    const candidate = show && typeof show === 'object' ? show as Record<string, unknown> : {};
    return {
      id: typeof candidate.id === 'string' ? candidate.id : `show-${index + 1}`,
      name: typeof candidate.name === 'string' ? candidate.name : `Show ${index + 1}`,
      sceneIds: Array.isArray(candidate.sceneIds) ? candidate.sceneIds.map(String).filter((id) => sceneIds.has(id)) : [],
      loop: Boolean(candidate.loop),
      defaultHoldSeconds: Math.max(1, Math.min(600, Number(candidate.defaultHoldSeconds ?? 15))),
    };
  });
  return shows.length ? shows : normalizeShows(null, scenes);
}

export function migrateProject(input: unknown): StudioProject {
  if (!input || typeof input !== 'object') return structuredClone(defaultProject);
  const candidate = input as Partial<StudioProject> & { scenes?: unknown[]; shows?: unknown };
  if (!Array.isArray(candidate.scenes) || candidate.scenes.length === 0) return structuredClone(defaultProject);

  const scenes = candidate.scenes.map((scene) => normalizeScene(scene as unknown as Record<string, unknown>));
  const selectedSceneId = scenes.some((scene) => scene.id === candidate.selectedSceneId)
    ? String(candidate.selectedSceneId)
    : scenes[0].id;
  const shows = normalizeShows(candidate.shows, scenes);
  const selectedShowId = shows.some((show) => show.id === candidate.selectedShowId)
    ? String(candidate.selectedShowId)
    : shows[0]?.id ?? null;

  return {
    schemaVersion: 8,
    id: typeof candidate.id === 'string' ? candidate.id : defaultProject.id,
    name: typeof candidate.name === 'string' ? candidate.name : defaultProject.name,
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString(),
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
    scenes,
    selectedSceneId,
    shows,
    selectedShowId,
    branding: {
      studioName: candidate.branding?.studioName ?? 'NEX GEN WX',
      shortName: candidate.branding?.shortName ?? 'NEX GEN WX',
      logoDataUrl: candidate.branding?.logoDataUrl ?? null,
    },
  };
}
