import type { MapScene } from '../types/domain';

export type TropicalArrivalTimeMode = 'earliest' | 'most-likely';

export interface TropicalArrivalTimeSceneState {
  showContours: boolean;
  showLabels: boolean;
  showWindProbability: boolean;
  autoRefreshEnabled: boolean;
  refreshToken: number;
}

export const DEFAULT_TROPICAL_ARRIVAL_TIME_SCENE_STATE: TropicalArrivalTimeSceneState = {
  showContours: true,
  showLabels: true,
  showWindProbability: true,
  autoRefreshEnabled: true,
  refreshToken: 0,
};

function boundedInteger(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.round(number)));
}

export function normalizeTropicalArrivalTimeSceneState(
  value: Record<string, unknown> | null | undefined,
): TropicalArrivalTimeSceneState {
  const current = value ?? {};
  return {
    showContours: current.showContours !== false,
    showLabels: current.showLabels !== false,
    showWindProbability: current.showWindProbability !== false,
    autoRefreshEnabled: current.autoRefreshEnabled !== false,
    refreshToken: boundedInteger(current.refreshToken, 0, 0, Number.MAX_SAFE_INTEGER),
  };
}

export function tropicalArrivalTimeStateForScene(scene: MapScene): TropicalArrivalTimeSceneState {
  return normalizeTropicalArrivalTimeSceneState(scene.moduleState['tropical-arrival-time']);
}

export function tropicalArrivalTimeModeForScene(scene: MapScene): TropicalArrivalTimeMode | null {
  if (scene.product.category !== 'tropical') return null;
  if (scene.product.id === 'nhc-arrival-earliest') return 'earliest';
  if (scene.product.id === 'nhc-arrival-most-likely') return 'most-likely';
  return null;
}
