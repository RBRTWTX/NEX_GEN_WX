import type { HeaderLegendState, MapScene } from '../types/domain';

export type RadarMode = 'national' | 'site';
export type RadarProductId =
  | 'mrms-base-reflectivity'
  | 'site-base-reflectivity'
  | 'site-base-velocity'
  | 'site-storm-relative-velocity'
  | 'site-echo-tops';

export interface RadarSceneState {
  mode: RadarMode;
  selectedSite: string;
  animationEnabled: boolean;
  blendEnabled: boolean;
  frameIndex: number;
  frameCount: number;
  playbackRateMs: number;
  playbackStartedAt: number;
  autoRefreshEnabled: boolean;
  expandedTools: boolean;
  refreshToken: number;
}

export interface RadarSite {
  id: string;
  label: string;
  distanceKm: number | null;
}

export interface RadarFrame {
  id: string;
  validTime: string;
  label: string;
  timestamp: string;
  epochMs: number | null;
}

export interface RadarCatalog {
  provider: 'noaa-mrms' | 'iem-nexrad';
  mode: RadarMode;
  product: RadarProductId;
  sites: RadarSite[];
  frames: RadarFrame[];
  generatedAt: string;
  cacheStatus?: string;
  cacheWarning?: string;
}

export const DEFAULT_RADAR_SCENE_STATE: RadarSceneState = {
  mode: 'national',
  selectedSite: 'auto',
  animationEnabled: false,
  blendEnabled: false,
  frameIndex: -1,
  frameCount: 12,
  playbackRateMs: 900,
  playbackStartedAt: 0,
  autoRefreshEnabled: true,
  expandedTools: false,
  refreshToken: 0,
};

const SITE_PRODUCTS = new Set<RadarProductId>([
  'site-base-reflectivity',
  'site-base-velocity',
  'site-storm-relative-velocity',
  'site-echo-tops',
]);

export function isRadarProduct(value: unknown): value is RadarProductId {
  return value === 'mrms-base-reflectivity' || SITE_PRODUCTS.has(value as RadarProductId);
}

export function isSiteRadarProduct(value: RadarProductId): boolean {
  return SITE_PRODUCTS.has(value);
}

export function radarProductForScene(scene: MapScene): RadarProductId {
  if (isRadarProduct(scene.product.id)) return scene.product.id;
  if (scene.product.id === 'reflectivity' || scene.product.id === 'mrms-reflectivity') {
    return 'mrms-base-reflectivity';
  }
  return 'mrms-base-reflectivity';
}

function boundedNumber(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(maximum, number));
}

export function normalizeRadarSceneState(
  value: Record<string, unknown> | null | undefined,
  scene?: MapScene,
): RadarSceneState {
  const current = value ?? {};
  const product = scene ? radarProductForScene(scene) : 'mrms-base-reflectivity';
  const inferredMode: RadarMode = isSiteRadarProduct(product) ? 'site' : 'national';
  const mode: RadarMode = scene
    ? inferredMode
    : current.mode === 'site' || current.mode === 'national' ? current.mode : inferredMode;
  const selectedSite = String(current.selectedSite ?? 'auto').trim().toUpperCase() || 'AUTO';
  return {
    mode,
    selectedSite: selectedSite === 'AUTO' ? 'auto' : selectedSite.replace(/^K(?=[A-Z0-9]{3}$)/, '').slice(0, 4),
    animationEnabled: Boolean(current.animationEnabled),
    blendEnabled: mode === 'site' && product === 'site-base-reflectivity' && Boolean(current.blendEnabled),
    frameIndex: Math.round(boundedNumber(current.frameIndex, -1, -1, 500)),
    frameCount: Math.round(boundedNumber(current.frameCount, 12, 1, 24)),
    playbackRateMs: Math.round(boundedNumber(current.playbackRateMs, 900, 250, 5000)),
    playbackStartedAt: Math.round(boundedNumber(current.playbackStartedAt, 0, 0, Number.MAX_SAFE_INTEGER)),
    autoRefreshEnabled: current.autoRefreshEnabled !== false,
    expandedTools: Boolean(current.expandedTools),
    refreshToken: Math.round(boundedNumber(current.refreshToken, 0, 0, Number.MAX_SAFE_INTEGER)),
  };
}

export function radarStateForScene(scene: MapScene): RadarSceneState {
  return normalizeRadarSceneState(scene.moduleState.radar, scene);
}



export function radarPlaybackFrameIndex(
  state: Pick<RadarSceneState, 'animationEnabled' | 'frameIndex' | 'playbackRateMs' | 'playbackStartedAt'>,
  frameCount: number,
  now = Date.now(),
): number {
  if (frameCount <= 0) return 0;
  const base = state.frameIndex < 0
    ? frameCount - 1
    : Math.max(0, Math.min(frameCount - 1, Math.round(state.frameIndex)));
  if (!state.animationEnabled || state.playbackStartedAt <= 0) return base;
  const elapsed = Math.max(0, now - state.playbackStartedAt);
  const steps = Math.floor(elapsed / Math.max(250, state.playbackRateMs));
  return (base + steps) % frameCount;
}

export function radarLegendForProduct(product: RadarProductId): HeaderLegendState {
  if (product === 'site-base-velocity' || product === 'site-storm-relative-velocity') {
    return {
      kind: 'custom',
      visible: true,
      lowLabel: 'INBOUND',
      highLabel: 'OUTBOUND',
      customLabel: 'VELOCITY',
    };
  }
  if (product === 'site-echo-tops') {
    return {
      kind: 'custom',
      visible: true,
      lowLabel: 'LOW',
      highLabel: 'HIGH',
      customLabel: 'ECHO TOPS',
    };
  }
  return {
    kind: 'reflectivity',
    visible: true,
    lowLabel: 'LIGHT',
    highLabel: 'HEAVY',
    customLabel: 'REFLECTIVITY',
  };
}

export function radarProductLabel(product: RadarProductId): string {
  switch (product) {
    case 'mrms-base-reflectivity': return 'National MRMS Reflectivity';
    case 'site-base-reflectivity': return 'Site Base Reflectivity';
    case 'site-base-velocity': return 'Site Base Velocity';
    case 'site-storm-relative-velocity': return 'Storm-Relative Velocity';
    case 'site-echo-tops': return 'Echo Tops';
  }
}

export function iemProductCode(product: RadarProductId): string {
  switch (product) {
    case 'site-base-reflectivity': return 'N0B';
    case 'site-base-velocity': return 'N0U';
    case 'site-storm-relative-velocity': return 'N0S';
    case 'site-echo-tops': return 'NET';
    default: return 'N0B';
  }
}
