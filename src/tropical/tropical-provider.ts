import { fetchTropicalCatalog as fetchNativeTropicalCatalog } from '../engine/tauri-commands';
import type {
  GeoJsonFeature,
  GeoJsonFeatureCollection,
} from '../types/domain';
import type { TropicalStormSummary } from './tropical-types';

type JsonObject = Record<string, unknown>;

export interface TropicalCatalog {
  provider: string;
  points: GeoJsonFeatureCollection;
  track: GeoJsonFeatureCollection;
  cone: GeoJsonFeatureCollection;
  warnings: GeoJsonFeatureCollection;
  cacheStatus?: string;
  cacheWarning?: string;
}

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : null;
}

function featureCollection(value: unknown, label: string): GeoJsonFeatureCollection {
  const object = asObject(value);
  if (object?.type !== 'FeatureCollection' || !Array.isArray(object.features)) {
    throw new Error(`NHC ${label} response is not a GeoJSON FeatureCollection.`);
  }
  return object as unknown as GeoJsonFeatureCollection;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function finiteNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function walletFromProperties(properties: Record<string, unknown>): string {
  const source = text(properties.idp_source).toUpperCase();
  // The NHC summary service defines the storm wallet as the leading three characters.
  const wallet = source.slice(0, 3);
  return /^[A-Z]{2}\d$/.test(wallet) ? wallet : '';
}

function walletForFeature(feature: GeoJsonFeature): string {
  return walletFromProperties(feature.properties);
}

function pointCoordinate(feature: GeoJsonFeature): [number, number] | null {
  if (feature.geometry?.type !== 'Point' || !Array.isArray(feature.geometry.coordinates)) return null;
  const [lon, lat] = feature.geometry.coordinates as unknown[];
  const longitude = Number(lon);
  const latitude = Number(lat);
  return Number.isFinite(longitude) && Number.isFinite(latitude) ? [longitude, latitude] : null;
}

function currentPoint(features: GeoJsonFeature[]): GeoJsonFeature | null {
  if (!features.length) return null;
  return [...features].sort((left, right) => {
    const leftTau = finiteNumber(left.properties.tau) ?? finiteNumber(left.properties.fcstprd) ?? Number.MAX_SAFE_INTEGER;
    const rightTau = finiteNumber(right.properties.tau) ?? finiteNumber(right.properties.fcstprd) ?? Number.MAX_SAFE_INTEGER;
    return leftTau - rightTau;
  })[0] ?? null;
}

export function tropicalStormsFromCatalog(catalog: TropicalCatalog): TropicalStormSummary[] {
  const allFeatures = [
    ...catalog.points.features,
    ...catalog.track.features,
    ...catalog.cone.features,
    ...catalog.warnings.features,
  ];
  const wallets = new Set<string>();
  for (const feature of allFeatures) {
    const wallet = walletForFeature(feature);
    if (wallet) wallets.add(wallet);
  }

  return [...wallets].map((wallet) => {
    const pointFeatures = catalog.points.features.filter((feature) => walletForFeature(feature) === wallet);
    const fallbackFeatures = allFeatures.filter((feature) => walletForFeature(feature) === wallet);
    const primary = currentPoint(pointFeatures) ?? fallbackFeatures[0] ?? null;
    const properties = primary?.properties ?? {};
    return {
      id: wallet,
      wallet,
      name: text(properties.stormname) || wallet,
      stormType: text(properties.stormtype) || text(properties.stormsrc) || 'Tropical Cyclone',
      basin: text(properties.basin),
      advisoryNumber: text(properties.advisnum),
      advisoryDate: text(properties.advdate) || text(properties.validtime),
      maxWindKt: finiteNumber(properties.maxwind),
      pressureMb: finiteNumber(properties.mslp),
      classification: text(properties.dvlbl),
      currentCoordinate: primary ? pointCoordinate(primary) : null,
    };
  }).sort((left, right) => left.wallet.localeCompare(right.wallet));
}

function filterCollection(
  collection: GeoJsonFeatureCollection,
  storm: TropicalStormSummary | null,
): GeoJsonFeatureCollection {
  if (!storm) return { ...collection, features: [] };
  const name = storm.name.toUpperCase();
  return {
    ...collection,
    features: collection.features.filter((feature) => {
      const wallet = walletForFeature(feature);
      if (wallet) return wallet === storm.wallet;
      return text(feature.properties.stormname).toUpperCase() === name;
    }),
  };
}

export function selectTropicalStorm(
  catalog: TropicalCatalog,
  requestedStormId: string | null,
): {
  storms: TropicalStormSummary[];
  selected: TropicalStormSummary | null;
  points: GeoJsonFeatureCollection;
  track: GeoJsonFeatureCollection;
  cone: GeoJsonFeatureCollection;
  warnings: GeoJsonFeatureCollection;
} {
  const storms = tropicalStormsFromCatalog(catalog);
  const requested = requestedStormId?.trim().toUpperCase() ?? '';
  const selected = storms.find((storm) => storm.id === requested) ?? storms[0] ?? null;
  return {
    storms,
    selected,
    points: filterCollection(catalog.points, selected),
    track: filterCollection(catalog.track, selected),
    cone: filterCollection(catalog.cone, selected),
    warnings: filterCollection(catalog.warnings, selected),
  };
}

export async function fetchTropicalCatalog(force = false): Promise<TropicalCatalog> {
  const raw = await fetchNativeTropicalCatalog(force);
  const object = asObject(raw);
  if (!object) throw new Error('NHC tropical provider returned an invalid response.');
  return {
    provider: text(object.provider) || 'NOAA/NWS/NHC Tropical Weather Summary',
    points: featureCollection(object.points, 'forecast-points'),
    track: featureCollection(object.track, 'forecast-track'),
    cone: featureCollection(object.cone, 'forecast-cone'),
    warnings: featureCollection(object.warnings, 'watch-warning'),
    cacheStatus: typeof object.cacheStatus === 'string' ? object.cacheStatus : undefined,
    cacheWarning: typeof object.cacheWarning === 'string' ? object.cacheWarning : undefined,
  };
}
