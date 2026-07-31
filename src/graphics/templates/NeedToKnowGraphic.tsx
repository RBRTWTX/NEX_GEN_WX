import type { GraphicScene } from '../../types/domain';
import { SceneObject } from '../../scene-editing/SceneObject';
import { GraphicText } from '../GraphicText';

export function NeedToKnowGraphic({ scene, onSettingChange }: { scene: GraphicScene; onSettingChange?: (key: string, value: unknown) => void }) {
  return (
    <SceneObject elementId="graphic.need-to-know.grid" label="Need to know grid" kind="container" className="need-to-know-grid">
      {[0, 1, 2, 3].map((index) => (
        <SceneObject as="article" elementId={`graphic.need-to-know.card${index}`} label={`Need to know card ${index + 1}`} kind="container" key={index}>
          <GraphicText scene={scene} settingKey={`headline${index + 1}`} defaultValue={`EDIT HEADLINE ${index + 1}`} label={`Headline ${index + 1}`} onSettingChange={onSettingChange} as="strong" />
          <GraphicText scene={scene} settingKey={`detail${index + 1}`} defaultValue="Click this text to replace the broadcast message." label={`Headline ${index + 1} detail`} onSettingChange={onSettingChange} as="p" multiline />
        </SceneObject>
      ))}
    </SceneObject>
  );
}
