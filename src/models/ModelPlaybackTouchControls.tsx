import { useEffect } from 'react';
import type { MapScene } from '../types/domain';
import { useModelRuntime } from './model-runtime-store';
import {
  advanceModelForecastHour,
  modelStateForScene,
  type ModelSceneState,
} from './model-types';
import '../styles/models.css';

interface ModelPlaybackTouchControlsProps {
  scene: MapScene;
  onModuleStateChange?: (moduleId: string, patch: Record<string, unknown>) => void;
}

function patchModelState(
  onModuleStateChange: ModelPlaybackTouchControlsProps['onModuleStateChange'],
  value: Partial<ModelSceneState>,
): void {
  onModuleStateChange?.('models', value as Record<string, unknown>);
}

export function ModelPlaybackDriver({
  scene,
  onModuleStateChange,
}: ModelPlaybackTouchControlsProps) {
  const state = modelStateForScene(scene);
  const runtime = useModelRuntime(scene.id);
  const hours = runtime.availableHours.length ? runtime.availableHours : [state.forecastHour];
  const currentHour = hours.includes(runtime.forecastHour) ? runtime.forecastHour : state.forecastHour;
  const canPlay = hours.length > 1 && Boolean(runtime.run) && !runtime.error;
  const hoursKey = hours.join(',');

  useEffect(() => {
    if (!state.animationEnabled || !canPlay || runtime.loading) return undefined;

    const timer = window.setTimeout(() => {
      const next = advanceModelForecastHour(currentHour, hours, 1, state.loopEnabled);
      if (next.hour === currentHour && next.atBoundary && !state.loopEnabled) {
        patchModelState(onModuleStateChange, { animationEnabled: false });
        return;
      }
      patchModelState(onModuleStateChange, { forecastHour: next.hour });
    }, state.playbackRateMs);

    return () => window.clearTimeout(timer);
  }, [
    state.animationEnabled,
    state.loopEnabled,
    state.playbackRateMs,
    currentHour,
    canPlay,
    runtime.loading,
    hoursKey,
    onModuleStateChange,
  ]);

  return null;
}

export function ModelPlaybackTouchControls({
  scene,
  onModuleStateChange,
}: ModelPlaybackTouchControlsProps) {
  const state = modelStateForScene(scene);
  const runtime = useModelRuntime(scene.id);
  const hours = runtime.availableHours.length ? runtime.availableHours : [state.forecastHour];
  const currentHour = hours.includes(runtime.forecastHour) ? runtime.forecastHour : state.forecastHour;
  const canPlay = hours.length > 1 && Boolean(runtime.run) && !runtime.error;

  const patch = (value: Partial<ModelSceneState>): void => {
    patchModelState(onModuleStateChange, value);
  };

  const step = (direction: -1 | 1): void => {
    const next = advanceModelForecastHour(currentHour, hours, direction, state.loopEnabled);
    patch({
      forecastHour: next.hour,
      animationEnabled: false,
    });
  };

  return (
    <div
      className="model-touch-controls"
      data-operator-only="true"
      aria-label="Model playback controls"
    >
      <button
        type="button"
        className="model-touch-button"
        onClick={(event) => {
          event.stopPropagation();
          step(-1);
        }}
        disabled={!canPlay || runtime.loading}
        title="Previous forecast hour"
        aria-label="Previous forecast hour"
      >
        ◀
      </button>
      <button
        type="button"
        className={`model-touch-button model-touch-button--play ${state.animationEnabled ? 'is-active' : ''}`}
        onClick={(event) => {
          event.stopPropagation();
          patch({ animationEnabled: !state.animationEnabled });
        }}
        disabled={!canPlay}
        title={state.animationEnabled ? 'Pause model animation' : 'Play model animation'}
        aria-label={state.animationEnabled ? 'Pause model animation' : 'Play model animation'}
      >
        {state.animationEnabled ? 'Ⅱ' : '▶'}
      </button>
      <button
        type="button"
        className="model-touch-button"
        onClick={(event) => {
          event.stopPropagation();
          step(1);
        }}
        disabled={!canPlay || runtime.loading}
        title="Next forecast hour"
        aria-label="Next forecast hour"
      >
        ▶
      </button>
      <button
        type="button"
        className="model-touch-button model-touch-button--refresh"
        onClick={(event) => {
          event.stopPropagation();
          patch({
            refreshToken: state.refreshToken + 1,
            animationEnabled: false,
          });
        }}
        disabled={runtime.loading}
        title="Refresh HRRR run and selected field"
        aria-label="Refresh HRRR run and selected field"
      >
        ↻
      </button>
      <button
        type="button"
        className={`model-touch-button model-touch-button--loop ${state.loopEnabled ? 'is-active' : ''}`}
        onClick={(event) => {
          event.stopPropagation();
          patch({ loopEnabled: !state.loopEnabled });
        }}
        title={state.loopEnabled ? 'Loop is on' : 'Loop is off'}
        aria-pressed={state.loopEnabled}
      >
        LOOP
      </button>
      <span className="model-touch-status" title={runtime.run?.label ?? 'HRRR'}>
        <b>F{String(currentHour).padStart(2, '0')}</b>
        <small>{runtime.loading ? 'LOADING' : runtime.fieldReady ? 'READY' : 'MODEL'}</small>
      </span>
    </div>
  );
}
