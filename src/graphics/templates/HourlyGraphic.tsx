import type { GraphicScene } from '../../types/domain';
import { SceneObject } from '../../scene-editing/SceneObject';
import { GraphicText } from '../GraphicText';

export function HourlyGraphic({ scene, onSettingChange }: { scene: GraphicScene; onSettingChange?: (key: string, value: unknown) => void }) {
  return (
    <SceneObject elementId="graphic.hourly.chart" label="Hourly forecast chart" kind="container" className="hourly-chart">
      {Array.from({ length: 12 }, (_, index) => (
        <SceneObject elementId={`graphic.hour${index}.column`} label={`Hour ${index + 1} column`} kind="container" className="hourly-column" key={index}>
          <GraphicText scene={scene} settingKey={`hour${index}.temperature`} defaultValue="--°" label={`Hour ${index + 1} temperature`} onSettingChange={onSettingChange} as="strong" />
          <SceneObject as="i" elementId={`graphic.hour${index}.bar`} label={`Hour ${index + 1} chart bar`} kind="shape" style={{ height: `${28 + ((11 - index) * 4)}%` }} />
          <GraphicText scene={scene} settingKey={`hour${index}.label`} defaultValue={String(index + 1).padStart(2, '0')} label={`Hour ${index + 1} label`} onSettingChange={onSettingChange} as="span" />
        </SceneObject>
      ))}
    </SceneObject>
  );
}
