import type { GraphicScene } from '../../types/domain';
import { SceneObject } from '../../scene-editing/SceneObject';
import { GraphicText } from '../GraphicText';

export function TwoPanelGraphic({
  scene,
  labels,
  onSettingChange,
}: {
  scene: GraphicScene;
  labels: [string, string];
  onSettingChange?: (key: string, value: unknown) => void;
}) {
  return (
    <SceneObject elementId="graphic.two-panel.grid" label="Two panel forecast" kind="container" className="two-panel-forecast">
      {labels.map((label, index) => (
        <SceneObject as="article" elementId={`graphic.panel${index}.card`} label={`${label} panel`} kind="container" key={index}>
          <GraphicText scene={scene} settingKey={`panel${index}.label`} defaultValue={label} label={`${label} label`} onSettingChange={onSettingChange} as="header" />
          <GraphicText scene={scene} settingKey={`panel${index}.icon`} defaultValue={index === 0 ? '☀' : '☾'} label={`${label} icon`} onSettingChange={onSettingChange} as="div" className="forecast-icon" />
          <GraphicText scene={scene} settingKey={`panel${index}.high`} defaultValue="--°" label={`${label} high`} onSettingChange={onSettingChange} as="strong" />
          <GraphicText scene={scene} settingKey={`panel${index}.low`} defaultValue="LOW --°" label={`${label} low`} onSettingChange={onSettingChange} as="span" />
          <GraphicText scene={scene} settingKey={`panel${index}.condition`} defaultValue="Forecast" label={`${label} condition`} onSettingChange={onSettingChange} as="small" />
        </SceneObject>
      ))}
    </SceneObject>
  );
}
