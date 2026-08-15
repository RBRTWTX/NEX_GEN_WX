import type { LayerSpecification, Map as MapLibreMap } from 'maplibre-gl';
import type {
  BroadcastContextDetail,
  BroadcastContextMode,
  MapScene,
} from '../types/domain';
import { isRoadLayer, roadTier } from './map-layer-utils';

export const BROADCAST_CONTEXT_PREFIX = 'ngwx-broadcast-context-';

export const SATELLITE_CONTEXT_LAYER_IDS = {
  major: `${BROADCAST_CONTEXT_PREFIX}sat-major`,
  secondary: `${BROADCAST_CONTEXT_PREFIX}sat-secondary`,
  local: `${BROADCAST_CONTEXT_PREFIX}sat-local`,
  labels: `${BROADCAST_CONTEXT_PREFIX}sat-labels`,
} as const;

type RoadTier = ReturnType<typeof roadTier>;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function cloneLayer(layer: LayerSpecification): LayerSpecification {
  return JSON.parse(JSON.stringify(layer)) as LayerSpecification;
}

function vectorContextId(layerId: string): string {
  return `${BROADCAST_CONTEXT_PREFIX}vector-${layerId}`;
}

export function broadcastContextLayerIds(map: MapLibreMap): string[] {
  return (map.getStyle().layers ?? [])
    .map((layer) => layer.id)
    .filter((id) => id.startsWith(BROADCAST_CONTEXT_PREFIX));
}

export function addBasemapBroadcastContextLayers(
  map: MapLibreMap,
  before: string | undefined,
): void {
  const sourceLayers = [...(map.getStyle().layers ?? [])];
  for (const layer of sourceLayers) {
    if (layer.id.startsWith(BROADCAST_CONTEXT_PREFIX)) continue;
    if (!isRoadLayer(layer)) continue;
    if (layer.type !== 'line' && layer.type !== 'symbol') continue;
    const id = vectorContextId(layer.id);
    if (map.getLayer(id)) continue;
    const duplicate = cloneLayer(layer);
    duplicate.id = id;
    map.addLayer(duplicate, before);
  }
}

export function addSatelliteBroadcastContextLayers(
  map: MapLibreMap,
  before: string | undefined,
  source: string,
): void {
  if (!map.getLayer(SATELLITE_CONTEXT_LAYER_IDS.major)) {
    map.addLayer({
      id: SATELLITE_CONTEXT_LAYER_IDS.major,
      type: 'line',
      source,
      filter: ['==', ['get', 'roadTier'], 'major'],
      paint: {
        'line-color': '#ffd37a',
        'line-opacity': 0,
        'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.1, 7, 2, 11, 3.8, 15, 6],
        'line-blur': 0.05,
      },
    }, before);
  }
  if (!map.getLayer(SATELLITE_CONTEXT_LAYER_IDS.secondary)) {
    map.addLayer({
      id: SATELLITE_CONTEXT_LAYER_IDS.secondary,
      type: 'line',
      source,
      filter: ['==', ['get', 'roadTier'], 'secondary'],
      paint: {
        'line-color': '#f6f8fb',
        'line-opacity': 0,
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 9, 1.7, 13, 3],
      },
    }, before);
  }
  if (!map.getLayer(SATELLITE_CONTEXT_LAYER_IDS.local)) {
    map.addLayer({
      id: SATELLITE_CONTEXT_LAYER_IDS.local,
      type: 'line',
      source,
      filter: ['==', ['get', 'roadTier'], 'local'],
      paint: {
        'line-color': '#e1e6ed',
        'line-opacity': 0,
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.55, 13, 1.35, 16, 2.2],
      },
    }, before);
  }
  if (!map.getLayer(SATELLITE_CONTEXT_LAYER_IDS.labels)) {
    map.addLayer({
      id: SATELLITE_CONTEXT_LAYER_IDS.labels,
      type: 'symbol',
      source,
      layout: {
        'symbol-placement': 'line',
        'text-field': ['coalesce', ['get', 'displayName'], ['get', 'NAME'], ['get', 'BASENAME']],
        'text-font': ['Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 6, 9, 10, 11.5, 14, 13.5],
        'symbol-spacing': 320,
        'text-rotation-alignment': 'map',
        'text-pitch-alignment': 'viewport',
        'text-optional': true,
      },
      paint: {
        'text-color': '#ffffff',
        'text-opacity': 0,
        'text-halo-color': '#111923',
        'text-halo-width': 2,
        'text-halo-blur': 0.35,
      },
    }, before);
  }
}

function contextMode(scene: MapScene): BroadcastContextMode {
  return scene.display.contextMode ?? 'auto';
}

function contextDetail(scene: MapScene): BroadcastContextDetail {
  return scene.display.contextDetail ?? 'broadcast';
}

function detailShift(detail: BroadcastContextDetail): number {
  if (detail === 'low') return 1.35;
  if (detail === 'high') return -1.15;
  return 0;
}

function automaticProductShift(scene: MapScene): number {
  switch (scene.product.category) {
    case 'radar': return 0;
    case 'rainfall': return 0.15;
    case 'temperature': return 0.55;
    case 'satellite': return 0.8;
    case 'tropical': return 1.0;
    default: return 0.4;
  }
}

function minimumZoomForTier(scene: MapScene, tier: RoadTier): number {
  const mode = contextMode(scene);
  const shift = detailShift(contextDetail(scene))
    + (mode === 'auto' ? automaticProductShift(scene) : 0);
  const base = tier === 'major'
    ? 3.4
    : tier === 'secondary'
      ? 5.6
      : tier === 'minor'
        ? 8.1
        : 11.0;
  return Math.max(2, base + shift);
}

function tierOpacity(tier: RoadTier): number {
  if (tier === 'major') return 1;
  if (tier === 'secondary') return 0.82;
  if (tier === 'minor') return 0.64;
  return 0.46;
}

function emergenceOpacity(scene: MapScene, map: MapLibreMap, tier: RoadTier): number {
  const minimum = minimumZoomForTier(scene, tier);
  const progress = map.getZoom() - minimum;
  return clamp(0.42 + progress * 0.18, 0.42, 1);
}

function productOpacityFactor(scene: MapScene): number {
  if (contextMode(scene) !== 'auto') return 1;
  switch (scene.product.category) {
    case 'radar': return 1;
    case 'rainfall': return 0.94;
    case 'temperature': return 0.86;
    case 'satellite': return 0.78;
    case 'tropical': return 0.72;
    default: return 0.86;
  }
}

function contextOpacity(scene: MapScene): number {
  return clamp(scene.display.contextOpacity ?? 72, 0, 100) / 100 * productOpacityFactor(scene);
}

function vectorLayerIsVisible(scene: MapScene, map: MapLibreMap, id: string): boolean {
  if (!scene.overlays.roads || contextMode(scene) === 'off') return false;
  if (scene.baseMap === 'satellite') return false;
  const tier = roadTier(id);
  return map.getZoom() >= minimumZoomForTier(scene, tier);
}

function satelliteTierVisible(scene: MapScene, map: MapLibreMap, tier: RoadTier): boolean {
  if (!scene.overlays.roads || contextMode(scene) === 'off') return false;
  if (scene.baseMap !== 'satellite') return false;
  return map.getZoom() >= minimumZoomForTier(scene, tier);
}

function setVisibility(map: MapLibreMap, id: string, visible: boolean): void {
  if (!map.getLayer(id)) return;
  map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
}

export function applyBroadcastContext(map: MapLibreMap, scene: MapScene): void {
  const opacity = contextOpacity(scene);

  for (const layer of map.getStyle().layers ?? []) {
    if (!layer.id.startsWith(`${BROADCAST_CONTEXT_PREFIX}vector-`)) continue;
    const visible = vectorLayerIsVisible(scene, map, layer.id);
    setVisibility(map, layer.id, visible);
    const tier = roadTier(layer.id);
    const effectiveOpacity = visible
      ? opacity * tierOpacity(tier) * emergenceOpacity(scene, map, tier)
      : 0;
    if (layer.type === 'line') {
      map.setPaintProperty(layer.id, 'line-opacity', effectiveOpacity);
    } else if (layer.type === 'symbol') {
      map.setPaintProperty(layer.id, 'text-opacity', effectiveOpacity);
      map.setPaintProperty(layer.id, 'icon-opacity', effectiveOpacity);
    }
  }

  const satelliteLines: Array<[string, RoadTier]> = [
    [SATELLITE_CONTEXT_LAYER_IDS.major, 'major'],
    [SATELLITE_CONTEXT_LAYER_IDS.secondary, 'secondary'],
    [SATELLITE_CONTEXT_LAYER_IDS.local, 'local'],
  ];
  for (const [id, tier] of satelliteLines) {
    const visible = satelliteTierVisible(scene, map, tier);
    setVisibility(map, id, visible);
    if (map.getLayer(id)) {
      map.setPaintProperty(
        id,
        'line-opacity',
        visible ? opacity * tierOpacity(tier) * emergenceOpacity(scene, map, tier) : 0,
      );
    }
  }

  if (map.getLayer(SATELLITE_CONTEXT_LAYER_IDS.labels)) {
    const visibleTiers = (['major', 'secondary', 'minor', 'local'] as RoadTier[])
      .filter((tier) => satelliteTierVisible(scene, map, tier));
    const visible = visibleTiers.length > 0;
    setVisibility(map, SATELLITE_CONTEXT_LAYER_IDS.labels, visible);
    map.setFilter(
      SATELLITE_CONTEXT_LAYER_IDS.labels,
      ['in', ['get', 'roadTier'], ['literal', visibleTiers]],
    );
    map.setPaintProperty(
      SATELLITE_CONTEXT_LAYER_IDS.labels,
      'text-opacity',
      visible
        ? Math.min(1, opacity * 1.08 * emergenceOpacity(scene, map, visibleTiers[0] ?? 'major'))
        : 0,
    );
  }
}

export function effectiveBroadcastRoadDensity(scene: MapScene, zoom: number): number {
  const requested = clamp(scene.display.roadDensity, 0, 100);
  if (contextMode(scene) === 'off' || scene.baseMap !== 'satellite') return requested;

  const detail = contextDetail(scene);
  let automatic = 25;
  if (detail === 'low') {
    automatic = zoom >= 12 ? 80 : zoom >= 8 ? 58 : zoom >= 6 ? 38 : 25;
  } else if (detail === 'high') {
    automatic = zoom >= 10 ? 100 : zoom >= 7 ? 86 : zoom >= 5 ? 58 : 32;
  } else {
    automatic = zoom >= 11 ? 96 : zoom >= 8 ? 72 : zoom >= 5.5 ? 46 : 28;
  }
  return Math.max(requested, automatic);
}
