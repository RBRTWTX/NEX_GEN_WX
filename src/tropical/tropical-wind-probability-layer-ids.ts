export const TROPICAL_WIND_PROBABILITY_SOURCE_IDS = {
  probabilities: 'ngwx-tropical-wind-probability-source',
} as const;

export const TROPICAL_WIND_PROBABILITY_LAYER_IDS = [
  'ngwx-tropical-wind-probability-fill',
  'ngwx-tropical-wind-probability-outline',
  'ngwx-tropical-wind-probability-label',
] as const;

export const TROPICAL_WIND_PROBABILITY_LAYERS = {
  fill: TROPICAL_WIND_PROBABILITY_LAYER_IDS[0],
  outline: TROPICAL_WIND_PROBABILITY_LAYER_IDS[1],
  label: TROPICAL_WIND_PROBABILITY_LAYER_IDS[2],
} as const;
