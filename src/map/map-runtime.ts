import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type {
  BBox, GeoJsonFeature, GeoJsonFeatureCollection, MapSample, MapScene, ObservationSummary, SurfaceObservationCollection,
} from '../types/domain';
import {
  EMPTY_FEATURE_COLLECTION, firstPlaceLabelLayer,
} from './map-layer-utils';
import { fieldColor, formatObservationValue, TRANSPARENT_FIELD_IMAGE } from './observation-field';
import { addRoadContextLayers } from './road-runtime';
import {
  addBasemapBroadcastContextLayers,
  addSatelliteBroadcastContextLayers,
  broadcastContextLayerIds,
} from './broadcast-context';
import { RADAR_LAYER_IDS } from '../radar/radar-layer-ids';
import { SATELLITE_LAYER_IDS } from '../satellite/satellite-layer-ids';

export interface MutableImageSource {
  updateImage(options: {
    url: string;
    coordinates: [[number, number], [number, number], [number, number], [number, number]];
  }): void;
}

export const SOURCE_IDS = {
  states: 'ngws-states',
  counties: 'ngws-counties',
  places: 'ngws-places',
  roads: 'ngws-roads',
  observationField: 'ngws-observation-field',
  observations: 'ngws-observations',
  selectedObservation: 'ngws-selected-observation',
  samples: 'ngws-map-samples',
  alerts: 'ngws-alerts',
  selectedAlert: 'ngws-selected-alert',
  alertLeader: 'ngws-alert-leader',
  dim: 'ngws-world-dim',
} as const;

export const LAYER_IDS = {
  dim: 'ngws-basemap-dim',
  roadMajor: 'ngws-road-major',
  roadSecondary: 'ngws-road-secondary',
  roadLocal: 'ngws-road-local',
  roadLabels: 'ngws-road-labels',
  stateLines: 'ngws-state-lines',
  countyCasing: 'ngws-county-casing',
  countyLines: 'ngws-county-lines',
  observationField: 'ngws-observation-field-raster',
  alertFill: 'ngws-alert-fill',
  alertOutline: 'ngws-alert-outline',
  observationDots: 'ngws-observation-dots',
  observationLabels: 'ngws-observation-labels',
  selectedAlert: 'ngws-selected-alert-outline',
  alertLeader: 'ngws-alert-leader-line',
  selectedObservation: 'ngws-selected-observation-ring',
  cityDots: 'ngws-city-dots',
  cityLabels: 'ngws-city-labels',
  sampleDots: 'ngws-sample-dots',
  sampleLabels: 'ngws-sample-labels',
} as const;

export const WORLD_IMAGE_COORDINATES: [[number, number], [number, number], [number, number], [number, number]] = [
  [-179.9, 84.5],
  [179.9, 84.5],
  [179.9, -84.5],
  [-179.9, -84.5],
];

export function setGeoJson(map: MapLibreMap, id: string, data: GeoJsonFeatureCollection): void {
  (map.getSource(id) as GeoJSONSource | undefined)?.setData(data as never);
}

export function currentBBox(map: MapLibreMap): BBox {
  const bounds = map.getBounds();
  const zoom = map.getZoom();
  const step = zoom < 5 ? 1 : zoom < 7 ? 0.25 : zoom < 9 ? 0.05 : 0.01;
  const width = Math.max(0.01, bounds.getEast() - bounds.getWest());
  const height = Math.max(0.01, bounds.getNorth() - bounds.getSouth());
  const padX = width * 0.12;
  const padY = height * 0.12;
  const floor = (value: number) => Math.floor(value / step) * step;
  const ceil = (value: number) => Math.ceil(value / step) * step;
  return {
    west: Math.max(-179.9, floor(bounds.getWest() - padX)),
    south: Math.max(-85, floor(bounds.getSouth() - padY)),
    east: Math.min(179.9, ceil(bounds.getEast() + padX)),
    north: Math.min(85, ceil(bounds.getNorth() + padY)),
  };
}

function flightCategoryColor(category: string): string {
  switch (category.toUpperCase()) {
    case 'VFR': return '#35c768';
    case 'MVFR': return '#3da5ff';
    case 'IFR': return '#ef4b58';
    case 'LIFR': return '#d14bc5';
    default: return '#dce5ef';
  }
}

function observationValue(feature: GeoJsonFeature): number | null {
  const number = Number(feature.properties.fieldValue);
  return Number.isFinite(number) ? number : null;
}

export function styledObservationCollection(
  data: SurfaceObservationCollection,
  scene: MapScene,
): GeoJsonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: data.features.map((feature) => {
      const value = observationValue(feature);
      const fieldText = typeof feature.properties.fieldText === 'string'
        ? feature.properties.fieldText
        : value == null ? '--' : formatObservationValue(scene.observations.field, value);
      const station = typeof feature.properties.station === 'string' ? feature.properties.station : '';
      const color = scene.observations.field === 'flightCategory'
        ? flightCategoryColor(String(feature.properties.flightCategory ?? fieldText))
        : value == null ? '#dce5ef' : fieldColor(scene.observations.field, value);
      return {
        ...feature,
        properties: {
          ...feature.properties,
          fieldText,
          fieldColor: color,
          displayText: scene.observations.showStationIds && station
            ? `${station}\n${fieldText}`
            : fieldText,
        },
      };
    }),
    provider: data.provider,
    generatedAt: data.generatedAt,
    cacheStatus: data.cacheStatus,
    cacheWarning: data.cacheWarning,
  };
}

export function selectedObservationCollection(observation: ObservationSummary | null): GeoJsonFeatureCollection {
  if (!observation) return EMPTY_FEATURE_COLLECTION;
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      id: observation.id,
      properties: { station: observation.station },
      geometry: { type: 'Point', coordinates: observation.coordinate },
    }],
  };
}

export function sampleCollection(samples: MapSample[]): GeoJsonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: samples.map((sample) => ({
      type: 'Feature',
      id: sample.id,
      properties: {
        sampleId: sample.id,
        label: sample.label,
        source: sample.source,
      },
      geometry: { type: 'Point', coordinates: sample.coordinate },
    })),
  };
}

export function enforceStudioLayerOrder(map: MapLibreMap): void {
  const contextLayers = broadcastContextLayerIds(map);
  const ordered = [
    LAYER_IDS.dim,
    LAYER_IDS.roadMajor,
    LAYER_IDS.roadSecondary,
    LAYER_IDS.roadLocal,
    LAYER_IDS.roadLabels,
    LAYER_IDS.observationField,
    ...SATELLITE_LAYER_IDS,
    ...RADAR_LAYER_IDS,
    ...contextLayers,
    LAYER_IDS.countyCasing,
    LAYER_IDS.countyLines,
    LAYER_IDS.stateLines,
    LAYER_IDS.alertFill,
    LAYER_IDS.alertOutline,
    LAYER_IDS.observationDots,
    LAYER_IDS.observationLabels,
    LAYER_IDS.selectedAlert,
    LAYER_IDS.alertLeader,
    LAYER_IDS.selectedObservation,
    LAYER_IDS.cityDots,
    LAYER_IDS.cityLabels,
    LAYER_IDS.sampleDots,
    LAYER_IDS.sampleLabels,
  ];
  const before = firstPlaceLabelLayer(map);
  for (const id of ordered) {
    if (!map.getLayer(id)) continue;
    if (before && map.getLayer(before)) map.moveLayer(id, before);
    else map.moveLayer(id);
  }
}

export function addStudioLayers(map: MapLibreMap, scene: MapScene): void {
  const before = firstPlaceLabelLayer(map);
  addBasemapBroadcastContextLayers(map, before);
  const addGeoJsonSource = (id: string, data: GeoJsonFeatureCollection) => {
    if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: data as never });
  };
  addGeoJsonSource(SOURCE_IDS.states, EMPTY_FEATURE_COLLECTION);
  addGeoJsonSource(SOURCE_IDS.counties, EMPTY_FEATURE_COLLECTION);
  addGeoJsonSource(SOURCE_IDS.places, EMPTY_FEATURE_COLLECTION);
  addGeoJsonSource(SOURCE_IDS.roads, EMPTY_FEATURE_COLLECTION);
  addGeoJsonSource(SOURCE_IDS.observations, EMPTY_FEATURE_COLLECTION);
  addGeoJsonSource(SOURCE_IDS.selectedObservation, EMPTY_FEATURE_COLLECTION);
  addGeoJsonSource(SOURCE_IDS.samples, EMPTY_FEATURE_COLLECTION);
  addGeoJsonSource(SOURCE_IDS.alerts, EMPTY_FEATURE_COLLECTION);
  addGeoJsonSource(SOURCE_IDS.selectedAlert, EMPTY_FEATURE_COLLECTION);
  addGeoJsonSource(SOURCE_IDS.alertLeader, EMPTY_FEATURE_COLLECTION);
  addSatelliteBroadcastContextLayers(map, before, SOURCE_IDS.roads);
  addGeoJsonSource(SOURCE_IDS.dim, {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]],
      },
    }],
  });
  if (!map.getSource(SOURCE_IDS.observationField)) {
    map.addSource(SOURCE_IDS.observationField, {
      type: 'image',
      url: TRANSPARENT_FIELD_IMAGE,
      coordinates: WORLD_IMAGE_COORDINATES,
    });
  }

  if (!map.getLayer(LAYER_IDS.dim)) {
    map.addLayer({
      id: LAYER_IDS.dim,
      type: 'fill',
      source: SOURCE_IDS.dim,
      paint: {
        'fill-color': '#07101c',
        'fill-opacity': scene.display.dimBasemapUnderWeather ? 0.16 : 0,
      },
    }, before);
  }
  addRoadContextLayers(map, before, SOURCE_IDS.roads, {
    major: LAYER_IDS.roadMajor,
    secondary: LAYER_IDS.roadSecondary,
    local: LAYER_IDS.roadLocal,
    labels: LAYER_IDS.roadLabels,
  });

  if (!map.getLayer(LAYER_IDS.stateLines)) {
    map.addLayer({
      id: LAYER_IDS.stateLines,
      type: 'line',
      source: SOURCE_IDS.states,
      paint: {
        'line-color': '#f4f7fb',
        'line-opacity': 0.88,
        'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.7, 6, 1.4, 10, 2.1],
      },
    }, before);
  }
  if (!map.getLayer(LAYER_IDS.countyCasing)) {
    map.addLayer({
      id: LAYER_IDS.countyCasing,
      type: 'line',
      source: SOURCE_IDS.counties,
      minzoom: 4,
      paint: {
        'line-color': '#07101c',
        'line-opacity': 0,
        'line-width': 1.8,
      },
    }, before);
  }
  if (!map.getLayer(LAYER_IDS.countyLines)) {
    map.addLayer({
      id: LAYER_IDS.countyLines,
      type: 'line',
      source: SOURCE_IDS.counties,
      minzoom: 4,
      paint: {
        'line-color': '#f2f6fb',
        'line-opacity': 0,
        'line-width': 0.75,
      },
    }, before);
  }
  if (!map.getLayer(LAYER_IDS.observationField)) {
    map.addLayer({
      id: LAYER_IDS.observationField,
      type: 'raster',
      source: SOURCE_IDS.observationField,
      paint: {
        'raster-opacity': scene.observations.fieldOpacity / 100,
        'raster-fade-duration': 180,
        'raster-resampling': scene.observations.smoothing === 'sharp' ? 'nearest' : 'linear',
      },
    }, before);
  }
  if (!map.getLayer(LAYER_IDS.alertFill)) {
    map.addLayer({
      id: LAYER_IDS.alertFill,
      type: 'fill',
      source: SOURCE_IDS.alerts,
      paint: {
        'fill-color': [
          'match', ['downcase', ['coalesce', ['get', 'severity'], 'unknown']],
          'extreme', '#ff2e55',
          'severe', '#ff6a2a',
          'moderate', '#ffc83d',
          'minor', '#4ec7ff',
          '#9a7cff',
        ],
        'fill-opacity': scene.alerts.showFill ? 0.28 : 0,
      },
    }, before);
  }
  if (!map.getLayer(LAYER_IDS.alertOutline)) {
    map.addLayer({
      id: LAYER_IDS.alertOutline,
      type: 'line',
      source: SOURCE_IDS.alerts,
      paint: {
        'line-color': [
          'match', ['downcase', ['coalesce', ['get', 'severity'], 'unknown']],
          'extreme', '#ffffff',
          'severe', '#ffdfcf',
          'moderate', '#fff2b8',
          'minor', '#d8f4ff',
          '#e4dcff',
        ],
        'line-opacity': scene.alerts.showOutline ? 0.95 : 0,
        'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1, 8, 2.2, 12, 3.2],
      },
    }, before);
  }
  if (!map.getLayer(LAYER_IDS.observationDots)) {
    map.addLayer({
      id: LAYER_IDS.observationDots,
      type: 'circle',
      source: SOURCE_IDS.observations,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 9, 6, 11, 10, 13],
        'circle-color': ['coalesce', ['get', 'fieldColor'], '#dce5ef'],
        'circle-opacity': 0.95,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.2,
        'circle-stroke-opacity': 0.9,
      },
    }, before);
  }
  if (!map.getLayer(LAYER_IDS.observationLabels)) {
    map.addLayer({
      id: LAYER_IDS.observationLabels,
      type: 'symbol',
      source: SOURCE_IDS.observations,
      layout: {
        'text-field': ['coalesce', ['get', 'displayText'], '--'],
        'text-font': ['Noto Sans Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 2, 10, 7, 12, 11, 14],
        'text-allow-overlap': false,
        'text-ignore-placement': false,
        'text-optional': false,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#101722',
        'text-halo-width': 2.2,
        'text-halo-blur': 0.4,
      },
    }, before);
  }
  if (!map.getLayer(LAYER_IDS.selectedAlert)) {
    map.addLayer({
      id: LAYER_IDS.selectedAlert,
      type: 'line',
      source: SOURCE_IDS.selectedAlert,
      paint: { 'line-color': '#ffffff', 'line-width': 4, 'line-opacity': 1 },
    }, before);
  }
  if (!map.getLayer(LAYER_IDS.alertLeader)) {
    map.addLayer({
      id: LAYER_IDS.alertLeader,
      type: 'line',
      source: SOURCE_IDS.alertLeader,
      paint: {
        'line-color': 'rgba(255,255,255,0.9)',
        'line-width': 1.5,
        'line-dasharray': [2, 1.5],
      },
    }, before);
  }
  if (!map.getLayer(LAYER_IDS.selectedObservation)) {
    map.addLayer({
      id: LAYER_IDS.selectedObservation,
      type: 'circle',
      source: SOURCE_IDS.selectedObservation,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 15, 8, 19],
        'circle-color': 'rgba(0,0,0,0)',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 3.5,
        'circle-stroke-opacity': 1,
      },
    }, before);
  }
  if (!map.getLayer(LAYER_IDS.cityDots)) {
    map.addLayer({
      id: LAYER_IDS.cityDots,
      type: 'circle',
      source: SOURCE_IDS.places,
      minzoom: 3.2,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 1.5, 8, 2.3, 12, 3],
        'circle-color': '#f5f8fc',
        'circle-stroke-color': '#111a28',
        'circle-stroke-width': 1,
      },
    }, before);
  }
  if (!map.getLayer(LAYER_IDS.cityLabels)) {
    map.addLayer({
      id: LAYER_IDS.cityLabels,
      type: 'symbol',
      source: SOURCE_IDS.places,
      minzoom: 3.2,
      layout: {
        'text-field': ['coalesce', ['get', 'displayName'], ['get', 'NAME'], ['get', 'BASENAME']],
        'text-font': ['Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 3, 10, 7, 12, 11, 15],
        'text-offset': [0, 0.8],
        'text-anchor': 'top',
        'text-optional': true,
        'symbol-sort-key': ['coalesce', ['get', 'labelRank'], 999999],
      },
      paint: {
        'text-color': '#f7f9fc',
        'text-halo-color': '#0b111b',
        'text-halo-width': 1.8,
        'text-halo-blur': 0.4,
      },
    }, before);
  }
  if (!map.getLayer(LAYER_IDS.sampleDots)) {
    map.addLayer({
      id: LAYER_IDS.sampleDots,
      type: 'circle',
      source: SOURCE_IDS.samples,
      paint: {
        'circle-radius': 7,
        'circle-color': '#111827',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
    }, before);
  }
  if (!map.getLayer(LAYER_IDS.sampleLabels)) {
    map.addLayer({
      id: LAYER_IDS.sampleLabels,
      type: 'symbol',
      source: SOURCE_IDS.samples,
      layout: {
        'text-field': ['get', 'label'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 13,
        'text-offset': [0, 1.15],
        'text-anchor': 'top',
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#0a0f17',
        'text-halo-width': 2.5,
      },
    }, before);
  }
  enforceStudioLayerOrder(map);
}
