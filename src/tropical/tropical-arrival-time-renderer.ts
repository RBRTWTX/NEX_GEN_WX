import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { GeoJsonFeatureCollection } from '../types/domain';
import {
  TROPICAL_ARRIVAL_TIME_LAYER_IDS,
  TROPICAL_ARRIVAL_TIME_LAYERS,
  TROPICAL_ARRIVAL_TIME_SOURCE_IDS,
} from './tropical-arrival-time-layer-ids';
import type { TropicalArrivalTimeSceneState } from './tropical-arrival-time-types';

const EMPTY_COLLECTION: GeoJsonFeatureCollection = { type: 'FeatureCollection', features: [] };

const NHC_34KT_PROBABILITY_COLOR_EXPRESSION = [
  'match',
  ['get', 'ngwxProbabilityRange'],
  '<5%', 'rgba(212,207,199,0)',
  '5-10%', '#267300',
  '10-20%', '#38a800',
  '20-30%', '#55ff00',
  '30-40%', '#e6e600',
  '40-50%', '#ffd37f',
  '50-60%', '#e69800',
  '60-70%', '#ffaa00',
  '70-80%', '#e60000',
  '80-90%', '#a83800',
  '>90%', '#a900e6',
  'rgba(212,207,199,0)',
] as const;

function setGeoJson(map: MapLibreMap, id: string, data: GeoJsonFeatureCollection): void {
  (map.getSource(id) as GeoJSONSource | undefined)?.setData(data as never);
}

function setVisibility(map: MapLibreMap, id: string, visible: boolean): void {
  if (!map.getLayer(id)) return;
  map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
}

export function ensureTropicalArrivalTimeLayers(map: MapLibreMap): void {
  for (const source of Object.values(TROPICAL_ARRIVAL_TIME_SOURCE_IDS)) {
    if (!map.getSource(source)) {
      map.addSource(source, { type: 'geojson', data: EMPTY_COLLECTION as never });
    }
  }

  if (!map.getLayer(TROPICAL_ARRIVAL_TIME_LAYERS.probabilityFill)) {
    map.addLayer({
      id: TROPICAL_ARRIVAL_TIME_LAYERS.probabilityFill,
      type: 'fill',
      source: TROPICAL_ARRIVAL_TIME_SOURCE_IDS.probability,
      paint: {
        'fill-color': NHC_34KT_PROBABILITY_COLOR_EXPRESSION as never,
        'fill-opacity': 0.42,
      },
    });
  }
  if (!map.getLayer(TROPICAL_ARRIVAL_TIME_LAYERS.probabilityOutline)) {
    map.addLayer({
      id: TROPICAL_ARRIVAL_TIME_LAYERS.probabilityOutline,
      type: 'line',
      source: TROPICAL_ARRIVAL_TIME_SOURCE_IDS.probability,
      paint: {
        'line-color': NHC_34KT_PROBABILITY_COLOR_EXPRESSION as never,
        'line-width': 1.2,
        'line-opacity': 0.82,
      },
    });
  }
  if (!map.getLayer(TROPICAL_ARRIVAL_TIME_LAYERS.contourCasing)) {
    map.addLayer({
      id: TROPICAL_ARRIVAL_TIME_LAYERS.contourCasing,
      type: 'line',
      source: TROPICAL_ARRIVAL_TIME_SOURCE_IDS.contours,
      paint: {
        'line-color': '#ffffff',
        'line-width': 4.4,
        'line-opacity': 0.94,
      },
    });
  }
  if (!map.getLayer(TROPICAL_ARRIVAL_TIME_LAYERS.contourLine)) {
    map.addLayer({
      id: TROPICAL_ARRIVAL_TIME_LAYERS.contourLine,
      type: 'line',
      source: TROPICAL_ARRIVAL_TIME_SOURCE_IDS.contours,
      paint: {
        'line-color': '#000000',
        'line-width': 2.1,
        'line-opacity': 1,
      },
    });
  }
  if (!map.getLayer(TROPICAL_ARRIVAL_TIME_LAYERS.contourLabel)) {
    map.addLayer({
      id: TROPICAL_ARRIVAL_TIME_LAYERS.contourLabel,
      type: 'symbol',
      source: TROPICAL_ARRIVAL_TIME_SOURCE_IDS.contours,
      layout: {
        'symbol-placement': 'line',
        'symbol-spacing': 260,
        'text-field': ['get', 'ngwxArrivalLabel'],
        'text-font': ['Noto Sans Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 2, 10.5, 6, 12.5, 10, 14],
        'text-keep-upright': true,
        'text-allow-overlap': false,
        'text-ignore-placement': false,
      },
      paint: {
        'text-color': '#050505',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2.2,
        'text-halo-blur': 0.4,
      },
    });
  }
}

export function renderTropicalArrivalTime(
  map: MapLibreMap,
  contours: GeoJsonFeatureCollection,
  windProbability34: GeoJsonFeatureCollection,
): void {
  ensureTropicalArrivalTimeLayers(map);
  setGeoJson(map, TROPICAL_ARRIVAL_TIME_SOURCE_IDS.contours, contours);
  setGeoJson(map, TROPICAL_ARRIVAL_TIME_SOURCE_IDS.probability, windProbability34);
}

export function applyTropicalArrivalTimeVisibility(
  map: MapLibreMap,
  state: TropicalArrivalTimeSceneState,
): void {
  setVisibility(map, TROPICAL_ARRIVAL_TIME_LAYERS.probabilityFill, state.showWindProbability);
  setVisibility(map, TROPICAL_ARRIVAL_TIME_LAYERS.probabilityOutline, state.showWindProbability);
  setVisibility(map, TROPICAL_ARRIVAL_TIME_LAYERS.contourCasing, state.showContours);
  setVisibility(map, TROPICAL_ARRIVAL_TIME_LAYERS.contourLine, state.showContours);
  setVisibility(
    map,
    TROPICAL_ARRIVAL_TIME_LAYERS.contourLabel,
    state.showContours && state.showLabels,
  );
}

export function clearTropicalArrivalTimeData(map: MapLibreMap): void {
  setGeoJson(map, TROPICAL_ARRIVAL_TIME_SOURCE_IDS.contours, EMPTY_COLLECTION);
  setGeoJson(map, TROPICAL_ARRIVAL_TIME_SOURCE_IDS.probability, EMPTY_COLLECTION);
}

export function removeTropicalArrivalTimeLayers(map: MapLibreMap): void {
  for (const layer of [...TROPICAL_ARRIVAL_TIME_LAYER_IDS].reverse()) {
    if (map.getLayer(layer)) map.removeLayer(layer);
  }
  for (const source of Object.values(TROPICAL_ARRIVAL_TIME_SOURCE_IDS)) {
    if (map.getSource(source)) map.removeSource(source);
  }
}
