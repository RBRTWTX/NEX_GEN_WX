export const TROPICAL_ARRIVAL_TIME_SOURCE_IDS = {
  probability: 'ngwx-tropical-arrival-probability-source',
  contours: 'ngwx-tropical-arrival-contours-source',
} as const;

export const TROPICAL_ARRIVAL_TIME_LAYER_IDS = [
  'ngwx-tropical-arrival-probability-fill',
  'ngwx-tropical-arrival-probability-outline',
  'ngwx-tropical-arrival-contour-casing',
  'ngwx-tropical-arrival-contour-line',
  'ngwx-tropical-arrival-contour-label',
] as const;

export const TROPICAL_ARRIVAL_TIME_LAYERS = {
  probabilityFill: TROPICAL_ARRIVAL_TIME_LAYER_IDS[0],
  probabilityOutline: TROPICAL_ARRIVAL_TIME_LAYER_IDS[1],
  contourCasing: TROPICAL_ARRIVAL_TIME_LAYER_IDS[2],
  contourLine: TROPICAL_ARRIVAL_TIME_LAYER_IDS[3],
  contourLabel: TROPICAL_ARRIVAL_TIME_LAYER_IDS[4],
} as const;
