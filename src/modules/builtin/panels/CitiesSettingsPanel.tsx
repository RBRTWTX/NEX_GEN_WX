import type { ModuleSettingsPanelProps } from '../../../types/module';
import { SettingsCheck, SettingsSlider } from '../ui/SettingsControls';

export function CitiesSettingsPanel({ scene, dispatch }: ModuleSettingsPanelProps) {
  if (scene.kind !== 'map') return null;
  return (
    <div className="settings-section">
      <h3>Cities</h3>
      <SettingsCheck label="Show cities and towns" checked={scene.overlays.cities} onChange={(value) => dispatch({ type: 'scene/set-overlay', sceneId: scene.id, overlay: 'cities', value })} />
      <SettingsSlider label="Density" value={scene.display.cityDensity} min={10} max={100} onChange={(value) => dispatch({ type: 'scene/set-map-display', sceneId: scene.id, key: 'cityDensity', value })} suffix="%" />
      <SettingsSlider label="Label scale" value={scene.display.cityLabelScale} min={60} max={180} onChange={(value) => dispatch({ type: 'scene/set-map-display', sceneId: scene.id, key: 'cityLabelScale', value })} suffix="%" />
      <p className="settings-note">Density now changes the visible population-ranked city inventory immediately; more places progressively become eligible as density and zoom increase.</p>
    </div>
  );
}
