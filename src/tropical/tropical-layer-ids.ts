export const TROPICAL_SOURCE_IDS = {
  cone: 'ngwx-tropical-cone-source',
  track: 'ngwx-tropical-track-source',
  warnings: 'ngwx-tropical-warnings-source',
  points: 'ngwx-tropical-points-source',
} as const;

export const TROPICAL_TRACK_LAYER_IDS = [
  'ngwx-tropical-cone-fill',
  'ngwx-tropical-cone-outline',
  'ngwx-tropical-track-casing',
  'ngwx-tropical-track-line',
  'ngwx-tropical-warning-line',
  'ngwx-tropical-point-circle',
  'ngwx-tropical-point-label',
] as const;

export const TROPICAL_OUTLOOK_SOURCE_IDS = {
  locations: 'ngwx-tropical-outlook-locations-source',
  regions: 'ngwx-tropical-outlook-regions-source',
  motion: 'ngwx-tropical-outlook-motion-source',
} as const;

export const TROPICAL_OUTLOOK_LAYER_IDS = [
  'ngwx-tropical-outlook-region-fill',
  'ngwx-tropical-outlook-region-outline',
  'ngwx-tropical-outlook-motion-casing',
  'ngwx-tropical-outlook-motion-line',
  'ngwx-tropical-outlook-region-probability',
  'ngwx-tropical-outlook-location-circle',
  'ngwx-tropical-outlook-location-x',
  'ngwx-tropical-outlook-location-probability',
] as const;

export const TROPICAL_LAYER_IDS = TROPICAL_TRACK_LAYER_IDS;

export const TROPICAL_LAYERS = {
  coneFill: TROPICAL_TRACK_LAYER_IDS[0],
  coneOutline: TROPICAL_TRACK_LAYER_IDS[1],
  trackCasing: TROPICAL_TRACK_LAYER_IDS[2],
  trackLine: TROPICAL_TRACK_LAYER_IDS[3],
  warningLine: TROPICAL_TRACK_LAYER_IDS[4],
  pointCircle: TROPICAL_TRACK_LAYER_IDS[5],
  pointLabel: TROPICAL_TRACK_LAYER_IDS[6],
} as const;

export const TROPICAL_OUTLOOK_LAYERS = {
  regionFill: TROPICAL_OUTLOOK_LAYER_IDS[0],
  regionOutline: TROPICAL_OUTLOOK_LAYER_IDS[1],
  motionCasing: TROPICAL_OUTLOOK_LAYER_IDS[2],
  motionLine: TROPICAL_OUTLOOK_LAYER_IDS[3],
  regionProbability: TROPICAL_OUTLOOK_LAYER_IDS[4],
  locationCircle: TROPICAL_OUTLOOK_LAYER_IDS[5],
  locationX: TROPICAL_OUTLOOK_LAYER_IDS[6],
  locationProbability: TROPICAL_OUTLOOK_LAYER_IDS[7],
} as const;
