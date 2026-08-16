import type { MapScene } from '../types/domain';

export interface TropicalSceneState {
  selectedStormId: string | null;
  showTrack: boolean;
  showCone: boolean;
  showPoints: boolean;
  showWarnings: boolean;
  autoRefreshEnabled: boolean;
  refreshToken: number;
}

export interface TropicalStormSummary {
  id: string;
  wallet: string;
  name: string;
  stormType: string;
  basin: string;
  advisoryNumber: string;
  advisoryDate: string;
  maxWindKt: number | null;
  pressureMb: number | null;
  classification: string;
  currentCoordinate: [number, number] | null;
}

export const DEFAULT_TROPICAL_SCENE_STATE: TropicalSceneState = {
  selectedStormId: null,
  showTrack: true,
  showCone: true,
  showPoints: true,
  showWarnings: true,
  autoRefreshEnabled: true,
  refreshToken: 0,
};

function boundedInteger(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.round(number)));
}

export function normalizeTropicalSceneState(
  value: Record<string, unknown> | null | undefined,
): TropicalSceneState {
  const current = value ?? {};
  const selectedStormId = typeof current.selectedStormId === 'string' && current.selectedStormId.trim()
    ? current.selectedStormId.trim().toUpperCase()
    : null;
  return {
    selectedStormId,
    showTrack: current.showTrack !== false,
    showCone: current.showCone !== false,
    showPoints: current.showPoints !== false,
    showWarnings: current.showWarnings !== false,
    autoRefreshEnabled: current.autoRefreshEnabled !== false,
    refreshToken: boundedInteger(current.refreshToken, 0, 0, Number.MAX_SAFE_INTEGER),
  };
}

export function tropicalStateForScene(scene: MapScene): TropicalSceneState {
  return normalizeTropicalSceneState(scene.moduleState.tropical);
}

export function tropicalTrackConeIsActive(scene: MapScene): boolean {
  return scene.product.category === 'tropical' && scene.product.id === 'nhc-track-cone';
}
