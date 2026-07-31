import type { CustomSceneObject, SceneElementStyle, SceneElementTransform, StudioScene } from '../types/domain';
import type { SceneElementSelection } from '../state/scene-element-selection';
import { FloatingWindow } from '../components/FloatingWindow';
import { SceneObjectAppearanceControls, SceneObjectTextControls, SceneObjectTransformControls } from './SceneObjectControls';

interface SceneElementStylePanelProps {
  scene: StudioScene;
  selection: SceneElementSelection;
  onStyleChange: (style: Partial<SceneElementStyle>) => void;
  onTransformChange: (transform: Partial<SceneElementTransform>) => void;
  onResetStyle: () => void;
  onResetTransform: () => void;
  onResetAll: () => void;
  onUpdateCustomObject: (objectId: string, patch: Partial<CustomSceneObject>) => void;
  onDuplicateCustomObject: (objectId: string) => void;
  onDeleteCustomObject: (objectId: string) => void;
  onClose: () => void;
}

export function SceneElementStylePanel({
  scene, selection, onStyleChange, onTransformChange, onResetStyle, onResetTransform,
  onResetAll, onUpdateCustomObject, onDuplicateCustomObject, onDeleteCustomObject, onClose,
}: SceneElementStylePanelProps) {
  const override = scene.elementOverrides[selection.elementId] ?? { style: {}, transform: {} };
  const customObject = selection.customObjectId
    ? scene.customObjects.find((item) => item.id === selection.customObjectId)
    : undefined;
  const isText = selection.kind === 'text';

  return (
    <FloatingWindow title="Scene Object" eyebrow={`${selection.label} · ${selection.kind.toUpperCase()}`} className="scene-element-style-window" initialPosition={{ x: Math.max(430, window.innerWidth - 390), y: 78 }} onClose={onClose}>
      <div className="scene-element-style-form">
        <p>Drag MOVE on the scene, drag a corner to resize, use the round handle to rotate, and type directly into authored text.</p>
        {customObject && <label>Object name<input type="text" value={customObject.label} onChange={(event) => onUpdateCustomObject(customObject.id, { label: event.currentTarget.value })} /></label>}
        {customObject?.kind === 'shape' && (
          <label>Shape type<select value={customObject.shape ?? 'rectangle'} onChange={(event) => onUpdateCustomObject(customObject.id, { shape: event.currentTarget.value as CustomSceneObject['shape'] })}>
            <option value="rectangle">Rectangle</option>
            <option value="rounded">Rounded rectangle</option>
            <option value="ellipse">Ellipse</option>
            <option value="line">Line</option>
          </select></label>
        )}
        <SceneObjectTransformControls value={override.transform} onChange={onTransformChange} />
        <SceneObjectAppearanceControls value={override.style} isText={isText} onChange={onStyleChange} />
        {isText && <SceneObjectTextControls value={override.style} onChange={onStyleChange} />}
        <div className="scene-style-actions scene-style-actions--wrap">
          <button type="button" onClick={onResetStyle}>Reset appearance</button>
          <button type="button" onClick={onResetTransform}>Reset position</button>
          <button type="button" onClick={onResetAll}>Reset all</button>
          {customObject && <button type="button" onClick={() => onDuplicateCustomObject(customObject.id)}>Duplicate</button>}
          {customObject && <button type="button" className="danger-button" onClick={() => onDeleteCustomObject(customObject.id)}>Delete</button>}
          <button type="button" className="primary-button" onClick={onClose}>Done</button>
        </div>
      </div>
    </FloatingWindow>
  );
}
