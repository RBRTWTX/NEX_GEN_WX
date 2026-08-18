import {
  fetchTropicalStormSurgeCatalog as fetchNativeTropicalStormSurgeCatalog,
} from '../engine/tauri-commands';
import type { GeoJsonFeature, GeoJsonFeatureCollection } from '../types/domain';
import type {
  PeakStormSurgeClass,
  TropicalStormSurgeProduct,
} from './tropical-storm-surge-types';

type JsonObject = Record<string, unknown>;

const EMPTY_COLLECTION: GeoJsonFeatureCollection = { type: 'FeatureCollection', features: [] };

export interface TropicalStormSurgeCatalog {
  provider: string;
  product: TropicalStormSurgeProduct;
  footprint: GeoJsonFeatureCollection;
  points: GeoJsonFeatureCollection;
  lines: GeoJsonFeatureCollection;
  polygons: GeoJsonFeatureCollection;
  rasterVersion: string;
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

function optionalFeatureCollection(value: unknown, label: string): GeoJsonFeatureCollection {
  return value == null ? EMPTY_COLLECTION : featureCollection(value, label);
}

function jsonObject(value: unknown): JsonObject | null {
  const raw = plainText(value);
  if (!raw.startsWith('{') || !raw.endsWith('}')) return null;
  try {
    return asObject(JSON.parse(raw));
  } catch {
    return null;
  }
}

function peakPayload(properties: Record<string, unknown>): JsonObject | null {
  for (const value of [properties.popupinfo, properties.name, properties.snippet]) {
    const parsed = jsonObject(value);
    if (parsed) return parsed;
  }
  return null;
}

function peakClassFromColor(value: unknown): PeakStormSurgeClass | null {
  switch (text(value).toLowerCase()) {
    case 'blue': return 'blue';
    case 'yellow': return 'yellow';
    case 'orange': return 'orange';
    case 'red': return 'red';
    case 'purple': return 'purple';
    default: return null;
  }
}

function peakClass(properties: Record<string, unknown>): PeakStormSurgeClass {
  const payload = peakPayload(properties);
  const structuredColor = peakClassFromColor(payload?.color);
  if (structuredColor) return structuredColor;

  const structuredRange = plainText(
    payload?.peak_surge_range
      ?? payload?.peakSurgeRange
      ?? payload?.surge_range,
  );
  const candidate = `${text(properties.name)} ${plainText(properties.popupinfo)} ${structuredRange}`.toLowerCase();
  if (candidate.includes('purple') || /above\s*12\s*ft/.test(candidate)) return 'purple';
  if (candidate.includes('red') || /up\s*to\s*12\s*ft/.test(candidate)) return 'red';
  if (candidate.includes('orange') || /up\s*to\s*9\s*ft/.test(candidate)) return 'orange';
  if (candidate.includes('yellow') || /up\s*to\s*6\s*ft/.test(candidate)) return 'yellow';
  if (candidate.includes('blue') || /up\s*to\s*3\s*ft/.test(candidate)) return 'blue';
  return 'unknown';
}

function classLabel(value: PeakStormSurgeClass): string {
  if (value === 'blue') return 'UP TO 3 FT';
  if (value === 'yellow') return 'UP TO 6 FT';
  if (value === 'orange') return 'UP TO 9 FT';
  if (value === 'red') return 'UP TO 12 FT';
  if (value === 'purple') return 'ABOVE 12 FT';
  return '';
}

function peakLabel(
  properties: Record<string, unknown>,
  surgeClass: PeakStormSurgeClass,
): string {
  const payload = peakPayload(properties);
  const structuredRange = plainText(
    payload?.peak_surge_range
      ?? payload?.peakSurgeRange
      ?? payload?.surge_range,
  );
  if (structuredRange) return structuredRange;

  const popup = plainText(properties.popupinfo);
  if (popup && !popup.startsWith('{') && !popup.startsWith('[')) return popup;

  const name = plainText(properties.name);
  if (
    name
    && !name.startsWith('{')
    && !name.startsWith('[')
    && !peakClassFromColor(name)
  ) return name;

  return classLabel(surgeClass);
}

function normalizePeakCollection(collection: GeoJsonFeatureCollection): GeoJsonFeatureCollection {
  return {
    ...collection,
    features: collection.features.map((feature: GeoJsonFeature) => {
      const surgeClass = peakClass(feature.properties);
      return {
        ...feature,
        properties: {
          ...feature.properties,
          ngwxSurgeClass: surgeClass,
          ngwxSurgeLabel: peakLabel(feature.properties, surgeClass),
        },
      };
    }),
  };
}

function versionFromCollection(collection: GeoJsonFeatureCollection): string {
  const tokens = collection.features.flatMap((feature) => [
    text(feature.properties.idp_filedate),
    text(feature.properties.idp_ingestdate),
  ]).filter(Boolean);
  return tokens.sort().at(-1) ?? '';
}

export async function fetchTropicalStormSurgeCatalog(
  product: TropicalStormSurgeProduct,
  force = false,
): Promise<TropicalStormSurgeCatalog> {
  const raw = await fetchNativeTropicalStormSurgeCatalog(product, force);
  const object = asObject(raw);
  if (!object) throw new Error('NHC storm-surge provider returned an invalid response.');
  const responseProduct = text(object.product) as TropicalStormSurgeProduct;
  if (responseProduct !== product) {
    throw new Error(`NHC storm-surge provider returned ${responseProduct || 'an unknown product'} for ${product}.`);
  }

  if (product === 'potential') {
    const footprint = featureCollection(object.footprint, 'NHC potential-surge footprint');
    return {
      provider: text(object.provider) || 'NOAA/NWS/NHC Tropical Weather Summary',
      product,
      footprint,
      points: EMPTY_COLLECTION,
      lines: EMPTY_COLLECTION,
      polygons: EMPTY_COLLECTION,
      rasterVersion: versionFromCollection(footprint) || text(object.rasterVersion),
      cacheStatus: typeof object.cacheStatus === 'string' ? object.cacheStatus : undefined,
      cacheWarning: typeof object.cacheWarning === 'string' ? object.cacheWarning : undefined,
    };
  }

  const points = normalizePeakCollection(optionalFeatureCollection(object.points, 'NHC peak-surge points'));
  const lines = normalizePeakCollection(optionalFeatureCollection(object.lines, 'NHC peak-surge lines'));
  const polygons = normalizePeakCollection(optionalFeatureCollection(object.polygons, 'NHC peak-surge polygons'));
  return {
    provider: text(object.provider) || 'NOAA/NWS/NHC Peak Storm Surge',
    product,
    footprint: EMPTY_COLLECTION,
    points,
    lines,
    polygons,
    rasterVersion: '',
    cacheStatus: typeof object.cacheStatus === 'string' ? object.cacheStatus : undefined,
    cacheWarning: typeof object.cacheWarning === 'string' ? object.cacheWarning : undefined,
  };
}

export function stormSurgeFeatureCount(catalog: TropicalStormSurgeCatalog): number {
  if (catalog.product === 'potential') return catalog.footprint.features.length;
  return catalog.points.features.length + catalog.lines.features.length + catalog.polygons.features.length;
}
