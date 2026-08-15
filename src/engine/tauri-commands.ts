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
