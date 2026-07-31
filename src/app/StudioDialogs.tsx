import type { Dispatch } from 'react';
import { GraphicSceneBuilder } from '../components/GraphicSceneBuilder';
import { ProductsDialog } from '../components/ProductsDialog';
import { SaveSceneDialog } from '../components/SaveSceneDialog';
import { SettingsDialog } from '../components/SettingsDialog';
import { ShowBuilderDialog } from '../components/ShowBuilderDialog';
import { ModuleDialogHost } from '../modules/ModuleDialogHost';
import { SceneElementStylePanel } from '../scene-editing/SceneElementStylePanel';
import type { StudioAction } from '../state/studio-actions';
import type { SceneElementSelection } from '../state/scene-element-selection';
import type { StudioState } from '../state/studio-state';
import type { HeaderLegendKind, StudioScene } from '../types/domain';

interface StudioDialogsProps {
  state: StudioState;
  selectedScene: StudioScene;
  selectedElement: SceneElementSelection | null;
  dispatch: Dispatch<StudioAction>;
  onAdvanceShow: (direction: -1 | 1) => void;
}

function headerLegend(kind: string | undefined, category: string): {
  kind: HeaderLegendKind;
  lowLabel: string;
  highLabel: string;
} {
  const value = String(kind ?? category).toLowerCase();
  if (value.includes('temperature')) return { kind: 'temperature', lowLabel: 'COLD', highLabel: 'HOT' };
  if (value.includes('dew')) return { kind: 'dewpoint', lowLabel: 'DRY', highLabel: 'HUMID' };
  if (value.includes('rain')) return { kind: 'rainfall', lowLabel: 'LIGHT', highLabel: 'HEAVY' };
  if (value.includes('sat') || value.includes('infrared') || value.includes('visible')) {
    return { kind: 'satellite', lowLabel: 'WARM', highLabel: 'COLD' };
  }
  if (value.includes('outlook')) return { kind: 'outlook', lowLabel: 'LOW', highLabel: 'HIGH' };
  return { kind: 'reflectivity', lowLabel: 'LIGHT', highLabel: 'HEAVY' };
}

export function StudioDialogs({
  state,
  selectedScene,
  selectedElement,
  dispatch,
  onAdvanceShow,
}: StudioDialogsProps) {
  const project = state.project.document;
  const mapScene = selectedScene.kind === 'map' ? selectedScene : null;

  return (
    <>
      {selectedElement && (
        <SceneElementStylePanel
          scene={selectedScene}
          selection={selectedElement}
          onStyleChange={(style) => dispatch({
            type: 'scene/set-element-style',
            sceneId: selectedScene.id,
            elementId: selectedElement.elementId,
            style,
          })}
          onTransformChange={(transform) => dispatch({
            type: 'scene/set-element-transform',
            sceneId: selectedScene.id,
            elementId: selectedElement.elementId,
            transform,
          })}
          onResetStyle={() => dispatch({
            type: 'scene/reset-element-style',
            sceneId: selectedScene.id,
            elementId: selectedElement.elementId,
          })}
          onResetTransform={() => dispatch({
            type: 'scene/reset-element-transform',
            sceneId: selectedScene.id,
            elementId: selectedElement.elementId,
          })}
          onResetAll={() => dispatch({
            type: 'scene/reset-element',
            sceneId: selectedScene.id,
            elementId: selectedElement.elementId,
          })}
          onUpdateCustomObject={(objectId, patch) => dispatch({
            type: 'scene/update-custom-object', sceneId: selectedScene.id, objectId, patch,
          })}
          onDuplicateCustomObject={(objectId) => dispatch({
            type: 'scene/duplicate-custom-object', sceneId: selectedScene.id, objectId,
          })}
          onDeleteCustomObject={(objectId) => {
            dispatch({ type: 'scene/delete-custom-object', sceneId: selectedScene.id, objectId });
            dispatch({ type: 'ui/clear-scene-element' });
          }}
          onClose={() => dispatch({ type: 'ui/clear-scene-element' })}
        />
      )}

      {state.ui.activeDialog === 'products' && mapScene && (
        <ProductsDialog
          scene={mapScene}
          onClose={() => dispatch({ type: 'ui/close-dialog' })}
          onSelect={(category, product) => {
            const legend = headerLegend(product.legend, category);
            dispatch({
              type: 'scene/set-product',
              sceneId: mapScene.id,
              product: { category, id: product.id, opacity: 0.82 },
            });
            dispatch({
              type: 'scene/set-header',
              sceneId: mapScene.id,
              key: 'title',
              value: product.name.toUpperCase(),
            });
            dispatch({
              type: 'scene/set-header',
              sceneId: mapScene.id,
              key: 'legend',
              value: { ...mapScene.header.legend, ...legend, visible: true },
            });
            dispatch({ type: 'ui/close-dialog' });
          }}
        />
      )}

      {state.ui.activeDialog === 'settings' && (
        <SettingsDialog
          state={state}
          scene={selectedScene}
          tab={state.ui.settingsTab}
          dispatch={dispatch}
          onTabChange={(tab) => dispatch({ type: 'ui/set-settings-tab', tab })}
          onClose={() => dispatch({ type: 'ui/close-dialog' })}
        />
      )}

      {state.ui.activeDialog === 'graphic-builder' && (
        <GraphicSceneBuilder
          onClose={() => dispatch({ type: 'ui/close-dialog' })}
          onCreate={(templateId, name, settings) => dispatch({ type: 'scene/create-graphic', templateId, name, settings })}
        />
      )}

      {state.ui.activeDialog === 'save-scene' && (
        <SaveSceneDialog
          scene={selectedScene}
          onClose={() => dispatch({ type: 'ui/close-dialog' })}
          onSave={(name, category, transitionType, durationMs, advance, holdSeconds) => dispatch({
            type: 'scene/duplicate',
            sceneId: selectedScene.id,
            name,
            category,
            transitionType,
            durationMs,
            advance,
            holdSeconds,
          })}
        />
      )}

      {state.ui.activeDialog === 'show-builder' && (
        <ShowBuilderDialog
          scenes={project.scenes}
          shows={project.shows}
          selectedShowId={project.selectedShowId}
          activeSceneId={selectedScene.id}
          playing={state.presentation.playing}
          playbackShowId={state.presentation.showId}
          playbackIndex={state.presentation.sceneIndex}
          onSelectShow={(showId) => dispatch({ type: 'show/select', showId })}
          onCreateShow={(name) => dispatch({ type: 'show/create', name })}
          onDeleteShow={(showId) => dispatch({ type: 'show/delete', showId })}
          onUpdateShow={(showId, update) => dispatch({ type: 'show/update', showId, update })}
          onAddScene={(showId, sceneId) => dispatch({ type: 'show/add-scene', showId, sceneId })}
          onRemoveScene={(showId, sceneId, index) => dispatch({ type: 'show/remove-scene', showId, sceneId, index })}
          onMoveScene={(showId, index, direction) => dispatch({ type: 'show/move-scene', showId, index, direction })}
          onClearShow={(showId) => dispatch({ type: 'show/clear', showId })}
          onSelectScene={(sceneId) => dispatch({ type: 'scene/select', sceneId })}
          onSetTransition={(sceneId, transitionType, durationMs) => dispatch({
            type: 'scene/set-transition', sceneId, transitionType, durationMs,
          })}
          onSetHoldSeconds={(sceneId, value) => dispatch({ type: 'scene/set-hold-seconds', sceneId, value })}
          onSetAdvance={(sceneId, value) => dispatch({ type: 'scene/set-advance', sceneId, value })}
          onDuplicateScene={(sceneId) => dispatch({ type: 'scene/duplicate', sceneId })}
          onStartShow={(show) => dispatch({ type: 'presentation/start-show', showId: show.id })}
          onAdvanceShow={onAdvanceShow}
          onStopShow={() => dispatch({ type: 'presentation/stop-show' })}
          onClose={() => dispatch({ type: 'ui/close-dialog' })}
        />
      )}

      <ModuleDialogHost state={state} scene={selectedScene} dispatch={dispatch} />
    </>
  );
}
