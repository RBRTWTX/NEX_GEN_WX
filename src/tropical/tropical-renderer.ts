import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { GeoJsonFeatureCollection } from '../types/domain';
import {
  TROPICAL_LAYER_IDS,
  TROPICAL_LAYERS,
  TROPICAL_SOURCE_IDS,
} from './tropical-layer-ids';
import type { TropicalSceneState } from './tropical-types';

const EMPTY_COLLECTION: GeoJsonFeatureCollection = { type: 'FeatureCollection', features: [] };

function setGeoJson(map: MapLibreMap, id: string, data: GeoJsonFeatureCollection): void {
  (map.getSource(id) as GeoJSONSource | undefined)?.setData(data as never);
}

function setVisibility(map: MapLibreMap, id: string, visible: boolean): void {
  if (!map.getLayer(id)) return;
  map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
}

export interface TropicalRenderSelection {
  points: GeoJsonFeatureCollection;
  track: GeoJsonFeatureCollection;
  cone: GeoJsonFeatureCollection;
  warnings: GeoJsonFeatureCollection;
}

export function ensureTropicalLayers(map: MapLibreMap): void {
  for (const source of Object.values(TROPICAL_SOURCE_IDS)) {
    if (!map.getSource(source)) {
      map.addSource(source, { type: 'geojson', data: EMPTY_COLLECTION as never });
    }
  }

  if (!map.getLayer(TROPICAL_LAYERS.coneFill)) {
    map.addLayer({
      id: TROPICAL_LAYERS.coneFill,
      type: 'fill',
      source: TROPICAL_SOURCE_IDS.cone,
      paint: {
        'fill-color': '#e1e1e1',
        'fill-opacity': 0.44,
      },
    });
  }
  if (!map.getLayer(TROPICAL_LAYERS.coneOutline)) {
    map.addLayer({
      id: TROPICAL_LAYERS.coneOutline,
      type: 'line',
      source: TROPICAL_SOURCE_IDS.cone,
      paint: {
        'line-color': '#e60000',
        'line-opacity': 0.95,
        'line-width': 1.8,
      },
    });
  }
  if (!map.getLayer(TROPICAL_LAYERS.trackCasing)) {
    map.addLayer({
      id: TROPICAL_LAYERS.trackCasing,
      type: 'line',
      source: TROPICAL_SOURCE_IDS.track,
      paint: {
        'line-color': '#ffffff',
        'line-opacity': 0.9,
        'line-width': 5,
      },
    });
  }
  if (!map.getLayer(TROPICAL_LAYERS.trackLine)) {
    map.addLayer({
      id: TROPICAL_LAYERS.trackLine,
      type: 'line',
      source: TROPICAL_SOURCE_IDS.track,
      paint: {
        'line-color': '#000000',
        'line-opacity': 1,
        'line-width': 2.4,
      },
    });
  }
  if (!map.getLayer(TROPICAL_LAYERS.warningLine)) {
    map.addLayer({
      id: TROPICAL_LAYERS.warningLine,
      type: 'line',
      source: TROPICAL_SOURCE_IDS.warnings,
      paint: {
        // NOAA/NHC service layer 8 official watch/warning colors.
        'line-color': [
          'match', ['get', 'tcww'],
          'HWR', '#ff0000',
          'HWA', '#ff7f7f',
          'TWR', '#004da8',
          'TWA', '#ffff00',
          '#ffffff',
        ],
        'line-width': [
          'match', ['get', 'tcww'],
          'HWR', 5,
          'HWA', 5,
          'TWR', 2,
          'TWA', 2,
          2,
        ],
        'line-opacity': 1,
      },
    });
  }
  if (!map.getLayer(TROPICAL_LAYERS.pointCircle)) {
    map.addLayer({
      id: TROPICAL_LAYERS.pointCircle,
      type: 'circle',
      source: TROPICAL_SOURCE_IDS.points,
      paint: {
        'circle-radius': [
          'case',
          ['==', ['to-number', ['coalesce', ['get', 'tau'], ['get', 'fcstprd'], 999]], 0],
          9,
          7,
        ],
        'circle-color': [
          'match', ['get', 'dvlbl'],
          'M', '#b31b1b',
          'H', '#e64545',
          'S', '#f1c84b',
          'D', '#3b8fd8',
          '#f5f7fa',
        ],
        'circle-stroke-color': '#11151b',
        'circle-stroke-width': 2,
        'circle-opacity': 1,
      },
    });
  }
  if (!map.getLayer(TROPICAL_LAYERS.pointLabel)) {
    map.addLayer({
      id: TROPICAL_LAYERS.pointLabel,
      type: 'symbol',
      source: TROPICAL_SOURCE_IDS.points,
      layout: {
        'text-field': ['coalesce', ['get', 'dvlbl'], ''],
        'text-font': ['Noto Sans Regular'],
        'text-size': 10.5,
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#11151b',
        'text-halo-width': 1,
      },
    });
  }
}

export function renderTropicalSelection(
  map: MapLibreMap,
  selection: TropicalRenderSelection,
): void {
  ensureTropicalLayers(map);
  setGeoJson(map, TROPICAL_SOURCE_IDS.cone, selection.cone);
  setGeoJson(map, TROPICAL_SOURCE_IDS.track, selection.track);
  setGeoJson(map, TROPICAL_SOURCE_IDS.warnings, selection.warnings);
  setGeoJson(map, TROPICAL_SOURCE_IDS.points, selection.points);
}

export function applyTropicalVisibility(map: MapLibreMap, state: TropicalSceneState): void {
  setVisibility(map, TROPICAL_LAYERS.coneFill, state.showCone);
  setVisibility(map, TROPICAL_LAYERS.coneOutline, state.showCone);
  setVisibility(map, TROPICAL_LAYERS.trackCasing, state.showTrack);
  setVisibility(map, TROPICAL_LAYERS.trackLine, state.showTrack);
  setVisibility(map, TROPICAL_LAYERS.warningLine, state.showWarnings);
  setVisibility(map, TROPICAL_LAYERS.pointCircle, state.showPoints);
  setVisibility(map, TROPICAL_LAYERS.pointLabel, state.showPoints);
}

export function clearTropicalData(map: MapLibreMap): void {
  for (const source of Object.values(TROPICAL_SOURCE_IDS)) {
    setGeoJson(map, source, EMPTY_COLLECTION);
  }
}

export function removeTropicalLayers(map: MapLibreMap): void {
  for (const layer of [...TROPICAL_LAYER_IDS].reverse()) {
    if (map.getLayer(layer)) map.removeLayer(layer);
  }
  for (const source of Object.values(TROPICAL_SOURCE_IDS)) {
    if (map.getSource(source)) map.removeSource(source);
  }
}
