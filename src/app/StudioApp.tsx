import { useEffect, useMemo, useReducer, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { defaultProject } from '../scenes/default-project';
import { BottomDock } from '../components/BottomDock';
import { ContextToolsMenu } from '../components/ContextToolsMenu';
import { SceneLibrary } from '../components/SceneLibrary';
import { SceneTransitionViewport } from '../rendering/SceneTransitionViewport';
import { StageQuickTools } from '../components/StageQuickTools';
import { TopBar } from '../components/TopBar';
import { SceneExportHost, type SceneExportHostHandle } from '../output/SceneExportHost';
import { useOutputController } from '../output/use-output-controller';
import { createExportController } from '../output/use-export-controller';
import { loadLatestProject, saveProject } from '../engine/tauri-commands';
import { migrateProject } from '../core/project-migration';
import { useWeatherData } from '../data/weather-data-context';
import type {
  HeaderState,
  StudioScene,
} from '../types/domain';
import type { ModuleCommand } from '../types/module';
import { useModuleRegistry } from '../modules/module-context';
import { studioReducer } from '../state/studio-reducer';
import { createInitialStudioState, type StudioDialogId } from '../state/studio-state';
import { selectActiveScene } from '../state/selectors';
import { StudioDialogs } from './StudioDialogs';
import { useSceneThumbnails } from '../thumbnails/use-scene-thumbnails';

const LOCAL_PROJECT_KEY = 'nex-gen-wx-project-v8';
const LEGACY_PROJECT_KEYS = [
  'nex-gen-wx-project-v7',
  'nex-gen-wx-project-v6',
  'nex-gen-wx-project-v5',
  'nex-gen-wx-project-v4',
  'ngws-project-v3',
  'ngws-project-v2',
  'ngws-project',
];

const initialState = createInitialStudioState(structuredClone(defaultProject));

function scenePositionLabel(scene: StudioScene): string {
  if (scene.kind === 'graphic') return 'GRAPHIC SCENE';
  const scale = scene.camera.zoom < 4.5 ? 'CONUS' : scene.camera.zoom < 7 ? 'REGIONAL' : 'LOCAL';
  return `${scene.camera.center[1].toFixed(3)}°, ${scene.camera.center[0].toFixed(3)}° Z${scene.camera.zoom.toFixed(1)} · ${scale}`;
}

function readLocalProject(): unknown {
  for (const key of [LOCAL_PROJECT_KEY, ...LEGACY_PROJECT_KEYS]) {
    try {
      const value = localStorage.getItem(key);
      if (value) return JSON.parse(value);
    } catch {
      // Continue to the next recovery key.
    }
  }
  return null;
}

export function StudioApp() {
  const [state, dispatch] = useReducer(studioReducer, initialState);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const exportHostRef = useRef<SceneExportHostHandle | null>(null);
  const hydrateStartedRef = useRef(false);
  const weather = useWeatherData();
  const registry = useModuleRegistry();
  const project = state.project.document;
  const selectedScene = useMemo(() => selectActiveScene(state), [state]);
  const selectedElement = state.ui.selectedSceneElement?.sceneId === selectedScene?.id
    ? state.ui.selectedSceneElement
    : null;
  const thumbnails = useSceneThumbnails({
    projectId: project.id,
    scenes: project.scenes,
    selectedScene,
    branding: project.branding,
    stageRef,
  });

  useEffect(() => {
    if (hydrateStartedRef.current) return;
    hydrateStartedRef.current = true;
    void (async () => {
      const localProject = readLocalProject();
      let diskProject: unknown = null;
      try {
        diskProject = await loadLatestProject();
      } catch {
        // Browser development mode or no native project file yet.
      }
      const migratedLocal = localProject
        ? registry.normalizeProjectModuleState(migrateProject(localProject))
        : null;
      const migratedDisk = diskProject
        ? registry.normalizeProjectModuleState(migrateProject(diskProject))
        : null;
      if (migratedLocal || migratedDisk) {
        const localUpdated = migratedLocal ? Date.parse(migratedLocal.updatedAt) || 0 : -1;
        const diskUpdated = migratedDisk ? Date.parse(migratedDisk.updatedAt) || 0 : -1;
        const useLocal = Boolean(migratedLocal && localUpdated >= diskUpdated);
        dispatch({
          type: 'project/load',
          project: useLocal ? migratedLocal! : migratedDisk!,
          source: useLocal ? 'automatic local save' : 'project folder',
        });
      } else {
        dispatch({
          type: 'project/load',
          project: registry.normalizeProjectModuleState(structuredClone(defaultProject)),
          source: 'R3 reference presentation',
        });
      }
    })();
  }, [registry]);

  useEffect(() => {
    if (!state.project.hydrated) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(LOCAL_PROJECT_KEY, JSON.stringify(project));
        if (state.project.persistence === 'dirty') {
          dispatch({ type: 'project/persistence', value: 'saved' });
        }
      } catch (error) {
        dispatch({ type: 'project/persistence', value: 'error' });
        dispatch({ type: 'status/set', message: `Automatic save failed: ${String(error)}`, level: 'error' });
      }
    }, 750);
    return () => window.clearTimeout(timer);
  }, [project, state.project.hydrated, state.project.persistence]);

  useEffect(() => {
    if (!state.project.hydrated || !selectedScene) return;
    const normalized = registry.normalizeSceneModuleState(selectedScene);
    if (normalized === selectedScene) return;
    dispatch({
      type: 'scene/normalize-module-state',
      sceneId: selectedScene.id,
      moduleState: normalized.moduleState,
    });
  }, [registry, selectedScene, state.project.hydrated]);

  useEffect(() => {
    if (!state.presentation.playing || !selectedScene) return;
    const show = project.shows.find((item) => item.id === state.presentation.showId);
    if (!show && selectedScene.advance === 'manual') return;
    const holdSeconds = show?.defaultHoldSeconds ?? selectedScene.holdSeconds;
    const timer = window.setTimeout(() => {
      if (show) dispatch({ type: 'presentation/advance-show', direction: 1 });
      else dispatch({ type: 'scene/select-relative', direction: 1 });
    }, Math.max(1, holdSeconds) * 1000);
    return () => window.clearTimeout(timer);
  }, [project.shows, selectedScene, state.presentation.playing, state.presentation.showId]);

  useEffect(() => {
    if (!selectedScene) return;
    void getCurrentWindow().setTitle(`NEX GEN WX — ${selectedScene.name}`).catch(() => undefined);
  }, [selectedScene]);

  // Hooks must always run in the same order, including while project hydration is pending.
  // The output controller accepts a nullable scene and stays dormant until both the project
  // and active scene are ready.
  const { openOutput } = useOutputController({
    scene: selectedScene,
    branding: project.branding,
    hydrated: state.project.hydrated,
    dispatch,
  });

  if (!state.project.hydrated || !selectedScene) {
    return <main className="studio-loading">Preparing NEX GEN WX…</main>;
  }

  const mapScene = selectedScene.kind === 'map' ? selectedScene : null;
  const dockLayerTools = registry.getTools(selectedScene, 'dock-layer');
  const dockModuleTools = registry.getTools(selectedScene, 'dock-tool');
  const quickTools = registry.getTools(selectedScene, 'quick');
  const contextTools = registry.getTools(selectedScene, 'context');
  const { exportCurrent, exportSelectedShow, exportProjectFile } = createExportController({
    project,
    selectedScene,
    exportHostRef,
    dispatch,
  });

  async function saveCurrentProject(): Promise<void> {
    dispatch({ type: 'project/persistence', value: 'saving' });
    let localSaved = false;
    try {
      localStorage.setItem(LOCAL_PROJECT_KEY, JSON.stringify(project));
      localSaved = true;
    } catch (error) {
      dispatch({ type: 'project/persistence', value: 'error' });
      dispatch({ type: 'status/set', message: `Project save failed: ${String(error)}`, level: 'error' });
      return;
    }
    try {
      const path = await saveProject(project);
      dispatch({ type: 'project/persistence', value: 'saved' });
      dispatch({ type: 'status/set', message: `Project saved: ${path}`, level: 'success' });
    } catch (error) {
      dispatch({ type: 'project/persistence', value: localSaved ? 'saved' : 'error' });
      dispatch({
        type: 'status/set',
        message: localSaved
          ? `Project saved locally; native project file unavailable: ${String(error)}`
          : `Project save failed: ${String(error)}`,
        level: localSaved ? 'warning' : 'error',
      });
    }
  }

  function openDialog(dialog: StudioDialogId): void {
    dispatch({ type: 'ui/open-dialog', dialog });
  }

  function restoreSceneHome(): void {
    if (!mapScene) return;
    const reference = defaultProject.scenes.find((scene) => scene.id === mapScene.id);
    const camera = reference?.kind === 'map'
      ? reference.camera
      : { ...mapScene.camera, bearing: 0, pitch: 0 };
    dispatch({ type: 'scene/set-camera', sceneId: mapScene.id, camera });
    dispatch({ type: 'status/set', message: 'Scene home view restored' });
  }

  function changeZoom(amount: number): void {
    if (!mapScene) return;
    dispatch({
      type: 'scene/set-camera',
      sceneId: mapScene.id,
      camera: {
        ...mapScene.camera,
        zoom: Math.max(1, Math.min(18, mapScene.camera.zoom + amount)),
      },
    });
  }

  function updateHeader<K extends keyof HeaderState>(key: K, value: HeaderState[K]): void {
    if (!mapScene) return;
    dispatch({ type: 'scene/set-header', sceneId: mapScene.id, key, value });
  }


  function invokeModuleCommand(command: ModuleCommand): void {
    switch (command.kind) {
      case 'open-dialog':
        openDialog(command.dialog);
        return;
      case 'open-settings':
        dispatch({ type: 'ui/open-dialog', dialog: 'settings', settingsTab: command.tab });
        return;
      case 'toggle-overlay':
        if (mapScene) dispatch({
          type: 'scene/set-overlay',
          sceneId: mapScene.id,
          overlay: command.overlay,
          value: !mapScene.overlays[command.overlay],
        });
        return;
      case 'clear-samples':
        if (mapScene) dispatch({ type: 'scene/clear-map-samples', sceneId: mapScene.id });
        return;
      case 'map-home':
        restoreSceneHome();
        return;
      case 'map-zoom':
        changeZoom(command.amount);
        return;
      case 'status':
        dispatch({ type: 'status/set', message: command.message });
        return;
      default:
        return;
    }
  }
  function advanceSelectedShow(direction: -1 | 1): void {
    if (state.presentation.showId) {
      dispatch({ type: 'presentation/advance-show', direction });
      return;
    }
    const show = project.shows.find((item) => item.id === project.selectedShowId);
    if (!show?.sceneIds.length) {
      dispatch({ type: 'scene/select-relative', direction });
      return;
    }
    const current = show.sceneIds.indexOf(selectedScene.id);
    const baseIndex = current >= 0 ? current : 0;
    const proposed = baseIndex + direction;
    const nextIndex = show.loop
      ? (proposed + show.sceneIds.length) % show.sceneIds.length
      : Math.max(0, Math.min(show.sceneIds.length - 1, proposed));
    dispatch({ type: 'scene/select', sceneId: show.sceneIds[nextIndex] });
  }

  function clearWeather(): void {
    if (!mapScene) return;
    dispatch({ type: 'scene/set-product', sceneId: mapScene.id, product: { opacity: 0 } });
    dispatch({ type: 'scene/set-overlay', sceneId: mapScene.id, overlay: 'alerts', value: false });
    dispatch({ type: 'scene/set-overlay', sceneId: mapScene.id, overlay: 'observations', value: false });
    dispatch({ type: 'status/set', message: 'Weather layers cleared from the current scene' });
  }



  return (
    <main className={`app-shell ${state.ui.leftPanelOpen ? '' : 'left-collapsed'}`}>
      <TopBar
        studioName="NEX GEN WX"
        projectName={project.name}
        dataState={weather.overallState}
        mapPosition={scenePositionLabel(selectedScene)}
        outputStatus={state.presentation.outputStatus}
        outputDetail={state.presentation.outputDetail}
        leftPanelOpen={state.ui.leftPanelOpen}
        onToggleLeftPanel={() => dispatch({ type: 'ui/toggle-left-panel' })}
        onSearch={(query) => dispatch({ type: 'status/set', message: `Place search queued: ${query}` })}
        onHome={() => dispatch({ type: 'scene/select', sceneId: project.scenes[0].id })}
        onOpenProducts={() => mapScene ? openDialog('products') : openDialog('graphic-builder')}
        onOpenShow={() => openDialog('show-builder')}
        onOpenModelLab={() => openDialog('module:model-lab')}
        onOpenSources={() => openDialog('module:sources')}
        onOpenSettings={() => openDialog('settings')}
        onPresent={() => void openOutput()}
      />

      {state.ui.leftPanelOpen && (
        <SceneLibrary
          scenes={project.scenes}
          selectedSceneId={selectedScene.id}
          selectedScene={selectedScene}
          thumbnails={thumbnails}
          onSelect={(sceneId) => dispatch({ type: 'scene/select', sceneId })}
          onDuplicate={(sceneId) => dispatch({ type: 'scene/duplicate', sceneId })}
          onDelete={(sceneId) => dispatch({ type: 'scene/delete', sceneId })}
          onAddGraphic={() => openDialog('graphic-builder')}
          onSaveScene={() => openDialog('save-scene')}
          onClearWeather={clearWeather}
          onOverlayChange={(overlay, value) => mapScene && dispatch({
            type: 'scene/set-overlay', sceneId: mapScene.id, overlay, value,
          })}
        />
      )}

      <section className="stage">
        <SceneTransitionViewport
          ref={stageRef}
          scene={selectedScene}
          branding={project.branding}
          interactive
          transitionsEnabled={state.presentation.playing}
          contextMenuOpen={state.ui.contextMenuOpen}
          onToggleContextMenu={() => dispatch({
            type: 'ui/set-context-menu', value: !state.ui.contextMenuOpen,
          })}
          selectedElementId={selectedElement?.elementId ?? null}
          onSelectElement={(selection) => dispatch({ type: 'ui/select-scene-element', selection })}
          onClearElementSelection={() => dispatch({ type: 'ui/clear-scene-element' })}
          onElementStyleChange={(elementId, style) => dispatch({
            type: 'scene/set-element-style', sceneId: selectedScene.id, elementId, style,
          })}
          onElementTransformChange={(elementId, transform) => dispatch({
            type: 'scene/set-element-transform', sceneId: selectedScene.id, elementId, transform,
          })}
          onElementStyleReset={(elementId) => dispatch({
            type: 'scene/reset-element-style', sceneId: selectedScene.id, elementId,
          })}
          onElementTransformReset={(elementId) => dispatch({
            type: 'scene/reset-element-transform', sceneId: selectedScene.id, elementId,
          })}
          onElementReset={(elementId) => dispatch({
            type: 'scene/reset-element', sceneId: selectedScene.id, elementId,
          })}
          onCustomObjectUpdate={(objectId, patch) => dispatch({
            type: 'scene/update-custom-object', sceneId: selectedScene.id, objectId, patch,
          })}
          onCustomObjectDelete={(objectId) => dispatch({
            type: 'scene/delete-custom-object', sceneId: selectedScene.id, objectId,
          })}
          onCustomObjectDuplicate={(objectId) => dispatch({
            type: 'scene/duplicate-custom-object', sceneId: selectedScene.id, objectId,
          })}
          onHeaderChange={updateHeader}
          onGraphicSettingChange={(key, value) => dispatch({
            type: 'scene/set-graphic-setting', sceneId: selectedScene.id, key, value,
          })}
          onCameraChange={(camera) => dispatch({
            type: 'scene/set-camera', sceneId: selectedScene.id, camera,
          })}
          onAddSample={(sample) => dispatch({
            type: 'scene/add-map-sample', sceneId: selectedScene.id, sample,
          })}
          onRemoveSample={(sampleId) => dispatch({
            type: 'scene/remove-map-sample', sceneId: selectedScene.id, sampleId,
          })}
        />

        {mapScene && (
          <>
            <ContextToolsMenu
              scene={mapScene}
              open={state.ui.contextMenuOpen}
              tools={contextTools}
              onInvoke={invokeModuleCommand}
              onClose={() => dispatch({ type: 'ui/set-context-menu', value: false })}
            />
            <StageQuickTools tools={quickTools} onInvoke={invokeModuleCommand} />
          </>
        )}


        <StudioDialogs
          state={state}
          selectedScene={selectedScene}
          selectedElement={selectedElement}
          dispatch={dispatch}
          onAdvanceShow={advanceSelectedShow}
        />
      </section>

      <BottomDock
        scene={selectedScene}
        statusMessage={state.status.message}
        layerTools={dockLayerTools}
        moduleTools={dockModuleTools}
        onInvoke={invokeModuleCommand}
        onProductOpacityChange={(opacity) => mapScene && dispatch({
          type: 'scene/set-product', sceneId: mapScene.id, product: { opacity },
        })}
        onSmoothingChange={(enabled) => mapScene && dispatch({
          type: 'scene/set-product',
          sceneId: mapScene.id,
          product: { smoothing: enabled ? 'smooth' : 'balanced' },
        })}
        onSave={() => void saveCurrentProject()}
        onExportProject={exportProjectFile}
        onExportPng={() => void exportCurrent()}
        onExportShow={() => void exportSelectedShow()}
        exportShowDisabled={!project.selectedShowId || !(project.shows.find((show) => show.id === project.selectedShowId)?.sceneIds.length)}
      />
      <SceneExportHost ref={exportHostRef} />
    </main>
  );
}
