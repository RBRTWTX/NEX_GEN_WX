import type { StyleSpecification } from 'maplibre-gl';
import type { BaseMapKind } from '../types/domain';

export type BasemapStyle = StyleSpecification | string;

const OPENFREE_STYLES: Record<'gray' | 'dark', string> = {
  gray: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

const OSM_TILES = ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'];
const WORLD_IMAGERY_TILES = [
  'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
];

function satelliteStyle(): StyleSpecification {
  return {
    version: 8,
    name: 'NEX GEN WX satellite basemap',
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      'nexgen-world-imagery': {
        type: 'raster',
        tiles: WORLD_IMAGERY_TILES,
        tileSize: 256,
        minzoom: 0,
        maxzoom: 19,
        attribution: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      },
    },
    layers: [
      {
        id: 'nexgen-satellite-background',
        type: 'background',
        paint: { 'background-color': '#0a1119' },
      },
      {
        id: 'nexgen-world-imagery',
        type: 'raster',
        source: 'nexgen-world-imagery',
        paint: {
          'raster-opacity': 1,
          'raster-fade-duration': 0,
          'raster-resampling': 'linear',
        },
      },
    ],
  };
}

function rasterFallbackStyle(kind: Exclude<BaseMapKind, 'satellite'>): StyleSpecification {
  const dark = kind === 'dark';
  return {
    version: 8,
    name: `NEX GEN WX ${kind} fallback basemap`,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      'nexgen-osm-fallback': {
        type: 'raster',
        tiles: OSM_TILES,
        tileSize: 256,
        maxzoom: 19,
        attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [
      {
        id: 'nexgen-fallback-background',
        type: 'background',
        paint: { 'background-color': dark ? '#111820' : '#b9bdc1' },
      },
      {
        id: 'nexgen-osm-fallback',
        type: 'raster',
        source: 'nexgen-osm-fallback',
        paint: {
          'raster-opacity': 1,
          'raster-saturation': dark ? -0.9 : -0.82,
          'raster-contrast': dark ? 0.3 : 0.06,
          'raster-brightness-min': dark ? 0.08 : 0.28,
          'raster-brightness-max': dark ? 0.55 : 0.96,
        },
      },
    ],
  };
}

/**
 * Standard and dark maps use OpenFreeMap vector styles so road hierarchy,
 * route shields and road labels remain independently controllable. Satellite
 * is real Esri World Imagery rather than a recolored street map.
 */
export function createBasemapStyle(kind: BaseMapKind): BasemapStyle {
  if (kind === 'satellite') return satelliteStyle();
  return OPENFREE_STYLES[kind];
}

/**
 * If a remote vector style cannot initialize, retain the 0.6.1 isolation rule:
 * fall back to a complete raster style so the map shell and weather providers
 * remain usable instead of leaving the stage blank.
 */
export function createBasemapFallbackStyle(kind: BaseMapKind): StyleSpecification {
  if (kind === 'satellite') return satelliteStyle();
  return rasterFallbackStyle(kind);
}
