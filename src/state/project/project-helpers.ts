import type { StudioProject, StudioScene, StudioShow } from '../../types/domain';

export function touchProject(project: StudioProject): StudioProject {
  return { ...project, updatedAt: new Date().toISOString() };
}

export function updateScene(
  project: StudioProject,
  sceneId: string,
  update: (scene: StudioScene) => StudioScene,
): StudioProject {
  const index = project.scenes.findIndex((scene) => scene.id === sceneId);
  if (index < 0) return project;
  const current = project.scenes[index];
  const nextScene = update(current);
  if (nextScene === current) return project;
  const scenes = [...project.scenes];
  scenes[index] = nextScene;
  return touchProject({ ...project, scenes });
}

export function updateShow(
  project: StudioProject,
  showId: string,
  update: (show: StudioShow) => StudioShow,
): StudioProject {
  const index = project.shows.findIndex((show) => show.id === showId);
  if (index < 0) return project;
  const current = project.shows[index];
  const nextShow = update(current);
  if (nextShow === current) return project;
  const shows = [...project.shows];
  shows[index] = nextShow;
  return touchProject({ ...project, shows });
}

export function selectScene(project: StudioProject, sceneId: string): StudioProject {
  if (project.selectedSceneId === sceneId || !project.scenes.some((scene) => scene.id === sceneId)) return project;
  return { ...project, selectedSceneId: sceneId };
}
