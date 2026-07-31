import type { GeoJsonFeature, ObservationSummary } from '../types/domain';

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function nullableNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function summarizeObservation(feature: GeoJsonFeature): ObservationSummary | null {
  const coordinates = feature.geometry?.coordinates;
  if (!Array.isArray(coordinates) || typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number') {
    return null;
  }
  const properties = feature.properties ?? {};
  const station = text(properties.station);
  if (!station) return null;
  return {
    id: String(feature.id ?? station),
    station,
    observed: text(properties.observed),
    raw: text(properties.raw),
    tempF: nullableNumber(properties.tempF),
    dewpointF: nullableNumber(properties.dewpointF),
    relativeHumidity: nullableNumber(properties.relativeHumidity),
    heatIndexF: nullableNumber(properties.heatIndexF),
    windChillF: nullableNumber(properties.windChillF),
    windMph: nullableNumber(properties.windMph),
    gustMph: nullableNumber(properties.gustMph),
    windDirection: nullableNumber(properties.windDirection),
    visibilityMi: nullableNumber(properties.visibilityMi),
    altimeterInHg: nullableNumber(properties.altimeterInHg),
    weather: text(properties.weather),
    flightCategory: text(properties.flightCategory),
    coordinate: [coordinates[0], coordinates[1]],
  };
}
