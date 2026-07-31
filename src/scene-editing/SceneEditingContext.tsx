import { createContext, useContext, type ReactNode, type RefObject } from 'react';
import type {
  CustomSceneObject,
  SceneElementOverride,
  SceneElementStyle,
  SceneElementTransform,
  SceneObjectKind,
} from '../types/domain';
import type { SceneElementSelection } from '../state/scene-element-selection';

interface SceneEditingContextValue {
  sceneId: string;
  interactive: boolean;
  stageRef: RefObject<HTMLDivElement | null>;
  selectedElementId: string | null;
  elementOverrides: Record<string, SceneElementOverride>;
  customObjects: CustomSceneObject[];
  selectElement: (selection: SceneElementSelection) => void;
  clearSelection: () => void;
  updateElementStyle: (elementId: string, style: Partial<SceneElementStyle>) => void;
  updateElementTransform: (elementId: string, transform: Partial<SceneElementTransform>) => void;
  resetElementStyle: (elementId: string) => void;
  resetElementTransform: (elementId: string) => void;
  resetElement: (elementId: string) => void;
  updateCustomObject: (objectId: string, patch: Partial<CustomSceneObject>) => void;
  deleteCustomObject: (objectId: string) => void;
  duplicateCustomObject: (objectId: string) => void;
}

const SceneEditingContext = createContext<SceneEditingContextValue | null>(null);

interface SceneEditingProviderProps extends SceneEditingContextValue {
  children: ReactNode;
}

export function SceneEditingProvider({ children, ...value }: SceneEditingProviderProps) {
  return <SceneEditingContext.Provider value={value}>{children}</SceneEditingContext.Provider>;
}

export function useSceneEditing(): SceneEditingContextValue {
  const value = useContext(SceneEditingContext);
  if (!value) throw new Error('useSceneEditing must be used within SceneEditingProvider');
  return value;
}

export function sceneObjectSelection(
  sceneId: string,
  elementId: string,
  label: string,
  kind: SceneObjectKind,
  source: SceneElementSelection['source'] = 'built-in',
  customObjectId?: string,
): SceneElementSelection {
  return { sceneId, elementId, label, kind, source, customObjectId };
}
