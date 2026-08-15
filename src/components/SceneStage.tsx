import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type {
  CameraState,
  CustomSceneObject,
  HeaderState,
  MapSample,
  ProductSelection,
  SceneElementStyle,
  SceneElementTransform,
  StudioBranding,
  StudioScene,
} from '../types/domain';
import type { SceneElementSelection } from '../state/scene-element-selection';
import { SceneEditingProvider } from '../scene-editing/SceneEditingContext';
import { CustomSceneObjectLayer } from '../scene-editing/CustomSceneObjectLayer';
import { SceneObjectOverlay } from '../scene-editing/SceneObjectOverlay';
import { MapStage } from '../map/MapStage';
import { AlertCallout } from './AlertCallout';
import { BroadcastHeader } from './BroadcastHeader';
import { GraphicStage } from './GraphicStage';
import { ObservationCallout } from './ObservationCallout';
import { ObservationLegend } from './ObservationLegend';
import { RadarQuickToolbar } from '../radar/RadarQuickToolbar';

export interface SceneStageProps {
  scene: StudioScene;
  branding?: StudioBranding;
  interactive: boolean;
  renderPurpose?: 'operator' | 'output' | 'export';
  contextMenuOpen?: boolean;
  selectedElementId?: string | null;
  onToggleContextMenu?: () => void;
  onSelectElement?: (selection: SceneElementSelection) => void;
  onClearElementSelection?: () => void;
  onElementStyleChange?: (elementId: string, style: Partial<SceneElementStyle>) => void;
  onElementTransformChange?: (elementId: string, transform: Partial<SceneElementTransform>) => void;
  onElementStyleReset?: (elementId: string) => void;
  onElementTransformReset?: (elementId: string) => void;
  onElementReset?: (elementId: string) => void;
  onCustomObjectUpdate?: (objectId: string, patch: Partial<CustomSceneObject>) => void;
  onCustomObjectDelete?: (objectId: string) => void;
  onCustomObjectDuplicate?: (objectId: string) => void;
  onHeaderChange?: <K extends keyof HeaderState>(key: K, value: HeaderState[K]) => void;
  onGraphicSettingChange?: (key: string, value: unknown) => void;
  onCameraChange?: (camera: CameraState) => void;
  onAddSample?: (sample: Omit<MapSample, 'id' | 'createdAt'>) => void;
  onRemoveSample?: (sampleId: string) => void;
  onModuleStateChange?: (moduleId: string, patch: Record<string, unknown>) => void;
  onProductChange?: (patch: Partial<ProductSelection>) => void;
  onRenderReady?: () => void;
}

const noop = () => undefined;

export const SceneStage = forwardRef<HTMLDivElement, SceneStageProps>(function SceneStage(
  {
    scene,
    branding,
    interactive,
    renderPurpose = interactive ? 'operator' : 'output',
    contextMenuOpen,
    selectedElementId = null,
    onToggleContextMenu,
    onSelectElement = noop,
    onClearElementSelection = noop,
    onElementStyleChange = noop,
    onElementTransformChange = noop,
    onElementStyleReset = noop,
    onElementTransformReset = noop,
    onElementReset = noop,
    onCustomObjectUpdate = noop,
    onCustomObjectDelete = noop,
    onCustomObjectDuplicate = noop,
    onHeaderChange,
    onGraphicSettingChange,
    onCameraChange,
    onAddSample,
    onRemoveSample,
    onModuleStateChange,
    onProductChange,
    onRenderReady,
  },
  forwardedRef,
) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  useImperativeHandle(forwardedRef, () => stageRef.current as HTMLDivElement, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const update = () => {
      const rect = stage.getBoundingClientRect();
      stage.style.setProperty('--scene-stage-width', `${rect.width}px`);
      stage.style.setProperty('--scene-stage-height', `${rect.height}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);


  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    stage.dataset.renderReady = 'false';
    if (scene.kind === 'map') return undefined;
    let cancelled = false;
    void (async () => {
      await document.fonts?.ready;
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (cancelled || !stageRef.current) return;
      stageRef.current.dataset.renderReady = 'true';
      onRenderReady?.();
    })();
    return () => { cancelled = true; };
  }, [onRenderReady, scene.id, scene.kind]);

  function markRenderReady(): void {
    if (!stageRef.current) return;
    stageRef.current.dataset.renderReady = 'true';
    onRenderReady?.();
  }

  return (
    <SceneEditingProvider
      sceneId={scene.id}
      interactive={interactive}
      stageRef={stageRef}
      selectedElementId={selectedElementId}
      elementOverrides={scene.elementOverrides}
      customObjects={scene.customObjects}
      selectElement={onSelectElement}
      clearSelection={onClearElementSelection}
      updateElementStyle={onElementStyleChange}
      updateElementTransform={onElementTransformChange}
      resetElementStyle={onElementStyleReset}
      resetElementTransform={onElementTransformReset}
      resetElement={onElementReset}
      updateCustomObject={onCustomObjectUpdate}
      deleteCustomObject={onCustomObjectDelete}
      duplicateCustomObject={onCustomObjectDuplicate}
    >
      <div
        className={`scene-stage scene-stage--${scene.kind}`}
        ref={stageRef}
        data-scene-id={scene.id}
        data-render-ready="false"
        onPointerDown={(event) => {
          if (!interactive) return;
          if ((event.target as HTMLElement).closest('[data-scene-object-id], [data-operator-only="true"]')) return;
          onClearElementSelection();
        }}
      >
        {scene.kind === 'map' ? (
          <>
            <MapStage
              scene={scene}
              interactive={interactive}
              renderPurpose={renderPurpose}
              onCameraChange={onCameraChange}
              onAddSample={onAddSample}
              onRemoveSample={onRemoveSample}
              onRenderReady={markRenderReady}
            />
            {interactive && scene.product.category === 'radar' && onModuleStateChange && onProductChange && (
              <RadarQuickToolbar
                scene={scene}
                onModuleStateChange={(patch) => onModuleStateChange('radar', patch)}
                onProductChange={onProductChange}
                onHeaderLegendChange={(legend) => onHeaderChange?.('legend', legend)}
              />
            )}
            <BroadcastHeader
              scene={scene}
              studioName={branding?.shortName ?? 'NEX GEN WX'}
              logoDataUrl={branding?.logoDataUrl}
              interactive={interactive}
              menuOpen={contextMenuOpen}
              onToggleMenu={onToggleContextMenu}
              onHeaderChange={onHeaderChange}
            />
            {scene.overlays.alerts && <AlertCallout />}
            {scene.overlays.observations && <ObservationCallout interactive={interactive} />}
            {scene.overlays.observations && <ObservationLegend settings={scene.observations} />}
          </>
        ) : (
          <GraphicStage scene={scene} onSettingChange={onGraphicSettingChange} />
        )}
        <CustomSceneObjectLayer objects={scene.customObjects} onUpdate={onCustomObjectUpdate} />
        <SceneObjectOverlay />
      </div>
    </SceneEditingProvider>
  );
});
