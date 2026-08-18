import { TropicalControls } from '../../../tropical/TropicalControls';
import { TropicalOutlookControls } from '../../../tropical/TropicalOutlookControls';
import { TropicalWindProbabilityControls } from '../../../tropical/TropicalWindProbabilityControls';
import { TropicalArrivalTimeControls } from '../../../tropical/TropicalArrivalTimeControls';
import { TropicalStormSurgeControls } from '../../../tropical/TropicalStormSurgeControls';
import type { TropicalOutlookSceneState } from '../../../tropical/tropical-outlook-types';
import { tropicalOutlookPeriodForScene } from '../../../tropical/tropical-outlook-types';
import { tropicalWindProbabilityThresholdForScene, type TropicalWindProbabilitySceneState } from '../../../tropical/tropical-wind-probability-types';
import { tropicalArrivalTimeModeForScene, type TropicalArrivalTimeSceneState } from '../../../tropical/tropical-arrival-time-types';
import { tropicalStormSurgeProductForScene, type TropicalStormSurgeSceneState } from '../../../tropical/tropical-storm-surge-types';
import type { TropicalSceneState } from '../../../tropical/tropical-types';
import type { ModuleDialogPanelProps } from '../../../types/module';

export function TropicalDialogPanel({ scene, dispatch }: ModuleDialogPanelProps) {
  if (scene.kind !== 'map') return <p className="settings-note">Tropical controls are available on map scenes.</p>;

  const outlookPeriod = tropicalOutlookPeriodForScene(scene);
  if (outlookPeriod) {
    const updateOutlook = (patch: Partial<TropicalOutlookSceneState>) => dispatch({
      type: 'scene/merge-module-state',
      sceneId: scene.id,
      moduleId: 'tropical-outlook',
      patch,
    });
    return (
      <div className="tool-panel-grid tool-panel-grid--tropical">
        <section>
          <TropicalOutlookControls
            scene={scene}
            onModuleStateChange={updateOutlook}
          />
        </section>
      </div>
    );
  }

  const windProbabilityThreshold = tropicalWindProbabilityThresholdForScene(scene);
  if (windProbabilityThreshold) {
    const updateWindProbability = (patch: Partial<TropicalWindProbabilitySceneState>) => dispatch({
      type: 'scene/merge-module-state',
      sceneId: scene.id,
      moduleId: 'tropical-wind-probability',
      patch,
    });
    return (
      <div className="tool-panel-grid tool-panel-grid--tropical">
        <section>
          <TropicalWindProbabilityControls
            scene={scene}
            onModuleStateChange={updateWindProbability}
          />
        </section>
      </div>
    );
  }

  const arrivalMode = tropicalArrivalTimeModeForScene(scene);
  if (arrivalMode) {
    const updateArrival = (patch: Partial<TropicalArrivalTimeSceneState>) => dispatch({
      type: 'scene/merge-module-state',
      sceneId: scene.id,
      moduleId: 'tropical-arrival-time',
      patch,
    });
    return (
      <div className="tool-panel-grid tool-panel-grid--tropical">
        <section>
          <TropicalArrivalTimeControls
            scene={scene}
            onModuleStateChange={updateArrival}
          />
        </section>
      </div>
    );
  }

  const surgeProduct = tropicalStormSurgeProductForScene(scene);
  if (surgeProduct) {
    const updateSurge = (patch: Partial<TropicalStormSurgeSceneState>) => dispatch({
      type: 'scene/merge-module-state',
      sceneId: scene.id,
      moduleId: 'tropical-storm-surge',
      patch,
    });
    return (
      <div className="tool-panel-grid tool-panel-grid--tropical">
        <section>
          <TropicalStormSurgeControls
            scene={scene}
            onModuleStateChange={updateSurge}
          />
        </section>
      </div>
    );
  }

  const updateModule = (patch: Partial<TropicalSceneState>) => dispatch({
    type: 'scene/merge-module-state',
    sceneId: scene.id,
    moduleId: 'tropical',
    patch,
  });
  return (
    <div className="tool-panel-grid tool-panel-grid--tropical">
      <section>
        <TropicalControls
          scene={scene}
          onModuleStateChange={updateModule}
        />
      </section>
    </div>
  );
}
