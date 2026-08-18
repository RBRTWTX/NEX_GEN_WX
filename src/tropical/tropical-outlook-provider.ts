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

function coordinatePair(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const longitude = Number(value[0]);
  const latitude = Number(value[1]);
  return Number.isFinite(longitude) && Number.isFinite(latitude)
    ? [longitude, latitude]
    : null;
}

function pointCoordinate(feature: GeoJsonFeature): [number, number] | null {
  if (feature.geometry?.type !== 'Point') return null;
  return coordinatePair(feature.geometry.coordinates);
}

function unwrapLongitude(longitude: number, reference: number): number {
  let value = longitude;
  while (value - reference > 180) value -= 360;
  while (value - reference < -180) value += 360;
  return value;
}

function ringContainsPoint(ring: unknown, point: [number, number]): boolean {
  if (!Array.isArray(ring)) return false;
  const coordinates = ring
    .map(coordinatePair)
    .filter((value): value is [number, number] => value != null);
  if (coordinates.length < 3) return false;

  const [x, y] = point;
  let inside = false;
  for (let index = 0, previous = coordinates.length - 1; index < coordinates.length; previous = index++) {
    const current = coordinates[index];
    const prior = coordinates[previous];
    const xi = unwrapLongitude(current[0], x);
    const yi = current[1];
    const xj = unwrapLongitude(prior[0], x);
    const yj = prior[1];
    const intersects = ((yi > y) !== (yj > y))
      && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function polygonContainsPoint(rings: unknown, point: [number, number]): boolean {
  if (!Array.isArray(rings) || !rings.length) return false;
  if (!ringContainsPoint(rings[0], point)) return false;
  return !rings.slice(1).some((ring) => ringContainsPoint(ring, point));
}

function geometryContainsPoint(feature: GeoJsonFeature, point: [number, number]): boolean {
  const geometry = feature.geometry;
  if (!geometry?.coordinates) return false;
  if (geometry.type === 'Polygon') return polygonContainsPoint(geometry.coordinates, point);
  if (geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.some((polygon) => polygonContainsPoint(polygon, point));
  }
  return false;
}

export function annotateTropicalOutlookRegionLabels(
  regions: GeoJsonFeatureCollection,
  locations: GeoJsonFeatureCollection,
): GeoJsonFeatureCollection {
  const locationPoints = locations.features
    .map(pointCoordinate)
    .filter((value): value is [number, number] => value != null);

  return {
    ...regions,
    features: regions.features.map((feature) => {
      const probability = Number(feature.properties.ngwxProbability);
      const hasCurrentLocation = locationPoints.some((point) => geometryContainsPoint(feature, point));
      return {
        ...feature,
        properties: {
          ...feature.properties,
          ngwxRegionProbabilityLabel: !hasCurrentLocation && Number.isFinite(probability)
            ? String(probability) + '%'
            : '',
        },
      };
    }),
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
  const locations = normalizeOutlookCollection(
    featureCollection(object.locations, 'outlook-locations'),
    period,
  );
  const regions = normalizeOutlookCollection(
    featureCollection(object.regions, 'outlook-regions'),
    period,
  );
  const motion = normalizeOutlookCollection(
    featureCollection(object.motion, 'outlook-motion'),
    period,
  );
  return {
    provider: text(object.provider) || 'NOAA/NWS/NHC Tropical Weather Summary',
    period,
    locations,
    regions: annotateTropicalOutlookRegionLabels(regions, locations),
    motion,
    cacheStatus: typeof object.cacheStatus === 'string' ? object.cacheStatus : undefined,
    cacheWarning: typeof object.cacheWarning === 'string' ? object.cacheWarning : undefined,
  };
}
