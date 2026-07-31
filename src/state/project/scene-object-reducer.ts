import { createId } from '../../core/id';
import type { SceneElementStyle, SceneElementTransform, StudioProject } from '../../types/domain';
import type { StudioAction } from '../studio-actions';
import { updateScene } from './project-helpers';

function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

function elementId(objectId: string): string {
  return `custom.${objectId}`;
}

export function reduceSceneObjectProject(project: StudioProject, action: StudioAction): StudioProject {
  switch (action.type) {
    case 'scene/set-element-style':
      return updateScene(project, action.sceneId, (scene) => {
        const current = scene.elementOverrides[action.elementId] ?? { style: {}, transform: {} };
        const style = compact<SceneElementStyle>({ ...current.style, ...action.style });
        const elementOverrides = { ...scene.elementOverrides };
        if (!Object.keys(style).length && !Object.keys(current.transform).length) delete elementOverrides[action.elementId];
        else elementOverrides[action.elementId] = { style, transform: current.transform };
        return { ...scene, elementOverrides };
      });
    case 'scene/set-element-transform':
      return updateScene(project, action.sceneId, (scene) => {
        const current = scene.elementOverrides[action.elementId] ?? { style: {}, transform: {} };
        const transform = compact<SceneElementTransform>({ ...current.transform, ...action.transform });
        const elementOverrides = { ...scene.elementOverrides };
        if (!Object.keys(current.style).length && !Object.keys(transform).length) delete elementOverrides[action.elementId];
        else elementOverrides[action.elementId] = { style: current.style, transform };
        return { ...scene, elementOverrides };
      });
    case 'scene/reset-element-style':
      return updateScene(project, action.sceneId, (scene) => {
        const current = scene.elementOverrides[action.elementId];
        if (!current || !Object.keys(current.style).length) return scene;
        const elementOverrides = { ...scene.elementOverrides };
        if (!Object.keys(current.transform).length) delete elementOverrides[action.elementId];
        else elementOverrides[action.elementId] = { style: {}, transform: current.transform };
        return { ...scene, elementOverrides };
      });
    case 'scene/reset-element-transform':
      return updateScene(project, action.sceneId, (scene) => {
        const current = scene.elementOverrides[action.elementId];
        if (!current || !Object.keys(current.transform).length) return scene;
        const elementOverrides = { ...scene.elementOverrides };
        if (!Object.keys(current.style).length) delete elementOverrides[action.elementId];
        else elementOverrides[action.elementId] = { style: current.style, transform: {} };
        return { ...scene, elementOverrides };
      });
    case 'scene/reset-element':
      return updateScene(project, action.sceneId, (scene) => {
        if (!scene.elementOverrides[action.elementId]) return scene;
        const elementOverrides = { ...scene.elementOverrides };
        delete elementOverrides[action.elementId];
        return { ...scene, elementOverrides };
      });
    case 'scene/add-custom-object':
      return updateScene(project, action.sceneId, (scene) => {
        if (scene.customObjects.some((item) => item.id === action.object.id)) return scene;
        return {
          ...scene,
          customObjects: [...scene.customObjects, structuredClone(action.object)],
          elementOverrides: {
            ...scene.elementOverrides,
            [elementId(action.object.id)]: {
              style: compact<SceneElementStyle>({ ...(action.style ?? {}) }),
              transform: compact<SceneElementTransform>({ ...(action.transform ?? {}) }),
            },
          },
        };
      });
    case 'scene/update-custom-object':
      return updateScene(project, action.sceneId, (scene) => {
        const index = scene.customObjects.findIndex((item) => item.id === action.objectId);
        if (index < 0) return scene;
        const customObjects = [...scene.customObjects];
        customObjects[index] = { ...customObjects[index], ...structuredClone(action.patch), id: action.objectId };
        return { ...scene, customObjects };
      });
    case 'scene/delete-custom-object':
      return updateScene(project, action.sceneId, (scene) => {
        if (!scene.customObjects.some((item) => item.id === action.objectId)) return scene;
        const elementOverrides = { ...scene.elementOverrides };
        delete elementOverrides[elementId(action.objectId)];
        return { ...scene, customObjects: scene.customObjects.filter((item) => item.id !== action.objectId), elementOverrides };
      });
    case 'scene/duplicate-custom-object':
      return updateScene(project, action.sceneId, (scene) => {
        const source = scene.customObjects.find((item) => item.id === action.objectId);
        if (!source) return scene;
        const id = createId(source.kind);
        const sourceOverride = scene.elementOverrides[elementId(source.id)] ?? { style: {}, transform: {} };
        const duplicate = { ...structuredClone(source), id, label: `${source.label} Copy` };
        return {
          ...scene,
          customObjects: [...scene.customObjects, duplicate],
          elementOverrides: {
            ...scene.elementOverrides,
            [elementId(id)]: {
              style: { ...sourceOverride.style },
              transform: {
                ...sourceOverride.transform,
                xPercent: Number(sourceOverride.transform.xPercent ?? 0) + 2,
                yPercent: Number(sourceOverride.transform.yPercent ?? 0) + 2,
                zIndex: Number(sourceOverride.transform.zIndex ?? 0) + 1,
              },
            },
          },
        };
      });
    default:
      return project;
  }
}
