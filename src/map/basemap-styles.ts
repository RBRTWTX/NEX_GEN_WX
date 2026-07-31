import type { StyleSpecification } from 'maplibre-gl';
import type { BaseMapKind } from '../types/domain';

const OSM_TILES = ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'];

interface RasterPaint {
  'raster-opacity': number;
  'raster-saturation': number;
  'raster-contrast': number;
  'raster-brightness-min': number;
  'raster-brightness-max': number;
}

function rasterPaint(kind: BaseMapKind): RasterPaint {
  if (kind === 'dark') {
    return {
      'raster-opacity': 1,
      'raster-saturation': -0.9,
      'raster-contrast': 0.3,
      'raster-brightness-min': 0.08,
      'raster-brightness-max': 0.55,
    };
  }
  if (kind === 'satellite') {
    // Satellite imagery is owned by the satellite module. Until that module is active,
    // keep a neutral geographic basemap rather than presenting placeholder imagery.
    return {
      'raster-opacity': 1,
      'raster-saturation': -0.15,
      'raster-contrast': 0.08,
      'raster-brightness-min': 0.18,
      'raster-brightness-max': 0.92,
    };
  }
  return {
    'raster-opacity': 1,
    'raster-saturation': -0.82,
    'raster-contrast': 0.06,
    'raster-brightness-min': 0.28,
    'raster-brightness-max': 0.96,
  };
}

/**
 * A complete local style document keeps MapLibre's lifecycle independent from
 * optional remote style JSON. The only remote requests are ordinary raster
 * tiles, so a Census, NWS, or style-provider failure cannot blank the map.
 */
export function createBasemapStyle(kind: BaseMapKind): StyleSpecification {
  return {
    version: 8,
    name: `NEX GEN WX ${kind} basemap`,
    sources: {
      'nexgen-osm': {
        type: 'raster',
        tiles: OSM_TILES,
        tileSize: 256,
        maxzoom: 19,
        attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [
      {
        id: 'nexgen-background',
        type: 'background',
        paint: { 'background-color': kind === 'dark' ? '#111820' : '#b9bdc1' },
      },
      {
        id: 'nexgen-osm-raster',
        type: 'raster',
        source: 'nexgen-osm',
        paint: rasterPaint(kind),
      },
    ],
  };
}
