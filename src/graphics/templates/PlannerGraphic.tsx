import type { GraphicScene } from '../../types/domain';
import { SceneObject } from '../../scene-editing/SceneObject';
import { GraphicText } from '../GraphicText';

const DEFAULT_PERIODS = ['MORNING', 'AFTERNOON', 'EVENING'];

export function PlannerGraphic({ scene, onSettingChange }: { scene: GraphicScene; onSettingChange?: (key: string, value: unknown) => void }) {
  return (
    <SceneObject elementId="graphic.planner.grid" label="Planner grid" kind="container" className="planner-grid">
      {DEFAULT_PERIODS.map((period, index) => (
        <SceneObject as="article" elementId={`graphic.period${index}.card`} label={`${period} panel`} kind="container" key={index}>
          <GraphicText scene={scene} settingKey={`period${index}.label`} defaultValue={period} label={`${period} label`} onSettingChange={onSettingChange} as="header" />
          <GraphicText scene={scene} settingKey={`period${index}.icon`} defaultValue={index === 2 ? '☾' : '☀'} label={`${period} icon`} onSettingChange={onSettingChange} as="div" className="planner-icon" />
          <GraphicText scene={scene} settingKey={`period${index}.temperature`} defaultValue="--°" label={`${period} temperature`} onSettingChange={onSettingChange} as="strong" />
          <GraphicText scene={scene} settingKey={`period${index}.condition`} defaultValue="Forecast" label={`${period} condition`} onSettingChange={onSettingChange} as="span" multiline />
        </SceneObject>
      ))}
    </SceneObject>
  );
}
