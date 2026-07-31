import type { StudioProject } from '../types/domain';
import type { StudioAction } from './studio-actions';
import { selectScene, touchProject } from './project/project-helpers';
import { reduceSceneProject } from './project/scene-reducer';
import { reduceShowProject } from './project/show-reducer';

export function reduceProject(project: StudioProject, action: StudioAction): StudioProject {
  if (action.type === 'project/load') return action.project;
  if (action.type === 'project/set-name') return touchProject({ ...project, name: action.name });

  const sceneResult = reduceSceneProject(project, action);
  if (sceneResult !== project) return sceneResult;
  return reduceShowProject(project, action);
}

export function selectSceneById(project: StudioProject, sceneId: string): StudioProject {
  return selectScene(project, sceneId);
}
