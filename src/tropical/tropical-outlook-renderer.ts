import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { GeoJsonFeatureCollection } from '../types/domain';
import {
  TROPICAL_OUTLOOK_LAYER_IDS,
  TROPICAL_OUTLOOK_LAYERS,
  TROPICAL_OUTLOOK_SOURCE_IDS,
} from './tropical-layer-ids';
import type { TropicalOutlookSceneState } from './tropical-outlook-types';

const EMPTY_COLLECTION: GeoJsonFeatureCollection = { type: 'FeatureCollection', features: [] };

function setGeoJson(map: MapLibreMap, id: string, data: GeoJsonFeatureCollection): void {
  (map.getSource(id) as GeoJSONSource | undefined)?.setData(data as never);
}

function setVisibility(map: MapLibreMap, id: string, visible: boolean): void {
  if (!map.getLayer(id)) return;
  map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
}

export interface TropicalOutlookRenderSelection {
  locations: GeoJsonFeatureCollection;
  regions: GeoJsonFeatureCollection;
  motion: GeoJsonFeatureCollection;
}

export function ensureTropicalOutlookLayers(map: MapLibreMap): void {
  for (const source of Object.values(TROPICAL_OUTLOOK_SOURCE_IDS)) {
    if (!map.getSource(source)) {
      map.addSource(source, { type: 'geojson', data: EMPTY_COLLECTION as never });
    }
  }

  if (!map.getLayer(TROPICAL_OUTLOOK_LAYERS.regionFill)) {
    map.addLayer({
      id: TROPICAL_OUTLOOK_LAYERS.regionFill,
      type: 'fill',
      source: TROPICAL_OUTLOOK_SOURCE_IDS.regions,
      paint: {
        'fill-color': [
          'step', ['coalesce', ['get', 'ngwxProbability'], 0],
          '#f1c84b', 40, '#e69800', 70, '#e60000',
        ],
        'fill-opacity': 0.2,
      },
    });
  }
  if (!map.getLayer(TROPICAL_OUTLOOK_LAYERS.regionOutline)) {
    map.addLayer({
      id: TROPICAL_OUTLOOK_LAYERS.regionOutline,
      type: 'line',
      source: TROPICAL_OUTLOOK_SOURCE_IDS.regions,
      paint: {
        'line-color': [
          'step', ['coalesce', ['get', 'ngwxProbability'], 0],
          '#f1c84b', 40, '#e69800', 70, '#e60000',
        ],
        'line-width': 2.6,
        'line-opacity': 0.95,
      },
    });
  }
  if (!map.getLayer(TROPICAL_OUTLOOK_LAYERS.motionCasing)) {
    map.addLayer({
      id: TROPICAL_OUTLOOK_LAYERS.motionCasing,
      type: 'line',
      source: TROPICAL_OUTLOOK_SOURCE_IDS.motion,
      paint: {
        'line-color': '#11151b',
        'line-width': 7,
        'line-opacity': 0.9,
      },
    });
  }
  if (!map.getLayer(TROPICAL_OUTLOOK_LAYERS.motionLine)) {
    map.addLayer({
      id: TROPICAL_OUTLOOK_LAYERS.motionLine,
      type: 'line',
      source: TROPICAL_OUTLOOK_SOURCE_IDS.motion,
      paint: {
        'line-color': [
          'step', ['coalesce', ['get', 'ngwxProbability'], 0],
          '#f1c84b', 40, '#e69800', 70, '#e60000',
        ],
        'line-width': 4,
        'line-opacity': 1,
      },
    });
  }
  if (!map.getLayer(TROPICAL_OUTLOOK_LAYERS.regionProbability)) {
    map.addLayer({
      id: TROPICAL_OUTLOOK_LAYERS.regionProbability,
      type: 'symbol',
      source: TROPICAL_OUTLOOK_SOURCE_IDS.regions,
      layout: {
        'text-field': ['get', 'ngwxRegionProbabilityLabel'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 13,
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#11151b',
        'text-halo-width': 1.8,
      },
    });
  }
  if (!map.getLayer(TROPICAL_OUTLOOK_LAYERS.locationCircle)) {
    map.addLayer({
      id: TROPICAL_OUTLOOK_LAYERS.locationCircle,
      type: 'circle',
      source: TROPICAL_OUTLOOK_SOURCE_IDS.locations,
      paint: {
        'circle-radius': 12,
        'circle-color': [
          'step', ['coalesce', ['get', 'ngwxProbability'], 0],
          '#f1c84b', 40, '#e69800', 70, '#e60000',
        ],
        'circle-stroke-color': '#11151b',
        'circle-stroke-width': 2,
        'circle-opacity': 1,
      },
    });
  }
  if (!map.getLayer(TROPICAL_OUTLOOK_LAYERS.locationX)) {
    map.addLayer({
      id: TROPICAL_OUTLOOK_LAYERS.locationX,
      type: 'symbol',
      source: TROPICAL_OUTLOOK_SOURCE_IDS.locations,
      layout: {
        'text-field': 'X',
        'text-font': ['Noto Sans Regular'],
        'text-size': 15,
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        'text-color': '#11151b',
        'text-halo-color': '#ffffff',
        'text-halo-width': 0.8,
      },
    });
  }
  if (!map.getLayer(TROPICAL_OUTLOOK_LAYERS.locationProbability)) {
    map.addLayer({
      id: TROPICAL_OUTLOOK_LAYERS.locationProbability,
      type: 'symbol',
      source: TROPICAL_OUTLOOK_SOURCE_IDS.locations,
      layout: {
        'text-field': ['concat', ['to-string', ['coalesce', ['get', 'ngwxProbability'], 0]], '%'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 12,
        'text-offset': [0, 1.9],
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#11151b',
        'text-halo-width': 1.5,
      },
    });
  }
}

export function renderTropicalOutlook(
  map: MapLibreMap,
  selection: TropicalOutlookRenderSelection,
): void {
  ensureTropicalOutlookLayers(map);
  setGeoJson(map, TROPICAL_OUTLOOK_SOURCE_IDS.locations, selection.locations);
  setGeoJson(map, TROPICAL_OUTLOOK_SOURCE_IDS.regions, selection.regions);
  setGeoJson(map, TROPICAL_OUTLOOK_SOURCE_IDS.motion, selection.motion);
}

export function applyTropicalOutlookVisibility(
  map: MapLibreMap,
  state: TropicalOutlookSceneState,
  sevenDay: boolean,
): void {
  setVisibility(
    map,
    TROPICAL_OUTLOOK_LAYERS.regionProbability,
    sevenDay && state.showRegions,
  );
  setVisibility(map, TROPICAL_OUTLOOK_LAYERS.locationCircle, state.showLocations);
  setVisibility(map, TROPICAL_OUTLOOK_LAYERS.locationX, state.showLocations);
  setVisibility(map, TROPICAL_OUTLOOK_LAYERS.locationProbability, state.showLocations);
  setVisibility(map, TROPICAL_OUTLOOK_LAYERS.regionFill, sevenDay && state.showRegions);
  setVisibility(map, TROPICAL_OUTLOOK_LAYERS.regionOutline, sevenDay && state.showRegions);
  setVisibility(map, TROPICAL_OUTLOOK_LAYERS.motionCasing, sevenDay && state.showMotion);
  setVisibility(map, TROPICAL_OUTLOOK_LAYERS.motionLine, sevenDay && state.showMotion);
}

export function clearTropicalOutlookData(map: MapLibreMap): void {
  for (const source of Object.values(TROPICAL_OUTLOOK_SOURCE_IDS)) {
    setGeoJson(map, source, EMPTY_COLLECTION);
  }
}

export function removeTropicalOutlookLayers(map: MapLibreMap): void {
  for (const layer of [...TROPICAL_OUTLOOK_LAYER_IDS].reverse()) {
    if (map.getLayer(layer)) map.removeLayer(layer);
  }
  for (const source of Object.values(TROPICAL_OUTLOOK_SOURCE_IDS)) {
    if (map.getSource(source)) map.removeSource(source);
  }
}
