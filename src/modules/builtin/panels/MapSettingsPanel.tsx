import type { BaseMapKind, BroadcastContextDetail, BroadcastContextMode, ProjectionKind } from '../../../types/domain';
import type { ModuleSettingsPanelProps } from '../../../types/module';
import { SettingsCheck, SettingsSlider } from '../ui/SettingsControls';

export function MapSettingsPanel({ scene, dispatch }: ModuleSettingsPanelProps) {
  if (scene.kind !== 'map') return null;
  return (
    <div className="settings-section">
      <h3>Map</h3>
      <label>Basemap
        <select value={scene.baseMap} onChange={(event) => dispatch({ type: 'scene/set-basemap', sceneId: scene.id, baseMap: event.currentTarget.value as BaseMapKind })}>
          <option value="gray">Gray</option><option value="dark">Dark</option><option value="satellite">Satellite</option>
        </select>
      </label>
      <label>Projection
        <select value={scene.projection} onChange={(event) => dispatch({ type: 'scene/set-projection', sceneId: scene.id, projection: event.currentTarget.value as ProjectionKind })}>
          <option value="mercator">Mercator</option><option value="globe">Globe</option>
        </select>
      </label>
      <SettingsCheck label="Dim basemap under weather" checked={scene.display.dimBasemapUnderWeather} onChange={(value) => dispatch({ type: 'scene/set-map-display', sceneId: scene.id, key: 'dimBasemapUnderWeather', value })} />
      <label>Broadcast context
        <select
          value={scene.display.contextMode ?? 'auto'}
          onChange={(event) => dispatch({
            type: 'scene/set-map-display',
            sceneId: scene.id,
            key: 'contextMode',
            value: event.currentTarget.value as BroadcastContextMode,
          })}
        >
          <option value="off">Off</option>
          <option value="auto">Auto Â· scene + zoom</option>
          <option value="custom">Custom</option>
        </select>
      </label>
      <SettingsSlider
        label="Context opacity"
        value={scene.display.contextOpacity ?? 72}
        min={20}
        max={100}
        onChange={(value) => dispatch({ type: 'scene/set-map-display', sceneId: scene.id, key: 'contextOpacity', value })}
        suffix="%"
      />
      <label>Context detail
        <select
          value={scene.display.contextDetail ?? 'broadcast'}
          onChange={(event) => dispatch({
            type: 'scene/set-map-display',
            sceneId: scene.id,
            key: 'contextDetail',
            value: event.currentTarget.value as BroadcastContextDetail,
          })}
        >
          <option value="low">Low</option>
          <option value="broadcast">Broadcast</option>
          <option value="high">High</option>
        </select>
      </label>
      <p className="settings-note">Auto keeps national/regional views clean, then progressively redraws useful roads and route labels above weather data as you zoom toward local/street scale.</p>
      <SettingsSlider label="Boundary weight" value={scene.display.boundaryWeight} min={50} max={180} onChange={(value) => dispatch({ type: 'scene/set-map-display', sceneId: scene.id, key: 'boundaryWeight', value })} suffix="%" />
      <SettingsCheck label="State lines" checked={scene.overlays.states} onChange={(value) => dispatch({ type: 'scene/set-overlay', sceneId: scene.id, overlay: 'states', value })} />
      <SettingsCheck label="County lines" checked={scene.overlays.counties} onChange={(value) => dispatch({ type: 'scene/set-overlay', sceneId: scene.id, overlay: 'counties', value })} />
    </div>
  );
}
