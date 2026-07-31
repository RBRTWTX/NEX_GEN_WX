/**
 * Non-negotiable map draw order.
 * Roads remain under weather data. City labels and annotations remain above it.
 */
export const MAP_LAYER_ORDER = [
  'basemap',
  'terrain-or-satellite',
  'roads',
  'boundaries',
  'weather-data',
  'weather-graphics',
  'city-labels',
  'annotations',
] as const;

export type MapLayerSlot = (typeof MAP_LAYER_ORDER)[number];

export const layerOrderIndex = (slot: MapLayerSlot): number => MAP_LAYER_ORDER.indexOf(slot);
