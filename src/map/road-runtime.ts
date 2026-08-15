import type { Map as MapLibreMap } from 'maplibre-gl';

interface RoadLayerIds {
  major: string;
  secondary: string;
  local: string;
  labels: string;
}

export function addRoadContextLayers(
  map: MapLibreMap,
  before: string | undefined,
  source: string,
  ids: RoadLayerIds,
): void {
  if (!map.getLayer(ids.major)) {
    map.addLayer({
      id: ids.major,
      type: 'line',
      source,
      filter: ['==', ['get', 'roadTier'], 'major'],
      paint: {
        'line-color': '#f5c36a',
        'line-opacity': 0.9,
        'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.8, 7, 1.4, 11, 3.2, 15, 5.4],
        'line-blur': 0.05,
      },
    }, before);
  }
  if (!map.getLayer(ids.secondary)) {
    map.addLayer({
      id: ids.secondary,
      type: 'line',
      source,
      filter: ['==', ['get', 'roadTier'], 'secondary'],
      minzoom: 5,
      paint: {
        'line-color': '#eef1f3',
        'line-opacity': 0.82,
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.45, 9, 1.4, 13, 2.8],
      },
    }, before);
  }
  if (!map.getLayer(ids.local)) {
    map.addLayer({
      id: ids.local,
      type: 'line',
      source,
      filter: ['==', ['get', 'roadTier'], 'local'],
      minzoom: 9,
      paint: {
        'line-color': '#d9dee2',
        'line-opacity': 0.68,
        'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.35, 13, 1.2, 16, 2.1],
      },
    }, before);
  }
  if (!map.getLayer(ids.labels)) {
    map.addLayer({
      id: ids.labels,
      type: 'symbol',
      source,
      minzoom: 6,
      layout: {
        'symbol-placement': 'line',
        'text-field': ['coalesce', ['get', 'displayName'], ['get', 'NAME'], ['get', 'BASENAME']],
        'text-font': ['Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 6, 9, 10, 11, 14, 13],
        'symbol-spacing': 340,
        'text-rotation-alignment': 'map',
        'text-pitch-alignment': 'viewport',
        'text-optional': true,
      },
      paint: {
        'text-color': '#f7f8fa',
        'text-halo-color': '#1b252e',
        'text-halo-width': 1.8,
        'text-halo-blur': 0.4,
      },
    }, before);
  }
}
