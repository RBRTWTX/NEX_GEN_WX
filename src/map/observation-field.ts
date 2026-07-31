import type {
  BBox,
  GeoJsonFeature,
  ObservationField,
  ObservationDisplaySettings,
  SurfaceObservationCollection,
} from '../types/domain';

interface RampStop {
  value: number;
  color: [number, number, number];
}

export interface ObservationFieldMeta {
  label: string;
  units: string;
  minimum: number;
  maximum: number;
  supportsField: boolean;
  ramp: RampStop[];
}

export interface RenderedObservationField {
  url: string;
  coordinates: [[number, number], [number, number], [number, number], [number, number]];
  minimum: number;
  maximum: number;
}

const TEMPERATURE_RAMP: RampStop[] = [
  { value: -40, color: [122, 49, 163] },
  { value: -20, color: [65, 89, 199] },
  { value: 0, color: [55, 150, 225] },
  { value: 20, color: [62, 201, 203] },
  { value: 40, color: [79, 190, 112] },
  { value: 60, color: [225, 215, 72] },
  { value: 75, color: [243, 154, 51] },
  { value: 90, color: [225, 70, 54] },
  { value: 105, color: [163, 38, 72] },
  { value: 120, color: [104, 26, 76] },
];

export const OBSERVATION_FIELD_META: Record<ObservationField, ObservationFieldMeta> = {
  tempF: { label: 'Temperature', units: '°F', minimum: -40, maximum: 120, supportsField: true, ramp: TEMPERATURE_RAMP },
  dewpointF: {
    label: 'Dew point', units: '°F', minimum: -10, maximum: 85, supportsField: true,
    ramp: [
      { value: -10, color: [132, 95, 171] }, { value: 10, color: [83, 133, 205] },
      { value: 30, color: [80, 178, 183] }, { value: 45, color: [77, 177, 114] },
      { value: 55, color: [152, 196, 78] }, { value: 65, color: [230, 202, 69] },
      { value: 72, color: [229, 135, 55] }, { value: 80, color: [190, 55, 70] },
      { value: 85, color: [122, 31, 82] },
    ],
  },
  relativeHumidity: {
    label: 'Relative humidity', units: '%', minimum: 0, maximum: 100, supportsField: true,
    ramp: [
      { value: 0, color: [163, 92, 55] }, { value: 20, color: [218, 160, 74] },
      { value: 40, color: [221, 213, 99] }, { value: 60, color: [99, 187, 122] },
      { value: 80, color: [66, 152, 190] }, { value: 100, color: [68, 74, 153] },
    ],
  },
  heatIndexF: {
    label: 'Heat index', units: '°F', minimum: 75, maximum: 135, supportsField: true,
    ramp: [
      { value: 75, color: [243, 215, 78] }, { value: 85, color: [245, 169, 55] },
      { value: 95, color: [232, 100, 46] }, { value: 105, color: [205, 51, 58] },
      { value: 115, color: [153, 36, 78] }, { value: 135, color: [85, 22, 65] },
    ],
  },
  windChillF: {
    label: 'Wind chill', units: '°F', minimum: -60, maximum: 55, supportsField: true,
    ramp: [
      { value: -60, color: [86, 30, 129] }, { value: -30, color: [65, 72, 184] },
      { value: 0, color: [54, 145, 218] }, { value: 20, color: [65, 192, 196] },
      { value: 40, color: [106, 188, 120] }, { value: 55, color: [220, 210, 80] },
    ],
  },
  windMph: {
    label: 'Wind speed', units: 'mph', minimum: 0, maximum: 65, supportsField: true,
    ramp: [
      { value: 0, color: [85, 142, 178] }, { value: 10, color: [73, 181, 161] },
      { value: 20, color: [175, 200, 88] }, { value: 30, color: [236, 175, 65] },
      { value: 45, color: [221, 91, 60] }, { value: 65, color: [151, 49, 94] },
    ],
  },
  gustMph: {
    label: 'Wind gust', units: 'mph', minimum: 0, maximum: 80, supportsField: true,
    ramp: [
      { value: 0, color: [85, 142, 178] }, { value: 15, color: [73, 181, 161] },
      { value: 30, color: [175, 200, 88] }, { value: 45, color: [236, 175, 65] },
      { value: 60, color: [221, 91, 60] }, { value: 80, color: [151, 49, 94] },
    ],
  },
  visibilityMi: {
    label: 'Visibility', units: 'mi', minimum: 0, maximum: 10, supportsField: false,
    ramp: [{ value: 0, color: [177, 54, 70] }, { value: 10, color: [85, 181, 132] }],
  },
  flightCategory: {
    label: 'Flight category', units: '', minimum: 0, maximum: 4, supportsField: false,
    ramp: [{ value: 0, color: [54, 176, 83] }, { value: 4, color: [195, 55, 175] }],
  },
};

function numericProperty(feature: GeoJsonFeature, key: string): number | null {
  const value = Number(feature.properties[key]);
  return Number.isFinite(value) ? value : null;
}

function interpolateColor(ramp: RampStop[], value: number): [number, number, number] {
  if (value <= ramp[0].value) return ramp[0].color;
  if (value >= ramp[ramp.length - 1].value) return ramp[ramp.length - 1].color;
  for (let index = 1; index < ramp.length; index += 1) {
    const right = ramp[index];
    const left = ramp[index - 1];
    if (value > right.value) continue;
    const factor = (value - left.value) / Math.max(0.0001, right.value - left.value);
    return [
      Math.round(left.color[0] + (right.color[0] - left.color[0]) * factor),
      Math.round(left.color[1] + (right.color[1] - left.color[1]) * factor),
      Math.round(left.color[2] + (right.color[2] - left.color[2]) * factor),
    ];
  }
  return ramp[ramp.length - 1].color;
}

export function fieldColor(field: ObservationField, value: number): string {
  const [red, green, blue] = interpolateColor(OBSERVATION_FIELD_META[field].ramp, value);
  return `rgb(${red}, ${green}, ${blue})`;
}

export function fieldGradient(field: ObservationField): string {
  const ramp = OBSERVATION_FIELD_META[field].ramp;
  const minimum = ramp[0].value;
  const range = Math.max(0.0001, ramp[ramp.length - 1].value - minimum);
  return `linear-gradient(90deg, ${ramp.map((stop) => {
    const percent = ((stop.value - minimum) / range) * 100;
    return `${fieldColor(field, stop.value)} ${percent.toFixed(1)}%`;
  }).join(', ')})`;
}

export function formatObservationValue(field: ObservationField, value: number | string): string {
  if (typeof value === 'string') return value || '--';
  if (!Number.isFinite(value)) return '--';
  const units = OBSERVATION_FIELD_META[field].units;
  if (units === '°F') return `${Math.round(value)}°`;
  if (units === '%') return `${Math.round(value)}%`;
  if (units === 'mi') return `${value < 3 ? value.toFixed(1) : Math.round(value)} mi`;
  return `${Math.round(value)}${units ? ` ${units}` : ''}`;
}

function transparentPng(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 2;
  return canvas.toDataURL('image/png');
}

export const TRANSPARENT_FIELD_IMAGE = transparentPng();

function imageCoordinates(bbox: BBox): [[number, number], [number, number], [number, number], [number, number]] {
  return [
    [bbox.west, bbox.north],
    [bbox.east, bbox.north],
    [bbox.east, bbox.south],
    [bbox.west, bbox.south],
  ];
}

export function renderObservationField(
  data: SurfaceObservationCollection,
  settings: ObservationDisplaySettings,
): RenderedObservationField | null {
  const meta = OBSERVATION_FIELD_META[settings.field];
  const { columns, rows, bbox } = data.grid;
  if (!settings.showField || !meta.supportsField || columns < 1 || rows < 1 || data.analysisFeatures.length === 0) {
    return null;
  }
  const base = document.createElement('canvas');
  base.width = columns;
  base.height = rows;
  const context = base.getContext('2d');
  if (!context) return null;
  const image = context.createImageData(columns, rows);
  for (const feature of data.analysisFeatures) {
    const row = numericProperty(feature, 'gridRow');
    const column = numericProperty(feature, 'gridColumn');
    const value = numericProperty(feature, 'fieldValue');
    const coverage = numericProperty(feature, 'coverage') ?? 0;
    if (row == null || column == null || value == null) continue;
    const integerRow = Math.round(row);
    const integerColumn = Math.round(column);
    if (integerRow < 0 || integerRow >= rows || integerColumn < 0 || integerColumn >= columns) continue;
    const [red, green, blue] = interpolateColor(meta.ramp, value);
    const index = (integerRow * columns + integerColumn) * 4;
    image.data[index] = red;
    image.data[index + 1] = green;
    image.data[index + 2] = blue;
    image.data[index + 3] = Math.round(255 * Math.max(0.18, Math.min(1, coverage)));
  }
  context.putImageData(image, 0, 0);

  const scale = settings.smoothing === 'sharp' ? 2 : settings.smoothing === 'smooth' ? 6 : 4;
  const rendered = document.createElement('canvas');
  rendered.width = columns * scale;
  rendered.height = rows * scale;
  const renderedContext = rendered.getContext('2d');
  if (!renderedContext) return null;
  renderedContext.imageSmoothingEnabled = settings.smoothing !== 'sharp';
  renderedContext.imageSmoothingQuality = settings.smoothing === 'smooth' ? 'high' : 'medium';
  renderedContext.drawImage(base, 0, 0, rendered.width, rendered.height);
  return {
    url: rendered.toDataURL('image/png'),
    coordinates: imageCoordinates(bbox),
    minimum: meta.minimum,
    maximum: meta.maximum,
  };
}

export function nearestAnalysisValue(
  data: SurfaceObservationCollection | null,
  longitude: number,
  latitude: number,
): { value: number; distanceSquared: number } | null {
  if (!data) return null;
  let best: { value: number; distanceSquared: number } | null = null;
  for (const feature of data.analysisFeatures) {
    const coordinates = feature.geometry?.coordinates;
    const value = numericProperty(feature, 'fieldValue');
    if (!Array.isArray(coordinates) || typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number' || value == null) continue;
    const longitudeScale = Math.cos(latitude * Math.PI / 180);
    const dx = (coordinates[0] - longitude) * longitudeScale;
    const dy = coordinates[1] - latitude;
    const distanceSquared = dx * dx + dy * dy;
    if (!best || distanceSquared < best.distanceSquared) best = { value, distanceSquared };
  }
  return best;
}
