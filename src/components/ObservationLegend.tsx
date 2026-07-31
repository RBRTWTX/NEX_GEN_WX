import { fieldGradient, OBSERVATION_FIELD_META } from '../map/observation-field';
import type { ObservationDisplaySettings } from '../types/domain';
import { SceneObject } from '../scene-editing/SceneObject';

function legendValue(value: number, units: string): string {
  if (units === '°F') return `${Math.round(value)}°`;
  if (units === '%') return `${Math.round(value)}%`;
  return `${Math.round(value)}${units ? ` ${units}` : ''}`;
}

export function ObservationLegend({ settings }: { settings: ObservationDisplaySettings }) {
  const meta = OBSERVATION_FIELD_META[settings.field];
  if (!settings.showField || !meta.supportsField) return null;
  const range = meta.maximum - meta.minimum;
  const values = Array.from({ length: 5 }, (_, index) => meta.minimum + range * index / 4);
  return (
    <SceneObject as="aside" elementId="map.observation.legend" label="Observation legend" kind="legend" className="observation-legend">
      <strong>{meta.label}</strong>
      <div className="observation-legend__ramp" style={{ background: fieldGradient(settings.field) }} />
      <div className="observation-legend__labels">
        {values.map((value) => <span key={value}>{legendValue(value, meta.units)}</span>)}
      </div>
      <small>Surface observation analysis</small>
    </SceneObject>
  );
}
