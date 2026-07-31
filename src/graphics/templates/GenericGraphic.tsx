import type { GraphicScene } from '../../types/domain';
import { SceneObject } from '../../scene-editing/SceneObject';
import { GraphicText } from '../GraphicText';

export function GenericGraphic({ scene, onSettingChange }: { scene: GraphicScene; onSettingChange?: (key: string, value: unknown) => void }) {
  return (
    <SceneObject elementId="graphic.generic.panel" label="Graphic content panel" kind="container" className="graphic-placeholder-panel generic-graphic-panel">
      <GraphicText scene={scene} settingKey="generic.kicker" defaultValue="BROADCAST GRAPHIC" label="Graphic kicker" onSettingChange={onSettingChange} as="span" />
      <GraphicText scene={scene} settingKey="generic.headline" defaultValue={scene.templateId.replace(/-/g, ' ').toUpperCase()} label="Graphic headline" onSettingChange={onSettingChange} as="strong" />
      <GraphicText scene={scene} settingKey="generic.detail" defaultValue="Click any text to edit it, then use the scene-object panel to change its appearance and position." label="Graphic detail" onSettingChange={onSettingChange} as="p" multiline />
    </SceneObject>
  );
}
