import type { MapScene } from '../types/domain';
import {
  modelFieldDefinition,
  modelStateForScene,
  type ModelRun,
} from './model-types';

const GENERATED_MODEL_SUBTITLES = new Set([
  'COMPOSITE REFLECTIVITY',
  'HRRR COMPOSITE REFLECTIVITY',
  '2 M TEMPERATURE',
  '2M TEMPERATURE',
  'HRRR 2 M TEMPERATURE',
  'TEMPERATURE',
]);

export function modelFieldBroadcastLabel(scene: MapScene): string {
  return modelFieldDefinition(modelStateForScene(scene).field).label.toUpperCase();
}

export function modelLayerStackLabel(scene: MapScene): string {
  return `HRRR · ${modelFieldDefinition(modelStateForScene(scene).field).label}`;
}

export function isGeneratedModelSubtitle(value: string): boolean {
  return GENERATED_MODEL_SUBTITLES.has(value.trim().toUpperCase());
}

export function isGeneratedModelValidLabel(value: string): boolean {
  const normalized = value.trim().toUpperCase();
  return normalized === ''
    || normalized === 'CURRENT'
    || /^F\d{1,2}$/.test(normalized)
    || /^VALID\b/.test(normalized);
}

export function modelValidDate(run: ModelRun | null, forecastHour: number): Date | null {
  if (!run || !/^\d{8}$/.test(run.date)) return null;
  const year = Number(run.date.slice(0, 4));
  const month = Number(run.date.slice(4, 6));
  const day = Number(run.date.slice(6, 8));
  if (
    !Number.isInteger(year)
    || !Number.isInteger(month) || month < 1 || month > 12
    || !Number.isInteger(day) || day < 1 || day > 31
    || !Number.isInteger(run.cycle) || run.cycle < 0 || run.cycle > 23
  ) {
    return null;
  }
  const hour = Math.max(0, Math.min(48, Math.round(forecastHour)));
  const date = new Date(Date.UTC(year, month - 1, day, run.cycle + hour, 0, 0, 0));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function modelHeaderValidLabel(
  run: ModelRun | null,
  forecastHour: number,
  locale?: string,
  timeZone?: string,
): string {
  const hour = Math.max(0, Math.min(48, Math.round(forecastHour)));
  const valid = modelValidDate(run, hour);
  if (!valid) return `F${String(hour).padStart(2, '0')}`;

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  };
  if (timeZone) options.timeZone = timeZone;

  const formatted = valid
    .toLocaleString(locale || undefined, options)
    .replace(',', '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  return `VALID ${formatted}`;
}
