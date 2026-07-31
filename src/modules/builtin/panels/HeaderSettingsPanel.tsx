import type { ModuleSettingsPanelProps } from '../../../types/module';
import { SettingsCheck, SettingsSlider } from '../ui/SettingsControls';

export function HeaderSettingsPanel({ scene, dispatch }: ModuleSettingsPanelProps) {
  if (scene.kind !== 'map') return null;
  const setHeader = (key: keyof typeof scene.header, value: (typeof scene.header)[keyof typeof scene.header]) => {
    dispatch({ type: 'scene/set-header', sceneId: scene.id, key, value });
  };
  return (
    <div className="settings-section">
      <h3>Broadcast Header</h3>
      <SettingsCheck label="Show header" checked={scene.header.visible} onChange={(value) => setHeader('visible', value)} />
      <label>Title<input type="text" value={scene.header.title} onChange={(event) => setHeader('title', event.currentTarget.value)} /></label>
      <label>Subtitle<input type="text" value={scene.header.subtitle} onChange={(event) => setHeader('subtitle', event.currentTarget.value)} /></label>
      <label>Valid label<input type="text" value={scene.header.validLabel} onChange={(event) => setHeader('validLabel', event.currentTarget.value)} /></label>
      <SettingsSlider label="Scale" value={Math.round(scene.header.scale * 100)} min={70} max={135} onChange={(value) => setHeader('scale', value / 100)} suffix="%" />
      <SettingsSlider label="Opacity" value={Math.round(scene.header.opacity * 100)} min={35} max={100} onChange={(value) => setHeader('opacity', value / 100)} suffix="%" />
      <SettingsCheck
        label="Show integrated color key"
        checked={scene.header.legend.visible}
        onChange={(value) => setHeader('legend', { ...scene.header.legend, visible: value })}
      />
      <div className="two-column-fields">
        <label>Low label<input type="text" value={scene.header.legend.lowLabel} onChange={(event) => setHeader('legend', { ...scene.header.legend, lowLabel: event.currentTarget.value })} /></label>
        <label>High label<input type="text" value={scene.header.legend.highLabel} onChange={(event) => setHeader('legend', { ...scene.header.legend, highLabel: event.currentTarget.value })} /></label>
      </div>
    </div>
  );
}
