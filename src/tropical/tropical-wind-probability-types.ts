import type { MapScene } from '../types/domain';

export type TropicalWindProbabilityThreshold = 34 | 50 | 64;

export interface TropicalWindProbabilitySceneState {
  showProbabilities: boolean;
  showLabels: boolean;
  autoRefreshEnabled: boolean;
  refreshToken: number;
}

export const DEFAULT_TROPICAL_WIND_PROBABILITY_SCENE_STATE: TropicalWindProbabilitySceneState = {
  showProbabilities: true,
  showLabels: false,
  autoRefreshEnabled: true,
  refreshToken: 0,
};

function boundedInteger(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.round(number)));
}

export function normalizeTropicalWindProbabilitySceneState(
  value: Record<string, unknown> | null | undefined,
): TropicalWindProbabilitySceneState {
  const current = value ?? {};
  return {
    showProbabilities: current.showProbabilities !== false,
    showLabels: current.showLabels === true,
    autoRefreshEnabled: current.autoRefreshEnabled !== false,
    refreshToken: boundedInteger(current.refreshToken, 0, 0, Number.MAX_SAFE_INTEGER),
  };
}

export function tropicalWindProbabilityStateForScene(
  scene: MapScene,
): TropicalWindProbabilitySceneState {
  return normalizeTropicalWindProbabilitySceneState(
    scene.moduleState['tropical-wind-probability'],
  );
}

export function tropicalWindProbabilityThresholdForScene(
  scene: MapScene,
): TropicalWindProbabilityThreshold | null {
  if (scene.product.category !== 'tropical') return null;
  if (scene.product.id === 'nhc-wind-prob-34kt') return 34;
  if (scene.product.id === 'nhc-wind-prob-50kt') return 50;
  if (scene.product.id === 'nhc-wind-prob-64kt') return 64;
  return null;
}
