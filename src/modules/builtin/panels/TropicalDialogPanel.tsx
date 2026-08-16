import { TropicalControls } from '../../../tropical/TropicalControls';
import { TropicalOutlookControls } from '../../../tropical/TropicalOutlookControls';
import type { TropicalOutlookSceneState } from '../../../tropical/tropical-outlook-types';
import { tropicalOutlookPeriodForScene } from '../../../tropical/tropical-outlook-types';
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
