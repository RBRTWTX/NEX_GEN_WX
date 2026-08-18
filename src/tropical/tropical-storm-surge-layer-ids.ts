export const TROPICAL_STORM_SURGE_SOURCE_IDS = {
  potentialRaster: 'ngwx-tropical-surge-potential-raster-source',
  peakPoints: 'ngwx-tropical-surge-peak-points-source',
  peakLines: 'ngwx-tropical-surge-peak-lines-source',
  peakPolygons: 'ngwx-tropical-surge-peak-polygons-source',
} as const;

export const TROPICAL_STORM_SURGE_LAYER_IDS = [
  'ngwx-tropical-surge-potential-raster',
  'ngwx-tropical-surge-peak-polygon-fill',
  'ngwx-tropical-surge-peak-polygon-outline',
  'ngwx-tropical-surge-peak-line',
  'ngwx-tropical-surge-peak-point',
  'ngwx-tropical-surge-peak-polygon-label',
  'ngwx-tropical-surge-peak-line-label',
  'ngwx-tropical-surge-peak-point-label',
] as const;

export const TROPICAL_STORM_SURGE_LAYERS = {
  potentialRaster: TROPICAL_STORM_SURGE_LAYER_IDS[0],
  peakPolygonFill: TROPICAL_STORM_SURGE_LAYER_IDS[1],
  peakPolygonOutline: TROPICAL_STORM_SURGE_LAYER_IDS[2],
  peakLine: TROPICAL_STORM_SURGE_LAYER_IDS[3],
  peakPoint: TROPICAL_STORM_SURGE_LAYER_IDS[4],
  peakPolygonLabel: TROPICAL_STORM_SURGE_LAYER_IDS[5],
  peakLineLabel: TROPICAL_STORM_SURGE_LAYER_IDS[6],
  peakPointLabel: TROPICAL_STORM_SURGE_LAYER_IDS[7],
} as const;
