import type { MapScene } from '../types/domain';

export type TropicalStormSurgeProduct = 'potential' | 'peak';
export type PeakStormSurgeClass = 'blue' | 'yellow' | 'orange' | 'red' | 'purple' | 'unknown';

export interface TropicalStormSurgeSceneState {
  showSurge: boolean;
  showLabels: boolean;
  autoRefreshEnabled: boolean;
  refreshToken: number;
}

export const DEFAULT_TROPICAL_STORM_SURGE_SCENE_STATE: TropicalStormSurgeSceneState = {
  showSurge: true,
  showLabels: true,
  autoRefreshEnabled: true,
  refreshToken: 0,
};

function boundedInteger(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.round(number)));
}

export function normalizeTropicalStormSurgeSceneState(
  value: Record<string, unknown> | null | undefined,
): TropicalStormSurgeSceneState {
  const current = value ?? {};
  return {
    showSurge: current.showSurge !== false,
    showLabels: current.showLabels !== false,
    autoRefreshEnabled: current.autoRefreshEnabled !== false,
    refreshToken: boundedInteger(current.refreshToken, 0, 0, Number.MAX_SAFE_INTEGER),
  };
}

export function tropicalStormSurgeStateForScene(scene: MapScene): TropicalStormSurgeSceneState {
  return normalizeTropicalStormSurgeSceneState(scene.moduleState['tropical-storm-surge']);
}

export function tropicalStormSurgeProductForScene(scene: MapScene): TropicalStormSurgeProduct | null {
  if (scene.product.category !== 'tropical') return null;
  if (scene.product.id === 'nhc-surge-inundation') return 'potential';
  if (scene.product.id === 'nhc-peak-storm-surge') return 'peak';
  return null;
}
