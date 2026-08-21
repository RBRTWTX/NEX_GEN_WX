import type { MapScene } from '../types/domain';

export interface ProductLegendSegment {
  label: string;
  color: string;
}

export interface DiscreteProductLegend {
  mode: 'discrete';
  id: string;
  title: string;
  segments: readonly ProductLegendSegment[];
}

export interface HiddenProductLegend {
  mode: 'none';
  id: string;
  reason: string;
}

export type ProductLegendSpec = DiscreteProductLegend | HiddenProductLegend;

const NHC_WIND_PROBABILITY_SEGMENTS = [
  { label: '5–10', color: '#267300' },
  { label: '10–20', color: '#38a800' },
  { label: '20–30', color: '#55ff00' },
  { label: '30–40', color: '#e6e600' },
  { label: '40–50', color: '#ffd37f' },
  { label: '50–60', color: '#e69800' },
  { label: '60–70', color: '#ffaa00' },
  { label: '70–80', color: '#e60000' },
  { label: '80–90', color: '#a83800' },
  { label: '>90%', color: '#a900e6' },
] as const;

const NHC_OUTLOOK_SEGMENTS = [
  { label: 'LOW ≤30%', color: '#f1c84b' },
  { label: 'MED 40–60%', color: '#e69800' },
  { label: 'HIGH ≥70%', color: '#e60000' },
] as const;


const NHC_POTENTIAL_SURGE_SEGMENTS = [
  { label: '>1 FT', color: '#005ce6' },
  { label: '>3 FT', color: '#ffff00' },
  { label: '>6 FT', color: '#ffaa00' },
  { label: '>9 FT', color: '#ff0000' },
] as const;

const NHC_PEAK_SURGE_SEGMENTS = [
  { label: 'UP TO 3 FT', color: '#005ce6' },
  { label: 'UP TO 6 FT', color: '#ffff00' },
  { label: 'UP TO 9 FT', color: '#ffaa00' },
  { label: 'UP TO 12 FT', color: '#ff0000' },
  { label: 'ABOVE 12 FT', color: '#c500ff' },
] as const;


const MODEL_REFLECTIVITY_SEGMENTS = [
  { label: '5', color: '#2ea838' },
  { label: '20', color: '#33ed57' },
  { label: '30', color: '#fae80d' },
  { label: '40', color: '#ff8005' },
  { label: '50', color: '#f0170f' },
  { label: '60', color: '#940061' },
  { label: '70', color: '#ff33db' },
  { label: '80 dBZ', color: '#ffffff' },
] as const;

const MODEL_TEMPERATURE_SEGMENTS = [
  { label: '-40', color: '#e066db' },
  { label: '-10', color: '#6e2ed1' },
  { label: '10', color: '#1a63db' },
  { label: '32', color: '#00b8e3' },
  { label: '50', color: '#21ab61' },
  { label: '70', color: '#cceb29' },
  { label: '85', color: '#ffa30f' },
  { label: '100', color: '#f2291f' },
  { label: '115°F', color: '#e80094' },
] as const;

const MODEL_DEWPOINT_SEGMENTS = [
  { label: '-10', color: '#7a4a21' },
  { label: '20', color: '#b78b4f' },
  { label: '40', color: '#e9df63' },
  { label: '55', color: '#59c65c' },
  { label: '65', color: '#00b59f' },
  { label: '75', color: '#2782c8' },
  { label: '80°F', color: '#7b4bc4' },
] as const;

const MODEL_RELATIVE_HUMIDITY_SEGMENTS = [
  { label: '10', color: '#a64b29' },
  { label: '20', color: '#dc8c40' },
  { label: '30', color: '#eed45c' },
  { label: '50', color: '#78c75c' },
  { label: '70', color: '#33b8a6' },
  { label: '85', color: '#3d8ed1' },
  { label: '100%', color: '#704cc7' },
] as const;

const MODEL_WIND_GUST_SEGMENTS = [
  { label: '0', color: '#4a6b8a' },
  { label: '15', color: '#3daf69' },
  { label: '25', color: '#d6db42' },
  { label: '35', color: '#f2a33b' },
  { label: '50', color: '#e84a40' },
  { label: '65', color: '#c33d99' },
  { label: '80 mph', color: '#7a4fb5' },
] as const;

const PRODUCT_LEGENDS: Record<string, ProductLegendSpec> = {
  'nhc-wind-prob-34kt': {
    mode: 'discrete',
    id: 'nhc-wind-probability',
    title: 'WIND PROBABILITY (%)',
    segments: NHC_WIND_PROBABILITY_SEGMENTS,
  },
  'nhc-wind-prob-50kt': {
    mode: 'discrete',
    id: 'nhc-wind-probability',
    title: 'WIND PROBABILITY (%)',
    segments: NHC_WIND_PROBABILITY_SEGMENTS,
  },
  'nhc-wind-prob-64kt': {
    mode: 'discrete',
    id: 'nhc-wind-probability',
    title: 'WIND PROBABILITY (%)',
    segments: NHC_WIND_PROBABILITY_SEGMENTS,
  },
  'nhc-outlook-2day': {
    mode: 'discrete',
    id: 'nhc-tropical-outlook',
    title: 'FORMATION CHANCE',
    segments: NHC_OUTLOOK_SEGMENTS,
  },
  'nhc-outlook-7day': {
    mode: 'discrete',
    id: 'nhc-tropical-outlook',
    title: 'FORMATION CHANCE',
    segments: NHC_OUTLOOK_SEGMENTS,
  },
  'nhc-surge-inundation': {
    mode: 'discrete',
    id: 'nhc-potential-storm-surge',
    title: 'POTENTIAL INUNDATION ABOVE GROUND',
    segments: NHC_POTENTIAL_SURGE_SEGMENTS,
  },
  'nhc-peak-storm-surge': {
    mode: 'discrete',
    id: 'nhc-peak-storm-surge',
    title: 'PEAK SURGE ABOVE GROUND',
    segments: NHC_PEAK_SURGE_SEGMENTS,
  },
};

const SCENE_LEGEND_OVERRIDES: Record<string, HiddenProductLegend> = {
  'visible-satellite': {
    mode: 'none',
    id: 'visible-satellite-no-key',
    reason: 'Visible satellite imagery does not use a scalar color key.',
  },
  'spc-md-national': {
    mode: 'none',
    id: 'spc-md-no-key',
    reason: 'Mesoscale Discussion polygons are categorical discussion areas, not a low-to-high field.',
  },
  'active-alerts-ewx': {
    mode: 'none',
    id: 'active-alerts-no-key',
    reason: 'Active weather alerts use event-specific polygon colors rather than one scalar key.',
  },
  'national-air-quality-ozone': {
    mode: 'none',
    id: 'national-air-quality-ozone-no-key',
    reason: 'National Ozone Forecast does not yet have a verified dataset-specific legend; suppress the generic placeholder key.',
  },
  'national-air-quality-smoke': {
    mode: 'none',
    id: 'national-air-quality-smoke-no-key',
    reason: 'National Surface Smoke does not yet have a verified dataset-specific legend; suppress the generic placeholder key.',
  },
  'national-forecast-day1': {
    mode: 'none',
    id: 'national-forecast-chart-no-key',
    reason: 'The national forecast chart contains multiple symbol types and does not use one scalar key.',
  },
  'national-fronts-day1': {
    mode: 'none',
    id: 'forecast-fronts-no-key',
    reason: 'Fronts and pressure symbols do not use one scalar key.',
  },
  'nhc-track-cone': {
    mode: 'none',
    id: 'nhc-track-cone-no-key',
    reason: 'Track, cone, forecast points, and watches/warnings are categorical graphics.',
  },
};

export function productLegendForScene(scene: MapScene): ProductLegendSpec | null {
  if (scene.category === 'Models') {
    const modelState = scene.moduleState?.models as Record<string, unknown> | undefined;
    switch (modelState?.field) {
      case 'composite-reflectivity':
        return {
          mode: 'discrete',
          id: 'hrrr-composite-reflectivity',
          title: 'COMPOSITE REFLECTIVITY (dBZ)',
          segments: MODEL_REFLECTIVITY_SEGMENTS,
        };
      case 'dewpoint-2m':
        return {
          mode: 'discrete',
          id: 'hrrr-dewpoint-2m',
          title: '2 M DEW POINT (°F)',
          segments: MODEL_DEWPOINT_SEGMENTS,
        };
      case 'relative-humidity-2m':
        return {
          mode: 'discrete',
          id: 'hrrr-relative-humidity-2m',
          title: '2 M RELATIVE HUMIDITY (%)',
          segments: MODEL_RELATIVE_HUMIDITY_SEGMENTS,
        };
      case 'wind-gust-surface':
        return {
          mode: 'discrete',
          id: 'hrrr-wind-gust-surface',
          title: 'SURFACE WIND GUST (mph)',
          segments: MODEL_WIND_GUST_SEGMENTS,
        };
      case 'temperature-2m':
      default:
        return {
          mode: 'discrete',
          id: 'hrrr-temperature-2m',
          title: '2 M TEMPERATURE (°F)',
          segments: MODEL_TEMPERATURE_SEGMENTS,
        };
    }
  }

  const sceneOverride = SCENE_LEGEND_OVERRIDES[scene.id];
  if (sceneOverride) return sceneOverride;

  if (scene.product.id === 'nhc-arrival-earliest' || scene.product.id === 'nhc-arrival-most-likely') {
    const arrivalState = scene.moduleState?.['tropical-arrival-time'] as Record<string, unknown> | undefined;
    if (arrivalState?.showWindProbability === false) {
      return {
        mode: 'none',
        id: 'nhc-arrival-time-direct-labels',
        reason: 'NHC arrival times are labeled directly on the contour lines when the probability background is hidden.',
      };
    }
    return {
      mode: 'discrete',
      id: 'nhc-arrival-34kt-probability',
      title: '34-KT WIND PROBABILITY (%)',
      segments: NHC_WIND_PROBABILITY_SEGMENTS,
    };
  }

  const productLegend = PRODUCT_LEGENDS[scene.product.id];
  if (productLegend) return productLegend;

  if (scene.header.legend.kind === 'custom' && scene.category !== 'Custom') {
    return {
      mode: 'none',
      id: 'unverified-operational-custom-key',
      reason: 'Unverified operational placeholder keys are hidden until a product-specific legend is registered.',
    };
  }

  return null;
}
