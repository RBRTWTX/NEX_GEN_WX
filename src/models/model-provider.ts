import { fetchModelHrrrCycleCatalog, fetchModelHrrrField } from '../engine/tauri-commands';
import {
  isModelField,
  modelRunId,
  parseModelRunId,
  type ModelCatalog,
  type ModelFieldGrid,
  type ModelRun,
  type ModelSceneState,
} from './model-types';

interface RawHrrrCycleCatalog {
  provider?: unknown;
  model?: unknown;
  date?: unknown;
  cycle?: unknown;
  forecastHours?: unknown;
  cacheStatus?: unknown;
  cacheWarning?: unknown;
}

interface RawHrrrField {
  provider?: unknown;
  model?: unknown;
  field?: unknown;
  runId?: unknown;
  date?: unknown;
  cycle?: unknown;
  forecastHour?: unknown;
  nx?: unknown;
  ny?: unknown;
  iIndices?: unknown;
  jIndices?: unknown;
  values?: unknown;
  unit?: unknown;
  cacheStatus?: unknown;
  cacheWarning?: unknown;
}

const HRRR_PUBLIC_BASE = 'https://noaa-hrrr-bdp-pds.s3.amazonaws.com';

function normalizeHours(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .map(Number)
    .filter((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 48))]
    .sort((left, right) => left - right);
}

function normalizeCycleCatalog(raw: unknown): ModelCatalog | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const value = raw as RawHrrrCycleCatalog;
  const date = typeof value.date === 'string' ? value.date : '';
  const cycle = Number(value.cycle);
  const forecastHours = normalizeHours(value.forecastHours);
  if (!/^\d{8}$/.test(date) || !Number.isInteger(cycle) || cycle < 0 || cycle > 23 || !forecastHours.length) {
    return null;
  }

  const run: ModelRun = {
    id: modelRunId(date, cycle),
    date,
    cycle,
    label: `HRRR ${date} ${String(cycle).padStart(2, '0')}Z`,
    forecastHours,
  };

  return {
    provider: 'noaa-nodd-hrrr',
    model: 'hrrr',
    run,
    generatedAt: new Date().toISOString(),
    cacheStatus: typeof value.cacheStatus === 'string' ? value.cacheStatus : undefined,
    cacheWarning: typeof value.cacheWarning === 'string' ? value.cacheWarning : undefined,
  };
}

function integerArray(value: unknown, maximum: number): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(Number)
    .filter((candidate) => Number.isInteger(candidate) && candidate >= 0 && candidate <= maximum);
}

function normalizeFieldGrid(raw: unknown): ModelFieldGrid {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('NOAA HRRR field decoder returned an invalid payload.');
  }
  const value = raw as RawHrrrField;
  const field = isModelField(value.field) ? value.field : null;
  const date = typeof value.date === 'string' ? value.date : '';
  const cycle = Number(value.cycle);
  const forecastHour = Number(value.forecastHour);
  const nx = Number(value.nx);
  const ny = Number(value.ny);
  const iIndices = integerArray(value.iIndices, 1798);
  const jIndices = integerArray(value.jIndices, 1058);
  const rawValues = Array.isArray(value.values) ? value.values : [];
  const values = rawValues.map((candidate) => {
    if (candidate == null) return null;
    const number = Number(candidate);
    return Number.isFinite(number) ? number : null;
  });

  if (
    !field
    || !/^\d{8}$/.test(date)
    || !Number.isInteger(cycle) || cycle < 0 || cycle > 23
    || !Number.isInteger(forecastHour) || forecastHour < 0 || forecastHour > 48
    || nx !== 1799 || ny !== 1059
    || iIndices.length < 2 || jIndices.length < 2
    || values.length !== iIndices.length * jIndices.length
  ) {
    throw new Error('NOAA HRRR decoded field failed the NEX GEN WX grid contract.');
  }

  return {
    provider: 'noaa-nodd-hrrr',
    model: 'hrrr',
    field,
    runId: typeof value.runId === 'string' ? value.runId : modelRunId(date, cycle),
    date,
    cycle,
    forecastHour,
    nx,
    ny,
    iIndices,
    jIndices,
    values,
    unit: typeof value.unit === 'string' ? value.unit : '',
    cacheStatus: typeof value.cacheStatus === 'string' ? value.cacheStatus : undefined,
    cacheWarning: typeof value.cacheWarning === 'string' ? value.cacheWarning : undefined,
  };
}

function utcDateStamp(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('');
}

export function candidateHrrrRuns(now = Date.now(), count = 10): Array<{ date: string; cycle: number }> {
  const start = new Date(now - 60 * 60_000);
  const candidates: Array<{ date: string; cycle: number }> = [];
  for (let offset = 0; offset < Math.max(1, count); offset += 1) {
    const candidate = new Date(start.getTime() - offset * 60 * 60_000);
    candidates.push({ date: utcDateStamp(candidate), cycle: candidate.getUTCHours() });
  }
  return candidates;
}

export async function fetchHrrrCatalogForRun(
  date: string,
  cycle: number,
  force = false,
): Promise<ModelCatalog> {
  const raw = await fetchModelHrrrCycleCatalog(date, cycle, force);
  const catalog = normalizeCycleCatalog(raw);
  if (!catalog) {
    throw new Error(`NOAA NODD has no usable HRRR surface catalog for ${date} ${String(cycle).padStart(2, '0')}Z.`);
  }
  return catalog;
}

export async function fetchLatestHrrrCatalog(force = false): Promise<ModelCatalog> {
  let lastError: unknown = null;
  for (const candidate of candidateHrrrRuns()) {
    try {
      const raw = await fetchModelHrrrCycleCatalog(candidate.date, candidate.cycle, force);
      const catalog = normalizeCycleCatalog(raw);
      if (catalog) return catalog;
    } catch (error) {
      lastError = error;
    }
  }
  const detail = lastError instanceof Error ? ` ${lastError.message}` : '';
  throw new Error(`No recent NOAA NODD HRRR surface run could be resolved.${detail}`.trim());
}

export async function fetchModelCatalog(
  state: Pick<ModelSceneState, 'model' | 'runMode' | 'runId'>,
  force = false,
): Promise<ModelCatalog> {
  if (state.model !== 'hrrr') throw new Error(`Unsupported forecast model: ${state.model}`);
  if (state.runMode === 'pinned') {
    const parsed = parseModelRunId(state.runId);
    if (!parsed) throw new Error('Pinned HRRR run must use YYYYMMDDTHHZ.');
    return fetchHrrrCatalogForRun(parsed.date, parsed.cycle, force);
  }
  return fetchLatestHrrrCatalog(force);
}

export async function fetchModelFieldGrid(
  state: Pick<ModelSceneState, 'model' | 'field' | 'smoothing'>,
  run: ModelRun,
  forecastHour: number,
  force = false,
): Promise<ModelFieldGrid> {
  if (state.model !== 'hrrr') throw new Error(`Unsupported forecast model: ${state.model}`);
  const raw = await fetchModelHrrrField(
    run.date,
    run.cycle,
    forecastHour,
    state.field,
    state.smoothing,
    force,
  );
  const grid = normalizeFieldGrid(raw);
  if (grid.runId !== run.id || grid.forecastHour !== forecastHour || grid.field !== state.field) {
    throw new Error('NOAA HRRR field response did not match the requested model frame.');
  }
  return grid;
}

export function hrrrSurfaceObjectKey(date: string, cycle: number, forecastHour: number): string {
  return `hrrr.${date}/conus/hrrr.t${String(cycle).padStart(2, '0')}z.wrfsfcf${String(forecastHour).padStart(2, '0')}.grib2`;
}

export function hrrrSurfaceGribUrl(date: string, cycle: number, forecastHour: number): string {
  return `${HRRR_PUBLIC_BASE}/${hrrrSurfaceObjectKey(date, cycle, forecastHour)}`;
}

export function hrrrSurfaceIndexUrl(date: string, cycle: number, forecastHour: number): string {
  return `${hrrrSurfaceGribUrl(date, cycle, forecastHour)}.idx`;
}
