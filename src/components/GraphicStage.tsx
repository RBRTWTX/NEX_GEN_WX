import type { GraphicScene } from '../types/domain';
import { SceneObject } from '../scene-editing/SceneObject';
import { GraphicHeader } from '../graphics/GraphicHeader';
import { GenericGraphic } from '../graphics/templates/GenericGraphic';
import { HourlyGraphic } from '../graphics/templates/HourlyGraphic';
import { MuggyMeterGraphic } from '../graphics/templates/MuggyMeterGraphic';
import { NeedToKnowGraphic } from '../graphics/templates/NeedToKnowGraphic';
import { PlannerGraphic } from '../graphics/templates/PlannerGraphic';
import { SevenDayGraphic } from '../graphics/templates/SevenDayGraphic';
import { TwoPanelGraphic } from '../graphics/templates/TwoPanelGraphic';

interface GraphicStageProps {
  scene: GraphicScene;
  onSettingChange?: (key: string, value: unknown) => void;
}

function GraphicBody({ scene, onSettingChange }: GraphicStageProps) {
  switch (scene.templateId) {
    case 'seven-day':
      return <SevenDayGraphic scene={scene} onSettingChange={onSettingChange} />;
    case 'hourly':
      return <HourlyGraphic scene={scene} onSettingChange={onSettingChange} />;
    case 'planner':
    case 'heading-out':
      return <PlannerGraphic scene={scene} onSettingChange={onSettingChange} />;
    case 'weekend':
      return <TwoPanelGraphic scene={scene} labels={['Saturday', 'Sunday']} onSettingChange={onSettingChange} />;
    case 'today-tonight':
      return <TwoPanelGraphic scene={scene} labels={['Today', 'Tonight']} onSettingChange={onSettingChange} />;
    case 'need-to-know':
      return <NeedToKnowGraphic scene={scene} onSettingChange={onSettingChange} />;
    case 'muggy-meter':
      return <MuggyMeterGraphic scene={scene} onSettingChange={onSettingChange} />;
    default:
      return <GenericGraphic scene={scene} onSettingChange={onSettingChange} />;
  }
}

export function GraphicStage({ scene, onSettingChange }: GraphicStageProps) {
  return (
    <section
      className={`graphic-stage graphic-theme-${String(scene.settings.theme ?? 'broadcast')}`}
      aria-label={scene.name}
      data-template-id={scene.templateId}
    >
      <GraphicHeader scene={scene} onSettingChange={onSettingChange} />
      <SceneObject as="main" elementId="graphic.content" label="Graphic content area" kind="container" className="graphic-content">
        <GraphicBody scene={scene} onSettingChange={onSettingChange} />
      </SceneObject>
    </section>
  );
}
