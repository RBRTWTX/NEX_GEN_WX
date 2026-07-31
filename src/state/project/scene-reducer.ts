import { createId } from '../../core/id';
import type {
  AlertDisplaySettings,
  GraphicScene,
  HeaderState,
  ObservationDisplaySettings,
  StudioProject,
} from '../../types/domain';
import type { StudioAction } from '../studio-actions';
import { selectScene, touchProject, updateScene } from './project-helpers';
import { reduceSceneObjectProject } from './scene-object-reducer';

function graphicScene(templateId: string, name: string, settings: Record<string, unknown> = {}): GraphicScene {
  return {
    id: createId('scene'),
    name,
    kind: 'graphic',
    category: 'Graphics',
    tags: ['Graphics', templateId],
    templateId,
    settings: { locationName: 'San Antonio, TX', theme: 'broadcast', ...settings },
    transition: { type: 'dissolve', durationMs: 900 },
    advance: 'manual',
    holdSeconds: 12,
    activeModuleIds: ['graphics', 'forecast'],
    moduleState: {},
    elementOverrides: {},
    customObjects: [],
  };
}

export function reduceSceneProject(project: StudioProject, action: StudioAction): StudioProject {
  const objectResult = reduceSceneObjectProject(project, action);
  if (objectResult !== project) return objectResult;
  switch (action.type) {
    case 'scene/select':
      return selectScene(project, action.sceneId);
    case 'scene/set-camera':
      return updateScene(project, action.sceneId, (scene) => scene.kind === 'map' ? { ...scene, camera: action.camera } : scene);
    case 'scene/set-basemap':
      return updateScene(project, action.sceneId, (scene) => scene.kind === 'map' ? { ...scene, baseMap: action.baseMap } : scene);
    case 'scene/set-projection':
      return updateScene(project, action.sceneId, (scene) => scene.kind === 'map' ? { ...scene, projection: action.projection } : scene);
    case 'scene/set-product':
      return updateScene(project, action.sceneId, (scene) => scene.kind === 'map'
        ? { ...scene, product: { ...scene.product, ...action.product } }
        : scene);
    case 'scene/set-overlay':
      return updateScene(project, action.sceneId, (scene) => scene.kind === 'map'
        ? { ...scene, overlays: { ...scene.overlays, [action.overlay]: action.value } }
        : scene);
    case 'scene/set-map-display':
      return updateScene(project, action.sceneId, (scene) => scene.kind === 'map'
        ? { ...scene, display: { ...scene.display, [action.key]: action.value } }
        : scene);
    case 'scene/set-alert-display':
      return updateScene(project, action.sceneId, (scene) => scene.kind === 'map'
        ? { ...scene, alerts: { ...scene.alerts, [action.key]: action.value } as AlertDisplaySettings }
        : scene);
    case 'scene/set-observation-display':
      return updateScene(project, action.sceneId, (scene) => scene.kind === 'map'
        ? { ...scene, observations: { ...scene.observations, [action.key]: action.value } as ObservationDisplaySettings }
        : scene);
    case 'scene/set-header':
      return updateScene(project, action.sceneId, (scene) => scene.kind === 'map'
        ? { ...scene, header: { ...scene.header, [action.key]: action.value } as HeaderState }
        : scene);
    case 'scene/set-transition':
      return updateScene(project, action.sceneId, (scene) => ({
        ...scene,
        transition: { type: action.transitionType, durationMs: action.durationMs ?? scene.transition.durationMs },
      }));
    case 'scene/set-advance':
      return updateScene(project, action.sceneId, (scene) => ({ ...scene, advance: action.value }));
    case 'scene/set-hold-seconds':
      return updateScene(project, action.sceneId, (scene) => ({ ...scene, holdSeconds: Math.max(1, Math.min(300, action.value)) }));
    case 'scene/set-graphic-setting':
      return updateScene(project, action.sceneId, (scene) => scene.kind === 'graphic'
        ? { ...scene, settings: { ...scene.settings, [action.key]: action.value } }
        : scene);
    case 'scene/set-module-active':
      return updateScene(project, action.sceneId, (scene) => {
        const active = new Set(scene.activeModuleIds);
        if (action.value) active.add(action.moduleId);
        else active.delete(action.moduleId);
        const activeModuleIds = [...active];
        return activeModuleIds.length === scene.activeModuleIds.length
          && activeModuleIds.every((id, index) => id === scene.activeModuleIds[index])
          ? scene
          : { ...scene, activeModuleIds };
      });
    case 'scene/merge-module-state':
      return updateScene(project, action.sceneId, (scene) => ({
        ...scene,
        moduleState: {
          ...scene.moduleState,
          [action.moduleId]: { ...(scene.moduleState[action.moduleId] ?? {}), ...action.patch },
        },
      }));
    case 'scene/replace-module-state':
      return updateScene(project, action.sceneId, (scene) => ({
        ...scene,
        moduleState: { ...scene.moduleState, [action.moduleId]: { ...action.value } },
      }));
    case 'scene/reset-module-state':
      return updateScene(project, action.sceneId, (scene) => {
        if (!(action.moduleId in scene.moduleState)) return scene;
        const moduleState = { ...scene.moduleState };
        delete moduleState[action.moduleId];
        return { ...scene, moduleState };
      });
    case 'scene/normalize-module-state':
      return updateScene(project, action.sceneId, (scene) => (
        JSON.stringify(scene.moduleState) === JSON.stringify(action.moduleState)
          ? scene
          : { ...scene, moduleState: structuredClone(action.moduleState) }
      ));
    case 'scene/add-map-sample':
      return updateScene(project, action.sceneId, (scene) => scene.kind === 'map'
        ? { ...scene, samples: [...scene.samples, { ...action.sample, id: createId('sample'), createdAt: new Date().toISOString() }] }
        : scene);
    case 'scene/remove-map-sample':
      return updateScene(project, action.sceneId, (scene) => scene.kind === 'map'
        ? { ...scene, samples: scene.samples.filter((sample) => sample.id !== action.sampleId) }
        : scene);
    case 'scene/clear-map-samples':
      return updateScene(project, action.sceneId, (scene) => scene.kind === 'map' && scene.samples.length ? { ...scene, samples: [] } : scene);
    case 'scene/rename':
      return updateScene(project, action.sceneId, (scene) => ({ ...scene, name: action.name }));
    case 'scene/set-category':
      return updateScene(project, action.sceneId, (scene) => ({ ...scene, category: action.category }));
    case 'scene/duplicate': {
      const index = project.scenes.findIndex((scene) => scene.id === action.sceneId);
      if (index < 0) return project;
      const source = project.scenes[index];
      const duplicate = structuredClone(source);
      duplicate.id = createId('scene');
      duplicate.name = action.name?.trim() || `${source.name} Copy`;
      if (action.category) duplicate.category = action.category;
      if (action.transitionType) duplicate.transition = { type: action.transitionType, durationMs: action.durationMs ?? duplicate.transition.durationMs };
      if (action.advance) duplicate.advance = action.advance;
      if (typeof action.holdSeconds === 'number') duplicate.holdSeconds = Math.max(1, Math.min(300, action.holdSeconds));
      const scenes = [...project.scenes];
      scenes.splice(index + 1, 0, duplicate);
      return touchProject({ ...project, scenes, selectedSceneId: duplicate.id });
    }
    case 'scene/create-graphic': {
      const scene = graphicScene(action.templateId, action.name, action.settings);
      return touchProject({ ...project, scenes: [...project.scenes, scene], selectedSceneId: scene.id });
    }
    case 'scene/delete': {
      if (project.scenes.length <= 1) return project;
      const index = project.scenes.findIndex((scene) => scene.id === action.sceneId);
      if (index < 0) return project;
      const scenes = project.scenes.filter((scene) => scene.id !== action.sceneId);
      const next = scenes[Math.min(index, scenes.length - 1)];
      const shows = project.shows.map((show) => ({ ...show, sceneIds: show.sceneIds.filter((id) => id !== action.sceneId) }));
      return touchProject({ ...project, scenes, shows, selectedSceneId: next.id });
    }
    case 'scene/move': {
      const index = project.scenes.findIndex((scene) => scene.id === action.sceneId);
      const target = index + action.direction;
      if (index < 0 || target < 0 || target >= project.scenes.length) return project;
      const scenes = [...project.scenes];
      [scenes[index], scenes[target]] = [scenes[target], scenes[index]];
      return touchProject({ ...project, scenes });
    }
    case 'scene/select-relative': {
      const current = project.scenes.findIndex((scene) => scene.id === project.selectedSceneId);
      if (current < 0) return project;
      const next = (current + action.direction + project.scenes.length) % project.scenes.length;
      return selectScene(project, project.scenes[next].id);
    }
    default:
      return project;
  }
}
