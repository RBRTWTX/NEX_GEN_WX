import type { Dispatch, RefObject } from 'react';
import type { StudioAction } from '../state/studio-actions';
import type { StudioProject, StudioScene } from '../types/domain';
import type { SceneExportHostHandle } from './SceneExportHost';
import { exportProjectAsJson } from './export-scene';

interface ExportControllerOptions {
  project: StudioProject;
  selectedScene: StudioScene;
  exportHostRef: RefObject<SceneExportHostHandle | null>;
  dispatch: Dispatch<StudioAction>;
}

export function createExportController(options: ExportControllerOptions) {
  async function exportCurrent(): Promise<void> {
    if (!options.exportHostRef.current) return;
    options.dispatch({ type: 'status/set', message: 'Rendering verified 1920×1080 PNG…' });
    try {
      const result = await options.exportHostRef.current.exportScene(options.selectedScene, options.project.branding);
      options.dispatch({
        type: 'status/set',
        message: `${result.detail} Saved: ${result.path}`,
        level: result.verified ? 'success' : 'warning',
      });
    } catch (error) {
      options.dispatch({ type: 'status/set', message: `Export failed: ${String(error)}`, level: 'error' });
    }
  }

  async function exportSelectedShow(): Promise<void> {
    const show = options.project.shows.find((item) => item.id === options.project.selectedShowId);
    if (!show?.sceneIds.length || !options.exportHostRef.current) return;
    const scenes = show.sceneIds
      .map((sceneId) => options.project.scenes.find((scene) => scene.id === sceneId))
      .filter((scene): scene is StudioScene => Boolean(scene));
    if (!scenes.length) return;
    try {
      for (let index = 0; index < scenes.length; index += 1) {
        options.dispatch({ type: 'status/set', message: `Exporting show slide ${index + 1} of ${scenes.length}…` });
        const prefix = `${String(index + 1).padStart(2, '0')}_${show.name}`;
        await options.exportHostRef.current.exportScene(scenes[index], options.project.branding, prefix);
      }
      options.dispatch({
        type: 'status/set',
        message: `Exported ${scenes.length} verified PNG slides for ${show.name}.`,
        level: 'success',
      });
    } catch (error) {
      options.dispatch({ type: 'status/set', message: `Show export stopped: ${String(error)}`, level: 'error' });
    }
  }

  function exportProjectFile(): void {
    const fileName = exportProjectAsJson(options.project, options.project.name);
    options.dispatch({ type: 'status/set', message: `Project exported: ${fileName}`, level: 'success' });
  }

  return { exportCurrent, exportSelectedShow, exportProjectFile };
}
