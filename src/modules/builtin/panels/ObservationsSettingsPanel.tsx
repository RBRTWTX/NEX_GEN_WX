import type { ObservationDisplayMode, ObservationField } from '../../../types/domain';
import type { ModuleSettingsPanelProps } from '../../../types/module';
import { SettingsCheck, SettingsSlider } from '../ui/SettingsControls';

export function ObservationsSettingsPanel({ scene, dispatch }: ModuleSettingsPanelProps) {
  if (scene.kind !== 'map') return null;
  const update = (key: keyof typeof scene.observations, value: (typeof scene.observations)[keyof typeof scene.observations]) => {
    dispatch({ type: 'scene/set-observation-display', sceneId: scene.id, key, value });
  };
  return (
    <div className="settings-section">
      <h3>Surface Observations</h3>
      <SettingsCheck label="Show observation layer" checked={scene.overlays.observations} onChange={(value) => dispatch({ type: 'scene/set-overlay', sceneId: scene.id, overlay: 'observations', value })} />
      <label>Field
        <select value={scene.observations.field} onChange={(event) => update('field', event.currentTarget.value as ObservationField)}>
          <option value="tempF">Temperature</option><option value="dewpointF">Dew point</option><option value="relativeHumidity">Relative humidity</option><option value="heatIndexF">Heat index</option><option value="windChillF">Wind chill</option><option value="windMph">Wind</option><option value="gustMph">Wind gust</option><option value="visibilityMi">Visibility</option><option value="flightCategory">Flight category</option>
        </select>
      </label>
      <label>Display mode
        <select value={scene.observations.displayMode} onChange={(event) => update('displayMode', event.currentTarget.value as ObservationDisplayMode)}>
          <option value="broadcast">Broadcast</option><option value="standard">Standard</option><option value="detailed">Detailed</option>
        </select>
      </label>
      <SettingsCheck label="Show analyzed field" checked={scene.observations.showField} onChange={(value) => update('showField', value)} />
      <SettingsCheck label="Show stations" checked={scene.observations.showStations} onChange={(value) => update('showStations', value)} />
      <SettingsCheck label="Show station identifiers" checked={scene.observations.showStationIds} onChange={(value) => update('showStationIds', value)} />
      <SettingsSlider label="Station density" value={scene.observations.density} min={10} max={100} onChange={(value) => update('density', value)} suffix="%" />
      <SettingsSlider label="Label scale" value={scene.observations.labelScale} min={60} max={180} onChange={(value) => update('labelScale', value)} suffix="%" />
      <SettingsSlider label="Field opacity" value={scene.observations.fieldOpacity} min={0} max={100} onChange={(value) => update('fieldOpacity', value)} suffix="%" />
    </div>
  );
}
