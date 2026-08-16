import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { GeoJsonFeatureCollection } from '../types/domain';
import {
  TROPICAL_WIND_PROBABILITY_LAYER_IDS,
  TROPICAL_WIND_PROBABILITY_LAYERS,
  TROPICAL_WIND_PROBABILITY_SOURCE_IDS,
} from './tropical-wind-probability-layer-ids';
import type { TropicalWindProbabilitySceneState } from './tropical-wind-probability-types';

const EMPTY_COLLECTION: GeoJsonFeatureCollection = { type: 'FeatureCollection', features: [] };

const NHC_PROBABILITY_COLOR_EXPRESSION = [
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

export function ensureTropicalWindProbabilityLayers(map: MapLibreMap): void {
  const sourceId = TROPICAL_WIND_PROBABILITY_SOURCE_IDS.probabilities;
  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, { type: 'geojson', data: EMPTY_COLLECTION as never });
  }

  if (!map.getLayer(TROPICAL_WIND_PROBABILITY_LAYERS.fill)) {
    map.addLayer({
      id: TROPICAL_WIND_PROBABILITY_LAYERS.fill,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': NHC_PROBABILITY_COLOR_EXPRESSION as never,
        'fill-opacity': 0.52,
      },
    });
  }
  if (!map.getLayer(TROPICAL_WIND_PROBABILITY_LAYERS.outline)) {
    map.addLayer({
      id: TROPICAL_WIND_PROBABILITY_LAYERS.outline,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': NHC_PROBABILITY_COLOR_EXPRESSION as never,
        'line-width': 1.5,
        'line-opacity': 0.92,
      },
    });
  }
  if (!map.getLayer(TROPICAL_WIND_PROBABILITY_LAYERS.label)) {
    map.addLayer({
      id: TROPICAL_WIND_PROBABILITY_LAYERS.label,
      type: 'symbol',
      source: sourceId,
      minzoom: 3,
      layout: {
        'text-field': ['get', 'ngwxProbabilityRange'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 10.5,
        'text-allow-overlap': false,
        'text-ignore-placement': false,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#11151b',
        'text-halo-width': 1.4,
      },
    });
  }
}

export function renderTropicalWindProbability(
  map: MapLibreMap,
  probabilities: GeoJsonFeatureCollection,
): void {
  ensureTropicalWindProbabilityLayers(map);
  setGeoJson(map, TROPICAL_WIND_PROBABILITY_SOURCE_IDS.probabilities, probabilities);
}

export function applyTropicalWindProbabilityVisibility(
  map: MapLibreMap,
  state: TropicalWindProbabilitySceneState,
): void {
  setVisibility(map, TROPICAL_WIND_PROBABILITY_LAYERS.fill, state.showProbabilities);
  setVisibility(map, TROPICAL_WIND_PROBABILITY_LAYERS.outline, state.showProbabilities);
  setVisibility(
    map,
    TROPICAL_WIND_PROBABILITY_LAYERS.label,
    state.showProbabilities && state.showLabels,
  );
}

export function clearTropicalWindProbabilityData(map: MapLibreMap): void {
  setGeoJson(
    map,
    TROPICAL_WIND_PROBABILITY_SOURCE_IDS.probabilities,
    EMPTY_COLLECTION,
  );
}

export function removeTropicalWindProbabilityLayers(map: MapLibreMap): void {
  for (const layer of [...TROPICAL_WIND_PROBABILITY_LAYER_IDS].reverse()) {
    if (map.getLayer(layer)) map.removeLayer(layer);
  }
  for (const source of Object.values(TROPICAL_WIND_PROBABILITY_SOURCE_IDS)) {
    if (map.getSource(source)) map.removeSource(source);
  }
}
