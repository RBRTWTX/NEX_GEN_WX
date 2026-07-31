import type { CustomSceneObject } from '../types/domain';
import { EditableSceneText } from './EditableSceneText';
import { SceneObject } from './SceneObject';

interface CustomSceneObjectLayerProps {
  objects: CustomSceneObject[];
  onUpdate: (objectId: string, patch: Partial<CustomSceneObject>) => void;
}

function CustomObject({ object, onUpdate }: { object: CustomSceneObject; onUpdate: CustomSceneObjectLayerProps['onUpdate'] }) {
  const elementId = `custom.${object.id}`;
  if (object.kind === 'text') {
    return (
      <EditableSceneText
        as="div"
        className="custom-scene-object custom-scene-object--text"
        elementId={elementId}
        label={object.label}
        value={object.text ?? 'EDIT TEXT'}
        onChange={(text) => onUpdate(object.id, { text })}
        multiline
        source="custom"
        customObjectId={object.id}
      />
    );
  }
  if (object.kind === 'image') {
    return (
      <SceneObject
        as="figure"
        className="custom-scene-object custom-scene-object--image"
        elementId={elementId}
        label={object.label}
        kind="image"
        source="custom"
        customObjectId={object.id}
      >
        {object.imageDataUrl ? <img src={object.imageDataUrl} alt={object.label} /> : <span>IMAGE</span>}
      </SceneObject>
    );
  }
  return (
    <SceneObject
      className={`custom-scene-object custom-scene-object--shape shape-${object.shape ?? 'rectangle'}`}
      elementId={elementId}
      label={object.label}
      kind="shape"
      source="custom"
      customObjectId={object.id}
    />
  );
}

export function CustomSceneObjectLayer({ objects, onUpdate }: CustomSceneObjectLayerProps) {
  return (
    <div className="custom-scene-object-layer" aria-label="Authored scene objects">
      {objects.map((object) => <CustomObject key={object.id} object={object} onUpdate={onUpdate} />)}
    </div>
  );
}
