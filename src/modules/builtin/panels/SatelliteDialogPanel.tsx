import { SatelliteControls } from '../../../satellite/SatelliteControls';
import type { SatelliteSceneState } from '../../../satellite/satellite-types';
import type { ProductSelection } from '../../../types/domain';
import type { ModuleDialogPanelProps } from '../../../types/module';

export function SatelliteDialogPanel({ scene, dispatch }: ModuleDialogPanelProps) {
  if (scene.kind !== 'map') return <p className="settings-note">Satellite controls are available on map scenes.</p>;
  const updateModule = (patch: Partial<SatelliteSceneState>) => dispatch({
    type: 'scene/merge-module-state',
    sceneId: scene.id,
    moduleId: 'satellite',
    patch,
  });
  const updateProduct = (patch: Partial<ProductSelection>) => dispatch({
    type: 'scene/set-product',
    sceneId: scene.id,
    product: patch,
  });
  return (
    <div className="tool-panel-grid tool-panel-grid--satellite">
      <section>
        <SatelliteControls
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