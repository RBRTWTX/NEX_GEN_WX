import { fetchTropicalWindProbabilityCatalog as fetchNativeTropicalWindProbabilityCatalog } from '../engine/tauri-commands';
import type { GeoJsonFeature, GeoJsonFeatureCollection } from '../types/domain';
import type { TropicalWindProbabilityThreshold } from './tropical-wind-probability-types';

type JsonObject = Record<string, unknown>;

export interface TropicalWindProbabilityCatalog {
  provider: string;
  thresholdKnots: TropicalWindProbabilityThreshold;
  probabilities: GeoJsonFeatureCollection;
  cacheStatus?: string;
  cacheWarning?: string;
}

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function featureCollection(value: unknown): GeoJsonFeatureCollection {
  const object = asObject(value);
  if (object?.type !== 'FeatureCollection' || !Array.isArray(object.features)) {
    throw new Error('NHC wind-probability response is not a GeoJSON FeatureCollection.');
  }
  return object as unknown as GeoJsonFeatureCollection;
}

function probabilityBounds(value: unknown): { label: string; minimum: number; maximum: number } {
  const label = text(value);
  if (label === '<5%') return { label, minimum: 0, maximum: 5 };
  if (label === '>90%') return { label, minimum: 90, maximum: 100 };
  const match = label.match(/^(\d+)-(\d+)%$/);
  if (!match) return { label: label || 'UNKNOWN', minimum: -1, maximum: -1 };
  return {
    label,
    minimum: Number(match[1]),
    maximum: Number(match[2]),
  };
}

function walletFromProperties(properties: Record<string, unknown>): string {
  const source = text(properties.idp_source).toUpperCase();
  const wallet = source.slice(0, 3);
  return /^[A-Z]{2}\d$/.test(wallet) ? wallet : '';
}

function normalizeProbabilityCollection(
  collection: GeoJsonFeatureCollection,
): GeoJsonFeatureCollection {
  return {
    ...collection,
    features: collection.features.map((feature: GeoJsonFeature) => {
      const range = probabilityBounds(feature.properties.percentage);
      return {
        ...feature,
        properties: {
          ...feature.properties,
          ngwxProbabilityRange: range.label,
          ngwxProbabilityMin: range.minimum,
          ngwxProbabilityMax: range.maximum,
          ngwxWallet: walletFromProperties(feature.properties),
        },
      };
    }),
  };
}

export function windProbabilityStormWallets(
  catalog: TropicalWindProbabilityCatalog,
): string[] {
  return [...new Set(
    catalog.probabilities.features
      .map((feature) => text(feature.properties.ngwxWallet).toUpperCase())
      .filter((wallet) => /^[A-Z]{2}\d$/.test(wallet)),
  )].sort();
}

export async function fetchTropicalWindProbabilityCatalog(
  thresholdKnots: TropicalWindProbabilityThreshold,
  force = false,
): Promise<TropicalWindProbabilityCatalog> {
  const raw = await fetchNativeTropicalWindProbabilityCatalog(thresholdKnots, force);
  const object = asObject(raw);
  if (!object) throw new Error('NHC wind-probability provider returned an invalid response.');
  const responseThreshold = Number(object.thresholdKnots);
  if (responseThreshold !== thresholdKnots) {
    throw new Error(`NHC wind-probability provider returned ${responseThreshold || 'an unknown threshold'} kt for ${thresholdKnots} kt.`);
  }
  return {
    provider: text(object.provider) || 'NOAA/NWS/NHC Tropical Weather Summary',
    thresholdKnots,
    probabilities: normalizeProbabilityCollection(featureCollection(object.probabilities)),
    cacheStatus: typeof object.cacheStatus === 'string' ? object.cacheStatus : undefined,
    cacheWarning: typeof object.cacheWarning === 'string' ? object.cacheWarning : undefined,
  };
}
