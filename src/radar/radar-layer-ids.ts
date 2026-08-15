export const RADAR_SOURCE_PREFIX = 'studio-radar-source';
export const RADAR_LAYER_PREFIX = 'studio-radar-layer';
export const MAX_RADAR_RENDER_LAYERS = 3;

export function radarSourceId(index: number): string {
  return `${RADAR_SOURCE_PREFIX}-${index}`;
}

export function radarLayerId(index: number): string {
  return `${RADAR_LAYER_PREFIX}-${index}`;
}

export const RADAR_LAYER_IDS = Array.from(
  { length: MAX_RADAR_RENDER_LAYERS },
  (_, index) => radarLayerId(index),
);
