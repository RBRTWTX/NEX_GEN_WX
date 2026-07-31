import type { SceneObjectKind } from '../types/domain';

export interface SceneElementSelection {
  sceneId: string;
  elementId: string;
  label: string;
  kind: SceneObjectKind;
  source: 'built-in' | 'custom';
  customObjectId?: string;
}
