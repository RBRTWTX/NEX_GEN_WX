import { RadarControls } from '../../../radar/RadarControls';
import type { RadarSceneState } from '../../../radar/radar-types';
import type { ProductSelection } from '../../../types/domain';
import type { ModuleDialogPanelProps } from '../../../types/module';

export function RadarDialogPanel({ scene, dispatch }: ModuleDialogPanelProps) {
  if (scene.kind !== 'map') return <p className="settings-note">Radar controls are available on map scenes.</p>;
  const updateModule = (patch: Partial<RadarSceneState>) => dispatch({
    type: 'scene/merge-module-state',
    sceneId: scene.id,
    moduleId: 'radar',
    patch,
  });
  const updateProduct = (patch: Partial<ProductSelection>) => dispatch({
    type: 'scene/set-product',
    sceneId: scene.id,
    product: patch,
  });
  return (
    <div className="tool-panel-grid tool-panel-grid--radar">
      <section className="radar-dialog-section">
        <RadarControls
          scene={scene}
          onModuleStateChange={updateModule}
          onProductChange={updateProduct}
          onHeaderLegendChange={(legend) => dispatch({
            type: 'scene/set-header',
            sceneId: scene.id,
            key: 'legend',
            value: legend,
          })}
        />
      </section>
    </div>
  );
}
