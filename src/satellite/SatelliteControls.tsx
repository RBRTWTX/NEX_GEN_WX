import '../styles/satellite.css';
import type { ChangeEvent } from 'react';
import type { HeaderLegendState, MapScene, ProductSelection } from '../types/domain';
import { useSatelliteRuntime } from './satellite-runtime-store';
import {
  satelliteLegendForProduct,
  satelliteProductForScene,
  satelliteProductLabel,
  satelliteDisplaySourceLabel,
  satelliteStateForScene,
  type SatelliteProductId,
  type SatelliteSceneState,
  type SatelliteSource,
} from './satellite-types';

interface SatelliteControlsProps {
  scene: MapScene;
  onModuleStateChange: (patch: Partial<SatelliteSceneState>) => void;
  onProductChange: (patch: Partial<ProductSelection>) => void;
  onHeaderLegendChange?: (legend: HeaderLegendState) => void;
}

const PRODUCTS: Array<{ id: SatelliteProductId; label: string }> = [
  { id: 'goes-visible', label: 'Visible (ABI Band 2)' },
  { id: 'goes-infrared', label: 'Enhanced Infrared (ABI Band 13)' },
  { id: 'goes-water-vapor', label: 'Water Vapor (ABI Band 9)' },
  { id: 'goes-geocolor', label: 'GeoColor' },
];

function nextFrameIndex(current: number, count: number, direction: -1 | 1): number {
  if (count <= 0) return 0;
  return (current + direction + count) % count;
}

function frameLabel(validTime: string, fallback: string): string {
  if (!validTime) return fallback;
  const parsed = Date.parse(validTime);
  if (!Number.isFinite(parsed)) return fallback;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(parsed));
}

export function SatelliteControls({
  scene,
  onModuleStateChange,
  onProductChange,
  onHeaderLegendChange,
}: SatelliteControlsProps) {
  const state = satelliteStateForScene(scene);
  const product = scene.product.category === 'satellite'
    ? satelliteProductForScene(scene)
    : state.product;
  const runtime = useSatelliteRuntime(scene.id);
  const frameCount = runtime.frames.length;
  const runtimeFrame = frameCount ? Math.max(0, Math.min(frameCount - 1, runtime.frameIndex)) : 0;
  const satelliteScene = scene.product.category === 'satellite';

  const resetPlayback = {
    animationEnabled: false,
    frameIndex: -1,
    playbackStartedAt: 0,
  } as const;

  const setSource = (source: SatelliteSource) => {
    onModuleStateChange({ source, ...resetPlayback });
  };

  const setProduct = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.currentTarget.value as SatelliteProductId;
    onModuleStateChange({ product: next, ...resetPlayback });
    if (satelliteScene) {
      onProductChange({ category: 'satellite', id: next });
      onHeaderLegendChange?.(satelliteLegendForProduct(next));
    }
  };

  const togglePlayback = () => {
    if (state.animationEnabled) {
      onModuleStateChange({ animationEnabled: false, frameIndex: runtimeFrame, playbackStartedAt: 0 });
      return;
    }
    const startAt = frameCount > 1 && runtimeFrame >= frameCount - 1 ? 0 : runtimeFrame;
    onModuleStateChange({ animationEnabled: true, frameIndex: startAt, playbackStartedAt: Date.now() });
  };

  const stepFrame = (direction: -1 | 1) => {
    onModuleStateChange({
      animationEnabled: false,
      frameIndex: nextFrameIndex(runtimeFrame, frameCount, direction),
      playbackStartedAt: 0,
    });
  };

  const summary = frameLabel(
    runtime.validTime,
    runtime.loading ? 'Loading satellite…' : runtime.error ? 'Satellite history unavailable' : 'Awaiting satellite frame',
  );

  return (
    <div className="satellite-controls" data-operator-only="true">
      <div className="satellite-controls__header">
        <div>
          <span className={`satellite-health-dot ${runtime.error ? 'degraded' : runtime.loading ? 'loading' : 'online'}`} />
          <strong>{satelliteProductLabel(product)}</strong>
          <small>{runtime.provider || satelliteDisplaySourceLabel(state.source, product)}</small>
        </div>
      </div>

      <div className="satellite-control-grid">
        <label>
          Satellite
          <select
            value={product === 'goes-geocolor' ? 'merged' : state.source}
            disabled={product === 'goes-geocolor'}
            onChange={(event) => setSource(event.currentTarget.value as SatelliteSource)}
          >
            {product === 'goes-geocolor' && <option value="merged">Merged GOES East + West</option>}
            <option value="east">GOES-19 East</option>
            <option value="west">GOES-18 West</option>
          </select>
        </label>

        <label>
          Product
          <select value={product} onChange={setProduct}>
            {PRODUCTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>

        <label>
          Frames
          <input type="range" min="4" max="24" step="1" value={state.frameCount} onChange={(event) => onModuleStateChange({ frameCount: Number(event.currentTarget.value), ...resetPlayback })} />
          <output>{state.frameCount}</output>
        </label>

        <label>
          Loop speed
          <input type="range" min="250" max="3000" step="50" value={state.playbackRateMs} onChange={(event) => onModuleStateChange({ playbackRateMs: Number(event.currentTarget.value), frameIndex: runtimeFrame, playbackStartedAt: state.animationEnabled ? Date.now() : 0 })} />
          <output>{(state.playbackRateMs / 1000).toFixed(2)} sec</output>
        </label>

        {satelliteScene && (
          <label>
            Opacity
            <input type="range" min="0" max="1" step="0.01" value={scene.product.opacity} onChange={(event) => onProductChange({ opacity: Number(event.currentTarget.value) })} />
            <output>{Math.round(scene.product.opacity * 100)}%</output>
          </label>
        )}

        {satelliteScene && (
          <label>
            Raster resampling
            <select
              value={scene.product.smoothing === 'sharp' ? 'sharp' : 'balanced'}
              onChange={(event) => onProductChange({ smoothing: event.currentTarget.value as ProductSelection['smoothing'] })}
            >
              <option value="sharp">Sharp (nearest)</option>
              <option value="balanced">Smooth (linear)</option>
            </select>
          </label>
        )}
      </div>

      <div className="satellite-control-checks">
        <label className="setting-check">
          <input type="checkbox" checked={state.autoRefreshEnabled} onChange={(event) => onModuleStateChange({ autoRefreshEnabled: event.currentTarget.checked })} />
          <span>Refresh automatically</span>
        </label>
        <label className="setting-check">
          <input type="checkbox" checked={state.overlayEnabled} onChange={(event) => onModuleStateChange({ overlayEnabled: event.currentTarget.checked, ...resetPlayback })} />
          <span>Independent satellite overlay</span>
        </label>
      </div>

      <div className="satellite-playback-row">
        <button type="button" onClick={() => stepFrame(-1)} disabled={frameCount < 2}>Previous</button>
        <button type="button" className={state.animationEnabled ? 'active' : ''} onClick={togglePlayback} disabled={frameCount < 2}>{state.animationEnabled ? 'Pause' : 'Play'}</button>
        <button type="button" onClick={() => stepFrame(1)} disabled={frameCount < 2}>Next</button>
        <button type="button" onClick={() => onModuleStateChange({ refreshToken: state.refreshToken + 1 })}>Refresh now</button>
        <span>{frameCount ? `${runtimeFrame + 1} / ${frameCount}` : '0 / 0'}</span>
      </div>

      <div className={`satellite-status ${runtime.error ? 'satellite-status--warning' : ''}`}>
        <strong>{summary}</strong>
        <small>{satelliteDisplaySourceLabel(state.source, product)} · {satelliteProductLabel(product)}</small>
        {runtime.error && <small>{runtime.error}</small>}
      </div>
    </div>
  );
}