import type { MapScene } from '../types/domain';

export type TropicalOutlookPeriod = '2day' | '7day';

export interface TropicalOutlookSceneState {
  showLocations: boolean;
  showRegions: boolean;
  showMotion: boolean;
  autoRefreshEnabled: boolean;
  refreshToken: number;
}

export const DEFAULT_TROPICAL_OUTLOOK_SCENE_STATE: TropicalOutlookSceneState = {
  showLocations: true,
  showRegions: true,
  showMotion: true,
  autoRefreshEnabled: true,
  refreshToken: 0,
};

function boundedInteger(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.round(number)));
}

export function normalizeTropicalOutlookSceneState(
  value: Record<string, unknown> | null | undefined,
): TropicalOutlookSceneState {
  const current = value ?? {};
  return {
    showLocations: current.showLocations !== false,
    showRegions: current.showRegions !== false,
    showMotion: current.showMotion !== false,
    autoRefreshEnabled: current.autoRefreshEnabled !== false,
    refreshToken: boundedInteger(current.refreshToken, 0, 0, Number.MAX_SAFE_INTEGER),
  };
}

export function tropicalOutlookStateForScene(scene: MapScene): TropicalOutlookSceneState {
  return normalizeTropicalOutlookSceneState(scene.moduleState['tropical-outlook']);
}

export function tropicalOutlookPeriodForScene(scene: MapScene): TropicalOutlookPeriod | null {
  if (scene.product.category !== 'tropical') return null;
  if (scene.product.id === 'nhc-outlook-2day') return '2day';
  if (scene.product.id === 'nhc-outlook-7day') return '7day';
  return null;
}
