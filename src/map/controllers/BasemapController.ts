import type { MapScene } from '../../types/domain';
import { applyBasemapVisibility } from '../map-layer-utils';
import { createBasemapStyle } from '../basemap-styles';
import type { MapController, MapControllerContext } from './controller-types';

export class BasemapController implements MapController {
  readonly id = 'basemap';

  onStyleReady(context: MapControllerContext): void {
    context.map.setProjection({ type: context.scene.projection });
    applyBasemapVisibility(context.map, context.scene);
    context.callbacks.reportProviderStatus('basemap', 'online', '', 'live');
  }

  onSceneChange(context: MapControllerContext, previous: MapScene): void {
    if (previous.baseMap !== context.scene.baseMap) {
      context.map.getContainer().dataset.basemap = context.scene.baseMap;
      context.reloadStyle(createBasemapStyle(context.scene.baseMap));
      return;
    }
    if (!context.isStyleReady()) return;
    if (previous.projection !== context.scene.projection) {
      context.map.setProjection({ type: context.scene.projection });
    }
    applyBasemapVisibility(context.map, context.scene);
  }
}
