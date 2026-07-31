import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { SceneStage, type SceneStageProps } from '../components/SceneStage';
import type { StudioScene, TransitionKind } from '../types/domain';

interface TransitionLayerState {
  current: StudioScene;
  previous: StudioScene | null;
  phase: 'idle' | 'preparing' | 'running';
  token: number;
  kind: TransitionKind;
  durationMs: number;
}

export interface SceneTransitionViewportProps extends Omit<SceneStageProps, 'scene'> {
  scene: StudioScene;
  transitionsEnabled?: boolean;
  onTransitionComplete?: (scene: StudioScene) => void;
}

function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const SceneTransitionViewport = forwardRef<HTMLDivElement, SceneTransitionViewportProps>(
  function SceneTransitionViewport(
    {
      scene,
      transitionsEnabled = true,
      onTransitionComplete,
      ...stageProps
    },
    forwardedRef,
  ) {
    const currentStageRef = useRef<HTMLDivElement | null>(null);
    const latestSceneRef = useRef(scene);
    const completionRef = useRef(onTransitionComplete);
    const timerRef = useRef<number | null>(null);
    const frameRef = useRef<number | null>(null);
    const [layers, setLayers] = useState<TransitionLayerState>(() => ({
      current: scene,
      previous: null,
      phase: 'idle',
      token: 0,
      kind: scene.transition.type,
      durationMs: scene.transition.durationMs,
    }));

    latestSceneRef.current = scene;
    completionRef.current = onTransitionComplete;
    useImperativeHandle(forwardedRef, () => currentStageRef.current as HTMLDivElement, []);

    useEffect(() => () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    }, []);

    useEffect(() => {
      setLayers((value) => value.current.id === scene.id ? { ...value, current: scene } : value);
    }, [scene]);

    useEffect(() => {
      if (scene.id === layers.current.id) {
        setLayers((value) => ({ ...value, current: scene }));
        return;
      }

      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);

      const kind = transitionsEnabled && !reducedMotion() ? scene.transition.type : 'cut';
      const durationMs = kind === 'cut' ? 0 : Math.max(100, Math.min(8000, scene.transition.durationMs));
      const token = layers.token + 1;
      const previous = kind === 'cut' ? null : layers.current;

      setLayers({ current: scene, previous, phase: kind === 'cut' ? 'idle' : 'preparing', token, kind, durationMs });

      if (kind === 'cut') {
        completionRef.current?.(scene);
        return;
      }

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = requestAnimationFrame(() => {
          setLayers((value) => value.token === token ? { ...value, phase: 'running' } : value);
        });
      });
      timerRef.current = window.setTimeout(() => {
        setLayers((value) => value.token === token
          ? { ...value, previous: null, phase: 'idle' }
          : value);
        completionRef.current?.(latestSceneRef.current);
      }, durationMs + 80);
    // Only scene identity starts a transition. Same-scene edits update the current layer above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scene.id, transitionsEnabled]);

    const transitionStyle = { '--scene-transition-duration': `${layers.durationMs}ms` } as CSSProperties;

    return (
      <div
        className={`scene-transition-viewport transition-${layers.kind} phase-${layers.phase}`}
        style={transitionStyle}
        data-transition-kind={layers.kind}
        data-transition-phase={layers.phase}
      >
        {layers.previous && (
          <div className="scene-transition-layer scene-transition-layer--previous" aria-hidden="true">
            <SceneStage
              scene={layers.previous}
              branding={stageProps.branding}
              interactive={false}
            />
          </div>
        )}
        <div className="scene-transition-layer scene-transition-layer--current">
          <SceneStage
            {...stageProps}
            ref={currentStageRef}
            scene={layers.current}
          />
        </div>
      </div>
    );
  },
);
