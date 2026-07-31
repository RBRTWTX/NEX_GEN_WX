import type { GraphicScene } from '../../types/domain';
import { SceneObject } from '../../scene-editing/SceneObject';
import { GraphicText } from '../GraphicText';

const LEVELS = [
  ['THIS SUCKS', 'OVER 75°'],
  ['MUGGY', '70–74°'],
  ['BIT HUMID', '65–69°'],
  ['PLEASANT', '60–64°'],
  ['YES PLEASE', '60° OR BELOW'],
] as const;

export function MuggyMeterGraphic({ scene, onSettingChange }: { scene: GraphicScene; onSettingChange?: (key: string, value: unknown) => void }) {
  return (
    <SceneObject elementId="graphic.muggy.layout" label="Muggy meter layout" kind="container" className="muggy-meter-layout">
      <SceneObject elementId="graphic.muggy.scale" label="Muggy scale" kind="container" className="muggy-scale">
        <GraphicText scene={scene} settingKey="muggy.title" defaultValue="MUGGY SCALE" label="Muggy scale title" onSettingChange={onSettingChange} as="header" />
        {LEVELS.map(([name, range], index) => (
          <SceneObject elementId={`graphic.muggy.level${index}.panel`} label={`Muggy level ${index + 1} panel`} kind="container" className={`muggy-level level-${5 - index}`} key={index}>
            <GraphicText scene={scene} settingKey={`muggy.level${index}.name`} defaultValue={name} label={`Muggy level ${index + 1}`} onSettingChange={onSettingChange} as="strong" />
            <GraphicText scene={scene} settingKey={`muggy.level${index}.range`} defaultValue={range} label={`Muggy level ${index + 1} range`} onSettingChange={onSettingChange} as="span" />
          </SceneObject>
        ))}
      </SceneObject>
      <SceneObject elementId="graphic.muggy.current" label="Current dew point panel" kind="container" className="graphic-placeholder-panel">
        <GraphicText scene={scene} settingKey="muggy.currentLabel" defaultValue="CURRENT DEW POINT" label="Current dew point label" onSettingChange={onSettingChange} as="strong" />
        <GraphicText scene={scene} settingKey="muggy.currentValue" defaultValue="--°" label="Current dew point value" onSettingChange={onSettingChange} as="b" />
        <GraphicText scene={scene} settingKey="muggy.currentDetail" defaultValue="Edit this scene or connect live dew point data." label="Current dew point detail" onSettingChange={onSettingChange} as="span" multiline />
      </SceneObject>
    </SceneObject>
  );
}
