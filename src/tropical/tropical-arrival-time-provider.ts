import {
  fetchTropicalArrivalTimeCatalog as fetchNativeTropicalArrivalTimeCatalog,
} from '../engine/tauri-commands';
import type { GeoJsonFeature, GeoJsonFeatureCollection } from '../types/domain';
import {
  fetchTropicalWindProbabilityCatalog,
  type TropicalWindProbabilityCatalog,
} from './tropical-wind-probability-provider';
import type { TropicalArrivalTimeMode } from './tropical-arrival-time-types';

type JsonObject = Record<string, unknown>;

const EMPTY_COLLECTION: GeoJsonFeatureCollection = { type: 'FeatureCollection', features: [] };

export interface TropicalArrivalTimeCatalog {
  provider: string;
  mode: TropicalArrivalTimeMode;
  contours: GeoJsonFeatureCollection;
  windProbability34: GeoJsonFeatureCollection;
  cacheStatus?: string;
  cacheWarning?: string;
}

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function plainText(value: unknown): string {
  return text(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function featureCollection(value: unknown, label: string): GeoJsonFeatureCollection {
  const object = asObject(value);
  if (object?.type !== 'FeatureCollection' || !Array.isArray(object.features)) {
    throw new Error(`${label} is not a GeoJSON FeatureCollection.`);
  }
  return object as unknown as GeoJsonFeatureCollection;
}

function walletFromProperties(properties: Record<string, unknown>): string {
  const source = text(properties.idp_source).toUpperCase();
  const wallet = source.slice(0, 3);
  return /^[A-Z]{2}\d$/.test(wallet) ? wallet : '';
}

function normalizeArrivalContours(collection: GeoJsonFeatureCollection): GeoJsonFeatureCollection {
  return {
    ...collection,
    features: collection.features.map((feature: GeoJsonFeature) => {
      const arrivalTime = plainText(feature.properties.arrival_time);
      const popup = plainText(feature.properties.popupinfo);
      const name = plainText(feature.properties.name);
      return {
        ...feature,
        properties: {
          ...feature.properties,
          ngwxArrivalTime: arrivalTime,
          ngwxArrivalLabel: popup || arrivalTime || name || 'ARRIVAL TIME',
          ngwxWallet: walletFromProperties(feature.properties),
        },
      };
    }),
  };
}

function combineWarnings(primary: unknown, backgroundError: unknown): string | undefined {
  const warnings = [
    typeof primary === 'string' && primary.trim() ? primary.trim() : '',
    backgroundError instanceof Error
      ? `34-kt probability background unavailable: ${backgroundError.message}`
      : backgroundError
        ? `34-kt probability background unavailable: ${String(backgroundError)}`
        : '',
  ].filter(Boolean);
  return warnings.length ? warnings.join('; ') : undefined;
}

export function arrivalTimeStormWallets(catalog: TropicalArrivalTimeCatalog): string[] {
  return [...new Set(
    catalog.contours.features
      .map((feature) => text(feature.properties.ngwxWallet).toUpperCase())
      .filter((wallet) => /^[A-Z]{2}\d$/.test(wallet)),
  )].sort();
}

export async function fetchTropicalArrivalTimeCatalog(
  mode: TropicalArrivalTimeMode,
  force = false,
): Promise<TropicalArrivalTimeCatalog> {
  const [rawArrival, windResult] = await Promise.all([
    fetchNativeTropicalArrivalTimeCatalog(mode, force),
    fetchTropicalWindProbabilityCatalog(34, force)
      .then((catalog: TropicalWindProbabilityCatalog) => ({ catalog, error: null as unknown }))
      .catch((error: unknown) => ({ catalog: null, error })),
  ]);

  const object = asObject(rawArrival);
  if (!object) throw new Error('NHC arrival-time provider returned an invalid response.');
  const responseMode = text(object.mode) as TropicalArrivalTimeMode;
  if (responseMode !== mode) {
    throw new Error(`NHC arrival-time provider returned ${responseMode || 'an unknown mode'} for ${mode}.`);
  }

  return {
    provider: text(object.provider) || 'NOAA/NWS/NHC Tropical Weather Summary',
    mode,
    contours: normalizeArrivalContours(featureCollection(object.contours, 'NHC arrival-time contours')),
    windProbability34: windResult.catalog?.probabilities ?? EMPTY_COLLECTION,
    cacheStatus: typeof object.cacheStatus === 'string' ? object.cacheStatus : undefined,
    cacheWarning: combineWarnings(object.cacheWarning, windResult.error),
  };
}
