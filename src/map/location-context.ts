import type { Map as MapLibreMap } from 'maplibre-gl';
import type { MapScene } from '../types/domain';
import { LAYER_IDS } from './map-runtime';

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function cityRankLimit(zoom: number, density: number): number {
  const base = zoom < 4
    ? 18
    : zoom < 5
      ? 38
      : zoom < 6.5
        ? 82
        : zoom < 8
          ? 170
          : zoom < 10
            ? 340
            : 700;
  const normalized = clamp(density, 0, 100) / 100;
  const factor = 0.06 + Math.pow(normalized, 1.45) * 0.94;
  return Math.max(4, Math.round(base * factor));
}

function cityLabelPadding(density: number): number {
  const normalized = clamp(density, 0, 100) / 100;
  return 14 - normalized * 11;
}

function countyMinimumZoom(scene: MapScene): number {
  const mode = scene.display.contextMode ?? 'auto';
  const detail = scene.display.contextDetail ?? 'broadcast';
  if (mode === 'off') return 4;
  if (detail === 'low') return 5.2;
  if (detail === 'high') return 3.8;
  return 4.35;
}

function countyOpacity(scene: MapScene, zoom: number): number {
  const mode = scene.display.contextMode ?? 'auto';
  const contextOpacity = clamp(scene.display.contextOpacity ?? 72, 0, 100) / 100;
  const productFactor = mode === 'auto'
    ? scene.product.category === 'radar'
      ? 1
      : scene.product.category === 'rainfall'
        ? 0.9
        : 0.78
    : 1;
  const zoomFactor = zoom < 5
    ? 0.38
    : zoom < 7
      ? 0.52
      : zoom < 9
        ? 0.68
        : zoom < 11
          ? 0.78
          : 0.86;
  // Context Off disables the extra road pass, but an explicitly enabled County
  // layer remains usable as a conventional location-reference overlay.
  const modeFactor = mode === 'off' ? 0.78 : contextOpacity;
  return clamp(zoomFactor * productFactor * modeFactor, 0.18, 0.88);
}

function countyWidth(scene: MapScene, zoom: number): number {
  const weight = clamp(scene.display.boundaryWeight, 50, 180) / 100;
  const base = zoom < 6 ? 0.55 : zoom < 9 ? 0.9 : zoom < 12 ? 1.2 : 1.5;
  return base * weight;
}

function countyCasingWidth(scene: MapScene, zoom: number): number {
  return countyWidth(scene, zoom) + (zoom < 8 ? 1.15 : 1.5);
}

export function applyLocationContext(map: MapLibreMap, scene: MapScene): void {
  const zoom = map.getZoom();

  const cityLimit = cityRankLimit(zoom, scene.display.cityDensity);
  const cityFilter: unknown[] = [
    '<',
    ['coalesce', ['get', 'labelRank'], 999999],
    cityLimit,
  ];
  if (map.getLayer(LAYER_IDS.cityDots)) {
    map.setFilter(LAYER_IDS.cityDots, cityFilter as never);
  }
  if (map.getLayer(LAYER_IDS.cityLabels)) {
    map.setFilter(LAYER_IDS.cityLabels, cityFilter as never);
    map.setLayoutProperty(
      LAYER_IDS.cityLabels,
      'text-padding',
      cityLabelPadding(scene.display.cityDensity),
    );
  }

  const countiesVisible = scene.overlays.counties && zoom >= countyMinimumZoom(scene);
  const innerOpacity = countiesVisible ? countyOpacity(scene, zoom) : 0;

  if (map.getLayer(LAYER_IDS.countyCasing)) {
    map.setLayoutProperty(
      LAYER_IDS.countyCasing,
      'visibility',
      countiesVisible ? 'visible' : 'none',
    );
    map.setPaintProperty(
      LAYER_IDS.countyCasing,
      'line-opacity',
      countiesVisible ? Math.min(0.72, innerOpacity * 0.72) : 0,
    );
    map.setPaintProperty(
      LAYER_IDS.countyCasing,
      'line-width',
      countyCasingWidth(scene, zoom),
    );
  }

  if (map.getLayer(LAYER_IDS.countyLines)) {
    map.setLayoutProperty(
      LAYER_IDS.countyLines,
      'visibility',
      countiesVisible ? 'visible' : 'none',
    );
    map.setPaintProperty(
      LAYER_IDS.countyLines,
      'line-opacity',
      innerOpacity,
    );
    map.setPaintProperty(
      LAYER_IDS.countyLines,
      'line-width',
      countyWidth(scene, zoom),
    );
  }
}
