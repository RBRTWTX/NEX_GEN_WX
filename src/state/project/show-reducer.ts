import { createId } from '../../core/id';
import type { StudioProject, StudioShow } from '../../types/domain';
import type { StudioAction } from '../studio-actions';
import { selectScene, touchProject, updateShow } from './project-helpers';

export function reduceShowProject(project: StudioProject, action: StudioAction): StudioProject {
  switch (action.type) {
    case 'presentation/start-show': {
      const show = project.shows.find((item) => item.id === action.showId);
      return show?.sceneIds[0] ? selectScene(project, show.sceneIds[0]) : project;
    }
    case 'show/create': {
      const show: StudioShow = {
        id: createId('show'),
        name: action.name.trim() || 'New Show',
        sceneIds: [],
        loop: false,
        defaultHoldSeconds: 15,
      };
      return touchProject({ ...project, shows: [...project.shows, show], selectedShowId: show.id });
    }
    case 'show/delete': {
      const shows = project.shows.filter((show) => show.id !== action.showId);
      return touchProject({ ...project, shows, selectedShowId: shows[0]?.id ?? null });
    }
    case 'show/select':
      return project.selectedShowId === action.showId ? project : { ...project, selectedShowId: action.showId };
    case 'show/update':
      return updateShow(project, action.showId, (show) => ({ ...show, ...action.update }));
    case 'show/add-scene':
      return updateShow(project, action.showId, (show) => ({ ...show, sceneIds: [...show.sceneIds, action.sceneId] }));
    case 'show/remove-scene':
      return updateShow(project, action.showId, (show) => {
        if (typeof action.index === 'number') return { ...show, sceneIds: show.sceneIds.filter((_, index) => index !== action.index) };
        const index = show.sceneIds.indexOf(action.sceneId);
        return index < 0 ? show : { ...show, sceneIds: show.sceneIds.filter((_, itemIndex) => itemIndex !== index) };
      });
    case 'show/move-scene':
      return updateShow(project, action.showId, (show) => {
        const target = action.index + action.direction;
        if (target < 0 || target >= show.sceneIds.length) return show;
        const sceneIds = [...show.sceneIds];
        [sceneIds[action.index], sceneIds[target]] = [sceneIds[target], sceneIds[action.index]];
        return { ...show, sceneIds };
      });
    case 'show/clear':
      return updateShow(project, action.showId, (show) => show.sceneIds.length ? { ...show, sceneIds: [] } : show);
    default:
      return project;
  }
}
