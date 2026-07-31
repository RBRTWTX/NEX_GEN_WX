import { useRef, type ChangeEvent } from 'react';
import { createId } from '../../../core/id';
import type { CustomSceneObject, SceneElementStyle, SceneElementTransform } from '../../../types/domain';
import type { ModuleDialogPanelProps } from '../../../types/module';
import { sceneObjectSelection } from '../../../scene-editing/SceneEditingContext';

function starterTransform(kind: CustomSceneObject['kind'], index: number): SceneElementTransform {
  return {
    xPercent: 8 + (index % 6) * 2,
    yPercent: 20 + (index % 5) * 3,
    scaleX: 1,
    scaleY: 1,
    rotationDeg: 0,
    zIndex: 30 + index,
  };
}

function starterStyle(kind: CustomSceneObject['kind']): SceneElementStyle {
  if (kind === 'text') {
    return {
      color: '#ffffff',
      backgroundColor: '#10233acc',
      fontSizePx: 42,
      fontWeight: 800,
      paddingPx: 10,
      borderRadiusPx: 5,
      textShadow: true,
    };
  }
  if (kind === 'shape') {
    return {
      backgroundColor: '#1f6fc4cc',
      borderColor: '#ffffff',
      borderWidthPx: 2,
      borderRadiusPx: 8,
      boxShadow: true,
    };
  }
  return {
    backgroundColor: '#0b1420cc',
    borderColor: '#ffffff',
    borderWidthPx: 2,
    borderRadiusPx: 4,
    boxShadow: true,
  };
}

function objectElementId(objectId: string): string {
  return `custom.${objectId}`;
}

export function SceneObjectsDialogPanel({ scene, dispatch, onClose }: ModuleDialogPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function addObject(kind: CustomSceneObject['kind'], patch: Partial<CustomSceneObject> = {}): void {
    const id = createId(kind);
    const object: CustomSceneObject = {
      id,
      kind,
      label: kind === 'text' ? 'Custom Text' : kind === 'shape' ? 'Custom Shape' : 'Custom Image',
      text: kind === 'text' ? 'EDIT TEXT' : undefined,
      shape: kind === 'shape' ? 'rounded' : undefined,
      imageDataUrl: kind === 'image' ? null : undefined,
      ...patch,
    };
    dispatch({
      type: 'scene/add-custom-object',
      sceneId: scene.id,
      object,
      transform: starterTransform(kind, scene.customObjects.length),
      style: starterStyle(kind),
    });
    dispatch({
      type: 'ui/select-scene-element',
      selection: sceneObjectSelection(scene.id, objectElementId(id), object.label, kind, 'custom', id),
    });
  }

  function addImage(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      dispatch({ type: 'status/set', message: 'Select a PNG, JPG, WEBP, GIF, or SVG image.', level: 'warning' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      dispatch({ type: 'status/set', message: 'Image assets must be 2 MB or smaller so project autosave remains reliable.', level: 'warning' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => addObject('image', { imageDataUrl: String(reader.result), label: file.name });
    reader.onerror = () => dispatch({ type: 'status/set', message: 'Unable to read that image.', level: 'error' });
    reader.readAsDataURL(file);
  }

  return (
    <section className="scene-object-library-panel">
      <header>
        <div>
          <h3>Scene Objects</h3>
          <p>Add movable broadcast text, shapes, and image assets to the current scene.</p>
        </div>
        <button type="button" onClick={onClose}>Done</button>
      </header>
      <div className="scene-object-add-row">
        <button type="button" onClick={() => addObject('text')}>+ Text</button>
        <button type="button" onClick={() => addObject('shape')}>+ Shape</button>
        <button type="button" onClick={() => fileInputRef.current?.click()}>+ Image</button>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden onChange={addImage} />
      </div>
      <div className="scene-object-library-list">
        {scene.customObjects.length === 0 && (
          <p className="settings-note">No custom objects are in this scene. Existing headers, legends, text, and graphic panels can still be selected directly on the canvas.</p>
        )}
        {scene.customObjects.map((object) => {
          const override = scene.elementOverrides[objectElementId(object.id)];
          const hidden = Boolean(override?.transform.hidden);
          const locked = Boolean(override?.transform.locked);
          return (
            <article key={object.id} className={hidden ? 'is-hidden' : ''}>
              <button
                type="button"
                className="scene-object-library-select"
                onClick={() => dispatch({
                  type: 'ui/select-scene-element',
                  selection: sceneObjectSelection(scene.id, objectElementId(object.id), object.label, object.kind, 'custom', object.id),
                })}
              >
                <span>{object.kind.toUpperCase()}</span>
                <strong>{object.label}</strong>
                <small>{hidden ? 'Hidden' : locked ? 'Locked' : 'Ready'}</small>
              </button>
              <div>
                <button type="button" onClick={() => dispatch({ type: 'scene/duplicate-custom-object', sceneId: scene.id, objectId: object.id })}>Duplicate</button>
                <button type="button" onClick={() => dispatch({ type: 'scene/delete-custom-object', sceneId: scene.id, objectId: object.id })}>Delete</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
