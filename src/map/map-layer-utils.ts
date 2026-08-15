import type {
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  MapScene,
} from '../types/domain';
import type { LayerSpecification, Map as MapLibreMap } from 'maplibre-gl';

export const EMPTY_FEATURE_COLLECTION: GeoJsonFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

export function firstPlaceLabelLayer(map: MapLibreMap): string | undefined {
  const layers = map.getStyle().layers ?? [];
  const place = layers.find((layer) => {
    const sourceLayer = 'source-layer' in layer ? String(layer['source-layer'] ?? '').toLowerCase() : '';
    const id = layer.id.toLowerCase();
    return layer.type === 'symbol' && (sourceLayer === 'place' || /(^|[-_])(place|city|town|village|state)([-_]|$)/.test(id));
  });
  if (place) return place.id;
  return layers.find((layer) => layer.type === 'symbol')?.id;
}

export function isRoadLayer(layer: LayerSpecification): boolean {
  const sourceLayer = 'source-layer' in layer ? String(layer['source-layer'] ?? '').toLowerCase() : '';
  const id = layer.id.toLowerCase();
  return sourceLayer.includes('transportation') || /road|highway|motorway|trunk|street|bridge|tunnel/.test(id);
}

export function roadTier(layerId: string): 'major' | 'secondary' | 'minor' | 'local' {
  const id = layerId.toLowerCase();
  if (/service|track|path|pedestrian|residential|local/.test(id)) return 'local';
  if (/motorway|interstate|trunk|primary|major/.test(id)) return 'major';
  if (/secondary|tertiary|link/.test(id)) return 'secondary';
  if (/minor|street/.test(id)) return 'minor';
  return 'major';
}

function isPlaceLayer(layer: LayerSpecification): boolean {
  const sourceLayer = 'source-layer' in layer ? String(layer['source-layer'] ?? '').toLowerCase() : '';
  const id = layer.id.toLowerCase();
  return sourceLayer === 'place' || /(^|[-_])(place|city|town|village)([-_]|$)/.test(id);
}

export function applyBasemapVisibility(map: MapLibreMap, scene: MapScene): void {
  for (const layer of map.getStyle().layers ?? []) {
    if (!map.getLayer(layer.id)) continue;
    if (isRoadLayer(layer)) {
      const tier = roadTier(layer.id);
      const density = scene.display.roadDensity;
      const densityVisible =
        tier === 'major' ||
        (tier === 'secondary' && density >= 30) ||
        (tier === 'minor' && density >= 55) ||
        (tier === 'local' && density >= 78);
      map.setLayoutProperty(layer.id, 'visibility', scene.overlays.roads && densityVisible ? 'visible' : 'none');
    }
    if (isPlaceLayer(layer)) {
      // The Cities module owns place labels so the basemap cannot duplicate or obscure them.
      map.setLayoutProperty(layer.id, 'visibility', 'none');
    }
  }
}

export function severityRank(value: unknown): number {
  switch (String(value ?? '').toLowerCase()) {
    case 'extreme': return 4;
    case 'severe': return 3;
    case 'moderate': return 2;
    case 'minor': return 1;
    default: return 0;
  }
}

export function filterAlertsForScene(
  collection: GeoJsonFeatureCollection,
  scene: MapScene,
): GeoJsonFeatureCollection {
  if (!scene.overlays.alerts) return EMPTY_FEATURE_COLLECTION;
  const threshold = severityRank(scene.alerts.minimumSeverity);
  return {
    ...collection,
    features: collection.features.filter(
      (feature) => feature.geometry && severityRank(feature.properties.severity) >= threshold,
    ),
  };
}

function walkCoordinates(value: unknown, bounds: [number, number, number, number] | null): [number, number, number, number] | null {
  if (!Array.isArray(value)) return bounds;
  if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
    const [x, y] = value;
    if (!bounds) return [x, y, x, y];
    return [Math.min(bounds[0], x), Math.min(bounds[1], y), Math.max(bounds[2], x), Math.max(bounds[3], y)];
  }
  return value.reduce<[number, number, number, number] | null>(
    (current, item) => walkCoordinates(item, current),
    bounds,
  );
}

export function featureBounds(feature: GeoJsonFeature | undefined): [[number, number], [number, number]] | null {
  if (!feature?.geometry) return null;
  let bounds = walkCoordinates(feature.geometry.coordinates, null);
  if (!bounds && Array.isArray(feature.geometry.geometries)) {
    for (const geometry of feature.geometry.geometries) {
      bounds = walkCoordinates(geometry.coordinates, bounds);
    }
  }
  return bounds ? [[bounds[0], bounds[1]], [bounds[2], bounds[3]]] : null;
}
