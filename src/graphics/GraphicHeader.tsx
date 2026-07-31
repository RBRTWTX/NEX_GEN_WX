import type { GraphicScene } from '../types/domain';
import { SceneObject } from '../scene-editing/SceneObject';
import { GraphicText } from './GraphicText';

interface GraphicHeaderProps {
  scene: GraphicScene;
  onSettingChange?: (key: string, value: unknown) => void;
}

export function GraphicHeader({ scene, onSettingChange }: GraphicHeaderProps) {
  return (
    <SceneObject as="header" elementId="graphic.header" label="Graphic header" kind="container" className="graphic-header">
      <SceneObject elementId="graphic.header.copy" label="Graphic title block" kind="container" className="graphic-header-copy">
        <GraphicText
          scene={scene}
          settingKey="eyebrow"
          defaultValue="WEATHER FORECAST"
          label="Graphic eyebrow"
          onSettingChange={onSettingChange}
          as="small"
        />
        <GraphicText
          scene={scene}
          settingKey="title"
          defaultValue={scene.name.toUpperCase()}
          label="Graphic title"
          onSettingChange={onSettingChange}
          as="h1"
        />
      </SceneObject>
      <SceneObject elementId="graphic.header.location" label="Graphic location block" kind="container" className="graphic-location">
        <GraphicText
          scene={scene}
          settingKey="locationName"
          defaultValue="San Antonio, TX"
          label="Graphic location"
          onSettingChange={onSettingChange}
          as="strong"
        />
        <GraphicText
          scene={scene}
          settingKey="locationCaption"
          defaultValue="WEATHER GRAPHIC"
          label="Graphic location caption"
          onSettingChange={onSettingChange}
          as="span"
        />
      </SceneObject>
    </SceneObject>
  );
}
