import { invoke } from '@tauri-apps/api/core';
import type {
  BBox,
  EngineStatus,
  GeoJsonFeatureCollection,
  ObservationDisplayMode,
  ObservationField,
  StudioProject,
  SurfaceObservationCollection,
} from '../types/domain';

function validateBBox(bbox: BBox): BBox {
  const values = [bbox.west, bbox.south, bbox.east, bbox.north];
  if (
    values.some((value) => !Number.isFinite(value))
    || bbox.west >= bbox.east
    || bbox.south >= bbox.north
    || bbox.west < -180
    || bbox.east > 180
    || bbox.south < -90
    || bbox.north > 90
  ) {
    throw new Error('Invalid map bounds were supplied to the data provider.');
  }
  return bbox;
}

function featureCollection<T extends GeoJsonFeatureCollection>(value: T, provider: string): T {
  if (!value || value.type !== 'FeatureCollection' || !Array.isArray(value.features)) {
    throw new Error(`${provider} returned an invalid feature collection.`);
  }
  return value;
}

async function invokeFeatureCollection<T extends GeoJsonFeatureCollection>(
  command: string,
  args: Record<string, unknown>,
  provider: string,
): Promise<T> {
  const value = await invoke<T>(command, args);
  return featureCollection(value, provider);
}

export async function getEngineStatus(): Promise<EngineStatus> {
  return invoke<EngineStatus>('engine_status');
}

export async function saveProject(project: StudioProject): Promise<string> {
  return invoke<string>('save_project', { project });
}

export async function loadLatestProject(): Promise<StudioProject | null> {
  return invoke<StudioProject | null>('load_latest_project');
}

export async function savePng(dataUrl: string, fileName: string): Promise<string> {
  return invoke<string>('save_png', { dataUrl, fileName });
}

export async function fetchActiveAlerts(force = false): Promise<GeoJsonFeatureCollection> {
  return invokeFeatureCollection('fetch_active_alerts', { force }, 'NWS alerts');
}

export async function fetchStateBoundaries(force = false): Promise<GeoJsonFeatureCollection> {
  return invokeFeatureCollection('fetch_state_boundaries', { force }, 'Census state boundaries');
}

export async function fetchCountyBoundaries(
  bbox: BBox,
  zoom: number,
  force = false,
): Promise<GeoJsonFeatureCollection> {
  return invokeFeatureCollection(
    'fetch_county_boundaries',
    { bbox: validateBBox(bbox), zoom: Math.max(0, Math.min(24, zoom)), force },
    'Census county boundaries',
  );
}

export async function fetchPlaces(
  bbox: BBox,
  zoom: number,
  density: number,
  force = false,
): Promise<GeoJsonFeatureCollection> {
  return invokeFeatureCollection('fetch_places', {
    bbox: validateBBox(bbox),
    zoom: Math.max(0, Math.min(24, zoom)),
    density: Math.max(0, Math.min(100, Math.round(density))),
    force,
  }, 'Census places');
}

export async function fetchRoads(
  bbox: BBox,
  zoom: number,
  density: number,
  force = false,
): Promise<GeoJsonFeatureCollection> {
  return invokeFeatureCollection('fetch_roads', {
    bbox: validateBBox(bbox),
    zoom: Math.max(0, Math.min(24, zoom)),
    density: Math.max(0, Math.min(100, Math.round(density))),
    force,
  }, 'Census roads');
}

export async function fetchSurfaceObservations(
  bbox: BBox,
  zoom: number,
  density: number,
  mode: ObservationDisplayMode,
  field: ObservationField,
  force = false,
): Promise<SurfaceObservationCollection> {
  return invokeFeatureCollection('fetch_surface_observations', {
    bbox: validateBBox(bbox),
    zoom: Math.max(0, Math.min(24, zoom)),
    density: Math.max(0, Math.min(100, Math.round(density))),
    mode,
    field,
    force,
  }, 'NOAA surface observations');
}
const RADAR_SITE_PRODUCTS = new Set(['N0B', 'N0U', 'N0S', 'NET']);

function validateRadarSite(site: string): string {
  const value = site.trim().toUpperCase().replace(/^K(?=[A-Z0-9]{3}$)/, '');
  if (!/^[A-Z0-9]{3,4}$/.test(value)) {
    throw new Error('A valid three- or four-character NEXRAD site identifier is required.');
  }
  return value;
}

function validateRadarProductCode(productCode: string): string {
  const value = productCode.trim().toUpperCase();
  if (!RADAR_SITE_PRODUCTS.has(value)) {
    throw new Error(`Unsupported single-site radar product: ${value || 'empty'}.`);
  }
  return value;
}

function validateUtcMinute(value: string, label: string): string {
  const candidate = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/.test(candidate)) {
    throw new Error(`${label} must use UTC format YYYY-MM-DDTHH:MMZ.`);
  }
  return candidate;
}

export async function fetchRadarMrmsCatalog(force = false): Promise<unknown> {
  return invoke<unknown>('fetch_radar_mrms_catalog', { force });
}

export async function fetchRadarSites(
  latitude: number,
  longitude: number,
  timestamp: string,
  force = false,
): Promise<unknown> {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error('Radar latitude is outside -90 to 90.');
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('Radar longitude is outside -180 to 180.');
  }
  return invoke<unknown>('fetch_radar_sites', {
    latitude,
    longitude,
    timestamp: validateUtcMinute(timestamp, 'Radar lookup time'),
    force,
  });
}

export async function fetchRadarSiteCatalog(
  site: string,
  productCode: string,
  start: string,
  end: string,
  force = false,
): Promise<unknown> {
  const normalizedStart = validateUtcMinute(start, 'Radar catalog start time');
  const normalizedEnd = validateUtcMinute(end, 'Radar catalog end time');
  if (normalizedStart > normalizedEnd) {
    throw new Error('Radar catalog start time must not be after the end time.');
  }
  return invoke<unknown>('fetch_radar_site_catalog', {
    site: validateRadarSite(site),
    productCode: validateRadarProductCode(productCode),
    start: normalizedStart,
    end: normalizedEnd,
    force,
  });
}

export async function fetchSatelliteCatalog(
  force = false,
): Promise<unknown> {
  return invoke<unknown>('fetch_satellite_catalog', { force });
}

export async function fetchTropicalCatalog(
  force = false,
): Promise<unknown> {
  return invoke<unknown>('fetch_tropical_catalog', { force });
}

export async function fetchTropicalOutlookCatalog(
  period: '2day' | '7day',
  force = false,
): Promise<unknown> {
  return invoke<unknown>('fetch_tropical_outlook_catalog', { period, force });
}

export async function fetchTropicalWindProbabilityCatalog(
  thresholdKnots: 34 | 50 | 64,
  force = false,
): Promise<unknown> {
  if (![34, 50, 64].includes(thresholdKnots)) {
    throw new Error('NHC wind-probability threshold must be 34, 50, or 64 knots.');
  }
  return invoke<unknown>('fetch_tropical_wind_probability_catalog', { thresholdKnots, force });
}

export async function fetchTropicalArrivalTimeCatalog(
  mode: 'earliest' | 'most-likely',
  force = false,
): Promise<unknown> {
  if (!['earliest', 'most-likely'].includes(mode)) {
    throw new Error('NHC arrival-time mode must be earliest or most-likely.');
  }
  return invoke<unknown>('fetch_tropical_arrival_time_catalog', { mode, force });
}

export async function fetchTropicalStormSurgeCatalog(
  product: 'potential' | 'peak',
  force = false,
): Promise<unknown> {
  if (!['potential', 'peak'].includes(product)) {
    throw new Error('NHC storm-surge product must be potential or peak.');
  }
  return invoke<unknown>('fetch_tropical_storm_surge_catalog', { product, force });
}
