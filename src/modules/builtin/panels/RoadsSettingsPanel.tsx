import type { ModuleSettingsPanelProps } from '../../../types/module';
import { SettingsCheck, SettingsSlider } from '../ui/SettingsControls';

export function RoadsSettingsPanel({ scene, dispatch }: ModuleSettingsPanelProps) {
  if (scene.kind !== 'map') return null;
  return (
    <div className="settings-section">
      <h3>Roads</h3>
      <SettingsCheck label="Show roads" checked={scene.overlays.roads} onChange={(value) => dispatch({ type: 'scene/set-overlay', sceneId: scene.id, overlay: 'roads', value })} />
      <SettingsSlider label="Road density" value={scene.display.roadDensity} min={0} max={100} onChange={(value) => dispatch({ type: 'scene/set-map-display', sceneId: scene.id, key: 'roadDensity', value })} suffix="%" />
      <p className="settings-note">Base roads remain beneath weather. The Broadcast Context pass selectively redraws useful roads and route labels above weather as zoom increases.</p>
    </div>
  );
}
