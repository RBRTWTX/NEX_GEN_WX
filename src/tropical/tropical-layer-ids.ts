export const TROPICAL_SOURCE_IDS = {
  cone: 'ngwx-tropical-cone-source',
  track: 'ngwx-tropical-track-source',
  warnings: 'ngwx-tropical-warnings-source',
  points: 'ngwx-tropical-points-source',
} as const;

export const TROPICAL_LAYER_IDS = [
  'ngwx-tropical-cone-fill',
  'ngwx-tropical-cone-outline',
  'ngwx-tropical-track-casing',
  'ngwx-tropical-track-line',
  'ngwx-tropical-warning-line',
  'ngwx-tropical-point-circle',
  'ngwx-tropical-point-label',
] as const;

export const TROPICAL_LAYERS = {
  coneFill: TROPICAL_LAYER_IDS[0],
  coneOutline: TROPICAL_LAYER_IDS[1],
  trackCasing: TROPICAL_LAYER_IDS[2],
  trackLine: TROPICAL_LAYER_IDS[3],
  warningLine: TROPICAL_LAYER_IDS[4],
  pointCircle: TROPICAL_LAYER_IDS[5],
  pointLabel: TROPICAL_LAYER_IDS[6],
} as const;
