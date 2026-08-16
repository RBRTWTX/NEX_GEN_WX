import { fetchTropicalOutlookCatalog as fetchNativeTropicalOutlookCatalog } from '../engine/tauri-commands';
import type { GeoJsonFeature, GeoJsonFeatureCollection } from '../types/domain';
import type { TropicalOutlookPeriod } from './tropical-outlook-types';

type JsonObject = Record<string, unknown>;

export interface TropicalOutlookCatalog {
  provider: string;
  period: TropicalOutlookPeriod;
  locations: GeoJsonFeatureCollection;
  regions: GeoJsonFeatureCollection;
  motion: GeoJsonFeatureCollection;
  cacheStatus?: string;
  cacheWarning?: string;
}

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function featureCollection(value: unknown, label: string): GeoJsonFeatureCollection {
  const object = asObject(value);
  if (object?.type !== 'FeatureCollection' || !Array.isArray(object.features)) {
    throw new Error(`NHC ${label} response is not a GeoJSON FeatureCollection.`);
  }
  return object as unknown as GeoJsonFeatureCollection;
}

function probability(value: unknown): number | null {
  const compact = text(value).replace('%', '');
  const number = Number(compact);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : null;
}

function normalizeOutlookCollection(
  collection: GeoJsonFeatureCollection,
  period: TropicalOutlookPeriod,
): GeoJsonFeatureCollection {
  const probabilityField = period === '2day' ? 'prob2day' : 'prob7day';
  const riskField = period === '2day' ? 'risk2day' : 'risk7day';
  return {
    ...collection,
    features: collection.features.map((feature: GeoJsonFeature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        ngwxProbability: probability(feature.properties[probabilityField]),
        ngwxRisk: text(feature.properties[riskField]).toUpperCase(),
        ngwxBasin: text(feature.properties.basin).toUpperCase(),
      },
    })),
  };
}

export async function fetchTropicalOutlookCatalog(
  period: TropicalOutlookPeriod,
  force = false,
): Promise<TropicalOutlookCatalog> {
  const raw = await fetchNativeTropicalOutlookCatalog(period, force);
  const object = asObject(raw);
  if (!object) throw new Error('NHC tropical outlook provider returned an invalid response.');
  const responsePeriod = text(object.period).toLowerCase();
  if (responsePeriod !== period) {
    throw new Error(`NHC tropical outlook provider returned ${responsePeriod || 'an unknown period'} for ${period}.`);
  }
  return {
    provider: text(object.provider) || 'NOAA/NWS/NHC Tropical Weather Summary',
    period,
    locations: normalizeOutlookCollection(featureCollection(object.locations, 'outlook-locations'), period),
    regions: normalizeOutlookCollection(featureCollection(object.regions, 'outlook-regions'), period),
    motion: normalizeOutlookCollection(featureCollection(object.motion, 'outlook-motion'), period),
    cacheStatus: typeof object.cacheStatus === 'string' ? object.cacheStatus : undefined,
    cacheWarning: typeof object.cacheWarning === 'string' ? object.cacheWarning : undefined,
  };
}
