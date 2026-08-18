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
