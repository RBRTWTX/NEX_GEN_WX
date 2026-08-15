import type { HeaderLegendState, MapScene, ProductSelection } from '../types/domain';
import type { RadarSceneState } from './radar-types';
import { RadarControls } from './RadarControls';

interface RadarQuickToolbarProps {
  scene: MapScene;
  onModuleStateChange: (patch: Partial<RadarSceneState>) => void;
  onProductChange: (patch: Partial<ProductSelection>) => void;
  onHeaderLegendChange?: (legend: HeaderLegendState) => void;
}

export function RadarQuickToolbar(props: RadarQuickToolbarProps) {
  if (props.scene.product.category !== 'radar') return null;
  return <RadarControls {...props} compact />;
}
