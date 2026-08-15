import type { HeaderLegendState, MapScene } from '../types/domain';

export type SatelliteSource = 'east' | 'west';
export type SatelliteProductId =
  | 'goes-visible'
  | 'goes-infrared'
  | 'goes-water-vapor'
  | 'goes-geocolor';
export type SatelliteFrameMode = 'latest-tile' | 'archive-image' | 'noaa-image-service';
export type SatelliteProviderId = 'iem-goes' | 'noaa-nesdis-geocolor';

export interface SatelliteSceneState {
  source: SatelliteSource;
  product: SatelliteProductId;
  animationEnabled: boolean;
  frameIndex: number;
  frameCount: number;
  playbackRateMs: number;
  playbackStartedAt: number;
  autoRefreshEnabled: boolean;
  overlayEnabled: boolean;
  expandedTools: boolean;
  refreshToken: number;
}

export interface SatelliteFrame {
  id: string;
  validTime: string;
  label: string;
  epochMs: number | null;
  mode: SatelliteFrameMode;
}

export interface SatelliteCatalog {
  provider: SatelliteProviderId;
  source: SatelliteSource;
  product: SatelliteProductId;
  frames: SatelliteFrame[];
  generatedAt: string;
  cacheStatus?: string;
  cacheWarning?: string;
}

export const DEFAULT_SATELLITE_SCENE_STATE: SatelliteSceneState = {
  source: 'east',
  product: 'goes-infrared',
  animationEnabled: false,
  frameIndex: -1,
  frameCount: 12,
  playbackRateMs: 900,
  playbackStartedAt: 0,
  autoRefreshEnabled: true,
  overlayEnabled: false,
  expandedTools: false,
  refreshToken: 0,
};

function boundedNumber(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(maximum, number));
}

export function isSatelliteProduct(value: unknown): value is SatelliteProductId {
  return value === 'goes-visible'
    || value === 'goes-infrared'
    || value === 'goes-water-vapor'
    || value === 'goes-geocolor';
}

export function satelliteProductForScene(scene: MapScene): SatelliteProductId {
  if (isSatelliteProduct(scene.product.id)) return scene.product.id;
  const saved = scene.moduleState.satellite?.product;
  if (isSatelliteProduct(saved)) return saved;
  return 'goes-infrared';
}

export function normalizeSatelliteSceneState(
  value: Record<string, unknown> | null | undefined,
  scene?: MapScene,
): SatelliteSceneState {
  const current = value ?? {};
  const sceneProduct = scene?.product.category === 'satellite' && isSatelliteProduct(scene.product.id)
    ? scene.product.id
    : undefined;
  const product = sceneProduct
    ?? (isSatelliteProduct(current.product) ? current.product : DEFAULT_SATELLITE_SCENE_STATE.product);
  const source: SatelliteSource = current.source === 'west' ? 'west' : 'east';
  return {
    source,
    product,
    animationEnabled: Boolean(current.animationEnabled),
    frameIndex: Math.round(boundedNumber(current.frameIndex, -1, -1, 500)),
    frameCount: Math.round(boundedNumber(current.frameCount, 12, 1, 24)),
    playbackRateMs: Math.round(boundedNumber(current.playbackRateMs, 900, 250, 5000)),
    playbackStartedAt: Math.round(boundedNumber(current.playbackStartedAt, 0, 0, Number.MAX_SAFE_INTEGER)),
    autoRefreshEnabled: current.autoRefreshEnabled !== false,
    overlayEnabled: Boolean(current.overlayEnabled),
    expandedTools: Boolean(current.expandedTools),
    refreshToken: Math.round(boundedNumber(current.refreshToken, 0, 0, Number.MAX_SAFE_INTEGER)),
  };
}

export function satelliteStateForScene(scene: MapScene): SatelliteSceneState {
  return normalizeSatelliteSceneState(scene.moduleState.satellite, scene);
}

export function satelliteIsActive(scene: MapScene): boolean {
  return scene.product.category === 'satellite' || satelliteStateForScene(scene).overlayEnabled;
}

export function satellitePlaybackFrameIndex(
  state: Pick<SatelliteSceneState, 'animationEnabled' | 'frameIndex' | 'playbackRateMs' | 'playbackStartedAt'>,
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

export function satelliteProductLabel(product: SatelliteProductId): string {
  switch (product) {
    case 'goes-visible': return 'Visible';
    case 'goes-infrared': return 'Enhanced Infrared';
    case 'goes-water-vapor': return 'Water Vapor';
    case 'goes-geocolor': return 'GeoColor';
  }
}

export function satelliteSourceLabel(source: SatelliteSource): string {
  return source === 'west' ? 'GOES-18 West' : 'GOES-19 East';
}

export function satelliteDisplaySourceLabel(
  source: SatelliteSource,
  product: SatelliteProductId,
): string {
  return product === 'goes-geocolor'
    ? 'Merged GOES East + West'
    : satelliteSourceLabel(source);
}

export function satelliteLegendForProduct(product: SatelliteProductId): HeaderLegendState {
  switch (product) {
    case 'goes-infrared':
      return { kind: 'satellite', visible: true, lowLabel: 'WARM', highLabel: 'COLD', customLabel: 'ENHANCED IR' };
    case 'goes-water-vapor':
      return { kind: 'satellite', visible: true, lowLabel: 'DRY', highLabel: 'MOIST', customLabel: 'WATER VAPOR' };
    case 'goes-visible':
      return { kind: 'satellite', visible: false, lowLabel: '', highLabel: '', customLabel: 'VISIBLE' };
    case 'goes-geocolor':
      return { kind: 'satellite', visible: false, lowLabel: '', highLabel: '', customLabel: 'GEOCOLOR' };
  }
}