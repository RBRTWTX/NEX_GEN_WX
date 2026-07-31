import type { MapScene, StudioProject, StudioScene } from '../types/domain';
import type { StudioState } from './studio-state';

export function selectProject(state: StudioState): StudioProject {
  return state.project.document;
}

export function selectActiveScene(state: StudioState): StudioScene {
  const project = selectProject(state);
  const scene = project.scenes.find((item) => item.id === project.selectedSceneId) ?? project.scenes[0];
  if (!scene) {
    throw new Error('A NEX GEN WX project must contain at least one scene.');
  }
  return scene;
}

export function selectActiveMapScene(state: StudioState): MapScene | null {
  const scene = selectActiveScene(state);
  return scene.kind === 'map' ? scene : null;
}
