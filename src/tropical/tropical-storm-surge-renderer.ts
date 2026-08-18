import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { GeoJsonFeatureCollection } from '../types/domain';
import {
  TROPICAL_STORM_SURGE_LAYER_IDS,
  TROPICAL_STORM_SURGE_LAYERS,
  TROPICAL_STORM_SURGE_SOURCE_IDS,
} from './tropical-storm-surge-layer-ids';
import type { TropicalStormSurgeCatalog } from './tropical-storm-surge-provider';
import type { TropicalStormSurgeSceneState } from './tropical-storm-surge-types';

const EMPTY_COLLECTION: GeoJsonFeatureCollection = { type: 'FeatureCollection', features: [] };

export const NHC_POTENTIAL_SURGE_COLORS = {
  greaterThan1Ft: '#005ce6',
  greaterThan3Ft: '#ffff00',
  greaterThan6Ft: '#ffaa00',
  greaterThan9Ft: '#ff0000',
} as const;

export const NHC_PEAK_SURGE_COLORS = {
  blue: '#005ce6',
  yellow: '#ffff00',
  orange: '#ffaa00',
  red: '#ff0000',
  purple: '#c500ff',
} as const;

const PEAK_COLOR_EXPRESSION = [
  'match',
  ['get', 'ngwxSurgeClass'],
  'blue', NHC_PEAK_SURGE_COLORS.blue,
  'yellow', NHC_PEAK_SURGE_COLORS.yellow,
  'orange', NHC_PEAK_SURGE_COLORS.orange,
  'red', NHC_PEAK_SURGE_COLORS.red,
  'purple', NHC_PEAK_SURGE_COLORS.purple,
  'rgba(0,0,0,0)',
] as const;

const potentialRasterVersion = new WeakMap<MapLibreMap, string>();

function setGeoJson(map: MapLibreMap, id: string, data: GeoJsonFeatureCollection): void {
  (map.getSource(id) as GeoJSONSource | undefined)?.setData(data as never);
}

function setVisibility(map: MapLibreMap, id: string, visible: boolean): void {
  if (!map.getLayer(id)) return;
  map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
}

function removePotentialRaster(map: MapLibreMap): void {
  if (map.getLayer(TROPICAL_STORM_SURGE_LAYERS.potentialRaster)) {
    map.removeLayer(TROPICAL_STORM_SURGE_LAYERS.potentialRaster);
  }
  if (map.getSource(TROPICAL_STORM_SURGE_SOURCE_IDS.potentialRaster)) {
    map.removeSource(TROPICAL_STORM_SURGE_SOURCE_IDS.potentialRaster);
  }
  potentialRasterVersion.delete(map);
}

function potentialRasterUrl(version: string): string {
  const token = encodeURIComponent(version || 'current');
  return 'https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/'
    + 'NHC_tropical_weather_summary/MapServer/export'
    + '?bbox={bbox-epsg-3857}'
    + '&bboxSR=3857'
    + '&imageSR=3857'
    + '&size=512,512'
    + '&dpi=96'
    + '&format=png32'
    + '&transparent=true'
    + '&layers=show%3A24'
    + '&f=image'
    + `&ngwx=${token}`;
}

function ensurePotentialRaster(map: MapLibreMap, version: string): void {
  const key = version || 'current';
  if (
    potentialRasterVersion.get(map) === key
    && map.getSource(TROPICAL_STORM_SURGE_SOURCE_IDS.potentialRaster)
    && map.getLayer(TROPICAL_STORM_SURGE_LAYERS.potentialRaster)
  ) return;

  removePotentialRaster(map);
  map.addSource(TROPICAL_STORM_SURGE_SOURCE_IDS.potentialRaster, {
    type: 'raster',
    tiles: [potentialRasterUrl(key)],
    tileSize: 512,
    minzoom: 0,
    maxzoom: 14,
  });
  map.addLayer({
    id: TROPICAL_STORM_SURGE_LAYERS.potentialRaster,
    type: 'raster',
    source: TROPICAL_STORM_SURGE_SOURCE_IDS.potentialRaster,
    paint: {
      'raster-opacity': 0.88,
      'raster-fade-duration': 120,
      'raster-resampling': 'linear',
    },
  });
  potentialRasterVersion.set(map, key);
}

function ensurePeakSources(map: MapLibreMap): void {
  for (const source of [
    TROPICAL_STORM_SURGE_SOURCE_IDS.peakPoints,
    TROPICAL_STORM_SURGE_SOURCE_IDS.peakLines,
    TROPICAL_STORM_SURGE_SOURCE_IDS.peakPolygons,
  ]) {
    if (!map.getSource(source)) {
      map.addSource(source, { type: 'geojson', data: EMPTY_COLLECTION as never });
    }
  }
}

function ensurePeakLayers(map: MapLibreMap): void {
  ensurePeakSources(map);
  if (!map.getLayer(TROPICAL_STORM_SURGE_LAYERS.peakPolygonFill)) {
    map.addLayer({
      id: TROPICAL_STORM_SURGE_LAYERS.peakPolygonFill,
      type: 'fill',
      source: TROPICAL_STORM_SURGE_SOURCE_IDS.peakPolygons,
      paint: {
        'fill-color': PEAK_COLOR_EXPRESSION as never,
        'fill-opacity': 0.62,
      },
    });
  }
  if (!map.getLayer(TROPICAL_STORM_SURGE_LAYERS.peakPolygonOutline)) {
    map.addLayer({
      id: TROPICAL_STORM_SURGE_LAYERS.peakPolygonOutline,
      type: 'line',
      source: TROPICAL_STORM_SURGE_SOURCE_IDS.peakPolygons,
      paint: {
        'line-color': PEAK_COLOR_EXPRESSION as never,
        'line-width': 2,
        'line-opacity': 0.95,
      },
    });
  }
  if (!map.getLayer(TROPICAL_STORM_SURGE_LAYERS.peakLine)) {
    map.addLayer({
      id: TROPICAL_STORM_SURGE_LAYERS.peakLine,
      type: 'line',
      source: TROPICAL_STORM_SURGE_SOURCE_IDS.peakLines,
      paint: {
        'line-color': PEAK_COLOR_EXPRESSION as never,
        'line-width': ['interpolate', ['linear'], ['zoom'], 2, 4.5, 7, 7, 11, 9],
        'line-opacity': 0.98,
      },
    });
  }
  if (!map.getLayer(TROPICAL_STORM_SURGE_LAYERS.peakPoint)) {
    map.addLayer({
      id: TROPICAL_STORM_SURGE_LAYERS.peakPoint,
      type: 'circle',
      source: TROPICAL_STORM_SURGE_SOURCE_IDS.peakPoints,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 3, 7, 5, 11, 7],
        'circle-color': '#000000',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.3,
        'circle-opacity': 0.95,
      },
    });
  }
  if (!map.getLayer(TROPICAL_STORM_SURGE_LAYERS.peakPolygonLabel)) {
    map.addLayer({
      id: TROPICAL_STORM_SURGE_LAYERS.peakPolygonLabel,
      type: 'symbol',
      source: TROPICAL_STORM_SURGE_SOURCE_IDS.peakPolygons,
      layout: {
        'text-field': ['get', 'ngwxSurgeLabel'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 11,
        'text-allow-overlap': false,
        'text-ignore-placement': false,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#11151b',
        'text-halo-width': 1.8,
      },
    });
  }
  if (!map.getLayer(TROPICAL_STORM_SURGE_LAYERS.peakLineLabel)) {
    map.addLayer({
      id: TROPICAL_STORM_SURGE_LAYERS.peakLineLabel,
      type: 'symbol',
      source: TROPICAL_STORM_SURGE_SOURCE_IDS.peakLines,
      layout: {
        'symbol-placement': 'line',
        'symbol-spacing': 280,
        'text-field': ['get', 'ngwxSurgeLabel'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 11,
        'text-keep-upright': true,
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#11151b',
        'text-halo-width': 1.8,
      },
    });
  }
  if (!map.getLayer(TROPICAL_STORM_SURGE_LAYERS.peakPointLabel)) {
    map.addLayer({
      id: TROPICAL_STORM_SURGE_LAYERS.peakPointLabel,
      type: 'symbol',
      source: TROPICAL_STORM_SURGE_SOURCE_IDS.peakPoints,
      layout: {
        'text-field': ['get', 'ngwxSurgeLabel'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 11,
        'text-offset': [0, 1.2],
        'text-anchor': 'top',
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#11151b',
        'text-halo-width': 1.8,
      },
    });
  }
}

function clearPeakData(map: MapLibreMap): void {
  setGeoJson(map, TROPICAL_STORM_SURGE_SOURCE_IDS.peakPoints, EMPTY_COLLECTION);
  setGeoJson(map, TROPICAL_STORM_SURGE_SOURCE_IDS.peakLines, EMPTY_COLLECTION);
  setGeoJson(map, TROPICAL_STORM_SURGE_SOURCE_IDS.peakPolygons, EMPTY_COLLECTION);
}

export function renderTropicalStormSurge(
  map: MapLibreMap,
  catalog: TropicalStormSurgeCatalog,
  opacity: number,
): void {
  ensurePeakLayers(map);
  if (catalog.product === 'potential') {
    clearPeakData(map);
    if (catalog.footprint.features.length) ensurePotentialRaster(map, catalog.rasterVersion);
    else removePotentialRaster(map);
  } else {
    removePotentialRaster(map);
    setGeoJson(map, TROPICAL_STORM_SURGE_SOURCE_IDS.peakPoints, catalog.points);
    setGeoJson(map, TROPICAL_STORM_SURGE_SOURCE_IDS.peakLines, catalog.lines);
    setGeoJson(map, TROPICAL_STORM_SURGE_SOURCE_IDS.peakPolygons, catalog.polygons);
  }

  const boundedOpacity = Math.max(0, Math.min(1, opacity));
  if (map.getLayer(TROPICAL_STORM_SURGE_LAYERS.potentialRaster)) {
    map.setPaintProperty(TROPICAL_STORM_SURGE_LAYERS.potentialRaster, 'raster-opacity', boundedOpacity);
  }
  if (map.getLayer(TROPICAL_STORM_SURGE_LAYERS.peakPolygonFill)) {
    map.setPaintProperty(TROPICAL_STORM_SURGE_LAYERS.peakPolygonFill, 'fill-opacity', boundedOpacity * 0.7);
  }
  for (const layer of [
    TROPICAL_STORM_SURGE_LAYERS.peakPolygonOutline,
    TROPICAL_STORM_SURGE_LAYERS.peakLine,
  ]) {
    if (map.getLayer(layer)) map.setPaintProperty(layer, 'line-opacity', boundedOpacity);
  }
  if (map.getLayer(TROPICAL_STORM_SURGE_LAYERS.peakPoint)) {
    map.setPaintProperty(TROPICAL_STORM_SURGE_LAYERS.peakPoint, 'circle-opacity', boundedOpacity);
  }
}

export function applyTropicalStormSurgeVisibility(
  map: MapLibreMap,
  state: TropicalStormSurgeSceneState,
  product: TropicalStormSurgeCatalog['product'],
): void {
  setVisibility(
    map,
    TROPICAL_STORM_SURGE_LAYERS.potentialRaster,
    state.showSurge && product === 'potential',
  );
  const peakVisible = state.showSurge && product === 'peak';
  for (const layer of [
    TROPICAL_STORM_SURGE_LAYERS.peakPolygonFill,
    TROPICAL_STORM_SURGE_LAYERS.peakPolygonOutline,
    TROPICAL_STORM_SURGE_LAYERS.peakLine,
    TROPICAL_STORM_SURGE_LAYERS.peakPoint,
  ]) {
    setVisibility(map, layer, peakVisible);
  }
  for (const layer of [
    TROPICAL_STORM_SURGE_LAYERS.peakPolygonLabel,
    TROPICAL_STORM_SURGE_LAYERS.peakLineLabel,
    TROPICAL_STORM_SURGE_LAYERS.peakPointLabel,
  ]) {
    setVisibility(map, layer, peakVisible && state.showLabels);
  }
}

export function clearTropicalStormSurgeData(map: MapLibreMap): void {
  removePotentialRaster(map);
  clearPeakData(map);
}

export function removeTropicalStormSurgeLayers(map: MapLibreMap): void {
  for (const layer of [...TROPICAL_STORM_SURGE_LAYER_IDS].reverse()) {
    if (map.getLayer(layer)) map.removeLayer(layer);
  }
  for (const source of Object.values(TROPICAL_STORM_SURGE_SOURCE_IDS)) {
    if (map.getSource(source)) map.removeSource(source);
  }
  potentialRasterVersion.delete(map);
}
