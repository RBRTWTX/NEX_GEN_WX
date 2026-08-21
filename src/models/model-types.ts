import type { MapScene } from '../types/domain';

export type ModelId = 'hrrr';
export type ModelFieldId = 'composite-reflectivity' | 'temperature-2m' | 'dewpoint-2m' | 'relative-humidity-2m' | 'wind-gust-surface';
export type ModelRunMode = 'latest' | 'pinned';
export type ModelProviderId = 'noaa-nodd-hrrr';
export type ModelSmoothing = 'sharp' | 'balanced' | 'smooth';

export interface ModelSceneState {
  model: ModelId;
  field: ModelFieldId;
  runMode: ModelRunMode;
  runId: string;
  forecastHour: number;
  animationEnabled: boolean;
  loopEnabled: boolean;
  playbackRateMs: number;
  opacity: number;
  smoothing: ModelSmoothing;
  expandedTools: boolean;
  refreshToken: number;
}

export interface ModelFieldDefinition {
  id: ModelFieldId;
  label: string;
  parameter: string;
  level: string;
  sourceUnit: string;
  displayUnit: string;
}

export interface ModelRun {
  id: string;
  date: string;
  cycle: number;
  label: string;
  forecastHours: number[];
}

export interface ModelCatalog {
  provider: ModelProviderId;
  model: ModelId;
  run: ModelRun;
  generatedAt: string;
  cacheStatus?: string;
  cacheWarning?: string;
}

export interface ModelFieldGrid {
  provider: ModelProviderId;
  model: ModelId;
  field: ModelFieldId;
  runId: string;
  date: string;
  cycle: number;
  forecastHour: number;
  nx: number;
  ny: number;
  iIndices: number[];
  jIndices: number[];
  values: Array<number | null>;
  unit: string;
  cacheStatus?: string;
  cacheWarning?: string;
}

export const MODEL_FIELDS: readonly ModelFieldDefinition[] = [
  {
    id: 'temperature-2m',
    label: '2 m Temperature',
    parameter: 'TMP',
    level: '2 m above ground',
    sourceUnit: 'K',
    displayUnit: '°F',
  },
  {
    id: 'dewpoint-2m',
    label: '2 m Dew Point',
    parameter: 'DPT',
    level: '2 m above ground',
    sourceUnit: 'K',
    displayUnit: '°F',
  },
  {
    id: 'relative-humidity-2m',
    label: '2 m Relative Humidity',
    parameter: 'RH',
    level: '2 m above ground',
    sourceUnit: '%',
    displayUnit: '%',
  },
  {
    id: 'wind-gust-surface',
    label: 'Surface Wind Gust',
    parameter: 'GUST',
    level: 'surface',
    sourceUnit: 'm/s',
    displayUnit: 'mph',
  },
  {
    id: 'composite-reflectivity',
    label: 'Composite Reflectivity',
    parameter: 'REFC',
    level: 'entire atmosphere',
    sourceUnit: 'dBZ',
    displayUnit: 'dBZ',
  },
] as const;

export const DEFAULT_MODEL_SCENE_STATE: ModelSceneState = {
  model: 'hrrr',
  field: 'temperature-2m',
  runMode: 'latest',
  runId: '',
  forecastHour: 0,
  animationEnabled: false,
  loopEnabled: true,
  playbackRateMs: 900,
  opacity: 0.86,
  smoothing: 'balanced',
  expandedTools: true,
  refreshToken: 0,
};

function boundedNumber(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(maximum, number));
}

export function isModelField(value: unknown): value is ModelFieldId {
  return value === 'composite-reflectivity'
    || value === 'temperature-2m'
    || value === 'dewpoint-2m'
    || value === 'relative-humidity-2m'
    || value === 'wind-gust-surface';
}

export function normalizeModelSceneState(
  value: Record<string, unknown> | null | undefined,
): ModelSceneState {
  const current = value ?? {};
  return {
    model: 'hrrr',
    field: isModelField(current.field) ? current.field : DEFAULT_MODEL_SCENE_STATE.field,
    runMode: current.runMode === 'pinned' ? 'pinned' : 'latest',
    runId: typeof current.runId === 'string' ? current.runId.trim() : '',
    forecastHour: Math.round(boundedNumber(current.forecastHour, 0, 0, 48)),
    animationEnabled: Boolean(current.animationEnabled),
    loopEnabled: current.loopEnabled !== false,
    playbackRateMs: Math.round(boundedNumber(current.playbackRateMs, 900, 350, 5000)),
    opacity: boundedNumber(current.opacity, DEFAULT_MODEL_SCENE_STATE.opacity, 0, 1),
    smoothing: current.smoothing === 'sharp' || current.smoothing === 'smooth'
      ? current.smoothing
      : 'balanced',
    expandedTools: current.expandedTools !== false,
    refreshToken: Math.round(boundedNumber(current.refreshToken, 0, 0, Number.MAX_SAFE_INTEGER)),
  };
}

export function modelStateForScene(scene: MapScene): ModelSceneState {
  return normalizeModelSceneState(scene.moduleState.models);
}

export function modelIsActive(scene: MapScene): boolean {
  return scene.category === 'Models';
}

export function modelFieldDefinition(field: ModelFieldId): ModelFieldDefinition {
  return MODEL_FIELDS.find((candidate) => candidate.id === field)
  ?? MODEL_FIELDS.find((candidate) => candidate.id === DEFAULT_MODEL_SCENE_STATE.field)
  ?? MODEL_FIELDS[0];
}

export function modelRunId(date: string, cycle: number): string {
  return `${date}T${String(cycle).padStart(2, '0')}Z`;
}

export function parseModelRunId(value: string): { date: string; cycle: number } | null {
  const match = value.trim().match(/^(\d{8})T(\d{2})Z$/);
  if (!match) return null;
  const cycle = Number(match[2]);
  if (!Number.isInteger(cycle) || cycle < 0 || cycle > 23) return null;
  return { date: match[1], cycle };
}

export function nearestForecastHour(requested: number, available: readonly number[]): number {
  if (!available.length) return 0;
  const normalized = Math.max(0, Math.min(48, Math.round(requested)));
  return available.reduce((best, candidate) => (
    Math.abs(candidate - normalized) < Math.abs(best - normalized) ? candidate : best
  ), available[0]);
}

export function advanceModelForecastHour(
  current: number,
  available: readonly number[],
  direction: -1 | 1,
  loop: boolean,
): { hour: number; wrapped: boolean; atBoundary: boolean } {
  if (!available.length) return { hour: current, wrapped: false, atBoundary: true };
  const sorted = [...new Set(available)].sort((left, right) => left - right);
  let index = sorted.indexOf(current);
  if (index < 0) index = sorted.indexOf(nearestForecastHour(current, sorted));
  const next = index + direction;
  if (next >= 0 && next < sorted.length) {
    return { hour: sorted[next], wrapped: false, atBoundary: false };
  }
  if (loop && sorted.length > 1) {
    return {
      hour: direction > 0 ? sorted[0] : sorted[sorted.length - 1],
      wrapped: true,
      atBoundary: true,
    };
  }
  return { hour: sorted[index], wrapped: false, atBoundary: true };
}
