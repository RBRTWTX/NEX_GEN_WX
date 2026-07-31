import type { GraphicScene } from '../../types/domain';
import { SceneObject } from '../../scene-editing/SceneObject';
import { GraphicText } from '../GraphicText';

const DEFAULT_DAYS = ['TODAY', 'SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU'];
const ICONS = ['☀', '☁', '☂', '☀', '☁', '☀', '☂'];

export function SevenDayGraphic({ scene, onSettingChange }: { scene: GraphicScene; onSettingChange?: (key: string, value: unknown) => void }) {
  return (
    <SceneObject elementId="graphic.seven-day.grid" label="Seven day forecast grid" kind="container" className="seven-day-grid">
      {DEFAULT_DAYS.map((day, index) => (
        <SceneObject as="article" elementId={`graphic.day${index}.card`} label={`Day ${index + 1} panel`} kind="container" key={index}>
          <GraphicText scene={scene} settingKey={`day${index}.label`} defaultValue={day} label={`Day ${index + 1} label`} onSettingChange={onSettingChange} as="header" />
          <GraphicText scene={scene} settingKey={`day${index}.icon`} defaultValue={ICONS[index]} label={`Day ${index + 1} icon`} onSettingChange={onSettingChange} as="div" className="forecast-icon" />
          <GraphicText scene={scene} settingKey={`day${index}.high`} defaultValue="--°" label={`Day ${index + 1} high`} onSettingChange={onSettingChange} as="strong" />
          <GraphicText scene={scene} settingKey={`day${index}.low`} defaultValue="--°" label={`Day ${index + 1} low`} onSettingChange={onSettingChange} as="span" />
          <GraphicText scene={scene} settingKey={`day${index}.condition`} defaultValue="Forecast" label={`Day ${index + 1} condition`} onSettingChange={onSettingChange} as="small" />
        </SceneObject>
      ))}
    </SceneObject>
  );
}
