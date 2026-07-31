import type { AlertDisplaySettings } from '../../../types/domain';
import type { ModuleSettingsPanelProps } from '../../../types/module';
import { SettingsCheck } from '../ui/SettingsControls';

export function AlertsSettingsPanel({ scene, dispatch }: ModuleSettingsPanelProps) {
  if (scene.kind !== 'map') return null;
  return (
    <div className="settings-section">
      <h3>NWS Alerts</h3>
      <SettingsCheck label="Show alert polygons" checked={scene.overlays.alerts} onChange={(value) => dispatch({ type: 'scene/set-overlay', sceneId: scene.id, overlay: 'alerts', value })} />
      <SettingsCheck label="Polygon fill" checked={scene.alerts.showFill} onChange={(value) => dispatch({ type: 'scene/set-alert-display', sceneId: scene.id, key: 'showFill', value })} />
      <SettingsCheck label="Polygon outline" checked={scene.alerts.showOutline} onChange={(value) => dispatch({ type: 'scene/set-alert-display', sceneId: scene.id, key: 'showOutline', value })} />
      <SettingsCheck label="Zoom to selected alert" checked={scene.alerts.autoZoomOnSelect} onChange={(value) => dispatch({ type: 'scene/set-alert-display', sceneId: scene.id, key: 'autoZoomOnSelect', value })} />
      <label>Minimum severity
        <select value={scene.alerts.minimumSeverity} onChange={(event) => dispatch({
          type: 'scene/set-alert-display',
          sceneId: scene.id,
          key: 'minimumSeverity',
          value: event.currentTarget.value as AlertDisplaySettings['minimumSeverity'],
        })}>
          <option value="unknown">All</option><option value="minor">Minor</option><option value="moderate">Moderate</option><option value="severe">Severe</option><option value="extreme">Extreme</option>
        </select>
      </label>
    </div>
  );
}
