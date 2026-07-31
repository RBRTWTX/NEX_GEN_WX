import type { ModuleSettingsPanelProps } from '../../../types/module';

export function GraphicSettingsPanel({ scene, dispatch }: ModuleSettingsPanelProps) {
  if (scene.kind !== 'graphic') return null;
  return (
    <div className="settings-section">
      <h3>Graphic Scene</h3>
      <label>Location
        <input type="text" value={String(scene.settings.locationName ?? '')} onChange={(event) => dispatch({ type: 'scene/set-graphic-setting', sceneId: scene.id, key: 'locationName', value: event.currentTarget.value })} />
      </label>
      <label>Theme
        <select value={String(scene.settings.theme ?? 'broadcast')} onChange={(event) => dispatch({ type: 'scene/set-graphic-setting', sceneId: scene.id, key: 'theme', value: event.currentTarget.value })}>
          <option value="broadcast">Broadcast</option><option value="sky">Sky</option><option value="midnight">Midnight</option><option value="violet">Violet</option><option value="sunrise">Sunrise</option>
        </select>
      </label>
      <p className="settings-note">Template-specific controls stay in this floating panel so the broadcast canvas remains unobstructed.</p>
    </div>
  );
}
