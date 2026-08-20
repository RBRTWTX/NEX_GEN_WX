import '../../../styles/models.css';
import type { ModuleDialogPanelProps } from '../../../types/module';
import {
  MODEL_FIELDS,
  modelIsActive,
  modelStateForScene,
  type ModelSceneState,
} from '../../../models/model-types';
import { useModelRuntime } from '../../../models/model-runtime-store';

export function ModelLabDialogPanel({
  scene,
  dispatch,
}: ModuleDialogPanelProps) {
  if (scene.kind !== 'map') {
    return <div className="dialog-message"><h3>Model Lab</h3><p>Forecast models require a map scene.</p></div>;
  }

  const state = modelStateForScene(scene);
  const runtime = useModelRuntime(scene.id);
  const active = modelIsActive(scene);
  const patch = (value: Partial<ModelSceneState>) => dispatch({
    type: 'scene/merge-module-state',
    sceneId: scene.id,
    moduleId: 'models',
    patch: value,
  });

  const hours = runtime.availableHours.length ? runtime.availableHours : [state.forecastHour];
  const runLabel = runtime.run?.label ?? (runtime.loading ? 'Resolving latest HRRR run…' : 'No HRRR run loaded');

  return (
    <div className="model-lab" data-operator-only="true">
      <div className="model-lab__header">
        <div>
          <h3>Model Lab</h3>
          <small>Direct NOAA/NODD HRRR decoding</small>
        </div>
        <button
          type="button"
          onClick={() => patch({ refreshToken: state.refreshToken + 1, animationEnabled: false })}
          disabled={!active || runtime.loading}
          title="Refresh model catalog and selected field"
        >
          ↻
        </button>
      </div>

      {!active && (
        <div className="model-lab__status">
          <strong>This scene is not a Models scene.</strong>
          <small>Set the scene category to Models to activate the forecast-model runtime.</small>
          <button
            type="button"
            onClick={() => dispatch({ type: 'scene/set-category', sceneId: scene.id, category: 'Models' })}
          >
            Activate Models Scene
          </button>
        </div>
      )}

      <div className="model-lab__grid">
        <label>
          Model
          <select value={state.model} disabled>
            <option value="hrrr">HRRR</option>
          </select>
        </label>

        <label>
          Run
          <select
            value={state.runMode}
            onChange={(event) => patch({
              runMode: event.currentTarget.value === 'pinned' ? 'pinned' : 'latest',
              runId: event.currentTarget.value === 'latest' ? '' : (runtime.run?.id ?? state.runId),
              animationEnabled: false,
            })}
          >
            <option value="latest">Latest available</option>
            <option value="pinned" disabled={!runtime.run && !state.runId}>Pinned run</option>
          </select>
        </label>

        <label className="wide">
          Field
          <select
            value={state.field}
            onChange={(event) => patch({
              field: event.currentTarget.value as ModelSceneState['field'],
              animationEnabled: false,
            })}
          >
            {MODEL_FIELDS.map((field) => (
              <option key={field.id} value={field.id}>{field.label}</option>
            ))}
          </select>
        </label>

        <label>
          Forecast hour
          <select
            value={runtime.availableHours.includes(runtime.forecastHour) ? runtime.forecastHour : state.forecastHour}
            onChange={(event) => patch({
              forecastHour: Number(event.currentTarget.value),
              animationEnabled: false,
            })}
          >
            {hours.map((hour) => <option key={hour} value={hour}>F{String(hour).padStart(2, '0')}</option>)}
          </select>
        </label>

        <label>
          Playback speed
          <select
            value={state.playbackRateMs}
            onChange={(event) => patch({ playbackRateMs: Number(event.currentTarget.value) })}
          >
            <option value={500}>Fast</option>
            <option value={700}>Quick</option>
            <option value={900}>Normal</option>
            <option value={1200}>Slow</option>
            <option value={1600}>Slower</option>
          </select>
        </label>

        <label>
          Smoothing
          <select
            value={state.smoothing}
            onChange={(event) => patch({
              smoothing: event.currentTarget.value as ModelSceneState['smoothing'],
              animationEnabled: false,
            })}
          >
            <option value="sharp">Sharp</option>
            <option value="balanced">Balanced</option>
            <option value="smooth">Smooth</option>
          </select>
        </label>

        <label className="model-lab__loop-check">
          <span>Loop playback</span>
          <input
            type="checkbox"
            checked={state.loopEnabled}
            onChange={(event) => patch({ loopEnabled: event.currentTarget.checked })}
          />
        </label>

        <label className="wide">
          Opacity {Math.round(state.opacity * 100)}%
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={state.opacity}
            onChange={(event) => patch({ opacity: Number(event.currentTarget.value) })}
          />
        </label>
      </div>

      <div className={`model-lab__status ${runtime.error ? 'error' : ''}`}>
        <strong>{runLabel}</strong>
        <small>
          {runtime.error
            ? runtime.error
            : runtime.run
              ? `${runtime.availableHours.length} forecast hours · selected F${String(runtime.forecastHour).padStart(2, '0')} · ${runtime.loading ? 'decoding…' : runtime.fieldReady ? `${runtime.sampleCount.toLocaleString()} rendered samples` : 'awaiting field'}`
              : 'Awaiting NOAA HRRR catalog.'}
        </small>
      </div>

      <div className="model-lab__foundation-note">
        Checkpoint 2 decodes only the requested HRRR GRIB2 field using NOAA byte ranges, renders it through
        a dedicated MapLibre model layer, and keeps Previous, Play/Pause, Next, Refresh, and Loop in the hidden map-control menu.
        Model Lab remains the detailed model/run/field/speed/opacity setup panel.
      </div>
    </div>
  );
}
